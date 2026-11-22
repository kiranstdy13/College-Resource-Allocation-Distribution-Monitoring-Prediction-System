import pandas as pd
import numpy as np
import os

def generate_historical_dataset(num_samples_per_pair=25, random_state=42):
    """
    Generates realistic historical college resource allocation and utilization records.
    Explicitly labeled as Development & Training Dataset.
    """
    np.random.seed(random_state)
    
    departments = [
        {"dept_id": "MCA", "base_strength": 120, "growth_rate": 0.05},
        {"dept_id": "MBA", "base_strength": 180, "growth_rate": 0.03},
        {"dept_id": "MTech", "base_strength": 80, "growth_rate": 0.02}
    ]
    
    resources = [
        {"resource_id": "COMP", "category": "IT", "base_req_ratio": 0.35, "wear_rate": 0.05},
        {"resource_id": "FAN", "category": "Electrical", "base_req_ratio": 0.035, "wear_rate": 0.02},
        {"resource_id": "FILE", "category": "Consumables", "base_req_ratio": 0.40, "wear_rate": 0.01},
        {"resource_id": "TAB", "category": "Furniture", "base_req_ratio": 0.20, "wear_rate": 0.03}
    ]
    
    rows = []
    
    for cycle_num in range(1, 7): # Cycles 1 to 6
        for dept in departments:
            # Student strength with growth and noise
            growth = dept["growth_rate"] * (cycle_num - 1) + np.random.normal(0, 0.015)
            student_strength = int(dept["base_strength"] * (1 + growth))
            student_growth_pct = round(growth * 100, 2)
            
            for res in resources:
                # Base formula with realistic dynamics
                expected_demand = student_strength * res["base_req_ratio"]
                prev_requested = int(max(2, np.random.normal(expected_demand, expected_demand * 0.12)))
                
                # Admin allocation constraints (sometimes shortage, e.g. 80-100% of request)
                approval_ratio = np.random.uniform(0.75, 1.0)
                prev_approved = int(max(1, prev_requested * approval_ratio))
                
                # Usage rate typically 80% to 95% of approved
                usage_ratio = np.random.uniform(0.75, 0.96)
                prev_actual_usage = int(max(1, prev_approved * usage_ratio))
                unused_qty = max(0, prev_approved - prev_actual_usage)
                
                # Damaged items
                damaged_qty = int(np.random.binomial(prev_approved, res["wear_rate"]))
                
                # Additional urgent requests during cycle
                hist_additional = int(np.random.choice([0, 0, 1, 2], p=[0.6, 0.25, 0.1, 0.05]))
                
                # Central stock available at that time
                central_avail = int(np.random.uniform(20, 120))
                
                # Target: Next Cycle Demand
                # True demand increases with student strength growth, compensates for damaged assets,
                # subtracts surplus unused items, and reflects actual usage pattern
                base_next_demand = (student_strength * (1 + dept["growth_rate"])) * res["base_req_ratio"]
                target_demand = int(round(
                    base_next_demand * 0.6 +
                    prev_actual_usage * 0.3 +
                    damaged_qty * 1.0 -
                    (unused_qty * 0.4) +
                    (hist_additional * 2) +
                    np.random.normal(0, 2)
                ))
                target_demand = max(1, target_demand)
                
                rows.append({
                    "cycle_number": cycle_num,
                    "department_id": dept["dept_id"],
                    "resource_id": res["resource_id"],
                    "category": res["category"],
                    "student_strength": student_strength,
                    "student_growth_pct": student_growth_pct,
                    "prev_requested_quantity": prev_requested,
                    "prev_approved_quantity": prev_approved,
                    "prev_actual_usage": prev_actual_usage,
                    "unused_quantity": unused_qty,
                    "damaged_quantity": damaged_qty,
                    "historical_additional_requests": hist_additional,
                    "central_available_stock": central_avail,
                    "target_demand": target_demand
                })

    # Duplicate with minor noise to provide sufficient training rows (~250-300 records)
    augmented_rows = []
    for _ in range(num_samples_per_pair):
        for r in rows:
            copy = dict(r)
            copy["student_strength"] = int(max(20, r["student_strength"] + np.random.randint(-5, 6)))
            copy["prev_requested_quantity"] = int(max(1, r["prev_requested_quantity"] + np.random.randint(-2, 3)))
            copy["prev_approved_quantity"] = int(max(1, min(copy["prev_requested_quantity"], r["prev_approved_quantity"] + np.random.randint(-2, 3))))
            copy["prev_actual_usage"] = int(max(1, min(copy["prev_approved_quantity"], r["prev_actual_usage"] + np.random.randint(-2, 2))))
            copy["unused_quantity"] = max(0, copy["prev_approved_quantity"] - copy["prev_actual_usage"])
            copy["damaged_quantity"] = int(max(0, r["damaged_quantity"] + np.random.randint(-1, 2)))
            copy["target_demand"] = int(max(1, r["target_demand"] + np.random.randint(-2, 3)))
            augmented_rows.append(copy)

    df = pd.DataFrame(augmented_rows)
    output_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "data")
    os.makedirs(output_dir, exist_ok=True)
    csv_path = os.path.join(output_dir, "historical_resource_data.csv")
    df.to_csv(csv_path, index=False)
    print(f"[ML Data] Generated {len(df)} historical sample rows at {csv_path}")
    return df

if __name__ == "__main__":
    generate_historical_dataset()
