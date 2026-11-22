from flask import Blueprint, request, jsonify, Response
import io
import csv
from db import get_db
from auth import token_required, role_required

report_bp = Blueprint("reports", __name__)

@report_bp.route("/data", methods=["GET"])
@token_required
def get_report_data():
    report_type = request.args.get("type", "central_stock")
    db = get_db()
    current_user = request.current_user

    if report_type == "central_stock":
        resources = list(db.resources.find({}))
        data = []
        for r in resources:
            avail = max(0, r.get("total_quantity", 0) - r.get("allocated_quantity", 0) - r.get("reserved_quantity", 0) - r.get("under_maintenance_quantity", 0) - r.get("damaged_quantity", 0))
            data.append({
                "Resource ID": r.get("resource_id"),
                "Name": r.get("name"),
                "Category": r.get("category"),
                "Total Quantity": r.get("total_quantity", 0),
                "Allocated Quantity": r.get("allocated_quantity", 0),
                "Available Quantity": avail,
                "Reserved Quantity": r.get("reserved_quantity", 0),
                "Under Maintenance": r.get("under_maintenance_quantity", 0),
                "Damaged": r.get("damaged_quantity", 0),
                "Unit": r.get("unit"),
                "Condition": r.get("condition")
            })
        return jsonify({"type": report_type, "title": "Central Stock Inventory Report", "data": data}), 200

    elif report_type == "department_allocation":
        dept_filter = request.args.get("department_id")
        query = {}
        if current_user["role"] in ["HOD", "Staff"]:
            query["department_id"] = current_user.get("department_id")
        elif dept_filter:
            query["department_id"] = dept_filter

        allocs = list(db.allocations.find(query))
        data = []
        for a in allocs:
            data.append({
                "Receipt Number": a.get("receipt_number"),
                "Cycle": a.get("cycle_id"),
                "Department": a.get("department_id"),
                "Resource Name": a.get("resource_name"),
                "Category": a.get("category"),
                "Requested Quantity": a.get("requested_quantity"),
                "Allocated Quantity": a.get("allocated_quantity"),
                "Unit": a.get("unit"),
                "Allocated At": a.get("allocated_at"),
                "Allocated By": a.get("allocated_by")
            })
        return jsonify({"type": report_type, "title": "Department Allocation Report", "data": data}), 200

    elif report_type == "requested_vs_approved":
        query = {}
        if current_user["role"] in ["HOD", "Staff"]:
            query["department_id"] = current_user.get("department_id")

        requests_list = list(db.resource_requests.find(query))
        data = []
        for r in requests_list:
            data.append({
                "Request ID": r.get("request_id"),
                "Cycle": r.get("cycle_id"),
                "Department": r.get("department_id"),
                "Resource Name": r.get("resource_name"),
                "Requested Quantity": r.get("requested_quantity"),
                "Approved Quantity": r.get("approved_quantity", 0),
                "Allocated Quantity": r.get("allocated_quantity", 0),
                "Status": r.get("status"),
                "Priority": r.get("priority"),
                "Admin Remarks": r.get("admin_remarks", "")
            })
        return jsonify({"type": report_type, "title": "Requested vs Approved Quantity Report", "data": data}), 200

    elif report_type == "utilization":
        query = {}
        if current_user["role"] in ["HOD", "Staff"]:
            query["department_id"] = current_user.get("department_id")

        inv_items = list(db.department_inventory.find(query))
        data = []
        for item in inv_items:
            recv = item.get("received_quantity", 0)
            act = item.get("actively_used_quantity", 0)
            work = item.get("working_quantity", 0)
            pct = round((act / recv * 100), 1) if recv > 0 else 0
            data.append({
                "Department": item.get("department_id"),
                "Resource": item.get("resource_name"),
                "Allocated Quantity": recv,
                "Working Quantity": work,
                "Actively Used Quantity": act,
                "Unused Quantity": max(0, work - act),
                "Damaged Quantity": item.get("damaged_quantity", 0),
                "Quantity Utilization %": f"{pct}%"
            })
        return jsonify({"type": report_type, "title": "Department Resource Utilization Report", "data": data}), 200

    elif report_type == "damaged_maintenance":
        query = {}
        if current_user["role"] in ["HOD", "Staff"]:
            query["department_id"] = current_user.get("department_id")

        tickets = list(db.maintenance_requests.find(query))
        data = []
        for t in tickets:
            data.append({
                "Ticket ID": t.get("ticket_id"),
                "Department": t.get("department_id"),
                "Resource": t.get("resource_name"),
                "Quantity": t.get("quantity"),
                "Issue Type": t.get("issue_type"),
                "Status": t.get("status"),
                "Asset Serial": t.get("asset_id", "N/A"),
                "Reported Date": t.get("created_at")
            })
        return jsonify({"type": report_type, "title": "Damaged and Maintenance Report", "data": data}), 200

    elif report_type == "interdepartmental_transfers":
        txs = list(db.resource_transactions.find({"transaction_type": "INTERDEPT_TRANSFER"}))
        data = []
        for t in txs:
            data.append({
                "Transfer ID": t.get("transfer_id"),
                "From Department": t.get("source_department"),
                "To Department": t.get("destination_department"),
                "Resource Name": t.get("resource_name"),
                "Quantity": t.get("quantity"),
                "Status": t.get("status"),
                "Reason": t.get("reason"),
                "Timestamp": t.get("timestamp")
            })
        return jsonify({"type": report_type, "title": "Interdepartmental Transfer Report", "data": data}), 200

    else:
        return jsonify({"error": "Unknown report type"}), 400

@report_bp.route("/export-csv", methods=["GET"])
@token_required
def export_csv():
    report_type = request.args.get("type", "central_stock")
    db = get_db()
    current_user = request.current_user

    # Fetch rows
    resp, code = get_report_data()
    payload = resp.get_json() or {}
    data = payload.get("data", [])

    if not data:
        return jsonify({"error": "No data available for export"}), 404

    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=list(data[0].keys()))
    writer.writeheader()
    writer.writerows(data)

    csv_data = output.getvalue()
    filename = f"{report_type}_report.csv"

    return Response(
        csv_data,
        mimetype="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )
