from flask import Blueprint, request, jsonify
from datetime import datetime, timezone
import uuid
from db import get_db, sync_db
from auth import token_required, role_required, log_audit

request_bp = Blueprint("requests", __name__)

@request_bp.route("", methods=["GET"])
@token_required
def get_requests():
    current_user = request.current_user
    db = get_db()
    
    query = {}
    if current_user["role"] in ["HOD", "Staff"]:
        # Strict isolation: HOD and Staff can only view their own department's requests
        query["department_id"] = current_user.get("department_id")
    else:
        # Admin can filter by department, cycle_id, status, is_urgent
        dept_filter = request.args.get("department_id")
        if dept_filter:
            query["department_id"] = dept_filter

    cycle_filter = request.args.get("cycle_id")
    if cycle_filter:
        query["cycle_id"] = cycle_filter

    status_filter = request.args.get("status")
    if status_filter:
        query["status"] = status_filter

    urgent_filter = request.args.get("is_urgent")
    if urgent_filter is not None:
        query["is_urgent"] = urgent_filter.lower() in ("true", "1")

    requests_list = list(db.resource_requests.find(query).sort("created_at", -1))
    
    # Enrich with latest resource availability and department details for quick Admin view
    resources_map = {r["resource_id"]: r for r in db.resources.find({})}
    departments_map = {d["dept_id"]: d for d in db.departments.find({})}
    
    for req in requests_list:
        req["_id"] = str(req.get("_id", req.get("id")))
        res = resources_map.get(req.get("resource_id"))
        if res:
            req["central_available"] = max(0, res.get("total_quantity", 0) - res.get("allocated_quantity", 0) - res.get("reserved_quantity", 0) - res.get("under_maintenance_quantity", 0) - res.get("damaged_quantity", 0))
            req["unit"] = res.get("unit", "Units")
        else:
            req["central_available"] = 0
            req["unit"] = "Units"
            
        dept = departments_map.get(req.get("department_id"))
        if dept:
            req["student_strength"] = dept.get("student_strength", 0)
            req["department_name"] = dept.get("name", req.get("department_id"))
            
        # Get existing departmental inventory for this resource
        dept_inv = db.department_inventory.find_one({
            "department_id": req.get("department_id"),
            "resource_id": req.get("resource_id")
        })
        req["dept_existing_working"] = dept_inv.get("working_quantity", 0) if dept_inv else 0
        req["dept_existing_allocated"] = dept_inv.get("received_quantity", 0) if dept_inv else 0

    return jsonify({"requests": requests_list}), 200

@request_bp.route("", methods=["POST"])
@token_required
@role_required("HOD")
def submit_requests():
    current_user = request.current_user
    department_id = current_user.get("department_id")
    if not department_id:
        return jsonify({"error": "User does not belong to any department"}), 400

    data = request.get_json() or {}
    items = data.get("items", [])
    cycle_id = data.get("cycle_id", "").strip()
    is_urgent = bool(data.get("is_urgent", False))

    if not items:
        return jsonify({"error": "No resource items provided in request"}), 400

    db = get_db()
    
    # If not urgent, check if the cycle is open for requests
    if not is_urgent:
        if not cycle_id:
            return jsonify({"error": "Cycle ID is required for regular 6-month cycle requests"}), 400
        cycle = db.distribution_cycles.find_one({"cycle_code": cycle_id})
        if not cycle:
            return jsonify({"error": f"Cycle {cycle_id} not found"}), 404
        if cycle.get("status") not in ["Open for Requests", "Under Review", "Draft"]:
            return jsonify({"error": f"Submissions are closed for cycle {cycle_id} (Status: {cycle.get('status')})"}), 400

    inserted_requests = []
    now = datetime.now(timezone.utc).isoformat()

    for item in items:
        resource_id = item.get("resource_id", "").strip().upper()
        res = db.resources.find_one({"resource_id": resource_id})
        if not res:
            continue

        requested_qty = int(item.get("requested_quantity", 0))
        if requested_qty <= 0:
            continue

        req_doc = {
            "request_id": f"REQ-{datetime.now().strftime('%y%m%d')}-{uuid.uuid4().hex[:6].upper()}",
            "department_id": department_id,
            "cycle_id": cycle_id or "URGENT",
            "resource_id": resource_id,
            "resource_name": res.get("name", resource_id),
            "category": res.get("category", "General"),
            "requested_quantity": requested_qty,
            "approved_quantity": 0,
            "allocated_quantity": 0,
            "purpose": item.get("purpose", "").strip(),
            "priority": item.get("priority", "Medium"),  # Low, Medium, High, Critical
            "justification": item.get("justification", "").strip(),
            "status": "Submitted",  # Submitted, Under Review, Approved, Partially Approved, Rejected, Allocated
            "admin_remarks": "",
            "is_urgent": is_urgent,
            "clarification_requested": "",
            "clarification_response": "",
            "submitted_by": current_user["email"],
            "created_at": now,
            "updated_at": now
        }
        ins_res = db.resource_requests.insert_one(req_doc)
        req_doc["_id"] = str(ins_res.inserted_id)
        inserted_requests.append(req_doc)

    if not inserted_requests:
        return jsonify({"error": "No valid resource requests could be processed"}), 400

    # Notify Admin
    admin_notification = {
        "user_email": "admin@college.edu",
        "department_id": department_id,
        "title": f"New {'Urgent ' if is_urgent else ''}Resource Request from {department_id}",
        "message": f"{department_id} submitted {len(inserted_requests)} resource requirement(s) for cycle: {cycle_id or 'Mid-Cycle Urgent'}.",
        "type": "NEW_REQUEST",
        "is_read": False,
        "created_at": now
    }
    db.notifications.insert_one(admin_notification)

    sync_db()
    log_audit("REQUESTS_SUBMITTED", {
        "department_id": department_id,
        "cycle_id": cycle_id,
        "count": len(inserted_requests),
        "is_urgent": is_urgent
    })

    return jsonify({
        "message": f"Successfully submitted {len(inserted_requests)} resource request(s)",
        "requests": inserted_requests
    }), 201

@request_bp.route("/<request_id>/clarification", methods=["PUT"])
@token_required
def handle_clarification(request_id):
    current_user = request.current_user
    data = request.get_json() or {}
    db = get_db()
    req = db.resource_requests.find_one({"request_id": request_id})
    if not req:
        return jsonify({"error": "Request not found"}), 404

    now = datetime.now(timezone.utc).isoformat()
    if current_user["role"] == "Admin":
        question = data.get("clarification_requested", "").strip()
        if not question:
            return jsonify({"error": "Clarification message cannot be empty"}), 400
        db.resource_requests.update_one(
            {"request_id": request_id},
            {"$set": {
                "clarification_requested": question,
                "status": "Under Review",
                "updated_at": now
            }}
        )
        # Notify HOD
        db.notifications.insert_one({
            "user_email": req.get("submitted_by"),
            "department_id": req.get("department_id"),
            "title": f"Clarification Requested on {req.get('resource_name')} Request",
            "message": f"Admin requested: {question}",
            "type": "CLARIFICATION_REQUESTED",
            "is_read": False,
            "created_at": now
        })
        sync_db()
        return jsonify({"message": "Clarification requested from department HOD"}), 200

    elif current_user["role"] == "HOD":
        if req.get("department_id") != current_user.get("department_id"):
            return jsonify({"error": "Unauthorized"}), 403
        response_text = data.get("clarification_response", "").strip()
        if not response_text:
            return jsonify({"error": "Clarification response cannot be empty"}), 400
        db.resource_requests.update_one(
            {"request_id": request_id},
            {"$set": {
                "clarification_response": response_text,
                "updated_at": now
            }}
        )
        sync_db()
        return jsonify({"message": "Clarification response submitted to Admin"}), 200
    else:
        return jsonify({"error": "Unauthorized"}), 403

@request_bp.route("/urgent-transfer-check/<resource_id>", methods=["GET"])
@token_required
def check_urgent_transfer_possibility(resource_id):
    """Checks central stock + other departments that have unused stock for possible interdepartmental transfer"""
    db = get_db()
    res = db.resources.find_one({"resource_id": resource_id})
    if not res:
        return jsonify({"error": "Resource not found"}), 404

    central_available = max(0, res.get("total_quantity", 0) - res.get("allocated_quantity", 0) - res.get("reserved_quantity", 0) - res.get("under_maintenance_quantity", 0) - res.get("damaged_quantity", 0))

    # Check each department's unused quantity
    dept_inventories = list(db.department_inventory.find({"resource_id": resource_id}))
    other_departments = []
    for inv in dept_inventories:
        working = inv.get("working_quantity", 0)
        actively_used = inv.get("actively_used_quantity", 0)
        unused = max(0, working - actively_used)
        if unused > 0:
            other_departments.append({
                "department_id": inv.get("department_id"),
                "allocated": inv.get("received_quantity", 0),
                "working": working,
                "actively_used": actively_used,
                "unused_surplus": unused
            })

    return jsonify({
        "resource_id": resource_id,
        "resource_name": res.get("name"),
        "central_available": central_available,
        "department_surplus": other_departments
    }), 200
