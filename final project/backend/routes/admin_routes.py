from flask import Blueprint, request, jsonify
from datetime import datetime, timezone
from bson import ObjectId
from db import get_db, sync_db
from auth import token_required, role_required, log_audit

admin_bp = Blueprint("admin", __name__)

def _clean_user_doc(u):
    u["_id"] = str(u.get("_id", u.get("id")))
    if "password_hash" in u:
        del u["password_hash"]
    return u

@admin_bp.route("/users/pending", methods=["GET"])
@token_required
@role_required("Admin")
def get_pending_users():
    """Returns all pending HOD and Staff registration requests for Admin approval"""
    db = get_db()
    pending = list(db.users.find({"account_status": "pending"}, {"password_hash": 0}).sort("created_at", -1))
    for u in pending:
        _clean_user_doc(u)
    return jsonify({"pending_users": pending, "users": pending, "count": len(pending)}), 200

@admin_bp.route("/users", methods=["GET"])
@token_required
@role_required("Admin")
def get_all_users():
    """Returns all users across roles and account statuses"""
    status_filter = request.args.get("status")
    role_filter = request.args.get("role")
    
    query = {}
    if status_filter:
        query["account_status"] = status_filter
    if role_filter:
        query["role"] = {"$regex": f"^{role_filter}$", "$options": "i"}

    db = get_db()
    users = list(db.users.find(query, {"password_hash": 0}).sort("created_at", -1))
    for u in users:
        _clean_user_doc(u)
    return jsonify({"users": users, "total": len(users)}), 200

@admin_bp.route("/users/<user_id>/approve", methods=["PUT"])
@token_required
@role_required("Admin")
def approve_user(user_id):
    """Admin approves a pending HOD or Staff registration"""
    db = get_db()
    
    # Can query by user_id or _id
    query = {"$or": [{"user_id": user_id}]}
    if ObjectId.is_valid(user_id):
        query["$or"].append({"_id": ObjectId(user_id)})

    user = db.users.find_one(query)
    if not user:
        return jsonify({"error": "User account not found"}), 404

    now = datetime.now(timezone.utc).isoformat()
    db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {
            "account_status": "approved",
            "approved_by": request.current_user["email"],
            "approved_at": now,
            "updated_at": now
        }}
    )

    # In-app notification to the approved user
    db.notifications.insert_one({
        "user_email": user["email"],
        "department_id": user.get("department_id"),
        "title": "Account Approved",
        "message": f"Congratulations {user.get('full_name', user.get('name'))}! Your {user.get('role')} registration has been approved. You may now sign in.",
        "type": "ACCOUNT_APPROVED",
        "is_read": False,
        "created_at": now
    })

    sync_db()
    log_audit("USER_APPROVED", {"approved_email": user["email"], "role": user.get("role"), "department_id": user.get("department_id")})

    return jsonify({
        "message": f"Account for {user.get('full_name', user.get('name'))} approved successfully",
        "user_id": user.get("user_id")
    }), 200

@admin_bp.route("/users/<user_id>/reject", methods=["PUT"])
@token_required
@role_required("Admin")
def reject_user(user_id):
    """Admin rejects a registration application with a mandatory reason"""
    data = request.get_json() or {}
    reason = data.get("reason", "").strip() or "Registration did not meet institutional verification requirements."

    db = get_db()
    query = {"$or": [{"user_id": user_id}]}
    if ObjectId.is_valid(user_id):
        query["$or"].append({"_id": ObjectId(user_id)})

    user = db.users.find_one(query)
    if not user:
        return jsonify({"error": "User account not found"}), 404

    now = datetime.now(timezone.utc).isoformat()
    db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {
            "account_status": "rejected",
            "rejection_reason": reason,
            "rejected_by": request.current_user["email"],
            "rejected_at": now,
            "updated_at": now
        }}
    )

    db.notifications.insert_one({
        "user_email": user["email"],
        "department_id": user.get("department_id"),
        "title": "Registration Status Update",
        "message": f"Your registration request was rejected. Reason: {reason}",
        "type": "ACCOUNT_REJECTED",
        "is_read": False,
        "created_at": now
    })

    sync_db()
    log_audit("USER_REJECTED", {"rejected_email": user["email"], "reason": reason})

    return jsonify({"message": f"Account application rejected: {reason}"}), 200

@admin_bp.route("/users/<user_id>/suspend", methods=["PUT"])
@token_required
@role_required("Admin")
def suspend_user(user_id):
    """Admin suspends an active account"""
    db = get_db()
    query = {"$or": [{"user_id": user_id}]}
    if ObjectId.is_valid(user_id):
        query["$or"].append({"_id": ObjectId(user_id)})

    user = db.users.find_one(query)
    if not user:
        return jsonify({"error": "User account not found"}), 404

    if user.get("email") == request.current_user["email"]:
        return jsonify({"error": "You cannot suspend your own Administrator account"}), 400

    now = datetime.now(timezone.utc).isoformat()
    db.users.update_one(
        {"_id": user["_id"]},
        {"$set": {
            "account_status": "suspended",
            "suspended_by": request.current_user["email"],
            "suspended_at": now,
            "updated_at": now
        }}
    )

    sync_db()
    log_audit("USER_SUSPENDED", {"suspended_email": user["email"]})
    return jsonify({"message": f"User account {user.get('email')} suspended."}), 200
