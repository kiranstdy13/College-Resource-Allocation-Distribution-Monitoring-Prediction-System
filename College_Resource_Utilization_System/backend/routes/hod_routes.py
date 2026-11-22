from flask import Blueprint, request, jsonify
from db import get_db
from auth import token_required, role_required

hod_bp = Blueprint("hod", __name__)

@hod_bp.route("/profile", methods=["GET"])
@token_required
@role_required("HOD")
def get_hod_profile():
    current_user = request.current_user
    db = get_db()
    user = db.users.find_one({"email": current_user["email"]}, {"password_hash": 0})
    if not user:
        return jsonify({"error": "Profile not found"}), 404
    user["_id"] = str(user.get("_id"))
    
    dept = None
    if user.get("department_id"):
        dept = db.departments.find_one({"dept_id": user["department_id"]})
        if dept:
            dept["_id"] = str(dept.get("_id"))

    return jsonify({"profile": user, "department": dept}), 200

@hod_bp.route("/dashboard", methods=["GET"])
@token_required
@role_required("HOD")
def get_hod_dashboard():
    current_user = request.current_user
    dept_id = current_user.get("department_id")
    if not dept_id:
        return jsonify({"error": "No department assigned to this HOD account"}), 400

    db = get_db()
    dept = db.departments.find_one({"dept_id": dept_id})
    inventory = list(db.department_inventory.find({"department_id": dept_id}))
    requests = list(db.resource_requests.find({"department_id": dept_id}).sort("created_at", -1))
    
    for i in inventory:
        i["_id"] = str(i.get("_id"))
    for r in requests:
        r["_id"] = str(r.get("_id"))

    total_recv = sum(i.get("received_quantity", 0) for i in inventory)
    total_working = sum(i.get("working_quantity", 0) for i in inventory)
    total_damaged = sum(i.get("damaged_quantity", 0) for i in inventory)
    total_active = sum(i.get("actively_used_quantity", 0) for i in inventory)

    pending_reqs = [r for r in requests if r.get("status") in ["Submitted", "Under Review"]]
    approved_reqs = [r for r in requests if r.get("status") in ["Approved", "Partially Approved", "Allocated"]]

    return jsonify({
        "department": {
            "dept_id": dept_id,
            "name": dept.get("name") if dept else dept_id,
            "student_strength": dept.get("student_strength", 0) if dept else 0,
            "staff_count": dept.get("staff_count", 0) if dept else 0,
        },
        "stats": {
            "total_resources_received": total_recv,
            "working_resources": total_working,
            "damaged_resources": total_damaged,
            "actively_used": total_active,
            "pending_requests_count": len(pending_reqs),
            "approved_requests_count": len(approved_reqs),
            "quantity_utilization_pct": round((total_active / total_recv * 100), 1) if total_recv > 0 else 0
        },
        "inventory": inventory,
        "recent_requests": requests[:6]
    }), 200
