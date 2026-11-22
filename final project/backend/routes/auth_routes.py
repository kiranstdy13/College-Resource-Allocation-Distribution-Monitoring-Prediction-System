from flask import Blueprint, request, jsonify
from datetime import datetime, timezone
import uuid
from db import get_db, sync_db
from config import Config
from auth import hash_password, verify_password, generate_token, token_required, role_required, decode_token, log_audit
from utils.validators import validate_email, validate_mobile, validate_password_strength

auth_bp = Blueprint("auth", __name__)

def _format_user_response(user, db):
    dept_info = None
    if user.get("department_id"):
        dept = db.departments.find_one({"dept_id": user["department_id"]})
        if dept:
            dept_info = {
                "dept_id": dept["dept_id"],
                "name": dept["name"],
                "student_strength": dept.get("student_strength", 0),
                "staff_count": dept.get("staff_count", 0)
            }

    normalized_role = user.get("role", "Staff")
    if normalized_role.lower() == "admin":
        normalized_role = "Admin"
    elif normalized_role.lower() == "hod":
        normalized_role = "HOD"
    elif normalized_role.lower() == "staff":
        normalized_role = "Staff"

    return {
        "id": str(user.get("_id", user.get("id"))),
        "user_id": user.get("user_id", str(user.get("_id"))),
        "name": user.get("full_name") or user.get("name", ""),
        "full_name": user.get("full_name") or user.get("name", ""),
        "email": user["email"],
        "mobile": user.get("mobile", ""),
        "role": normalized_role,
        "department_id": user.get("department_id"),
        "employee_id": user.get("employee_id"),
        "admin_id": user.get("admin_id"),
        "hod_id": user.get("hod_id"),
        "staff_id": user.get("staff_id"),
        "college_name": user.get("college_name"),
        "designation": user.get("designation"),
        "account_status": user.get("account_status", "approved"),
        "department": dept_info
    }

# -------------------------------------------------------------
# 1. ADMIN REGISTRATION
# -------------------------------------------------------------
@auth_bp.route("/admin/register", methods=["POST"])
def register_admin():
    data = request.get_json() or {}
    full_name = data.get("full_name", "").strip()
    admin_id = data.get("admin_id", "").strip().upper()
    college_name = data.get("college_name", "").strip()
    email = data.get("email", "").strip().lower()
    mobile = data.get("mobile", "").strip()
    password = data.get("password", "")
    confirm_password = data.get("confirm_password", "")
    authorization_code = (data.get("authorization_code") or data.get("admin_setup_secret") or data.get("authKey") or "").strip()

    if not all([full_name, admin_id, college_name, email, mobile, password]):
        return jsonify({"error": "All required fields must be completed"}), 400

    if password != confirm_password:
        return jsonify({"error": "Password and Confirm Password do not match"}), 400

    if not validate_email(email):
        return jsonify({"error": "Invalid email address format"}), 400

    if not validate_mobile(mobile):
        return jsonify({"error": "Invalid mobile number. Please enter a valid 10-digit number"}), 400

    is_valid_pwd, pwd_err = validate_password_strength(password)
    if not is_valid_pwd:
        return jsonify({"error": pwd_err}), 400

    db = get_db()
    existing_admin_count = db.users.count_documents({"role": {"$in": ["Admin", "admin"]}})

    # Security requirement: Public users cannot create Admin accounts freely.
    # Requires authorization_code matching Config.ADMIN_SETUP_SECRET OR valid Admin bearer token
    auth_header = request.headers.get("Authorization")
    is_authenticated_admin = False
    if auth_header and auth_header.startswith("Bearer "):
        decoded = decode_token(auth_header.split(" ")[1])
        if decoded and decoded.get("role", "").lower() == "admin":
            is_authenticated_admin = True

    if existing_admin_count > 0 and not is_authenticated_admin:
        if authorization_code != Config.ADMIN_SETUP_SECRET:
            return jsonify({
                "error": "Admin account creation is restricted. A valid Admin Authorization Code or an authorized Administrator session is required."
            }), 403

    # Check duplicates
    if db.users.find_one({"email": email}):
        return jsonify({"error": f"An account with email '{email}' already exists"}), 409

    if db.users.find_one({"admin_id": admin_id}):
        return jsonify({"error": f"Admin ID '{admin_id}' is already registered"}), 409

    now = datetime.now(timezone.utc).isoformat()
    new_user = {
        "user_id": f"ADM-{uuid.uuid4().hex[:6].upper()}",
        "full_name": full_name,
        "name": full_name,
        "admin_id": admin_id,
        "college_name": college_name,
        "email": email,
        "mobile": mobile,
        "role": "Admin",
        "department_id": None,
        "password_hash": hash_password(password),
        "account_status": "approved",
        "is_active": True,
        "created_at": now,
        "updated_at": now
    }
    res = db.users.insert_one(new_user)
    new_user["_id"] = str(res.inserted_id)
    sync_db()

    log_audit("ADMIN_REGISTERED", {"email": email, "admin_id": admin_id}, user_email=email, role="Admin")

    token = generate_token(new_user)
    return jsonify({
        "message": "Admin account registered successfully",
        "token": token,
        "user": _format_user_response(new_user, db)
    }), 201

# -------------------------------------------------------------
# 2. HOD REGISTRATION (Creates Pending Account)
# -------------------------------------------------------------
@auth_bp.route("/hod/register", methods=["POST"])
def register_hod():
    data = request.get_json() or {}
    full_name = data.get("full_name", "").strip()
    hod_id = data.get("hod_id", "").strip().upper()
    email = data.get("email", "").strip().lower()
    mobile = data.get("mobile", "").strip()
    department_id = data.get("department_id", "").strip().upper()
    employee_id = data.get("employee_id", "").strip().upper()
    password = data.get("password", "")
    confirm_password = data.get("confirm_password", "")

    if not all([full_name, hod_id, email, mobile, department_id, employee_id, password]):
        return jsonify({"error": "All fields are required for HOD registration"}), 400

    if password != confirm_password:
        return jsonify({"error": "Password and Confirm Password do not match"}), 400

    if not validate_email(email):
        return jsonify({"error": "Invalid official email address format"}), 400

    if not validate_mobile(mobile):
        return jsonify({"error": "Invalid mobile number. Please enter a valid 10-digit number"}), 400

    is_valid_pwd, pwd_err = validate_password_strength(password)
    if not is_valid_pwd:
        return jsonify({"error": pwd_err}), 400

    if department_id not in ["MCA", "MBA", "MTECH", "MTech"]:
        return jsonify({"error": "Department must be one of: MCA, MBA, MTech"}), 400
    if department_id == "MTECH":
        department_id = "MTech"

    db = get_db()

    # Prevent duplicate HOD ID, Employee ID, Email
    if db.users.find_one({"email": email}):
        return jsonify({"error": f"An account with email '{email}' already exists"}), 409
    if db.users.find_one({"hod_id": hod_id}):
        return jsonify({"error": f"HOD ID '{hod_id}' is already registered"}), 409
    if db.users.find_one({"employee_id": employee_id}):
        return jsonify({"error": f"Employee ID '{employee_id}' is already registered"}), 409

    # Check whether the department already has an assigned active HOD
    existing_hod = db.users.find_one({
        "role": {"$in": ["HOD", "hod"]},
        "department_id": department_id,
        "account_status": "approved"
    })
    if existing_hod:
        return jsonify({
            "error": f"Department {department_id} already has an active HOD ({existing_hod.get('full_name', existing_hod.get('name'))}). Only one active HOD is permitted per department."
        }), 409

    now = datetime.now(timezone.utc).isoformat()
    new_user = {
        "user_id": f"HOD-{uuid.uuid4().hex[:6].upper()}",
        "full_name": full_name,
        "name": full_name,
        "hod_id": hod_id,
        "employee_id": employee_id,
        "email": email,
        "mobile": mobile,
        "department_id": department_id,
        "role": "HOD",
        "password_hash": hash_password(password),
        "account_status": "pending",  # Pending Admin approval
        "is_active": True,
        "created_at": now,
        "updated_at": now
    }
    res = db.users.insert_one(new_user)
    new_user["_id"] = str(res.inserted_id)

    # Notify Admin about pending HOD registration
    db.notifications.insert_one({
        "user_email": "admin@college.edu",
        "department_id": department_id,
        "title": f"New HOD Registration Request: {department_id}",
        "message": f"{full_name} ({hod_id}, Emp: {employee_id}) registered as HOD for {department_id}. Awaiting Admin approval.",
        "type": "USER_REGISTRATION",
        "is_read": False,
        "created_at": now
    })

    sync_db()
    log_audit("HOD_REGISTRATION_SUBMITTED", {"email": email, "department_id": department_id, "hod_id": hod_id}, user_email=email, role="HOD", department_id=department_id)

    return jsonify({
        "message": "Registration submitted successfully. Your HOD account is pending Admin approval.",
        "account_status": "pending",
        "user_id": new_user["user_id"]
    }), 201

# -------------------------------------------------------------
# 3. STAFF REGISTRATION (Creates Pending Account)
# -------------------------------------------------------------
@auth_bp.route("/staff/register", methods=["POST"])
def register_staff():
    data = request.get_json() or {}
    full_name = data.get("full_name", "").strip()
    staff_id = data.get("staff_id", "").strip().upper()
    employee_id = data.get("employee_id", "").strip().upper()
    email = data.get("email", "").strip().lower()
    mobile = data.get("mobile", "").strip()
    department_id = data.get("department_id", "").strip().upper()
    designation = data.get("designation", "").strip()
    password = data.get("password", "")
    confirm_password = data.get("confirm_password", "")

    if not all([full_name, staff_id, employee_id, email, mobile, department_id, designation, password]):
        return jsonify({"error": "All fields are required for Staff registration"}), 400

    if password != confirm_password:
        return jsonify({"error": "Password and Confirm Password do not match"}), 400

    if not validate_email(email):
        return jsonify({"error": "Invalid official email address format"}), 400

    if not validate_mobile(mobile):
        return jsonify({"error": "Invalid mobile number. Please enter a valid 10-digit number"}), 400

    is_valid_pwd, pwd_err = validate_password_strength(password)
    if not is_valid_pwd:
        return jsonify({"error": pwd_err}), 400

    if department_id not in ["MCA", "MBA", "MTECH", "MTech"]:
        return jsonify({"error": "Department must be one of: MCA, MBA, MTech"}), 400
    if department_id == "MTECH":
        department_id = "MTech"

    db = get_db()
    if db.users.find_one({"email": email}):
        return jsonify({"error": f"An account with email '{email}' already exists"}), 409
    if db.users.find_one({"staff_id": staff_id}):
        return jsonify({"error": f"Staff ID '{staff_id}' is already registered"}), 409
    if db.users.find_one({"employee_id": employee_id}):
        return jsonify({"error": f"Employee ID '{employee_id}' is already registered"}), 409

    now = datetime.now(timezone.utc).isoformat()
    new_user = {
        "user_id": f"STF-{uuid.uuid4().hex[:6].upper()}",
        "full_name": full_name,
        "name": full_name,
        "staff_id": staff_id,
        "employee_id": employee_id,
        "email": email,
        "mobile": mobile,
        "department_id": department_id,
        "designation": designation,
        "role": "Staff",
        "password_hash": hash_password(password),
        "account_status": "pending",  # Pending Admin or HOD approval
        "is_active": True,
        "created_at": now,
        "updated_at": now
    }
    res = db.users.insert_one(new_user)
    new_user["_id"] = str(res.inserted_id)

    # Notify Admin & HOD
    db.notifications.insert_one({
        "user_email": "admin@college.edu",
        "department_id": department_id,
        "title": f"New Staff Registration: {department_id}",
        "message": f"{full_name} ({designation}, Emp: {employee_id}) registered as Staff for {department_id}. Awaiting approval.",
        "type": "USER_REGISTRATION",
        "is_read": False,
        "created_at": now
    })

    sync_db()
    log_audit("STAFF_REGISTRATION_SUBMITTED", {"email": email, "department_id": department_id, "staff_id": staff_id}, user_email=email, role="Staff", department_id=department_id)

    return jsonify({
        "message": "Staff registration submitted successfully. Your account is pending administrative approval.",
        "account_status": "pending",
        "user_id": new_user["user_id"]
    }), 201

# -------------------------------------------------------------
# 4. ADMIN LOGIN
# -------------------------------------------------------------
@auth_bp.route("/admin/login", methods=["POST"])
def admin_login():
    data = request.get_json() or {}
    identifier = (data.get("identifier") or data.get("email") or data.get("admin_id") or "").strip()
    password = data.get("password", "")

    if not identifier or not password:
        return jsonify({"error": "Admin ID or Email and password are required"}), 400

    db = get_db()
    id_lower = identifier.lower()
    id_upper = identifier.upper()

    user = db.users.find_one({
        "$or": [
            {"email": id_lower},
            {"admin_id": id_upper},
            {"user_id": id_upper}
        ]
    })

    if not user or not verify_password(password, user.get("password_hash", "")):
        return jsonify({"error": "Invalid Admin credentials"}), 401

    if user.get("role", "").lower() != "admin":
        return jsonify({"error": "Access restricted. This login portal is for Administrator accounts only."}), 403

    status = user.get("account_status", "approved").lower()
    if status == "pending":
        return jsonify({"error": "Your Admin account is currently pending activation."}), 403
    elif status == "rejected":
        return jsonify({"error": f"Your account request was rejected: {user.get('rejection_reason', 'Not approved')}"}), 403
    elif status == "suspended":
        return jsonify({"error": "This Administrator account has been suspended."}), 403

    token = generate_token(user)
    log_audit("ADMIN_LOGIN", {"identifier": identifier}, user_email=user["email"], role="Admin")

    return jsonify({
        "message": "Admin login successful",
        "token": token,
        "user": _format_user_response(user, db)
    }), 200

# -------------------------------------------------------------
# 5. HOD LOGIN
# -------------------------------------------------------------
@auth_bp.route("/hod/login", methods=["POST"])
def hod_login():
    data = request.get_json() or {}
    identifier = (data.get("identifier") or data.get("email") or data.get("hod_id") or data.get("employee_id") or "").strip()
    password = data.get("password", "")

    if not identifier or not password:
        return jsonify({"error": "HOD ID, Employee ID or Email and password are required"}), 400

    db = get_db()
    id_lower = identifier.lower()
    id_upper = identifier.upper()

    user = db.users.find_one({
        "$or": [
            {"email": id_lower},
            {"hod_id": id_upper},
            {"employee_id": id_upper},
            {"user_id": id_upper}
        ]
    })

    if not user or not verify_password(password, user.get("password_hash", "")):
        return jsonify({"error": "Invalid HOD credentials"}), 401

    if user.get("role", "").lower() != "hod":
        return jsonify({"error": "Access restricted. This login portal is for Head of Department accounts only."}), 403

    status = user.get("account_status", "approved").lower()
    if status == "pending":
        return jsonify({
            "error": "Your HOD registration is pending Admin approval. You will receive access once approved by Central Administration."
        }), 403
    elif status == "rejected":
        return jsonify({
            "error": f"Your HOD registration was rejected: {user.get('rejection_reason', 'Department position already filled or invalid credentials')}"
        }), 403
    elif status == "suspended":
        return jsonify({"error": "Your HOD account has been suspended by the administrator."}), 403

    token = generate_token(user)
    log_audit("HOD_LOGIN", {"identifier": identifier, "department": user.get("department_id")}, user_email=user["email"], role="HOD", department_id=user.get("department_id"))

    return jsonify({
        "message": "HOD login successful",
        "token": token,
        "user": _format_user_response(user, db)
    }), 200

# -------------------------------------------------------------
# 6. STAFF LOGIN
# -------------------------------------------------------------
@auth_bp.route("/staff/login", methods=["POST"])
def staff_login():
    data = request.get_json() or {}
    identifier = (data.get("identifier") or data.get("email") or data.get("staff_id") or data.get("employee_id") or "").strip()
    password = data.get("password", "")

    if not identifier or not password:
        return jsonify({"error": "Staff ID, Employee ID or Email and password are required"}), 400

    db = get_db()
    id_lower = identifier.lower()
    id_upper = identifier.upper()

    user = db.users.find_one({
        "$or": [
            {"email": id_lower},
            {"staff_id": id_upper},
            {"employee_id": id_upper},
            {"user_id": id_upper}
        ]
    })

    if not user or not verify_password(password, user.get("password_hash", "")):
        return jsonify({"error": "Invalid Staff credentials"}), 401

    if user.get("role", "").lower() != "staff":
        return jsonify({"error": "Access restricted. This login portal is for Staff accounts only."}), 403

    status = user.get("account_status", "approved").lower()
    if status == "pending":
        return jsonify({
            "error": "Your Staff registration is pending administrative approval."
        }), 403
    elif status == "rejected":
        return jsonify({
            "error": f"Your Staff registration was rejected: {user.get('rejection_reason', 'Not approved')}"
        }), 403
    elif status == "suspended":
        return jsonify({"error": "Your Staff account has been suspended by the administrator."}), 403

    token = generate_token(user)
    log_audit("STAFF_LOGIN", {"identifier": identifier, "department": user.get("department_id")}, user_email=user["email"], role="Staff", department_id=user.get("department_id"))

    return jsonify({
        "message": "Staff login successful",
        "token": token,
        "user": _format_user_response(user, db)
    }), 200

# -------------------------------------------------------------
# 7. UNIFIED LOGIN FALLBACK (Backwards-compatibility)
# -------------------------------------------------------------
@auth_bp.route("/login", methods=["POST"])
def login_fallback():
    data = request.get_json() or {}
    identifier = (data.get("identifier") or data.get("email") or "").strip()
    password = data.get("password", "")

    if not identifier or not password:
        return jsonify({"error": "Identifier and password are required"}), 400

    db = get_db()
    id_lower = identifier.lower()
    id_upper = identifier.upper()

    user = db.users.find_one({
        "$or": [
            {"email": id_lower},
            {"admin_id": id_upper},
            {"hod_id": id_upper},
            {"staff_id": id_upper},
            {"employee_id": id_upper},
            {"user_id": id_upper}
        ]
    })

    if not user or not verify_password(password, user.get("password_hash", "")):
        return jsonify({"error": "Invalid email or password"}), 401

    status = user.get("account_status", "approved").lower()
    if status == "pending":
        return jsonify({"error": "Account is pending administrative approval."}), 403
    elif status != "approved":
        return jsonify({"error": f"Account status: {status}."}), 403

    token = generate_token(user)
    return jsonify({
        "message": "Login successful",
        "token": token,
        "user": _format_user_response(user, db)
    }), 200

# -------------------------------------------------------------
# 8. CURRENT USER PROFILE
# -------------------------------------------------------------
@auth_bp.route("/me", methods=["GET"])
@token_required
def get_current_user():
    db = get_db()
    user = db.users.find_one({"email": request.current_user["email"]})
    if not user:
        return jsonify({"error": "User not found"}), 404
    return jsonify({"user": _format_user_response(user, db)}), 200

# -------------------------------------------------------------
# 9. LOGOUT
# -------------------------------------------------------------
@auth_bp.route("/logout", methods=["POST"])
def logout():
    return jsonify({"message": "Successfully logged out"}), 200

# -------------------------------------------------------------
# 10. FORGOT PASSWORD RECOVERY
# -------------------------------------------------------------
@auth_bp.route("/forgot-password", methods=["POST"])
def forgot_password():
    data = request.get_json() or {}
    identifier = (data.get("email") or data.get("identifier") or "").strip()
    new_password = data.get("new_password", "")

    if not identifier:
        return jsonify({"error": "Please provide your registered Email or ID"}), 400

    db = get_db()
    id_lower = identifier.lower()
    id_upper = identifier.upper()

    user = db.users.find_one({
        "$or": [
            {"email": id_lower},
            {"admin_id": id_upper},
            {"hod_id": id_upper},
            {"staff_id": id_upper},
            {"employee_id": id_upper}
        ]
    })

    if not user:
        return jsonify({"error": "No registered account found with that email or ID"}), 404

    # If new_password provided, perform reset
    if new_password:
        is_valid, msg = validate_password_strength(new_password)
        if not is_valid:
            return jsonify({"error": msg}), 400

        db.users.update_one(
            {"_id": user["_id"]},
            {"$set": {
                "password_hash": hash_password(new_password),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        sync_db()
        log_audit("PASSWORD_RESET", {"email": user["email"]}, user_email=user["email"], role=user.get("role"))
        return jsonify({"message": "Password has been successfully updated. You may now log in."}), 200

    return jsonify({
        "message": f"Account identified for {user.get('full_name', user.get('name'))} ({user.get('role')}). Enter your new password to complete the reset.",
        "user_email": user["email"]
    }), 200
