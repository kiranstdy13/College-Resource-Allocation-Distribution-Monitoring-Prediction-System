from flask import Blueprint, request, jsonify
from datetime import datetime, timezone
from db import get_db, sync_db
from auth import token_required, role_required, log_audit

dept_bp = Blueprint("departments", __name__)

@dept_bp.route("", methods=["GET"])
@token_required
def get_departments():
    db = get_db()
    departments = list(db.departments.find({}))
    for d in departments:
        d["_id"] = str(d.get("_id", d.get("id")))
        # Compute real-time allocated resources count for each department
        allocated_items = list(db.department_inventory.find({"department_id": d["dept_id"]}))
        total_working = sum(item.get("working_quantity", 0) for item in allocated_items)
        total_damaged = sum(item.get("damaged_quantity", 0) for item in allocated_items)
        total_allocated = sum(item.get("received_quantity", 0) for item in allocated_items)
        total_actively_used = sum(item.get("actively_used_quantity", 0) for item in allocated_items)
        
        d["inventory_summary"] = {
            "total_allocated": total_allocated,
            "total_working": total_working,
            "total_damaged": total_damaged,
            "total_actively_used": total_actively_used,
            "items_count": len(allocated_items)
        }
    return jsonify({"departments": departments}), 200

@dept_bp.route("/<dept_id>", methods=["GET"])
@token_required
def get_department_detail(dept_id):
    current_user = request.current_user
    # HOD or Staff can only view their own department detail unless Admin
    if current_user["role"] in ["HOD", "Staff"] and current_user.get("department_id") != dept_id:
        return jsonify({"error": "Unauthorized access to another department's data"}), 403

    db = get_db()
    dept = db.departments.find_one({"dept_id": dept_id})
    if not dept:
        return jsonify({"error": "Department not found"}), 404

    dept["_id"] = str(dept.get("_id", dept.get("id")))

    # Inventory breakdown
    inventory = list(db.department_inventory.find({"department_id": dept_id}))
    for item in inventory:
        item["_id"] = str(item.get("_id", item.get("id")))
    dept["inventory"] = inventory

    return jsonify({"department": dept}), 200

@dept_bp.route("", methods=["POST"])
@token_required
@role_required("Admin")
def create_department():
    data = request.get_json() or {}
    dept_id = data.get("dept_id", "").strip().upper()
    name = data.get("name", "").strip()
    student_strength = int(data.get("student_strength", 0))
    staff_count = int(data.get("staff_count", 0))
    hod_name = data.get("hod_name", "").strip()
    hod_email = data.get("hod_email", "").strip().lower()

    if not dept_id or not name:
        return jsonify({"error": "Department ID and Name are required"}), 400

    db = get_db()
    if db.departments.find_one({"dept_id": dept_id}):
        return jsonify({"error": f"Department {dept_id} already exists"}), 409

    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "dept_id": dept_id,
        "name": name,
        "student_strength": student_strength,
        "staff_count": staff_count,
        "hod_name": hod_name,
        "hod_email": hod_email,
        "description": data.get("description", ""),
        "created_at": now,
        "updated_at": now
    }
    result = db.departments.insert_one(doc)
    sync_db()

    log_audit("DEPARTMENT_CREATED", {"dept_id": dept_id, "name": name})

    return jsonify({"message": "Department created", "id": str(result.inserted_id), "department": doc}), 201

@dept_bp.route("/<dept_id>", methods=["PUT"])
@token_required
@role_required("Admin")
def update_department(dept_id):
    data = request.get_json() or {}
    db = get_db()
    dept = db.departments.find_one({"dept_id": dept_id})
    if not dept:
        return jsonify({"error": "Department not found"}), 404

    update_fields = {}
    if "name" in data:
        update_fields["name"] = data["name"].strip()
    if "student_strength" in data:
        update_fields["student_strength"] = int(data["student_strength"])
    if "staff_count" in data:
        update_fields["staff_count"] = int(data["staff_count"])
    if "hod_name" in data:
        update_fields["hod_name"] = data["hod_name"].strip()
    if "hod_email" in data:
        update_fields["hod_email"] = data["hod_email"].strip().lower()
    if "description" in data:
        update_fields["description"] = data["description"].strip()

    update_fields["updated_at"] = datetime.now(timezone.utc).isoformat()

    db.departments.update_one({"dept_id": dept_id}, {"$set": update_fields})
    sync_db()

    log_audit("DEPARTMENT_UPDATED", {"dept_id": dept_id, "updated_fields": list(update_fields.keys())})

    return jsonify({"message": f"Department {dept_id} updated successfully"}), 200
