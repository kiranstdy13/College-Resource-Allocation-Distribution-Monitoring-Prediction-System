from flask import Blueprint, request, jsonify
from datetime import datetime, timezone
from db import get_db, sync_db
from auth import token_required

notification_bp = Blueprint("notifications", __name__)

@notification_bp.route("", methods=["GET"])
@token_required
def get_notifications():
    current_user = request.current_user
    db = get_db()
    
    # Notifications for this user or their department, or Admin
    if current_user["role"] == "Admin":
        query = {"$or": [{"user_email": current_user["email"]}, {"user_email": "admin@college.edu"}]}
    else:
        query = {"$or": [{"user_email": current_user["email"]}, {"department_id": current_user.get("department_id")}]}

    notifs = list(db.notifications.find(query).sort("created_at", -1).limit(50))
    unread_count = 0
    for n in notifs:
        n["_id"] = str(n.get("_id", n.get("id")))
        if not n.get("is_read", False):
            unread_count += 1

    return jsonify({"notifications": notifs, "unread_count": unread_count}), 200

@notification_bp.route("/mark-all-read", methods=["PUT"])
@token_required
def mark_all_read():
    current_user = request.current_user
    db = get_db()
    
    if current_user["role"] == "Admin":
        query = {"$or": [{"user_email": current_user["email"]}, {"user_email": "admin@college.edu"}]}
    else:
        query = {"$or": [{"user_email": current_user["email"]}, {"department_id": current_user.get("department_id")}]}

    db.notifications.update_many(query, {"$set": {"is_read": True}})
    sync_db()
    return jsonify({"message": "Notifications marked as read"}), 200
