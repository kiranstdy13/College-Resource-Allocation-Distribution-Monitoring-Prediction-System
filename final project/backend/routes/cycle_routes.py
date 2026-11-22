from flask import Blueprint, request, jsonify
from datetime import datetime, timezone
from db import get_db, sync_db
from auth import token_required, role_required, log_audit

cycle_bp = Blueprint("cycles", __name__)

@cycle_bp.route("", methods=["GET"])
@token_required
def get_cycles():
    db = get_db()
    cycles = list(db.distribution_cycles.find({}))
    for c in cycles:
        c["_id"] = str(c.get("_id", c.get("id")))
        # Count requests submitted for this cycle
        req_count = db.resource_requests.count_documents({"cycle_id": c["cycle_code"]})
        alloc_count = db.allocations.count_documents({"cycle_id": c["cycle_code"]})
        c["requests_count"] = req_count
        c["allocations_count"] = alloc_count
    return jsonify({"cycles": cycles}), 200

@cycle_bp.route("/active", methods=["GET"])
@token_required
def get_active_cycle():
    db = get_db()
    # Find cycle with status 'Open for Requests', 'Under Review', or 'Distribution Active'
    active = db.distribution_cycles.find_one({
        "status": {"$in": ["Open for Requests", "Under Review", "Distribution Active"]}
    })
    if not active:
        # fallback to the latest cycle
        active = db.distribution_cycles.find_one({}, sort=[("created_at", -1)])

    if not active:
        return jsonify({"cycle": None, "message": "No distribution cycles found"}), 200

    active["_id"] = str(active.get("_id", active.get("id")))
    return jsonify({"cycle": active}), 200

@cycle_bp.route("", methods=["POST"])
@token_required
@role_required("Admin")
def create_cycle():
    data = request.get_json() or {}
    cycle_code = data.get("cycle_code", "").strip().upper()
    name = data.get("name", "").strip()
    start_date = data.get("start_date", "").strip()
    end_date = data.get("end_date", "").strip()
    submission_deadline = data.get("submission_deadline", "").strip()
    status = data.get("status", "Draft")

    if not cycle_code or not name or not start_date or not end_date:
        return jsonify({"error": "Cycle Code, Name, Start Date, and End Date are required"}), 400

    db = get_db()
    if db.distribution_cycles.find_one({"cycle_code": cycle_code}):
        return jsonify({"error": f"Cycle code '{cycle_code}' already exists"}), 409

    now = datetime.now(timezone.utc).isoformat()
    doc = {
        "cycle_code": cycle_code,
        "name": name,
        "start_date": start_date,
        "end_date": end_date,
        "submission_deadline": submission_deadline,
        "status": status,
        "created_at": now,
        "updated_at": now
    }
    result = db.distribution_cycles.insert_one(doc)
    doc["_id"] = str(result.inserted_id)
    sync_db()

    log_audit("CYCLE_CREATED", {"cycle_code": cycle_code, "status": status})
    return jsonify({"message": "Distribution cycle created", "cycle": doc}), 201

@cycle_bp.route("/<cycle_code>/status", methods=["PUT"])
@token_required
@role_required("Admin")
def update_cycle_status(cycle_code):
    data = request.get_json() or {}
    new_status = data.get("status")
    allowed = ["Draft", "Open for Requests", "Under Review", "Distribution Active", "Completed", "Closed"]
    if new_status not in allowed:
        return jsonify({"error": f"Invalid status. Must be one of: {', '.join(allowed)}"}), 400

    db = get_db()
    cycle = db.distribution_cycles.find_one({"cycle_code": cycle_code})
    if not cycle:
        return jsonify({"error": "Cycle not found"}), 404

    db.distribution_cycles.update_one(
        {"cycle_code": cycle_code},
        {"$set": {"status": new_status, "updated_at": datetime.now(timezone.utc).isoformat()}}
    )

    # If opening for requests, notify HODs
    if new_status == "Open for Requests":
        hods = list(db.users.find({"role": "HOD"}))
        notifications = []
        for hod in hods:
            notifications.append({
                "user_email": hod["email"],
                "department_id": hod.get("department_id"),
                "title": f"Cycle {cycle_code} Open for Submissions",
                "message": f"Requirements submission is now open for cycle: {cycle['name']}.",
                "type": "CYCLE_OPEN",
                "is_read": False,
                "created_at": datetime.now(timezone.utc).isoformat()
            })
        if notifications:
            db.notifications.insert_many(notifications)

    sync_db()
    log_audit("CYCLE_STATUS_CHANGED", {"cycle_code": cycle_code, "new_status": new_status})
    return jsonify({"message": f"Cycle {cycle_code} status updated to {new_status}"}), 200
