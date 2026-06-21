from river import linear_model, preprocessing, metrics, compose
from data_store import get_all, get_recent
import json
import os
import pickle
import time
from datetime import datetime, timezone

MODEL_DIR = os.getenv("MODEL_DIR", "/home/unix/test/mqtt_test/models")
os.makedirs(MODEL_DIR, exist_ok=True)

ONLINE_MODEL_PATH = f"{MODEL_DIR}/online_model.pkl"
LONG_MODEL_PATH = f"{MODEL_DIR}/long_term_model.pkl"
LONG_MODEL_META = f"{MODEL_DIR}/long_term_meta.json"

def build_pipeline():
    return compose.Pipeline(
        ("scale", preprocessing.StandardScaler()),
        ("regressor", linear_model.LinearRegression(
            l2=0.01,
            intercept_lr=0.1,
        ))
    )

def get_online_model():
    if os.path.exists(ONLINE_MODEL_PATH):
        with open(ONLINE_MODEL_PATH, "rb") as f:
            return pickle.load(f)
    return build_pipeline()

def save_online_model(model):
    with open(ONLINE_MODEL_PATH, "wb") as f:
        pickle.dump(model, f)

def train_online(model, row):
    features = extract_features(row)
    if features is None:
        return model, None
    x, y = features
    y_pred = model.predict_one(x)
    model.learn_one(x, y)
    return model, {"y_true": y, "y_pred": y_pred, "error": abs(y - y_pred)}

def extract_features(row):
    temp = row.get("temperature_c")
    hum = row.get("humidity_percent")
    co = row.get("co_raw")
    hi = row.get("heat_index_c")

    if temp is None:
        return None

    return (
        {
            "humidity": hum if hum is not None else 50,
            "co_raw": co if co is not None else 200,
            "heat_index": hi if hi is not None else temp,
        },
        temp
    )

def retrain_long_term():
    rows = get_all()
    if len(rows) < 10:
        print(f"Not enough data for long-term model ({len(rows)} rows)", flush=True)
        return

    model = build_pipeline()
    mae = 0
    count = 0
    for row in rows:
        features = extract_features(row)
        if features is None:
            continue
        x, y = features
        y_pred = model.predict_one(x)
        model.learn_one(x, y)
        mae += abs(y - (y_pred if y_pred is not None else y))
        count += 1

    if count > 0:
        mae /= count
        with open(LONG_MODEL_PATH, "wb") as f:
            pickle.dump(model, f)
        meta = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "samples": count,
            "mae": round(mae, 3),
            "feature_names": list(x.keys()),
        }
        with open(LONG_MODEL_META, "w") as f:
            json.dump(meta, f)
        print(f"Long-term model retrained: {count} samples, MAE={mae:.3f}", flush=True)
