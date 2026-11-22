import os
import sys
import getpass
from datetime import datetime, timezone

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from db import get_db, sync_db
from auth import hash_password
from utils.validators import validate_email, validate_mobile, validate_password

def setup_admin(full_name=None, admin_id=None, email=None, mobile=None, college_name=None, password=None):
    db = get_db()
    
    print("\n=======================================================")
    print("   COLLEGE RESOURCE SYSTEM - SECURE ADMIN SETUP TOOL   ")
    print("=======================================================\n")
    
    if not full_name:
        full_name = input("Enter Admin Full Name: ").strip()
    if not admin_id:
        admin_id = input("Enter Admin ID (e.g., ADM-002): ").strip().upper()
    if not email:
        email = input("Enter Official Email: ").strip().lower()
    if not mobile:
        mobile = input("Enter Mobile Number (10 digits): ").strip()
    if not college_name:
        college_name = input("Enter College Name: ").strip()
    if not password:
        password = getpass.getpass("Enter Strong Password: ")
        confirm_pass = getpass.getpass("Confirm Password: ")
        if password != confirm_pass:
            print("❌ Error: Passwords do not match!")
            return False

    # Validation
    if not full_name or not admin_id or not email or not mobile or not college_name:
        print("❌ Error: All fields are required.")
        return False
        
    is_valid_email, email_msg = validate_email(email)
    if not is_valid_email:
        print(f"❌ Error: {email_msg}")
        return False
        
    is_valid_mobile, mob_msg = validate_mobile(mobile)
    if not is_valid_mobile:
        print(f"❌ Error: {mob_msg}")
        return False
        
    is_valid_pwd, pwd_msg = validate_password(password)
    if not is_valid_pwd:
        print(f"❌ Error: {pwd_msg}")
        return False

    # Duplicate check
    existing = db.users.find_one({"$or": [{"email": email}, {"admin_id": admin_id}]})
    if existing:
        print(f"❌ Error: An admin with this email or Admin ID already exists.")
        return False

    now = datetime.now(timezone.utc).isoformat()
    new_admin = {
        "user_id": f"USR-{admin_id}",
        "admin_id": admin_id,
        "employee_id": f"EMP-{admin_id}",
        "full_name": full_name,
        "name": full_name,
        "email": email,
        "mobile": mobile,
        "college_name": college_name,
        "role": "Admin",
        "department_id": None,
        "account_status": "approved",
        "password_hash": hash_password(password),
        "is_active": True,
        "created_at": now,
        "updated_at": now
    }

    db.users.insert_one(new_admin)
    sync_db()
    print(f"\n✅ Admin account successfully created and authorized!")
    print(f"   Name:     {full_name}")
    print(f"   Admin ID: {admin_id}")
    print(f"   Email:    {email}")
    print(f"   Status:   approved\n")
    return True

if __name__ == "__main__":
    if len(sys.argv) > 1 and sys.argv[1] == "--default":
        # Quick seed default secondary admin if needed
        setup_admin(
            full_name="Dr. Central Administrator",
            admin_id="ADM-002",
            email="admin2@college.edu",
            mobile="9876543299",
            college_name="College of Engineering & Technology",
            password="Admin@123"
        )
    else:
        setup_admin()
