from flask import Blueprint, request, jsonify
from datetime import datetime, timezone
import uuid
from db import get_db, sync_db
from auth import token_required, role_required, log_audit

transfer_bp = Blueprint("transfers", __name__)

@transfer_bp.route("", methods=["GET"])
@token_required
def get_transfers():
    current_user = request.current_user
    db = get_db()
    query = {}
    if current_user["role"] in ["HOD", "Staff"]:
        dept_id = current_user.get("department_id")
        query["$or"] = [{"source_department": dept_id}, {"destination_department": dept_id}]

    transfers = list(db.resource_transactions.find({"transaction_type": {"$in": ["INTERDEPT_TRANSFER", "RETURN_TO_CENTRAL"]}}).sort("timestamp", -1))
    for t in transfers:
        t["_id"] = str(t.get("_id", t.get("id")))
    return jsonify({"transfers": transfers}), 200

@transfer_bp.route("/initiate", methods=["POST"])
@token_required
def initiate_transfer():
    """HOD or Admin initiates an interdepartmental transfer request"""
    current_user = request.current_user
    data = request.get_json() or {}
    source_dept = data.get("source_department")
    dest_dept = data.get("destination_department")
    resource_id = data.get("resource_id")
    quantity = int(data.get("quantity", 0))
    reason = data.get("reason", "").strip()

    if not source_dept or not dest_dept or not resource_id or quantity <= 0:
        return jsonify({"error": "source_department, destination_department, resource_id and quantity > 0 are required"}), 400

    if source_dept == dest_dept:
        return jsonify({"error": "Source and destination departments cannot be identical"}), 400

    if current_user["role"] in ["HOD", "Staff"] and current_user.get("department_id") != source_dept:
        return jsonify({"error": "You can only request transfers out of your own department"}), 403

    db = get_db()
    # Check source inventory has enough working and unused items
    source_inv = db.department_inventory.find_one({"department_id": source_dept, "resource_id": resource_id})
    if not source_inv:
        return jsonify({"error": f"Source department {source_dept} does not possess {resource_id}"}), 400

    working_qty = source_inv.get("working_quantity", 0)
    actively_used = source_inv.get("actively_used_quantity", 0)
    unused_qty = max(0, working_qty - actively_used)

    if quantity > unused_qty:
        return jsonify({
            "error": f"Cannot transfer {quantity} items. Department {source_dept} only has {unused_qty} unused working items available (Working: {working_qty}, In Use: {actively_used})."
        }), 400

    res = db.resources.find_one({"resource_id": resource_id})
    now = datetime.now(timezone.utc).isoformat()
    transfer_id = f"TRF-{datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"

    # If initiated by Admin, it can be auto-approved and executed immediately. If by HOD, status is Pending Admin Approval.
    auto_execute = (current_user["role"] == "Admin")

    tx_doc = {
        "transfer_id": transfer_id,
        "transaction_type": "INTERDEPT_TRANSFER",
        "source_department": source_dept,
        "destination_department": dest_dept,
        "resource_id": resource_id,
        "resource_name": res.get("name", resource_id) if res else resource_id,
        "quantity": quantity,
        "reason": reason,
        "status": "Completed" if auto_execute else "Pending Admin Approval",
        "initiated_by": current_user["email"],
        "approved_by": current_user["email"] if auto_execute else None,
        "timestamp": now
    }

    if auto_execute:
        _perform_transfer_execution(db, tx_doc, now)

    res = db.resource_transactions.insert_one(tx_doc)
    tx_doc["_id"] = str(res.inserted_id)

    # Notify destination HOD and Admin
    db.notifications.insert_one({
        "user_email": "admin@college.edu",
        "department_id": dest_dept,
        "title": f"Transfer {'Completed' if auto_execute else 'Requested'}: {quantity} {tx_doc['resource_name']}",
        "message": f"Transfer of {quantity} {tx_doc['resource_name']} from {source_dept} to {dest_dept}. Reason: {reason}",
        "type": "TRANSFER_NOTICE",
        "is_read": False,
        "created_at": now
    })

    sync_db()
    log_audit("TRANSFER_INITIATED", {
        "transfer_id": transfer_id,
        "source": source_dept,
        "dest": dest_dept,
        "quantity": quantity,
        "auto_executed": auto_execute
    })

    return jsonify({
        "message": f"Transfer {'executed' if auto_execute else 'submitted for Admin approval'}",
        "transfer": tx_doc
    }), 201

@transfer_bp.route("/<transfer_id>/action", methods=["PUT"])
@token_required
@role_required("Admin")
def action_transfer(transfer_id):
    """Admin approves and executes or rejects a pending transfer"""
    data = request.get_json() or {}
    action = data.get("action")  # "APPROVE", "REJECT"
    remarks = data.get("remarks", "")

    db = get_db()
    tx = db.resource_transactions.find_one({"transfer_id": transfer_id})
    if not tx:
        return jsonify({"error": "Transfer not found"}), 404

    if tx.get("status") != "Pending Admin Approval":
        return jsonify({"error": f"Transfer is already in '{tx.get('status')}' state"}), 400

    now = datetime.now(timezone.utc).isoformat()
    if action == "REJECT":
        db.resource_transactions.update_one(
            {"transfer_id": transfer_id},
            {"$set": {"status": "Rejected", "remarks": remarks, "updated_at": now}}
        )
        sync_db()
        return jsonify({"message": "Transfer rejected"}), 200

    elif action == "APPROVE":
        _perform_transfer_execution(db, tx, now)
        db.resource_transactions.update_one(
            {"transfer_id": transfer_id},
            {"$set": {
                "status": "Completed",
                "approved_by": request.current_user["email"],
                "remarks": remarks,
                "updated_at": now
            }}
        )
        sync_db()
        log_audit("TRANSFER_APPROVED", {"transfer_id": transfer_id})
        return jsonify({"message": "Transfer approved and inventory balances updated successfully"}), 200
    else:
        return jsonify({"error": "Invalid action. Must be APPROVE or REJECT"}), 400

def _perform_transfer_execution(db, tx, now):
    source_dept = tx["source_department"]
    dest_dept = tx["destination_department"]
    resource_id = tx["resource_id"]
    quantity = tx["quantity"]

    # 1. Deduct from source department
    db.department_inventory.update_one(
        {"department_id": source_dept, "resource_id": resource_id},
        {"$inc": {
            "received_quantity": -quantity,
            "working_quantity": -quantity
        },
        "$set": {"updated_at": now}}
    )

    # 2. Add to destination department
    res = db.resources.find_one({"resource_id": resource_id})
    dest_inv = db.department_inventory.find_one({"department_id": dest_dept, "resource_id": resource_id})
    if dest_inv:
        db.department_inventory.update_one(
            {"department_id": dest_dept, "resource_id": resource_id},
            {"$inc": {
                "received_quantity": quantity,
                "working_quantity": quantity
            },
            "$set": {"updated_at": now}}
        )
    else:
        db.department_inventory.insert_one({
            "department_id": dest_dept,
            "resource_id": resource_id,
            "resource_name": res.get("name", resource_id) if res else resource_id,
            "category": res.get("category", "General") if res else "General",
            "received_quantity": quantity,
            "working_quantity": quantity,
            "damaged_quantity": 0,
            "under_maintenance_quantity": 0,
            "actively_used_quantity": 0,
            "is_durable": res.get("is_durable", True) if res else True,
            "created_at": now,
            "updated_at": now
        })

    # 3. Reassign durable asset serial records
    if res and res.get("is_durable", True):
        assets_to_move = list(db.resource_assets.find({
            "resource_id": resource_id,
            "current_department": source_dept,
            "status": "Allocated"
        }).limit(quantity))
        for a in assets_to_move:
            db.resource_assets.update_one(
                {"asset_id": a["asset_id"]},
                {"$set": {
                    "current_department": dest_dept,
                    "updated_at": now
                }}
            )

@transfer_bp.route("/return-to-central", methods=["POST"])
@token_required
def return_to_central():
    """Returns items from a department back to central store"""
    current_user = request.current_user
    data = request.get_json() or {}
    dept_id = data.get("department_id")
    resource_id = data.get("resource_id")
    quantity = int(data.get("quantity", 0))
    condition = data.get("condition", "Working")  # "Working", "Damaged", "Surplus"
    reason = data.get("reason", "").strip()

    if current_user["role"] in ["HOD", "Staff"] and current_user.get("department_id") != dept_id:
        return jsonify({"error": "Unauthorized"}), 403

    if not dept_id or not resource_id or quantity <= 0:
        return jsonify({"error": "department_id, resource_id, and quantity > 0 are required"}), 400

    db = get_db()
    dept_inv = db.department_inventory.find_one({"department_id": dept_id, "resource_id": resource_id})
    if not dept_inv:
        return jsonify({"error": "Resource not found in department inventory"}), 404

    # Verify department has enough working/total items
    curr_received = dept_inv.get("received_quantity", 0)
    if quantity > curr_received:
        return jsonify({"error": f"Cannot return {quantity} items. Department only received {curr_received}."}), 400

    now = datetime.now(timezone.utc).isoformat()
    return_id = f"RET-{datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"

    # 1. Reduce department inventory
    dec_dict = {"received_quantity": -quantity}
    if condition == "Working" or condition == "Surplus":
        dec_dict["working_quantity"] = -min(quantity, dept_inv.get("working_quantity", 0))
    elif condition == "Damaged":
        dec_dict["damaged_quantity"] = -min(quantity, dept_inv.get("damaged_quantity", 0))

    db.department_inventory.update_one(
        {"department_id": dept_id, "resource_id": resource_id},
        {"$inc": dec_dict, "$set": {"updated_at": now}}
    )

    # 2. Return to Central Inventory (decrease central allocated_quantity)
    res = db.resources.find_one({"resource_id": resource_id})
    if res:
        new_allocated = max(0, res.get("allocated_quantity", 0) - quantity)
        inc_damage = quantity if condition == "Damaged" else 0
        new_avail = max(0, res.get("total_quantity", 0) - new_allocated - res.get("reserved_quantity", 0) - res.get("under_maintenance_quantity", 0) - (res.get("damaged_quantity", 0) + inc_damage))
        
        db.resources.update_one(
            {"resource_id": resource_id},
            {"$set": {
                "allocated_quantity": new_allocated,
                "available_quantity": new_avail,
                "updated_at": now
            },
            "$inc": {"damaged_quantity": inc_damage}}
        )

        # 3. Update asset serial records
        if res.get("is_durable", True):
            assets_to_return = list(db.resource_assets.find({
                "resource_id": resource_id,
                "current_department": dept_id
            }).limit(quantity))
            for a in assets_to_return:
                db.resource_assets.update_one(
                    {"asset_id": a["asset_id"]},
                    {"$set": {
                        "status": "In Central Store" if condition != "Damaged" else "Damaged",
                        "current_department": None,
                        "updated_at": now
                    }}
                )

    # 4. Log transaction
    ret_doc = {
        "return_id": return_id,
        "transaction_type": "RETURN_TO_CENTRAL",
        "source_department": dept_id,
        "destination_department": "CENTRAL_STORE",
        "resource_id": resource_id,
        "resource_name": res.get("name", resource_id) if res else resource_id,
        "quantity": quantity,
        "condition": condition,
        "reason": reason,
        "status": "Completed",
        "returned_by": current_user["email"],
        "timestamp": now
    }
    res_ins = db.resource_transactions.insert_one(ret_doc)
    ret_doc["_id"] = str(res_ins.inserted_id)

    sync_db()
    log_audit("RETURNED_TO_CENTRAL", ret_doc)
    return jsonify({"message": f"Successfully returned {quantity} units to Central Store", "return": ret_doc}), 200
