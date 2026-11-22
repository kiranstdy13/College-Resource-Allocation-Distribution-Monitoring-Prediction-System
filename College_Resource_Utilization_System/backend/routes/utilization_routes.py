from flask import Blueprint, request, jsonify
from datetime import datetime, timezone
import uuid
from db import get_db, sync_db
from auth import token_required, role_required, log_audit

utilization_bp = Blueprint("utilization", __name__)

@utilization_bp.route("/record", methods=["POST"])
@token_required
def record_utilization():
    """Staff or HOD records usage for a resource in their department"""
    current_user = request.current_user
    data = request.get_json() or {}
    dept_id = data.get("department_id")
    resource_id = data.get("resource_id")
    utilization_type = data.get("utilization_type", "QUANTITY")  # "QUANTITY" or "TIME"
    
    # Quantity-based fields
    actively_used_quantity = int(data.get("actively_used_quantity", 0))
    
    # Time-based fields
    actual_usage_hours = float(data.get("actual_usage_hours", 0))
    available_operating_hours = float(data.get("available_operating_hours", 0))
    
    notes = data.get("notes", "").strip()

    if current_user["role"] in ["HOD", "Staff"] and current_user.get("department_id") != dept_id:
        return jsonify({"error": "Unauthorized"}), 403

    if not dept_id or not resource_id:
        return jsonify({"error": "department_id and resource_id are required"}), 400

    db = get_db()
    dept_inv = db.department_inventory.find_one({"department_id": dept_id, "resource_id": resource_id})
    if not dept_inv:
        return jsonify({"error": "Resource not found in department inventory"}), 404

    now = datetime.now(timezone.utc).isoformat()
    record_id = f"UTL-{datetime.now().strftime('%Y%m%d')}-{uuid.uuid4().hex[:6].upper()}"

    allocated_qty = dept_inv.get("received_quantity", 0)
    working_qty = dept_inv.get("working_quantity", 0)

    if utilization_type == "QUANTITY":
        if actively_used_quantity > working_qty:
            return jsonify({
                "error": f"Actively used quantity ({actively_used_quantity}) cannot exceed working quantity ({working_qty})"
            }), 400
        
        # Quantity Utilization = (Actively Used / Allocated) * 100
        qty_util_pct = round((actively_used_quantity / allocated_qty * 100), 2) if allocated_qty > 0 else 0
        
        doc = {
            "record_id": record_id,
            "department_id": dept_id,
            "resource_id": resource_id,
            "resource_name": dept_inv.get("resource_name"),
            "utilization_type": "QUANTITY",
            "allocated_quantity": allocated_qty,
            "working_quantity": working_qty,
            "actively_used_quantity": actively_used_quantity,
            "unused_quantity": max(0, working_qty - actively_used_quantity),
            "damaged_quantity": dept_inv.get("damaged_quantity", 0),
            "utilization_percentage": qty_util_pct,
            "recorded_by": current_user["email"],
            "notes": notes,
            "timestamp": now
        }
        
        # Update the active quantity in department inventory
        db.department_inventory.update_one(
            {"department_id": dept_id, "resource_id": resource_id},
            {"$set": {
                "actively_used_quantity": actively_used_quantity,
                "updated_at": now
            }}
        )

    else: # TIME-based utilization
        if available_operating_hours <= 0:
            return jsonify({"error": "Available operating hours must be greater than zero"}), 400
        if actual_usage_hours > available_operating_hours:
            return jsonify({"error": "Actual usage hours cannot exceed available operating hours"}), 400

        time_util_pct = round((actual_usage_hours / available_operating_hours * 100), 2)

        doc = {
            "record_id": record_id,
            "department_id": dept_id,
            "resource_id": resource_id,
            "resource_name": dept_inv.get("resource_name"),
            "utilization_type": "TIME",
            "actual_usage_hours": actual_usage_hours,
            "available_operating_hours": available_operating_hours,
            "utilization_percentage": time_util_pct,
            "recorded_by": current_user["email"],
            "notes": notes,
            "timestamp": now
        }

    ins_res = db.utilization_records.insert_one(doc)
    doc["_id"] = str(ins_res.inserted_id)
    sync_db()
    log_audit("UTILIZATION_RECORDED", {"record_id": record_id, "type": utilization_type, "department_id": dept_id})

    return jsonify({"message": "Utilization recorded successfully", "record": doc}), 201

@utilization_bp.route("/department/<dept_id>", methods=["GET"])
@token_required
def get_department_utilization(dept_id):
    current_user = request.current_user
    if current_user["role"] in ["HOD", "Staff"] and current_user.get("department_id") != dept_id:
        return jsonify({"error": "Unauthorized"}), 403

    db = get_db()
    records = list(db.utilization_records.find({"department_id": dept_id}).sort("timestamp", -1))
    for r in records:
        r["_id"] = str(r.get("_id", r.get("id")))

    # Current snapshot
    inventory = list(db.department_inventory.find({"department_id": dept_id}))
    snapshot = []
    for inv in inventory:
        recv = inv.get("received_quantity", 0)
        active = inv.get("actively_used_quantity", 0)
        work = inv.get("working_quantity", 0)
        snapshot.append({
            "resource_id": inv.get("resource_id"),
            "resource_name": inv.get("resource_name"),
            "received_quantity": recv,
            "working_quantity": work,
            "actively_used_quantity": active,
            "unused_quantity": max(0, work - active),
            "damaged_quantity": inv.get("damaged_quantity", 0),
            "quantity_utilization_pct": round((active / recv * 100), 1) if recv > 0 else 0
        })

    return jsonify({
        "department_id": dept_id,
        "current_snapshot": snapshot,
        "history": records
    }), 200

@utilization_bp.route("/college-summary", methods=["GET"])
@token_required
@role_required("Admin")
def get_college_utilization_summary():
    """Aggregates utilization across all departments for Admin analytics"""
    db = get_db()
    departments = list(db.departments.find({}))
    all_inv = list(db.department_inventory.find({}))

    dept_summaries = []
    for d in departments:
        d_items = [i for i in all_inv if i.get("department_id") == d["dept_id"]]
        total_recv = sum(i.get("received_quantity", 0) for i in d_items)
        total_active = sum(i.get("actively_used_quantity", 0) for i in d_items)
        total_working = sum(i.get("working_quantity", 0) for i in d_items)
        total_damaged = sum(i.get("damaged_quantity", 0) for i in d_items)
        overall_util = round((total_active / total_recv * 100), 1) if total_recv > 0 else 0

        dept_summaries.append({
            "department_id": d["dept_id"],
            "department_name": d["name"],
            "student_strength": d.get("student_strength", 0),
            "total_allocated": total_recv,
            "total_working": total_working,
            "total_actively_used": total_active,
            "total_unused": max(0, total_working - total_active),
            "total_damaged": total_damaged,
            "overall_utilization_pct": overall_util
        })

    # Resource-wise utilization
    resources = list(db.resources.find({}))
    res_summaries = []
    for r in resources:
        r_items = [i for i in all_inv if i.get("resource_id") == r["resource_id"]]
        r_recv = sum(i.get("received_quantity", 0) for i in r_items)
        r_active = sum(i.get("actively_used_quantity", 0) for i in r_items)
        res_summaries.append({
            "resource_id": r["resource_id"],
            "resource_name": r["name"],
            "category": r.get("category"),
            "central_total": r.get("total_quantity", 0),
            "total_allocated": r_recv,
            "total_actively_used": r_active,
            "utilization_pct": round((r_active / r_recv * 100), 1) if r_recv > 0 else 0
        })

    return jsonify({
        "department_summaries": dept_summaries,
        "resource_summaries": res_summaries
    }), 200
