from flask import Blueprint, request, jsonify
from db import get_db, sync_db
from auth import token_required, role_required, log_audit
from ml.predictor import predict_future_demand, get_metrics_info
from ml.train_model import train_and_evaluate

ml_bp = Blueprint("ml", __name__)

@ml_bp.route("/predict", methods=["GET"])
@token_required
def get_predictions():
    current_user = request.current_user
    db = get_db()
    
    # HOD can only see their own department's predictions
    if current_user["role"] in ["HOD", "Staff"]:
        dept_id = current_user.get("department_id")
    else:
        dept_id = request.args.get("department_id")

    res_id = request.args.get("resource_id")

    try:
        preds = predict_future_demand(db, department_id=dept_id, resource_id=res_id)
        metrics = get_metrics_info()
        return jsonify({
            "predictions": preds,
            "metrics_summary": metrics,
            "disclaimer": "Machine Learning recommendations are advisory decision-support aids based on historical patterns. Final resource allocation requires Admin approval."
        }), 200
    except Exception as e:
        return jsonify({"error": f"Prediction error: {str(e)}"}), 500

@ml_bp.route("/evaluation", methods=["GET"])
@token_required
def get_evaluation():
    metrics = get_metrics_info()
    if not metrics:
        metrics = train_and_evaluate()
    return jsonify({"evaluation": metrics}), 200

@ml_bp.route("/train", methods=["POST"])
@token_required
@role_required("Admin")
def trigger_training():
    try:
        metrics = train_and_evaluate()
        log_audit("ML_MODEL_TRAINED", {"selected_model": metrics.get("selected_model")})
        return jsonify({
            "message": "ML training pipeline completed successfully",
            "metrics": metrics
        }), 200
    except Exception as e:
        return jsonify({"error": f"Training failed: {str(e)}"}), 500
