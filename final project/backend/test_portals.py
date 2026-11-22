import os
import sys
import unittest
import json

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from app import create_app
from db import get_db
from seed_data import seed_database

class TestSeparatePortals(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Force re-seed database
        seed_database(force=True)
        cls.app = create_app()
        cls.client = cls.app.test_client()

    def test_01_admin_login_success(self):
        """Admin should be able to log in with admin_id or email"""
        # Test with email
        res = self.client.post("/api/auth/admin/login", json={
            "identifier": "admin@college.edu",
            "password": "Admin@123"
        })
        self.assertEqual(res.status_code, 200)
        data = res.get_json()
        self.assertIn("token", data)
        self.assertEqual(data["user"]["role"], "Admin")

        # Test with admin_id
        res2 = self.client.post("/api/auth/admin/login", json={
            "identifier": "ADM-001",
            "password": "Admin@123"
        })
        self.assertEqual(res2.status_code, 200)

    def test_02_cross_role_login_prevented(self):
        """Admin login must reject HOD or Staff credentials"""
        res = self.client.post("/api/auth/admin/login", json={
            "identifier": "hod.mca@college.edu",
            "password": "Hod@123"
        })
        self.assertEqual(res.status_code, 403)
        self.assertIn("access restricted", res.get_json().get("error", "").lower())

        res2 = self.client.post("/api/auth/hod/login", json={
            "identifier": "admin@college.edu",
            "password": "Admin@123"
        })
        self.assertEqual(res2.status_code, 403)
        self.assertIn("access restricted", res2.get_json().get("error", "").lower())

    def test_03_admin_registration_requires_secret(self):
        """Admin registration must fail without valid authorization secret"""
        res = self.client.post("/api/auth/admin/register", json={
            "full_name": "Unauthorized Admin",
            "admin_id": "ADM-999",
            "college_name": "College",
            "email": "unauth@college.edu",
            "mobile": "9876543299",
            "password": "Password@123",
            "confirm_password": "Password@123",
            "authorization_code": "WRONG_SECRET"
        })
        self.assertEqual(res.status_code, 403)

        # Success with proper secret
        res2 = self.client.post("/api/auth/admin/register", json={
            "full_name": "Authorized Admin",
            "admin_id": "ADM-777",
            "college_name": "College of Technology",
            "email": "auth.admin@college.edu",
            "mobile": "9876543277",
            "password": "Password@123",
            "confirm_password": "Password@123",
            "authorization_code": "COLLEGE_ADMIN_KEY_2026"
        })
        self.assertEqual(res2.status_code, 201)

    def test_04_hod_registration_and_pending_status(self):
        """New HOD registration creates pending account that cannot log in until approved"""
        # Register a new applicant for MTech when MTech already has an active HOD
        res = self.client.post("/api/auth/hod/register", json={
            "full_name": "Prof. Duplicate HOD",
            "hod_id": "HOD-DUP-01",
            "employee_id": "EMP-HOD-99",
            "email": "dup.hod@college.edu",
            "mobile": "9876543201",
            "department_id": "MTech",
            "password": "Password@123",
            "confirm_password": "Password@123"
        })
        # Department MTech already has an active HOD seeded
        self.assertEqual(res.status_code, 409)

        # Remove existing MTech HOD to simulate vacancy
        db = get_db()
        db.users.delete_many({"department_id": "MTech", "role": {"$in": ["HOD", "hod"]}})

        res2 = self.client.post("/api/auth/hod/register", json={
            "full_name": "Prof. Applicant HOD",
            "hod_id": "HOD-APP-01",
            "employee_id": "EMP-HOD-99",
            "email": "applicant.hod@college.edu",
            "mobile": "9876543201",
            "department_id": "MTech",
            "password": "Password@123",
            "confirm_password": "Password@123"
        })
        self.assertEqual(res2.status_code, 201)
        self.assertEqual(res2.get_json()["account_status"], "pending")

        # Attempt to login while pending -> must be blocked
        login_res = self.client.post("/api/auth/hod/login", json={
            "identifier": "HOD-APP-01",
            "password": "Password@123"
        })
        self.assertEqual(login_res.status_code, 403)
        self.assertIn("pending", login_res.get_json().get("error", "").lower())

    def test_05_staff_registration_and_approval_flow(self):
        """Staff registers -> pending -> Admin approves -> Staff can log in"""
        reg_res = self.client.post("/api/auth/staff/register", json={
            "full_name": "Jane Doe Tech",
            "staff_id": "STF-TEST-01",
            "employee_id": "EMP-STF-88",
            "email": "jane.staff@college.edu",
            "mobile": "9876543288",
            "department_id": "MCA",
            "designation": "Hardware Specialist",
            "password": "StaffPassword@123",
            "confirm_password": "StaffPassword@123"
        })
        self.assertEqual(reg_res.status_code, 201)
        user_id = reg_res.get_json()["user_id"]

        # Log in as Admin to review pending users
        admin_login = self.client.post("/api/auth/admin/login", json={
            "identifier": "admin@college.edu",
            "password": "Admin@123"
        })
        admin_token = admin_login.get_json()["token"]

        # Fetch pending users
        pending_res = self.client.get("/api/admin/users/pending", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        self.assertEqual(pending_res.status_code, 200)
        pending_list = pending_res.get_json()["pending_users"]
        self.assertTrue(any(u.get("staff_id") == "STF-TEST-01" for u in pending_list))

        # Admin approves the staff member
        approve_res = self.client.put(f"/api/admin/users/{user_id}/approve", headers={
            "Authorization": f"Bearer {admin_token}"
        })
        self.assertEqual(approve_res.status_code, 200)

        # Now Staff member can log in successfully
        staff_login = self.client.post("/api/auth/staff/login", json={
            "identifier": "STF-TEST-01",
            "password": "StaffPassword@123"
        })
        self.assertEqual(staff_login.status_code, 200)
        self.assertIn("token", staff_login.get_json())

    def test_06_forgot_password(self):
        """Forgot password allows resetting credentials"""
        res = self.client.post("/api/auth/forgot-password", json={
            "identifier": "staff.mca@college.edu",
            "new_password": "NewStaffPassword@123",
            "role": "staff"
        })
        self.assertEqual(res.status_code, 200)

        # Login with new password
        login_res = self.client.post("/api/auth/staff/login", json={
            "identifier": "staff.mca@college.edu",
            "password": "NewStaffPassword@123"
        })
        self.assertEqual(login_res.status_code, 200)

if __name__ == "__main__":
    unittest.main()
