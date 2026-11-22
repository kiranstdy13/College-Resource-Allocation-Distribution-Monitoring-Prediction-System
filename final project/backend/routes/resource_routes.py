from flask import Blueprint, request, jsonify
from datetime import datetime, timezone
from db import get_db, sync_db
from auth import token_required, role_required, log_audit

resource_bp = Blueprint("resources", __name__)

def calculate_available(total, allocated, reserved, under_maint, damaged):
    return max(0, total - allocated - reserved - under_maint - damaged)

@resource_bp.route("", methods=["GET"])
@token_required
def get_resources():
    db = get_db()
    resources = list(db.resources.find({}))
    for r in resources:
        r["_id"] = str(r.get("_id", r.get("id")))
        # Ensure available_quantity is always strictly computed
        r["available_quantity"] = calculate_available(
            r.get("total_quantity", 0),
            r.get("allocated_quantity", 0),
            r.get("reserved_quantity", 0),
            r.get("under_maintenance_quantity", 0),
            r.get("damaged_quantity", 0)
        )
    return jsonify({"resources": resources}), 200

@resource_bp.route("/<resource_id>", methods=["GET"])
@token_required
def get_resource_detail(resource_id):
    db = get_db()
    res = db.resources.find_one({"resource_id": resource_id})
    if not res:
        return jsonify({"error": "Resource not found"}), 404

    res["_id"] = str(res.get("_id", res.get("id")))
    res["available_quantity"] = calculate_available(
        res.get("total_quantity", 0),
        res.get("allocated_quantity", 0),
        res.get("reserved_quantity", 0),
        res.get("under_maintenance_quantity", 0),
        res.get("damaged_quantity", 0)
    )

    # Fetch asset items if durable
    assets = list(db.resource_assets.find({"resource_id": resource_id}))
    for a in assets:
        a["_id"] = str(a.get("_id", a.get("id")))
    res["assets"] = assets

    return jsonify({"resource": res}), 200

@resource_bp.route("", methods=["POST"])
@token_required
@role_required("Admin")
def create_resource():
    data = request.get_json() or {}
    resource_id = data.get("resource_id", "").strip().upper()
    name = data.get("name", "").strip()
    category = data.get("category", "General").strip()
    total_qty = int(data.get("total_quantity", 0))
    unit = data.get("unit", "Units").strip()
    location = data.get("location", "Central Warehouse").strip()
    condition = data.get("condition", "Good").strip()
    description = data.get("description", "").strip()
    is_durable = bool(data.get("is_durable", True))

    if not resource_id or not name or total_qty < 0:
        return jsonify({"error": "Valid Resource ID, Name and non-negative Total Quantity are required"}), 400

    db = get_db()
    if db.resources.find_one({"resource_id": resource_id}):
        return jsonify({"error": f"Resource ID '{resource_id}' already exists"}), 409

    now = datetime.now(timezone.utc).isoformat()
    reserved_qty = int(data.get("reserved_quantity", 0))
    under_maint_qty = int(data.get("under_maintenance_quantity", 0))
    damaged_qty = int(data.get("damaged_quantity", 0))
    allocated_qty = 0

    available_qty = calculate_available(total_qty, allocated_qty, reserved_qty, under_maint_qty, damaged_qty)

    doc = {
        "resource_id": resource_id,
        "name": name,
        "category": category,
        "total_quantity": total_qty,
        "allocated_quantity": allocated_qty,
        "reserved_quantity": reserved_qty,
        "under_maintenance_quantity": under_maint_qty,
        "damaged_quantity": damaged_qty,
        "available_quantity": available_qty,
        "unit": unit,
        "location": location,
        "condition": condition,
        "description": description,
        "is_durable": is_durable,
        "created_at": now,
        "updated_at": now
    }

    result = db.resources.insert_one(doc)
    doc["_id"] = str(result.inserted_id)

    # If durable, generate individual asset tracking serial numbers
    if is_durable and total_qty > 0:
        asset_docs = []
        for i in range(1, total_qty + 1):
            asset_docs.append({
                "asset_id": f"{resource_id}-{i:04d}",
                "resource_id": resource_id,
                "serial_number": f"SN-{resource_id}-{i:04d}",
                "status": "In Central Store",  # In Central Store, Allocated, Under Maintenance, Damaged, Disposed
                "current_department": None,
                "condition": condition,
                "created_at": now,
                "updated_at": now
            })
        if asset_docs:
            db.resource_assets.insert_many(asset_docs)

    sync_db()
    log_audit("RESOURCE_CREATED", {"resource_id": resource_id, "name": name, "total_quantity": total_qty})

    return jsonify({"message": "Resource created successfully", "resource": doc}), 201

@resource_bp.route("/<resource_id>", methods=["PUT"])
@token_required
@role_required("Admin")
def update_resource(resource_id):
    data = request.get_json() or {}
    db = get_db()
    res = db.resources.find_one({"resource_id": resource_id})
    if not res:
        return jsonify({"error": "Resource not found"}), 404

    total_qty = int(data.get("total_quantity", res.get("total_quantity", 0)))
    allocated_qty = res.get("allocated_quantity", 0)
    reserved_qty = int(data.get("reserved_quantity", res.get("reserved_quantity", 0)))
    under_maint_qty = int(data.get("under_maintenance_quantity", res.get("under_maintenance_quantity", 0)))
    damaged_qty = int(data.get("damaged_quantity", res.get("damaged_quantity", 0)))

    # Prevent reducing total quantity below what is already allocated
    if total_qty < (allocated_qty + reserved_qty + under_maint_qty + damaged_qty):
        return jsonify({
            "error": f"Cannot set total quantity ({total_qty}) lower than current commitments (Allocated: {allocated_qty}, Reserved: {reserved_qty}, Maint: {under_maint_qty}, Damaged: {damaged_qty})"
        }), 400

    available_qty = calculate_available(total_qty, allocated_qty, reserved_qty, under_maint_qty, damaged_qty)

    update_fields = {
        "name": data.get("name", res["name"]).strip(),
        "category": data.get("category", res.get("category", "General")).strip(),
        "total_quantity": total_qty,
        "reserved_quantity": reserved_qty,
        "under_maintenance_quantity": under_maint_qty,
        "damaged_quantity": damaged_qty,
        "available_quantity": available_qty,
        "unit": data.get("unit", res.get("unit", "Units")),
        "location": data.get("location", res.get("location", "")),
        "condition": data.get("condition", res.get("condition", "Good")),
        "description": data.get("description", res.get("description", "")),
        "updated_at": datetime.now(timezone.utc).isoformat()
    }

    # If durable and total quantity increased, add new asset serial records
    prev_total = res.get("total_quantity", 0)
    if res.get("is_durable", False) and total_qty > prev_total:
        now = datetime.now(timezone.utc).isoformat()
        new_assets = []
        for i in range(prev_total + 1, total_qty + 1):
            new_assets.append({
                "asset_id": f"{resource_id}-{i:04d}",
                "resource_id": resource_id,
                "serial_number": f"SN-{resource_id}-{i:04d}",
                "status": "In Central Store",
                "current_department": None,
                "condition": update_fields["condition"],
                "created_at": now,
                "updated_at": now
            })
        if new_assets:
            db.resource_assets.insert_many(new_assets)

    db.resources.update_one({"resource_id": resource_id}, {"$set": update_fields})
    sync_db()

    log_audit("RESOURCE_UPDATED", {"resource_id": resource_id, "changes": update_fields})
    return jsonify({"message": "Resource updated successfully", "updated": update_fields}), 200

@resource_bp.route("/<resource_id>", methods=["DELETE"])
@token_required
@role_required("Admin")
def delete_resource(resource_id):
    db = get_db()
    res = db.resources.find_one({"resource_id": resource_id})
    if not res:
        return jsonify({"error": "Resource not found"}), 404

    # Business rule: Deletion restricted when stock is in use or referenced by transactions
    if res.get("allocated_quantity", 0) > 0:
        return jsonify({"error": f"Cannot delete resource '{res['name']}'. It currently has {res['allocated_quantity']} units allocated to departments."}), 400

    # Check if referenced in any active requests or allocations
    ref_request = db.resource_requests.find_one({"resource_id": resource_id})
    ref_alloc = db.allocations.find_one({"resource_id": resource_id})
    if ref_request or ref_alloc:
        return jsonify({"error": f"Cannot delete resource '{res['name']}'. It is referenced by historical requests or allocations. Archive or adjust stock instead."}), 400

    db.resources.delete_one({"resource_id": resource_id})
    db.resource_assets.delete_many({"resource_id": resource_id})
    sync_db()

    log_audit("RESOURCE_DELETED", {"resource_id": resource_id, "name": res["name"]})
    return jsonify({"message": f"Resource '{res['name']}' deleted successfully"}), 200

@resource_bp.route("/<resource_id>/assets", methods=["GET"])
@token_required
def get_resource_assets(resource_id):
    db = get_db()
    assets = list(db.resource_assets.find({"resource_id": resource_id}))
    for a in assets:
        a["_id"] = str(a.get("_id", a.get("id")))
    return jsonify({"assets": assets}), 200
