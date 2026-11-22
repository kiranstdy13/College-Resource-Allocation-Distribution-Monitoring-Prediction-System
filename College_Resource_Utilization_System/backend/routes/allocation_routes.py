from flask import Blueprint, request, jsonify
from datetime import datetime, timezone
import uuid
from db import get_db, sync_db
from auth import token_required, role_required, log_audit

allocation_bp = Blueprint("allocations", __name__)

@allocation_bp.route("/shortage-summary", methods=["GET"])
@token_required
@role_required("Admin")
def get_shortage_summary():
    """Calculates demand vs availability per resource for a given cycle or all pending requests"""
    cycle_id = request.args.get("cycle_id")
    db = get_db()

    query = {"status": {"$in": ["Submitted", "Under Review"]}}
    if cycle_id:
        query["cycle_id"] = cycle_id

    pending_requests = list(db.resource_requests.find(query))
    resources = list(db.resources.find({}))
    res_map = {r["resource_id"]: r for r in resources}

    summary = {}
    for r in resources:
        avail = max(0, r.get("total_quantity", 0) - r.get("allocated_quantity", 0) - r.get("reserved_quantity", 0) - r.get("under_maintenance_quantity", 0) - r.get("damaged_quantity", 0))
        summary[r["resource_id"]] = {
            "resource_id": r["resource_id"],
            "resource_name": r["name"],
            "category": r.get("category", "General"),
            "unit": r.get("unit", "Units"),
            "central_total": r.get("total_quantity", 0),
            "central_allocated": r.get("allocated_quantity", 0),
            "central_available": avail,
            "total_requested": 0,
            "department_demands": [],
            "shortage": 0,
            "has_shortage": False
        }

    for req in pending_requests:
        r_id = req.get("resource_id")
        if r_id in summary:
            summary[r_id]["total_requested"] += req.get("requested_quantity", 0)
            summary[r_id]["department_demands"].append({
                "request_id": req.get("request_id"),
                "department_id": req.get("department_id"),
                "requested_quantity": req.get("requested_quantity", 0),
                "priority": req.get("priority", "Medium"),
                "purpose": req.get("purpose", ""),
                "justification": req.get("justification", "")
            })

    # Calculate shortage
    shortages_list = []
    for r_id, info in summary.items():
        if info["total_requested"] > info["central_available"]:
            info["shortage"] = info["total_requested"] - info["central_available"]
            info["has_shortage"] = True
        shortages_list.append(info)

    return jsonify({"summary": shortages_list}), 200

@allocation_bp.route("/decide", methods=["POST"])
@token_required
@role_required("Admin")
def decide_request():
    """Admin reviews and approves (full or partial) or rejects a specific resource request"""
    data = request.get_json() or {}
    request_id = data.get("request_id")
    action = data.get("action")  # "APPROVE", "PARTIAL_APPROVE", "REJECT"
    approved_quantity = int(data.get("approved_quantity", 0))
    admin_remarks = data.get("admin_remarks", "").strip()

    if not request_id or not action:
        return jsonify({"error": "request_id and action are required"}), 400

    if action not in ["APPROVE", "PARTIAL_APPROVE", "REJECT"]:
        return jsonify({"error": "Invalid action. Must be APPROVE, PARTIAL_APPROVE, or REJECT"}), 400

    if action == "REJECT" and not admin_remarks:
        return jsonify({"error": "Mandatory remarks/reason required when rejecting a request"}), 400

    db = get_db()
    req = db.resource_requests.find_one({"request_id": request_id})
    if not req:
        return jsonify({"error": "Resource request not found"}), 404

    if req.get("status") in ["Allocated"]:
        return jsonify({"error": "This request has already been distributed and allocated"}), 400

    requested_qty = req.get("requested_quantity", 0)
    resource_id = req.get("resource_id")
    res = db.resources.find_one({"resource_id": resource_id})
    if not res:
        return jsonify({"error": "Resource not found in central inventory"}), 404

    avail = max(0, res.get("total_quantity", 0) - res.get("allocated_quantity", 0) - res.get("reserved_quantity", 0) - res.get("under_maintenance_quantity", 0) - res.get("damaged_quantity", 0))

    final_status = "Approved"
    final_approved_qty = requested_qty

    if action == "REJECT":
        final_status = "Rejected"
        final_approved_qty = 0
    elif action == "PARTIAL_APPROVE":
        final_status = "Partially Approved"
        if approved_quantity <= 0 or approved_quantity >= requested_qty:
            return jsonify({"error": f"Partially approved quantity must be between 1 and {requested_qty - 1}"}), 400
        final_approved_qty = approved_quantity
    elif action == "APPROVE":
        final_status = "Approved"
        final_approved_qty = requested_qty

    # Check stock limit if approving
    if final_approved_qty > avail:
        return jsonify({
            "error": f"Cannot approve {final_approved_qty} units. Central available stock is only {avail} units."
        }), 400

    now = datetime.now(timezone.utc).isoformat()
    db.resource_requests.update_one(
        {"request_id": request_id},
        {"$set": {
            "status": final_status,
            "approved_quantity": final_approved_qty,
            "admin_remarks": admin_remarks,
            "updated_at": now
        }}
    )

    # Notify HOD
    db.notifications.insert_one({
        "user_email": req.get("submitted_by"),
        "department_id": req.get("department_id"),
        "title": f"Request {final_status}: {req.get('resource_name')}",
        "message": f"Your request for {req.get('resource_name')} has been marked as '{final_status}' with {final_approved_qty} unit(s). Remarks: {admin_remarks or 'Approved as requested.'}",
        "type": "REQUEST_DECISION",
        "is_read": False,
        "created_at": now
    })

    sync_db()
    log_audit("REQUEST_DECIDED", {
        "request_id": request_id,
        "action": action,
        "status": final_status,
        "approved_quantity": final_approved_qty,
        "remarks": admin_remarks
    })

    return jsonify({
        "message": f"Request {action} successfully",
        "status": final_status,
        "approved_quantity": final_approved_qty
    }), 200

@allocation_bp.route("/execute", methods=["POST"])
@token_required
@role_required("Admin")
def execute_allocation():
    """Atomically transfers approved resources from central inventory to departmental inventory"""
    data = request.get_json() or {}
    request_ids = data.get("request_ids", [])

    if not request_ids:
        return jsonify({"error": "No request_ids provided for allocation execution"}), 400

    db = get_db()
    now = datetime.now(timezone.utc).isoformat()
    allocated_receipts = []

    for req_id in request_ids:
        req = db.resource_requests.find_one({"request_id": req_id})
        if not req:
            continue

        if req.get("status") not in ["Approved", "Partially Approved"]:
            continue

        approved_qty = req.get("approved_quantity", 0)
        if approved_qty <= 0:
            continue

        resource_id = req.get("resource_id")
        res = db.resources.find_one({"resource_id": resource_id})
        if not res:
            continue

        avail = max(0, res.get("total_quantity", 0) - res.get("allocated_quantity", 0) - res.get("reserved_quantity", 0) - res.get("under_maintenance_quantity", 0) - res.get("damaged_quantity", 0))

        if approved_qty > avail:
            return jsonify({
                "error": f"Cannot allocate {approved_qty} units of {res['name']}. Available central stock is only {avail}."
            }), 400

        dept_id = req.get("department_id")

        # 1. ATOMIC UPDATE: Increase allocated quantity in Central Inventory
        new_allocated = res.get("allocated_quantity", 0) + approved_qty
        new_avail = max(0, res.get("total_quantity", 0) - new_allocated - res.get("reserved_quantity", 0) - res.get("under_maintenance_quantity", 0) - res.get("damaged_quantity", 0))
        db.resources.update_one(
            {"resource_id": resource_id},
            {"$set": {
                "allocated_quantity": new_allocated,
                "available_quantity": new_avail,
                "updated_at": now
            }}
        )

        # 2. ATOMIC UPDATE: Upsert Department Inventory
        dept_inv = db.department_inventory.find_one({"department_id": dept_id, "resource_id": resource_id})
        if dept_inv:
            db.department_inventory.update_one(
                {"department_id": dept_id, "resource_id": resource_id},
                {"$inc": {
                    "received_quantity": approved_qty,
                    "working_quantity": approved_qty
                },
                "$set": {"updated_at": now}}
            )
        else:
            db.department_inventory.insert_one({
                "department_id": dept_id,
                "resource_id": resource_id,
                "resource_name": res.get("name"),
                "category": res.get("category", "General"),
                "received_quantity": approved_qty,
                "working_quantity": approved_qty,
                "damaged_quantity": 0,
                "under_maintenance_quantity": 0,
                "actively_used_quantity": 0,
                "is_durable": res.get("is_durable", True),
                "created_at": now,
                "updated_at": now
            })

        # 3. Durable asset assignment
        assigned_asset_ids = []
        if res.get("is_durable", True):
            # Pick available assets in central store
            unassigned_assets = list(db.resource_assets.find({
                "resource_id": resource_id,
                "status": "In Central Store"
            }).limit(approved_qty))

            for asset in unassigned_assets:
                db.resource_assets.update_one(
                    {"asset_id": asset["asset_id"]},
                    {"$set": {
                        "status": "Allocated",
                        "current_department": dept_id,
                        "allocation_date": now,
                        "updated_at": now
                    }}
                )
                assigned_asset_ids.append(asset["asset_id"])

        # 4. Generate Allocation Receipt
        receipt_no = f"REC-{datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"
        allocation_doc = {
            "receipt_number": receipt_no,
            "request_id": req["request_id"],
            "cycle_id": req.get("cycle_id"),
            "department_id": dept_id,
            "resource_id": resource_id,
            "resource_name": res.get("name"),
            "category": res.get("category"),
            "requested_quantity": req.get("requested_quantity"),
            "allocated_quantity": approved_qty,
            "unit": res.get("unit", "Units"),
            "assigned_assets": assigned_asset_ids,
            "allocated_by": request.current_user["email"],
            "allocated_at": now,
            "status": "Completed"
        }
        ins_res = db.allocations.insert_one(allocation_doc)
        allocation_doc["_id"] = str(ins_res.inserted_id)
        allocated_receipts.append(allocation_doc)

        # 5. Update Request Status to Allocated
        db.resource_requests.update_one(
            {"request_id": req["request_id"]},
            {"$set": {
                "status": "Allocated",
                "allocated_quantity": approved_qty,
                "allocation_receipt": receipt_no,
                "updated_at": now
            }}
        )

        # 6. Audit & Notification
        db.resource_transactions.insert_one({
            "transaction_type": "ALLOCATION",
            "receipt_number": receipt_no,
            "resource_id": resource_id,
            "department_id": dept_id,
            "quantity": approved_qty,
            "timestamp": now,
            "initiated_by": request.current_user["email"]
        })

        db.notifications.insert_one({
            "user_email": req.get("submitted_by"),
            "department_id": dept_id,
            "title": f"Resources Dispatched: {res.get('name')}",
            "message": f"Central Inventory has dispatched {approved_qty} {res.get('name')} to {dept_id}. Receipt #{receipt_no}.",
            "type": "RESOURCES_ALLOCATED",
            "is_read": False,
            "created_at": now
        })

    sync_db()
    log_audit("ALLOCATION_EXECUTED", {"receipts_count": len(allocated_receipts)})

    return jsonify({
        "message": f"Successfully executed distribution for {len(allocated_receipts)} item(s)",
        "receipts": allocated_receipts
    }), 200

@allocation_bp.route("/receipts", methods=["GET"])
@token_required
def get_receipts():
    current_user = request.current_user
    db = get_db()
    query = {}
    if current_user["role"] in ["HOD", "Staff"]:
        query["department_id"] = current_user.get("department_id")

    receipts = list(db.allocations.find(query).sort("allocated_at", -1))
    for r in receipts:
        r["_id"] = str(r.get("_id", r.get("id")))
    return jsonify({"receipts": receipts}), 200
