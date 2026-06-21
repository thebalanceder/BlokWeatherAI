import sqlite3
import json
import os
import time
from datetime import datetime, timezone

DB_PATH = os.getenv("WEATHER_DB_PATH", "/home/unix/test/mqtt_test/weather.db")

def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_conn()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS weather (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            device_id TEXT,
            temperature_c REAL,
            humidity_percent REAL,
            heat_index_c REAL,
            co_raw INTEGER,
            co_voltage REAL,
            co_level TEXT,
            latitude REAL,
            longitude REAL,
            altitude_m REAL,
            speed_kmph REAL,
            course_deg REAL,
            satellites INTEGER,
            hdop REAL,
            utc_date TEXT,
            utc_time TEXT,
            dht_ok INTEGER,
            gps_valid INTEGER,
            arduino_uptime_ms INTEGER,
            gateway TEXT,
            timestamp REAL,
            received_at TEXT
        )
    """)
    conn.commit()
    conn.close()

def insert_weather(data):
    conn = get_conn()
    conn.execute("""
        INSERT INTO weather (
            device_id, temperature_c, humidity_percent, heat_index_c,
            co_raw, co_voltage, co_level, latitude, longitude,
            altitude_m, speed_kmph, course_deg, satellites, hdop,
            utc_date, utc_time, dht_ok, gps_valid, arduino_uptime_ms,
            gateway, timestamp, received_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (
        data.get("device_id"),
        data.get("temperature_c"),
        data.get("humidity_percent"),
        data.get("heat_index_c"),
        data.get("co_raw"),
        data.get("co_voltage"),
        data.get("co_level"),
        data.get("latitude"),
        data.get("longitude"),
        data.get("altitude_m"),
        data.get("speed_kmph"),
        data.get("course_deg"),
        data.get("satellites"),
        data.get("hdop"),
        data.get("utc_date"),
        data.get("utc_time"),
        1 if data.get("dht_ok") else 0,
        1 if data.get("gps_valid") else 0,
        data.get("arduino_uptime_ms"),
        data.get("gateway"),
        data.get("timestamp"),
        datetime.now(timezone.utc).isoformat()
    ))
    conn.commit()
    conn.close()

def get_recent(limit=100):
    conn = get_conn()
    rows = conn.execute(
        "SELECT * FROM weather ORDER BY id DESC LIMIT ?", (limit,)
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]

def get_all():
    conn = get_conn()
    rows = conn.execute("SELECT * FROM weather ORDER BY timestamp ASC").fetchall()
    conn.close()
    return [dict(r) for r in rows]

def get_history(hours=None):
    conn = get_conn()
    if hours:
        since = time.time() - hours * 3600
        rows = conn.execute(
            "SELECT * FROM weather WHERE timestamp >= ? ORDER BY timestamp ASC", (since,)
        ).fetchall()
    else:
        rows = conn.execute("SELECT * FROM weather ORDER BY timestamp ASC").fetchall()
    conn.close()
    return [dict(r) for r in rows]

def get_stats(hours=None):
    conn = get_conn()
    if hours:
        since = time.time() - hours * 3600
        and_clause = " AND timestamp >= ?"
        count_params = (since,)
    else:
        and_clause = ""
        count_params = ()
    count = conn.execute(f"SELECT COUNT(*) FROM weather WHERE 1=1{and_clause}", count_params).fetchone()[0]
    if count == 0:
        conn.close()
        return None
    avg_temp = conn.execute(
        "SELECT AVG(temperature_c) FROM weather WHERE temperature_c IS NOT NULL" + and_clause,
        count_params
    ).fetchone()[0]
    avg_hum = conn.execute(
        "SELECT AVG(humidity_percent) FROM weather WHERE humidity_percent IS NOT NULL" + and_clause,
        count_params
    ).fetchone()[0]
    latest = conn.execute(
        "SELECT * FROM weather WHERE 1=1" + and_clause + " ORDER BY id DESC LIMIT 1",
        count_params
    ).fetchone()
    conn.close()
    return {
        "count": count,
        "avg_temperature": round(avg_temp, 1) if avg_temp else None,
        "avg_humidity": round(avg_hum, 1) if avg_hum else None,
        "latest": dict(latest) if latest else None,
    }

if __name__ == "__main__":
    init_db()
    print("Database initialized at", DB_PATH)
