import jwt
from functools import wraps
from datetime import datetime, timedelta, timezone
from flask import request, jsonify
from werkzeug.security import generate_password_hash, check_password_hash
from config import Config
from db import get_db, sync_db

def hash_password(password: str) -> str:
    return generate_password_hash(password)

def verify_password(password: str, hashed: str) -> bool:
    return check_password_hash(hashed, password)

def generate_token(user: dict) -> str:
    role = user.get("role", "staff").capitalize()
    payload = {
        "user_id": str(user.get("user_id") or user.get("_id", user.get("id"))),
        "email": user["email"],
        "name": user.get("full_name") or user.get("name", ""),
        "full_name": user.get("full_name") or user.get("name", ""),
        "role": role,
        "department_id": user.get("department_id"),
        "account_status": user.get("account_status", "approved"),
        "exp": datetime.now(timezone.utc) + timedelta(hours=Config.JWT_EXPIRATION_HOURS)
    }
    return jwt.encode(payload, Config.SECRET_KEY, algorithm="HS256")

def decode_token(token: str):
    try:
        return jwt.decode(token, Config.SECRET_KEY, algorithms=["HS256"])
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None

def token_required(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        auth_header = request.headers.get("Authorization")
        if not auth_header or not auth_header.startswith("Bearer "):
            return jsonify({"error": "Authorization token missing or invalid"}), 401
        
        token = auth_header.split(" ")[1]
        decoded = decode_token(token)
        if not decoded:
            return jsonify({"error": "Token is expired or invalid"}), 401
        
        db = get_db()
        user = db.users.find_one({"email": decoded["email"]})
        if not user:
            return jsonify({"error": "User no longer exists"}), 401

        status = user.get("account_status", "approved").lower()
        if status != "approved":
            return jsonify({"error": f"Account is {status}. Access restricted until approved by Admin."}), 403

        normalized_role = user.get("role", "staff")
        if normalized_role.lower() == "admin":
            normalized_role = "Admin"
        elif normalized_role.lower() == "hod":
            normalized_role = "HOD"
        elif normalized_role.lower() == "staff":
            normalized_role = "Staff"

        request.current_user = {
            "id": str(user.get("_id")),
            "user_id": user.get("user_id", str(user.get("_id"))),
            "email": user["email"],
            "name": user.get("full_name") or user.get("name", ""),
            "full_name": user.get("full_name") or user.get("name", ""),
            "role": normalized_role,
            "department_id": user.get("department_id"),
            "employee_id": user.get("employee_id"),
            "account_status": status
        }
        return f(*args, **kwargs)
    return decorated

def role_required(*allowed_roles):
    def decorator(f):
        @wraps(f)
        def decorated(*args, **kwargs):
            current_user = getattr(request, "current_user", None)
            if not current_user:
                return jsonify({"error": "Authentication required"}), 401
            
            allowed_normalized = [r.lower() for r in allowed_roles]
            user_role = current_user["role"].lower()
            if user_role not in allowed_normalized:
                return jsonify({"error": f"Access denied. Requires one of roles: {', '.join(allowed_roles)}"}), 403
            return f(*args, **kwargs)
        return decorated
    return decorator

def log_audit(action: str, details: dict, user_email: str = None, role: str = None, department_id: str = None):
    try:
        db = get_db()
        curr_user = getattr(request, "current_user", {}) if hasattr(request, "current_user") else {}
        doc = {
            "action": action,
            "details": details,
            "user_email": user_email or curr_user.get("email", "system"),
            "role": role or curr_user.get("role", "system"),
            "department_id": department_id or curr_user.get("department_id"),
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "ip_address": request.remote_addr if request else "local"
        }
        db.audit_logs.insert_one(doc)
        sync_db()
    except Exception as e:
        print(f"[Audit] Failed to log audit event: {e}")
