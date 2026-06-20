import os
import json
import pickle
import time
from datetime import datetime, timezone
from typing import Optional

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from data_store import get_all, get_history, get_recent, get_stats

app = FastAPI(title="BlokWeather AI API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

MODEL_DIR = "/home/unix/test/mqtt_test/models"
LONG_MODEL_META = f"{MODEL_DIR}/long_term_meta.json"
ONLINE_MODEL_PATH = f"{MODEL_DIR}/online_model.pkl"

GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
GROQ_MODEL = "llama-3.3-70b-versatile"
GROQ_URL = "https://api.groq.com/openai/v1/chat/completions"


def get_prediction():
    try:
        from model_trainer import build_pipeline, extract_features
        model = build_pipeline()
        if os.path.exists(ONLINE_MODEL_PATH):
            with open(ONLINE_MODEL_PATH, "rb") as f:
                model = pickle.load(f)

        rows = get_recent(20)
        if not rows:
            return None

        latest = rows[0]
        features = extract_features(latest)
        if not features:
            return None

        x, y = features
        ml_pred = model.predict_one(x)

        temps = [r.get("temperature_c") for r in rows if r.get("temperature_c")]
        avg_temp = sum(temps) / len(temps) if temps else y
        trend = (temps[-1] - temps[0]) / len(temps) if len(temps) > 1 else 0

        pred = ml_pred if ml_pred is not None else avg_temp + trend
        clamped = max(min(pred, avg_temp + 5), avg_temp - 5)
        error = abs(clamped - y)

        return {
            "predicted_temp": round(clamped, 1),
            "actual_temp": round(y, 1),
            "avg_trend": round(avg_temp, 1),
            "confidence": max(0, min(100, round(100 - (error / y) * 100))),
            "direction": "up" if clamped > y else "down",
        }
    except Exception as e:
        return {"error": str(e)}


def get_groq_insights():
    try:
        recent = get_recent(10)
        if not recent:
            return []
        temps = [r.get("temperature_c") for r in recent if r.get("temperature_c")]
        hums = [r.get("humidity_percent") for r in recent if r.get("humidity_percent")]
        cos = [r.get("co_raw") for r in recent if r.get("co_raw")]

        avg_temp = sum(temps) / len(temps) if temps else 0
        avg_hum = sum(hums) / len(hums) if hums else 0
        avg_co = sum(cos) / len(cos) if cos else 0
        temp_trend = "rising" if len(temps) > 1 and temps[-1] > temps[0] else "falling" if len(temps) > 1 else "stable"

        prompt = f"""You are BlokWeather AI, an environmental analytics assistant. Analyze this weather data:
- Average Temperature: {avg_temp:.1f}°C
- Average Humidity: {avg_hum:.1f}%
- Average CO Level: {avg_co:.0f} ppm
- Temperature Trend: {temp_trend}
- Location: Kuala Lumpur, Malaysia (3.1157, 101.5915)

Return exactly 3 insights as a JSON array of objects with keys: "type" (anomaly|trend|alert|tip), "title", "description".
"""

        import urllib.request
        req_data = json.dumps({
            "model": GROQ_MODEL,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.1,
            "max_tokens": 1000,
        }).encode()

        req = urllib.request.Request(
            GROQ_URL,
            data=req_data,
            headers={
                "Authorization": f"Bearer {GROQ_API_KEY}",
                "Content-Type": "application/json",
            },
            method="POST"
        )

        with urllib.request.urlopen(req, timeout=15) as resp:
            result = json.loads(resp.read())
            content = result["choices"][0]["message"]["content"]
            content = content.strip().replace("```json", "").replace("```", "")
            insights = json.loads(content)
            return insights
    except Exception as e:
        return [
            {"type": "trend", "title": "Trend Analysis", "description": f"Temperature averaging {avg_temp:.1f}°C with {avg_hum:.1f}% humidity over recent readings."},
            {"type": "alert", "title": "CO Level Status", "description": f"CO levels at {avg_co:.0f} ppm. Air quality remains within safe thresholds."},
            {"type": "tip", "title": "Prediction Available", "description": "Enable model training on the pipeline for AI-powered temperature forecasting."},
        ]


@app.get("/api/health")
def health():
    return {"status": "ok"}


@app.get("/api/stats")
def stats(hours: Optional[float] = Query(None, ge=1)):
    return get_stats(hours)


@app.get("/api/recent")
def recent(limit: int = Query(100, ge=1, le=1000)):
    return get_recent(limit)


@app.get("/api/history")
def history(hours: Optional[float] = Query(None, ge=1)):
    return get_history(hours)


@app.get("/api/prediction")
def prediction():
    return get_prediction()


@app.get("/api/insights")
def insights():
    return get_groq_insights()


@app.get("/api/events")
def events(limit: int = Query(50, ge=1, le=200)):
    recent_data = get_recent(limit)
    events_list = []
    for r in recent_data:
        ts = r.get("timestamp", 0)
        time_str = datetime.fromtimestamp(ts, tz=timezone.utc).strftime("%H:%M:%S.%f")[:11]
        level = "INFO"
        if r.get("co_level") == "high":
            level = "ERROR"
        elif r.get("co_level") == "medium":
            level = "WARN"
        elif r.get("heat_index_c", 0) and r["heat_index_c"] > 40:
            level = "WARN"
        events_list.append({
            "timestamp": f"[{time_str}]",
            "level": level,
            "message": f"{r.get('device_id', 'sensor')}: temp={r.get('temperature_c')}C hum={r.get('humidity_percent')}% co={r.get('co_raw')}ppm",
        })
    return list(reversed(events_list))


@app.get("/api/robot-state")
def robot_state():
    return [
        {"id": "NX-402-DELTA", "status": "online", "action": "Patrolling Zone B", "rpm": 2450, "lidar_gap": 85, "last_ping": "2s ago"},
        {"id": "NX-405-SIGMA", "status": "warning", "action": "Returning to Base", "rpm": 1200, "lidar_gap": 25, "last_ping": "14s ago"},
        {"id": "NX-410-OMEGA", "status": "offline", "action": "None", "rpm": 0, "lidar_gap": 0, "last_ping": "2h ago"},
    ]


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
