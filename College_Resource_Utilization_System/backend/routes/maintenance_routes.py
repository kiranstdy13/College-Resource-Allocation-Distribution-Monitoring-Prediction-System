from flask import Blueprint, request, jsonify
from datetime import datetime, timezone
import uuid
from db import get_db, sync_db
from auth import token_required, role_required, log_audit

maintenance_bp = Blueprint("maintenance", __name__)

@maintenance_bp.route("", methods=["GET"])
@token_required
def get_maintenance_requests():
    current_user = request.current_user
    db = get_db()
    query = {}
    if current_user["role"] in ["HOD", "Staff"]:
        query["department_id"] = current_user.get("department_id")

    status_filter = request.args.get("status")
    if status_filter:
        query["status"] = status_filter

    tickets = list(db.maintenance_requests.find(query).sort("created_at", -1))
    for t in tickets:
        t["_id"] = str(t.get("_id", t.get("id")))
    return jsonify({"tickets": tickets}), 200

@maintenance_bp.route("/report-damage", methods=["POST"])
@token_required
def report_damage():
    """Staff or HOD reports damaged or non-working resources"""
    current_user = request.current_user
    data = request.get_json() or {}
    dept_id = data.get("department_id") or current_user.get("department_id")
    resource_id = data.get("resource_id")
    quantity = int(data.get("quantity", 1))
    asset_id = data.get("asset_id")  # Optional specific asset serial
    issue_type = data.get("issue_type", "Damaged")  # Damaged, Malfunctioning, Missing, Routine Maintenance
    description = data.get("description", "").strip()

    if current_user["role"] in ["HOD", "Staff"] and current_user.get("department_id") != dept_id:
        return jsonify({"error": "Unauthorized"}), 403

    if not dept_id or not resource_id or quantity <= 0:
        return jsonify({"error": "department_id, resource_id, and quantity > 0 are required"}), 400

    db = get_db()
    dept_inv = db.department_inventory.find_one({"department_id": dept_id, "resource_id": resource_id})
    if not dept_inv:
        return jsonify({"error": "Resource not found in departmental inventory"}), 404

    working = dept_inv.get("working_quantity", 0)
    if quantity > working:
        return jsonify({"error": f"Cannot report {quantity} damaged. Only {working} working units available in department."}), 400

    now = datetime.now(timezone.utc).isoformat()
    ticket_id = f"MNT-{datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"

    # 1. Update department inventory: deduct from working, add to damaged/under-maintenance
    db.department_inventory.update_one(
        {"department_id": dept_id, "resource_id": resource_id},
        {"$inc": {
            "working_quantity": -quantity,
            "damaged_quantity": quantity if issue_type in ["Damaged", "Missing"] else 0,
            "under_maintenance_quantity": quantity if issue_type in ["Malfunctioning", "Routine Maintenance"] else 0
        },
        "$set": {"updated_at": now}}
    )

    # 2. Update specific asset if provided
    if asset_id:
        db.resource_assets.update_one(
            {"asset_id": asset_id},
            {"$set": {
                "status": "Under Maintenance" if issue_type != "Missing" else "Missing",
                "condition": issue_type,
                "updated_at": now
            }}
        )

    # 3. Create maintenance ticket
    ticket_doc = {
        "ticket_id": ticket_id,
        "department_id": dept_id,
        "resource_id": resource_id,
        "resource_name": dept_inv.get("resource_name"),
        "quantity": quantity,
        "asset_id": asset_id,
        "issue_type": issue_type,
        "description": description,
        "status": "Reported",  # Reported, Under Maintenance, Repaired & Restored, Written Off / Disposed
        "reported_by": current_user["email"],
        "action_taken": "",
        "created_at": now,
        "updated_at": now
    }
    ins_res = db.maintenance_requests.insert_one(ticket_doc)
    ticket_doc["_id"] = str(ins_res.inserted_id)

    # 4. Notify Admin
    db.notifications.insert_one({
        "user_email": "admin@college.edu",
        "department_id": dept_id,
        "title": f"Resource {issue_type}: {dept_inv.get('resource_name')} ({dept_id})",
        "message": f"{dept_id} reported {quantity} {dept_inv.get('resource_name')} as {issue_type}. Ticket #{ticket_id}.",
        "type": "MAINTENANCE_ALERT",
        "is_read": False,
        "created_at": now
    })

    sync_db()
    log_audit("DAMAGE_REPORTED", {"ticket_id": ticket_id, "department_id": dept_id, "quantity": quantity})

    return jsonify({"message": f"Maintenance ticket #{ticket_id} created", "ticket": ticket_doc}), 201

@maintenance_bp.route("/<ticket_id>/update-status", methods=["PUT"])
@token_required
@role_required("Admin")
def update_maintenance_status(ticket_id):
    """Admin updates maintenance ticket progress, e.g. repair completion or write-off"""
    data = request.get_json() or {}
    new_status = data.get("status")  # "Under Maintenance", "Repaired & Restored", "Written Off / Disposed"
    action_taken = data.get("action_taken", "").strip()

    valid_statuses = ["Under Maintenance", "Repaired & Restored", "Written Off / Disposed"]
    if new_status not in valid_statuses:
        return jsonify({"error": f"Invalid status. Must be one of {valid_statuses}"}), 400

    db = get_db()
    ticket = db.maintenance_requests.find_one({"ticket_id": ticket_id})
    if not ticket:
        return jsonify({"error": "Maintenance ticket not found"}), 404

    now = datetime.now(timezone.utc).isoformat()
    dept_id = ticket["department_id"]
    res_id = ticket["resource_id"]
    qty = ticket["quantity"]

    # Handle transitions
    if new_status == "Repaired & Restored" and ticket.get("status") != "Repaired & Restored":
        # Restore to working in department
        db.department_inventory.update_one(
            {"department_id": dept_id, "resource_id": res_id},
            {"$inc": {
                "working_quantity": qty,
                "damaged_quantity": -qty if ticket.get("issue_type") in ["Damaged", "Missing"] else 0,
                "under_maintenance_quantity": -qty if ticket.get("issue_type") not in ["Damaged", "Missing"] else 0
            },
            "$set": {"updated_at": now}}
        )
        if ticket.get("asset_id"):
            db.resource_assets.update_one(
                {"asset_id": ticket["asset_id"]},
                {"$set": {"status": "Allocated", "condition": "Good", "updated_at": now}}
            )

    elif new_status == "Written Off / Disposed" and ticket.get("status") != "Written Off / Disposed":
        # Remove from department received stock and update central records
        db.department_inventory.update_one(
            {"department_id": dept_id, "resource_id": res_id},
            {"$inc": {
                "received_quantity": -qty,
                "damaged_quantity": -qty if ticket.get("issue_type") in ["Damaged", "Missing"] else 0,
                "under_maintenance_quantity": -qty if ticket.get("issue_type") not in ["Damaged", "Missing"] else 0
            },
            "$set": {"updated_at": now}}
        )
        # In central inventory, reduce allocated and total quantity (disposed asset)
        db.resources.update_one(
            {"resource_id": res_id},
            {"$inc": {"total_quantity": -qty, "allocated_quantity": -qty}, "$set": {"updated_at": now}}
        )
        if ticket.get("asset_id"):
            db.resource_assets.update_one(
                {"asset_id": ticket["asset_id"]},
                {"$set": {"status": "Disposed", "condition": "Disposed", "updated_at": now}}
            )

    db.maintenance_requests.update_one(
        {"ticket_id": ticket_id},
        {"$set": {
            "status": new_status,
            "action_taken": action_taken,
            "updated_at": now
        }}
    )

    # Notify HOD
    db.notifications.insert_one({
        "user_email": ticket.get("reported_by"),
        "department_id": dept_id,
        "title": f"Maintenance Ticket #{ticket_id} {new_status}",
        "message": f"Maintenance update for {ticket.get('resource_name')}: {new_status}. Action: {action_taken}",
        "type": "MAINTENANCE_UPDATE",
        "is_read": False,
        "created_at": now
    })

    sync_db()
    log_audit("MAINTENANCE_UPDATED", {"ticket_id": ticket_id, "status": new_status, "action": action_taken})

    return jsonify({"message": f"Ticket #{ticket_id} updated to {new_status}"}), 200
