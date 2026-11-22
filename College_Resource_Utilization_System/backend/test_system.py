import os
import sys
import json

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from app import create_app
from seed_data import seed_database
from ml.train_model import train_and_evaluate

def run_e2e_tests():
    print("=" * 80)
    print("🚀 RUNNING END-TO-END VALIDATION & VERIFICATION SUITE")
    print("=" * 80)

    # Re-seed to guaranteed clean state
    seed_database(force=True)
    # Ensure model trained
    train_and_evaluate()

    app = create_app()
    client = app.test_client()

    # --- TEST 1: Admin Authentication ---
    print("\n[TEST 1] Testing Admin Login & JWT Generation...")
    login_res = client.post("/api/auth/login", json={"email": "admin@college.edu", "password": "Admin@123"})
    assert login_res.status_code == 200, f"Admin login failed: {login_res.status_code}"
    admin_token = login_res.get_json()["token"]
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    print("  ✓ Admin login successful. Role:", login_res.get_json()["user"]["role"])

    # --- TEST 2: Initial Central Inventory & Stock Calculations ---
    print("\n[TEST 2] Testing Central Inventory & Available Quantity Formula...")
    inv_res = client.get("/api/resources", headers=admin_headers)
    assert inv_res.status_code == 200
    resources = {r["resource_id"]: r for r in inv_res.get_json()["resources"]}
    
    assert resources["COMP"]["total_quantity"] == 100
    assert resources["COMP"]["available_quantity"] == 100
    assert resources["FAN"]["total_quantity"] == 10
    assert resources["FILE"]["total_quantity"] == 100
    assert resources["TAB"]["total_quantity"] == 60
    print("  ✓ Initial central stock verified: Computers (100), Fans (10), Files (100), Tables (60).")

    # --- TEST 3: Shortage Detection Warning ---
    print("\n[TEST 3] Testing Shortage Detection Warning Engine...")
    short_res = client.get("/api/allocations/shortage-summary", headers=admin_headers)
    assert short_res.status_code == 200
    shortages = {s["resource_id"]: s for s in short_res.get_json()["summary"]}
    
    comp_shortage = shortages["COMP"]
    print(f"  Computers Demand: {comp_shortage['total_requested']} vs Available: {comp_shortage['central_available']}")
    assert comp_shortage["total_requested"] == 120, f"Expected total 120 computers demand, got {comp_shortage['total_requested']}"
    assert comp_shortage["shortage"] == 20, f"Expected deficit of 20, got {comp_shortage['shortage']}"
    assert comp_shortage["has_shortage"] == True
    print("  ✓ Shortage engine accurately computed 20-computer deficit across MCA (40), MBA (30), MTech (50).")

    # --- TEST 4: Admin Justified Partial Approvals ---
    print("\n[TEST 4] Testing Admin Decision Workflow (Full, Partial & Justification)...")
    reqs_res = client.get("/api/requests", headers=admin_headers)
    reqs = reqs_res.get_json()["requests"]
    
    mca_comp_req = next(r for r in reqs if r["department_id"] == "MCA" and r["resource_id"] == "COMP")
    mba_comp_req = next(r for r in reqs if r["department_id"] == "MBA" and r["resource_id"] == "COMP")
    mtech_comp_req = next(r for r in reqs if r["department_id"] == "MTech" and r["resource_id"] == "COMP")

    # Partial Approve MCA -> 35
    dec1 = client.post("/api/allocations/decide", headers=admin_headers, json={
        "request_id": mca_comp_req["request_id"],
        "action": "PARTIAL_APPROVE",
        "approved_quantity": 35,
        "admin_remarks": "Approved 35 of 40 requested computers based on student-to-system ratio."
    })
    assert dec1.status_code == 200

    # Partial Approve MBA -> 25
    dec2 = client.post("/api/allocations/decide", headers=admin_headers, json={
        "request_id": mba_comp_req["request_id"],
        "action": "PARTIAL_APPROVE",
        "approved_quantity": 25,
        "admin_remarks": "Approved 25 of 30 requested computers for business analytics lab."
    })
    assert dec2.status_code == 200

    # Partial Approve MTech -> 40
    dec3 = client.post("/api/allocations/decide", headers=admin_headers, json={
        "request_id": mtech_comp_req["request_id"],
        "action": "PARTIAL_APPROVE",
        "approved_quantity": 40,
        "admin_remarks": "Approved 40 of 50 requested computers for robotics lab."
    })
    assert dec3.status_code == 200
    print("  ✓ Admin approved justified quantities: MCA=35, MBA=25, MTech=40. Total Approved = 100.")

    # --- TEST 5: Atomic Stock Distribution Execution ---
    print("\n[TEST 5] Testing Atomic Allocation & Stock Transfer...")
    exec_res = client.post("/api/allocations/execute", headers=admin_headers, json={
        "request_ids": [mca_comp_req["request_id"], mba_comp_req["request_id"], mtech_comp_req["request_id"]]
    })
    assert exec_res.status_code == 200
    receipts = exec_res.get_json()["receipts"]
    assert len(receipts) == 3
    print(f"  ✓ Atomic execution complete. Generated receipts: {[r['receipt_number'] for r in receipts]}")

    # Verify Central Stock decremented
    res_after = client.get("/api/resources/COMP", headers=admin_headers).get_json()["resource"]
    assert res_after["allocated_quantity"] == 100
    assert res_after["available_quantity"] == 0
    print("  ✓ Central stock updated: Total=100, Allocated=100, Available=0.")

    # --- TEST 6: Departmental Inventory Isolation & Durable Asset Serials ---
    print("\n[TEST 6] Testing Department Inventory & Asset Serial Assignment...")
    mca_inv = client.get("/api/inventory/department/MCA", headers=admin_headers).get_json()["inventory"]
    mca_comp = next(i for i in mca_inv if i["resource_id"] == "COMP")
    assert mca_comp["received_quantity"] == 35
    assert mca_comp["working_quantity"] == 35

    mca_assets = client.get("/api/inventory/department/MCA/assets", headers=admin_headers).get_json()["assets"]
    assert len(mca_assets) == 35
    print(f"  ✓ MCA Inventory verified: Received=35, Working=35. Assigned {len(mca_assets)} asset serial numbers.")

    # --- TEST 7: HOD & Staff Usage Logging & Damage Reporting ---
    print("\n[TEST 7] Testing HOD Login & Usage Recording (Section 10)...")
    hod_login = client.post("/api/auth/login", json={"email": "hod.mca@college.edu", "password": "Hod@123"})
    assert hod_login.status_code == 200
    hod_headers = {"Authorization": f"Bearer {hod_login.get_json()['token']}"}

    # Record 33 actively used computers
    use_res = client.post("/api/utilization/record", headers=hod_headers, json={
        "department_id": "MCA",
        "resource_id": "COMP",
        "utilization_type": "QUANTITY",
        "actively_used_quantity": 33,
        "notes": "Regular semester practical classes"
    })
    assert use_res.status_code == 201
    
    # Check utilization percentage: (33 / 35) * 100 = 94.29%
    util_data = client.get("/api/utilization/department/MCA", headers=hod_headers).get_json()
    comp_snap = next(s for s in util_data["current_snapshot"] if s["resource_id"] == "COMP")
    assert comp_snap["quantity_utilization_pct"] == 94.3
    print(f"  ✓ Quantity Utilization recorded: {comp_snap['quantity_utilization_pct']}% ({comp_snap['actively_used_quantity']} / {comp_snap['received_quantity']}).")

    # Staff login and report damage
    print("\n[TEST 8] Testing Staff Login & Damage Reporting (Section 14)...")
    staff_login = client.post("/api/auth/login", json={"email": "staff.mca@college.edu", "password": "Staff@123"})
    assert staff_login.status_code == 200
    staff_headers = {"Authorization": f"Bearer {staff_login.get_json()['token']}"}

    dmg_res = client.post("/api/maintenance/report-damage", headers=staff_headers, json={
        "department_id": "MCA",
        "resource_id": "COMP",
        "quantity": 2,
        "issue_type": "Damaged",
        "description": "Monitor power supplies damaged during power fluctuation"
    })
    assert dmg_res.status_code == 201
    ticket_id = dmg_res.get_json()["ticket"]["ticket_id"]
    print(f"  ✓ Maintenance Ticket #{ticket_id} filed.")

    # Verify damaged items excluded from working stock
    mca_inv_after_dmg = client.get("/api/inventory/department/MCA", headers=hod_headers).get_json()["inventory"]
    comp_after_dmg = next(i for i in mca_inv_after_dmg if i["resource_id"] == "COMP")
    assert comp_after_dmg["working_quantity"] == 33
    assert comp_after_dmg["damaged_quantity"] == 2
    print(f"  ✓ Health adjusted: Working={comp_after_dmg['working_quantity']}, Damaged={comp_after_dmg['damaged_quantity']}.")

    # --- TEST 9: Interdepartmental Transfer ---
    print("\n[TEST 9] Testing Interdepartmental Resource Transfer (Section 9)...")
    # Admin transfers 3 computers from MTech (which has 40) to MCA
    trf_res = client.post("/api/transfers/initiate", headers=admin_headers, json={
        "source_department": "MTech",
        "destination_department": "MCA",
        "resource_id": "COMP",
        "quantity": 3,
        "reason": "Temporary transfer for inter-college hackathon event"
    })
    assert trf_res.status_code == 201
    print("  ✓ Direct transfer of 3 computers from MTech to MCA executed successfully.")

    # Verify inventory changes
    mtech_inv = client.get("/api/inventory/department/MTech", headers=admin_headers).get_json()["inventory"]
    mtech_comp = next(i for i in mtech_inv if i["resource_id"] == "COMP")
    assert mtech_comp["received_quantity"] == 37  # 40 - 3

    mca_inv_after_trf = client.get("/api/inventory/department/MCA", headers=admin_headers).get_json()["inventory"]
    mca_comp_after_trf = next(i for i in mca_inv_after_trf if i["resource_id"] == "COMP")
    assert mca_comp_after_trf["received_quantity"] == 38  # 35 + 3
    print("  ✓ Source and destination department stock balances successfully synchronized.")

    # --- TEST 10: Machine Learning Demand Prediction API ---
    print("\n[TEST 10] Testing Scikit-Learn Demand Prediction & Evaluation (Section 11)...")
    pred_res = client.get("/api/ml/predict", headers=admin_headers)
    assert pred_res.status_code == 200
    preds = pred_res.get_json()["predictions"]
    assert len(preds) > 0
    mca_comp_pred = next(p for p in preds if p["department_id"] == "MCA" and p["resource_id"] == "COMP")
    print(f"  ✓ ML Predicted Demand for MCA Computers: {mca_comp_pred['predicted_demand']} units (Confidence: {int(mca_comp_pred['confidence_score'] * 100)}%)")
    print(f"    Rationale: {mca_comp_pred['rationale']}")

    eval_res = client.get("/api/ml/evaluation", headers=admin_headers)
    assert eval_res.status_code == 200
    eval_data = eval_res.get_json()["evaluation"]
    assert "Linear Regression (Baseline)" in eval_data["metrics"]
    assert "Random Forest Regressor" in eval_data["metrics"]
    assert "Gradient Boosting Regressor" in eval_data["metrics"]
    print("  ✓ Model comparison table verified: Linear Regression, Random Forest, Gradient Boosting Regressor.")

    # --- TEST 11: Reports & Audit Log ---
    print("\n[TEST 11] Testing Reports & Audit Trail (Sections 15 & 16)...")
    rep_res = client.get("/api/reports/data?type=central_stock", headers=admin_headers)
    assert rep_res.status_code == 200
    assert len(rep_res.get_json()["data"]) >= 4

    audit_res = client.get("/api/audit", headers=admin_headers)
    assert audit_res.status_code == 200
    assert len(audit_res.get_json()["logs"]) > 5
    print("  ✓ Reports generated and audit trail contains", len(audit_res.get_json()["logs"]), "logged operations.")

    print("\n" + "=" * 80)
    print("🎉 ALL 11 TESTS PASSED PERFECTLY! SYSTEM INTEGRATION VERIFIED.")
    print("=" * 80)

if __name__ == "__main__":
    run_e2e_tests()
