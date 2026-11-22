from flask import Blueprint, request, jsonify
from datetime import datetime, timezone
from db import get_db, sync_db
from auth import token_required, role_required, log_audit

inventory_bp = Blueprint("inventory", __name__)

@inventory_bp.route("/department/<dept_id>", methods=["GET"])
@token_required
def get_department_inventory(dept_id):
    current_user = request.current_user
    # HOD/Staff can only access their own department
    if current_user["role"] in ["HOD", "Staff"] and current_user.get("department_id") != dept_id:
        return jsonify({"error": "Unauthorized access to another department's inventory"}), 403

    db = get_db()
    items = list(db.department_inventory.find({"department_id": dept_id}))
    for item in items:
        item["_id"] = str(item.get("_id", item.get("id")))
        # Unused quantity is working - actively used
        working = item.get("working_quantity", 0)
        actively_used = item.get("actively_used_quantity", 0)
        item["unused_quantity"] = max(0, working - actively_used)
        
        # Quantity utilization calculation
        received = item.get("received_quantity", 0)
        item["quantity_utilization_pct"] = round((actively_used / received * 100), 1) if received > 0 else 0

    return jsonify({"department_id": dept_id, "inventory": items}), 200

@inventory_bp.route("/department/<dept_id>/assets", methods=["GET"])
@token_required
def get_department_assets(dept_id):
    current_user = request.current_user
    if current_user["role"] in ["HOD", "Staff"] and current_user.get("department_id") != dept_id:
        return jsonify({"error": "Unauthorized access"}), 403

    db = get_db()
    assets = list(db.resource_assets.find({"current_department": dept_id}))
    for a in assets:
        a["_id"] = str(a.get("_id", a.get("id")))
    return jsonify({"assets": assets}), 200

@inventory_bp.route("/all-departments", methods=["GET"])
@token_required
@role_required("Admin")
def get_all_departments_inventory():
    """Admin summary of inventory across all departments"""
    db = get_db()
    items = list(db.department_inventory.find({}))
    for item in items:
        item["_id"] = str(item.get("_id", item.get("id")))
        working = item.get("working_quantity", 0)
        actively_used = item.get("actively_used_quantity", 0)
        item["unused_quantity"] = max(0, working - actively_used)
        received = item.get("received_quantity", 0)
        item["quantity_utilization_pct"] = round((actively_used / received * 100), 1) if received > 0 else 0

    return jsonify({"inventory": items}), 200
