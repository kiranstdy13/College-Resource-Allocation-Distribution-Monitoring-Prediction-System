from flask import Blueprint, request, jsonify
from db import get_db
from auth import token_required, role_required

staff_bp = Blueprint("staff", __name__)

@staff_bp.route("/profile", methods=["GET"])
@token_required
@role_required("Staff")
def get_staff_profile():
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

@staff_bp.route("/dashboard", methods=["GET"])
@token_required
@role_required("Staff")
def get_staff_dashboard():
    current_user = request.current_user
    dept_id = current_user.get("department_id")
    if not dept_id:
        return jsonify({"error": "No department assigned to this Staff account"}), 400

    db = get_db()
    dept = db.departments.find_one({"dept_id": dept_id})
    inventory = list(db.department_inventory.find({"department_id": dept_id}))
    assets = list(db.resource_assets.find({"current_department": dept_id}))
    tickets = list(db.maintenance_requests.find({"department_id": dept_id}).sort("created_at", -1))
    recent_usage = list(db.utilization_records.find({"department_id": dept_id}).sort("timestamp", -1).limit(5))

    for i in inventory:
        i["_id"] = str(i.get("_id"))
    for a in assets:
        a["_id"] = str(a.get("_id"))
    for t in tickets:
        t["_id"] = str(t.get("_id"))
    for u in recent_usage:
        u["_id"] = str(u.get("_id"))

    total_working = sum(i.get("working_quantity", 0) for i in inventory)
    total_active = sum(i.get("actively_used_quantity", 0) for i in inventory)
    total_damaged = sum(i.get("damaged_quantity", 0) for i in inventory)

    return jsonify({
        "department": {
            "dept_id": dept_id,
            "name": dept.get("name") if dept else dept_id,
        },
        "stats": {
            "working_resources": total_working,
            "actively_used": total_active,
            "damaged_resources": total_damaged,
            "assigned_assets_count": len(assets),
            "open_tickets_count": len([t for t in tickets if t.get("status") in ["Reported", "Under Maintenance"]])
        },
        "inventory": inventory,
        "assigned_assets": assets[:10],
        "recent_tickets": tickets[:5],
        "recent_usage": recent_usage
    }), 200
