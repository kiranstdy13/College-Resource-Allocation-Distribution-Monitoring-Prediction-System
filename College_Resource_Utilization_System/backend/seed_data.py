import os
import sys
from datetime import datetime, timezone

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from db import get_db, sync_db
from auth import hash_password

def seed_database(force=False):
    db = get_db()
    
    if not force and db.users.count_documents({}) > 0:
        print("[Seed] Database already seeded. Skipping...")
        return

    print("[Seed] Seeding database with college resources, departments, users, and cycles...")
    now = datetime.now(timezone.utc).isoformat()

    # Clear old data if forced
    if force:
        for coll in ["users", "departments", "resources", "resource_assets", "distribution_cycles",
                     "resource_requests", "allocations", "department_inventory", "resource_transactions",
                     "utilization_records", "maintenance_requests", "notifications", "audit_logs"]:
            db[coll].delete_many({})

    # 1. Users
    users = [
        {
            "user_id": "USR-ADM-001",
            "admin_id": "ADM-001",
            "employee_id": "EMP-ADM-01",
            "email": "admin@college.edu",
            "name": "Dr. Sarah Jenkins",
            "full_name": "Dr. Sarah Jenkins",
            "college_name": "College of Engineering & Technology",
            "mobile": "9876543210",
            "role": "Admin",
            "department_id": None,
            "account_status": "approved",
            "password_hash": hash_password("Admin@123"),
            "is_active": True,
            "created_at": now,
            "updated_at": now
        },
        {
            "user_id": "USR-HOD-MCA-01",
            "hod_id": "HOD-MCA-01",
            "employee_id": "EMP-HOD-01",
            "email": "hod.mca@college.edu",
            "name": "Dr. Ramesh Kumar",
            "full_name": "Dr. Ramesh Kumar",
            "mobile": "9876543211",
            "role": "HOD",
            "department_id": "MCA",
            "account_status": "approved",
            "password_hash": hash_password("Hod@123"),
            "is_active": True,
            "created_at": now,
            "updated_at": now
        },
        {
            "user_id": "USR-HOD-MBA-01",
            "hod_id": "HOD-MBA-01",
            "employee_id": "EMP-HOD-02",
            "email": "hod.mba@college.edu",
            "name": "Dr. Priya Sharma",
            "full_name": "Dr. Priya Sharma",
            "mobile": "9876543212",
            "role": "HOD",
            "department_id": "MBA",
            "account_status": "approved",
            "password_hash": hash_password("Hod@123"),
            "is_active": True,
            "created_at": now,
            "updated_at": now
        },
        {
            "user_id": "USR-HOD-MTC-01",
            "hod_id": "HOD-MTC-01",
            "employee_id": "EMP-HOD-03",
            "email": "hod.mtech@college.edu",
            "name": "Dr. Anil Verma",
            "full_name": "Dr. Anil Verma",
            "mobile": "9876543213",
            "role": "HOD",
            "department_id": "MTech",
            "account_status": "approved",
            "password_hash": hash_password("Hod@123"),
            "is_active": True,
            "created_at": now,
            "updated_at": now
        },
        {
            "user_id": "USR-STF-MCA-01",
            "staff_id": "STF-MCA-01",
            "employee_id": "EMP-STF-01",
            "email": "staff.mca@college.edu",
            "name": "Prof. Vikram Singh",
            "full_name": "Prof. Vikram Singh",
            "mobile": "9876543214",
            "designation": "Lab Instructor",
            "role": "Staff",
            "department_id": "MCA",
            "account_status": "approved",
            "password_hash": hash_password("Staff@123"),
            "is_active": True,
            "created_at": now,
            "updated_at": now
        }
    ]
    db.users.insert_many(users)

    # 2. Departments
    departments = [
        {
            "dept_id": "MCA",
            "name": "Department of Computer Applications",
            "student_strength": 120,
            "staff_count": 15,
            "hod_name": "Dr. Ramesh Kumar",
            "hod_email": "hod.mca@college.edu",
            "description": "Postgraduate computer science, software engineering and cloud computing programs.",
            "created_at": now,
            "updated_at": now
        },
        {
            "dept_id": "MBA",
            "name": "Department of Management Studies",
            "student_strength": 180,
            "staff_count": 20,
            "hod_name": "Dr. Priya Sharma",
            "hod_email": "hod.mba@college.edu",
            "description": "Business analytics, finance, marketing and human resource management programs.",
            "created_at": now,
            "updated_at": now
        },
        {
            "dept_id": "MTech",
            "name": "Department of Technology & Advanced Engineering",
            "student_strength": 80,
            "staff_count": 12,
            "hod_name": "Dr. Anil Verma",
            "hod_email": "hod.mtech@college.edu",
            "description": "Advanced robotics, VLSI, AI systems and cyber-physical engineering research.",
            "created_at": now,
            "updated_at": now
        }
    ]
    db.departments.insert_many(departments)

    # 3. Central Resources
    # Initial sample data from specification:
    # Computers: 100, Fans: 10, Files: 100, Tables: 60
    resources = [
        {
            "resource_id": "COMP",
            "name": "Desktop Computers (Core i7 / 16GB)",
            "category": "IT Equipment",
            "total_quantity": 100,
            "allocated_quantity": 0,
            "reserved_quantity": 0,
            "under_maintenance_quantity": 0,
            "damaged_quantity": 0,
            "available_quantity": 100,
            "unit": "Units",
            "location": "Central IT Depot - Block A",
            "condition": "Excellent",
            "description": "Standard high-performance computer workstations with monitors, keyboards and mice.",
            "is_durable": True,
            "created_at": now,
            "updated_at": now
        },
        {
            "resource_id": "FAN",
            "name": "Ceiling / Wall Fans",
            "category": "Electrical",
            "total_quantity": 10,
            "allocated_quantity": 0,
            "reserved_quantity": 0,
            "under_maintenance_quantity": 0,
            "damaged_quantity": 0,
            "available_quantity": 10,
            "unit": "Units",
            "location": "Maintenance Depot - Ground Floor",
            "condition": "Good",
            "description": "Energy-efficient heavy-duty fans for seminar rooms and student project labs.",
            "is_durable": True,
            "created_at": now,
            "updated_at": now
        },
        {
            "resource_id": "FILE",
            "name": "Academic Record & Project Files",
            "category": "Stationery & Consumables",
            "total_quantity": 100,
            "allocated_quantity": 0,
            "reserved_quantity": 0,
            "under_maintenance_quantity": 0,
            "damaged_quantity": 0,
            "available_quantity": 100,
            "unit": "Files",
            "location": "Stationery Store - Admin Block",
            "condition": "New",
            "description": "Hardbound document binders and student portfolio record filing folders.",
            "is_durable": False,
            "created_at": now,
            "updated_at": now
        },
        {
            "resource_id": "TAB",
            "name": "Modular Study & Lab Tables",
            "category": "Furniture",
            "total_quantity": 60,
            "allocated_quantity": 0,
            "reserved_quantity": 0,
            "under_maintenance_quantity": 0,
            "damaged_quantity": 0,
            "available_quantity": 60,
            "unit": "Units",
            "location": "Furniture Warehouse - Basement",
            "condition": "Good",
            "description": "Ergonomic 2-seater modular laboratory and seminar tables.",
            "is_durable": True,
            "created_at": now,
            "updated_at": now
        }
    ]
    db.resources.insert_many(resources)

    # 4. Generate asset tracking records for durable assets
    for res in resources:
        if res["is_durable"]:
            asset_docs = []
            for i in range(1, res["total_quantity"] + 1):
                asset_docs.append({
                    "asset_id": f"{res['resource_id']}-{i:04d}",
                    "resource_id": res["resource_id"],
                    "serial_number": f"SN-{res['resource_id']}-{i:04d}",
                    "status": "In Central Store",
                    "current_department": None,
                    "condition": "Good",
                    "created_at": now,
                    "updated_at": now
                })
            if asset_docs:
                db.resource_assets.insert_many(asset_docs)

    # 5. Distribution Cycles
    cycles = [
        {
            "cycle_code": "CYCLE-2025-H2",
            "name": "Jul - Dec 2025 Resource Distribution Cycle",
            "start_date": "2025-07-01",
            "end_date": "2025-12-31",
            "submission_deadline": "2025-07-15",
            "status": "Completed",
            "created_at": now,
            "updated_at": now
        },
        {
            "cycle_code": "CYCLE-2026-H1",
            "name": "Jan - Jun 2026 Resource Distribution Cycle",
            "start_date": "2026-01-01",
            "end_date": "2026-06-30",
            "submission_deadline": "2026-01-20",
            "status": "Open for Requests",
            "created_at": now,
            "updated_at": now
        }
    ]
    db.distribution_cycles.insert_many(cycles)

    # 6. Sample Initial 6-month cycle resource requirements from prompt:
    # Table from spec:
    # Resource   MCA   MBA   MTech
    # Computers   40    30      50
    # Fans         4     3       3
    # Files       30    40      50
    # Tables      20    15      25
    sample_requests = [
        # MCA
        {"department_id": "MCA", "resource_id": "COMP", "resource_name": "Desktop Computers (Core i7 / 16GB)", "category": "IT Equipment", "requested_quantity": 40, "purpose": "Lab upgrade for AI & Cloud Lab", "priority": "Critical", "justification": "New semester has 120 MCA students requiring dual-boot programming workstations."},
        {"department_id": "MCA", "resource_id": "FAN", "resource_name": "Ceiling / Wall Fans", "category": "Electrical", "requested_quantity": 4, "purpose": "Server room and tutorial room ventilation", "priority": "Medium", "justification": "Replacement of outdated noisy fans in Room 204."},
        {"department_id": "MCA", "resource_id": "FILE", "resource_name": "Academic Record & Project Files", "category": "Stationery & Consumables", "requested_quantity": 30, "purpose": "MCA Major Project Documentation", "priority": "High", "justification": "Final year capstone project reports submission requirement."},
        {"department_id": "MCA", "resource_id": "TAB", "resource_name": "Modular Study & Lab Tables", "category": "Furniture", "requested_quantity": 20, "purpose": "New collaborative coding lab", "priority": "High", "justification": "20 modular tables needed for the newly partitioned lab space."},
        # MBA
        {"department_id": "MBA", "resource_id": "COMP", "resource_name": "Desktop Computers (Core i7 / 16GB)", "category": "IT Equipment", "requested_quantity": 30, "purpose": "Financial Modeling & Analytics Lab", "priority": "High", "justification": "180 students enrolled in business analytics and market simulation courses."},
        {"department_id": "MBA", "resource_id": "FAN", "resource_name": "Ceiling / Wall Fans", "category": "Electrical", "requested_quantity": 3, "purpose": "Case study breakout rooms", "priority": "Low", "justification": "Auxiliary cooling for 3 newly painted discussion rooms."},
        {"department_id": "MBA", "resource_id": "FILE", "resource_name": "Academic Record & Project Files", "category": "Stationery & Consumables", "requested_quantity": 40, "purpose": "Internship dossiers and company records", "priority": "Medium", "justification": "Mandatory summer internship portfolio review binders."},
        {"department_id": "MBA", "resource_id": "TAB", "resource_name": "Modular Study & Lab Tables", "category": "Furniture", "requested_quantity": 15, "purpose": "Executive seminar classroom", "priority": "Medium", "justification": "Executive seminar seating replacement."},
        # MTech
        {"department_id": "MTech", "resource_id": "COMP", "resource_name": "Desktop Computers (Core i7 / 16GB)", "category": "IT Equipment", "requested_quantity": 50, "purpose": "Robotics & Deep Learning Cluster", "priority": "Critical", "justification": "Research scholars require high-spec machines for simulation rendering."},
        {"department_id": "MTech", "resource_id": "FAN", "resource_name": "Ceiling / Wall Fans", "category": "Electrical", "requested_quantity": 3, "purpose": "Hardware prototyping laboratory", "priority": "Low", "justification": "Air circulation for prototyping bench."},
        {"department_id": "MTech", "resource_id": "FILE", "resource_name": "Academic Record & Project Files", "category": "Stationery & Consumables", "requested_quantity": 50, "purpose": "Thesis archiving and patent files", "priority": "High", "justification": "MTech dissertations and peer-review research dossiers."},
        {"department_id": "MTech", "resource_id": "TAB", "resource_name": "Modular Study & Lab Tables", "category": "Furniture", "requested_quantity": 25, "purpose": "VLSI design bench setup", "priority": "High", "justification": "Heavy anti-static tables for oscilloscope and hardware test benches."}
    ]

    import uuid
    for req in sample_requests:
        req["request_id"] = f"REQ-2601-{uuid.uuid4().hex[:6].upper()}"
        req["cycle_id"] = "CYCLE-2026-H1"
        req["approved_quantity"] = 0
        req["allocated_quantity"] = 0
        req["status"] = "Submitted"
        req["admin_remarks"] = ""
        req["is_urgent"] = False
        req["clarification_requested"] = ""
        req["clarification_response"] = ""
        req["submitted_by"] = f"hod.{req['department_id'].lower()}@college.edu"
        req["created_at"] = now
        req["updated_at"] = now
        db.resource_requests.insert_one(req)

    # 7. Initial notifications
    notifications = [
        {
            "user_email": "admin@college.edu",
            "department_id": None,
            "title": "Distribution Cycle CYCLE-2026-H1 Active",
            "message": "Jan - Jun 2026 distribution cycle has 12 submitted department requirements awaiting your review.",
            "type": "CYCLE_NOTICE",
            "is_read": False,
            "created_at": now
        },
        {
            "user_email": "hod.mca@college.edu",
            "department_id": "MCA",
            "title": "CYCLE-2026-H1 Requirements Submitted",
            "message": "Your 4 resource requirements (Computers: 40, Fans: 4, Files: 30, Tables: 20) are submitted for Admin review.",
            "type": "SUBMISSION_CONFIRMATION",
            "is_read": False,
            "created_at": now
        }
    ]
    db.notifications.insert_many(notifications)

    sync_db()
    print("[Seed] Database seed completed successfully!")

if __name__ == "__main__":
    seed_database(force=True)
