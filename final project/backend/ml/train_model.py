import os
import sys
import json

# Ensure backend root is in sys.path
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
if BASE_DIR not in sys.path:
    sys.path.insert(0, BASE_DIR)

import joblib
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.compose import ColumnTransformer
from sklearn.preprocessing import OneHotEncoder, StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.linear_model import LinearRegression
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.metrics import mean_absolute_error, root_mean_squared_error, r2_score

from ml.dataset_generator import generate_historical_dataset

DATA_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data", "historical_resource_data.csv")
MODELS_DIR = os.path.join(os.path.dirname(__file__), "models")
BEST_MODEL_PATH = os.path.join(MODELS_DIR, "best_demand_model.joblib")
METRICS_PATH = os.path.join(MODELS_DIR, "model_metrics.json")

def prepare_features(df: pd.DataFrame):
    df = df.copy()
    # Missing values check/fill
    df = df.fillna(0)
    
    # Feature Engineering
    df["utilization_rate"] = df["prev_actual_usage"] / (df["prev_approved_quantity"] + 1e-5)
    df["students_per_resource"] = df["student_strength"] / (df["prev_approved_quantity"] + 1e-5)
    
    feature_cols = [
        "department_id", "resource_id", "category",
        "cycle_number", "student_strength", "student_growth_pct",
        "prev_requested_quantity", "prev_approved_quantity",
        "prev_actual_usage", "unused_quantity", "damaged_quantity",
        "historical_additional_requests", "central_available_stock",
        "utilization_rate", "students_per_resource"
    ]
    
    X = df[feature_cols]
    y = df["target_demand"]
    return X, y

def train_and_evaluate():
    os.makedirs(MODELS_DIR, exist_ok=True)
    
    if not os.path.exists(DATA_PATH):
        print("[ML Train] Data file missing. Generating training dataset...")
        df = generate_historical_dataset()
    else:
        df = pd.read_csv(DATA_PATH)
        
    if len(df) < 20:
        return {"error": "Insufficient historical data to reliably train ML models. Minimum 20 records required."}
        
    X, y = prepare_features(df)
    
    categorical_cols = ["department_id", "resource_id", "category"]
    numerical_cols = [c for c in X.columns if c not in categorical_cols]
    
    preprocessor = ColumnTransformer(
        transformers=[
            ("num", StandardScaler(), numerical_cols),
            ("cat", OneHotEncoder(handle_unknown="ignore", sparse_output=False), categorical_cols)
        ]
    )
    
    X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
    
    candidates = {
        "Linear Regression (Baseline)": LinearRegression(),
        "Random Forest Regressor": RandomForestRegressor(n_estimators=100, max_depth=8, random_state=42),
        "Gradient Boosting Regressor": GradientBoostingRegressor(n_estimators=120, learning_rate=0.08, max_depth=4, random_state=42)
    }
    
    results = {}
    best_name = None
    best_rmse = float("inf")
    best_pipeline = None
    
    for name, regressor in candidates.items():
        pipeline = Pipeline([
            ("preprocessor", preprocessor),
            ("regressor", regressor)
        ])
        
        pipeline.fit(X_train, y_train)
        y_pred = pipeline.predict(X_test)
        
        # In sklearn 1.6+, root_mean_squared_error is standard
        try:
            rmse = float(root_mean_squared_error(y_test, y_pred))
        except Exception:
            rmse = float(np.sqrt(np.mean((y_test - y_pred) ** 2)))
            
        mae = float(mean_absolute_error(y_test, y_pred))
        r2 = float(r2_score(y_test, y_pred))
        
        results[name] = {
            "mae": round(mae, 3),
            "rmse": round(rmse, 3),
            "r2": round(r2, 4),
            "algorithm": name
        }
        
        if rmse < best_rmse:
            best_rmse = rmse
            best_name = name
            best_pipeline = pipeline

    # Save best model
    joblib.dump(best_pipeline, BEST_MODEL_PATH)
    
    evaluation_metadata = {
        "dataset_size": len(df),
        "training_samples": len(X_train),
        "test_samples": len(X_test),
        "selected_model": best_name,
        "metrics": results,
        "features": list(X.columns)
    }
    
    with open(METRICS_PATH, "w", encoding="utf-8") as f:
        json.dump(evaluation_metadata, f, indent=2)
        
    print(f"[ML Train] Best Model: {best_name} (RMSE: {best_rmse:.3f}, R2: {results[best_name]['r2']:.4f})")
    print(f"[ML Train] Saved to {BEST_MODEL_PATH}")
    return evaluation_metadata

if __name__ == "__main__":
    train_and_evaluate()
