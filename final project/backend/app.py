import os
import sys

# Ensure backend root is in sys.path
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

from flask import Flask, jsonify
from flask_cors import CORS
from config import Config
from db import get_db

# Import Route Blueprints
from routes.auth_routes import auth_bp
from routes.department_routes import dept_bp
from routes.resource_routes import resource_bp
from routes.cycle_routes import cycle_bp
from routes.request_routes import request_bp
from routes.allocation_routes import allocation_bp
from routes.inventory_routes import inventory_bp
from routes.transfer_routes import transfer_bp
from routes.utilization_routes import utilization_bp
from routes.maintenance_routes import maintenance_bp
from routes.ml_routes import ml_bp
from routes.report_routes import report_bp
from routes.notification_routes import notification_bp
from routes.audit_routes import audit_bp
from routes.admin_routes import admin_bp
from routes.hod_routes import hod_bp
from routes.staff_routes import staff_bp

def create_app():
    app = Flask(__name__)
    app.config.from_object(Config)

    # Enable CORS for frontend applications
    CORS(app, resources={r"/api/*": {"origins": "*"}}, supports_credentials=True)

    # Register Blueprints
    app.register_blueprint(auth_bp, url_prefix="/api/auth")
    app.register_blueprint(dept_bp, url_prefix="/api/departments")
    app.register_blueprint(resource_bp, url_prefix="/api/resources")
    app.register_blueprint(cycle_bp, url_prefix="/api/cycles")
    app.register_blueprint(request_bp, url_prefix="/api/requests")
    app.register_blueprint(allocation_bp, url_prefix="/api/allocations")
    app.register_blueprint(inventory_bp, url_prefix="/api/inventory")
    app.register_blueprint(transfer_bp, url_prefix="/api/transfers")
    app.register_blueprint(utilization_bp, url_prefix="/api/utilization")
    app.register_blueprint(maintenance_bp, url_prefix="/api/maintenance")
    app.register_blueprint(ml_bp, url_prefix="/api/ml")
    app.register_blueprint(report_bp, url_prefix="/api/reports")
    app.register_blueprint(notification_bp, url_prefix="/api/notifications")
    app.register_blueprint(audit_bp, url_prefix="/api/audit")
    app.register_blueprint(admin_bp, url_prefix="/api/admin")
    app.register_blueprint(hod_bp, url_prefix="/api/hod")
    app.register_blueprint(staff_bp, url_prefix="/api/staff")

    @app.route("/api/health", methods=["GET"])
    def health_check():
        db = get_db()
        return jsonify({
            "status": "healthy",
            "service": "College Resource Allocation System API",
            "version": "1.0.0",
            "database": "connected",
            "active_users": db.users.count_documents({}),
            "total_resources": db.resources.count_documents({})
        }), 200

    @app.errorhandler(404)
    def not_found(e):
        return jsonify({"error": "Endpoint not found"}), 404

    @app.errorhandler(500)
    def internal_error(e):
        return jsonify({"error": "Internal server error", "details": str(e)}), 500

    # Auto seed if users collection is empty
    with app.app_context():
        try:
            db = get_db()
            if db.users.count_documents({}) == 0:
                from seed_data import seed_database
                seed_database(force=False)
        except Exception as e:
            print(f"[App] Startup DB check note: {e}")

    return app

if __name__ == "__main__":
    app = create_app()
    port = int(os.environ.get("PORT", 5000))
    print(f"🚀 Starting College Resource Management Backend on http://localhost:{port}")
    app.run(host="0.0.0.0", port=port, debug=Config.DEBUG)
