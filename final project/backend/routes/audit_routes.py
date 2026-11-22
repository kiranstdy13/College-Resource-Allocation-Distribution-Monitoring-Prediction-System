from flask import Blueprint, request, jsonify
from db import get_db
from auth import token_required, role_required

audit_bp = Blueprint("audit", __name__)

@audit_bp.route("", methods=["GET"])
@token_required
@role_required("Admin")
def get_audit_logs():
    db = get_db()
    limit = int(request.args.get("limit", 100))
    action_filter = request.args.get("action")
    
    query = {}
    if action_filter:
        query["action"] = action_filter

    logs = list(db.audit_logs.find(query).sort("timestamp", -1).limit(limit))
    for log in logs:
        log["_id"] = str(log.get("_id", log.get("id")))

    return jsonify({"logs": logs}), 200
