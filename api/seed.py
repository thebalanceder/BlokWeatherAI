import os
import time
import random
import sqlite3

random.seed(42)

DB_PATH = os.getenv("WEATHER_DB_PATH", "/home/unix/test/mqtt_test/weather.db")
MODEL_DIR = os.getenv("MODEL_DIR", "/home/unix/test/mqtt_test/models")
os.makedirs(os.path.dirname(DB_PATH) if "/" in DB_PATH else ".", exist_ok=True)
os.makedirs(MODEL_DIR, exist_ok=True)

DEVICES = ["NX-402-DELTA", "NX-405-SIGMA", "NX-410-OMEGA", "NX-415-GAMMA"]
BASE_TIME = time.time() - 72 * 3600

def init_db():
    conn = sqlite3.connect(DB_PATH)
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
    return conn

def seed():
    conn = init_db()
    cur = conn.execute("SELECT COUNT(*) FROM weather")
    count = cur.fetchone()[0]
    if count > 0:
        print(f"Database already has {count} records, skipping seed.")
        conn.close()
        return

    base_lat, base_lon = 3.1157, 101.5915
    rows = []
    for i in range(1500):
        ts = BASE_TIME + i * 180
        temp = 28 + 5 * (i % 12) / 12 + random.uniform(-1, 1)
        hum = 70 - 15 * (i % 12) / 12 + random.uniform(-3, 3)
        co = 120 + random.randint(-30, 60)
        heat = temp + (hum / 100) * 5
        co_level = "high" if co > 300 else ("medium" if co > 150 else "low")
        lat = base_lat + random.uniform(-0.005, 0.005)
        lon = base_lon + random.uniform(-0.005, 0.005)
        gps_valid = 1 if i % 10 != 0 else 0

        d = (
            DEVICES[i % len(DEVICES)],
            round(temp, 1), round(hum, 1), round(heat, 1),
            co, round(co * 0.005, 4), co_level,
            lat if gps_valid else 0, lon if gps_valid else 0,
            30 + random.uniform(-5, 5),
            random.uniform(0, 5), random.uniform(0, 360),
            8 if gps_valid else 0,
            round(random.uniform(0.5, 2.0), 1),
            "200126", "143000",
            1, gps_valid,
            i * 1000, "gcp-iot-core",
            ts,
        )
        rows.append(d)

    conn.executemany("""
        INSERT INTO weather (
            device_id, temperature_c, humidity_percent, heat_index_c,
            co_raw, co_voltage, co_level, latitude, longitude,
            altitude_m, speed_kmph, course_deg, satellites, hdop,
            utc_date, utc_time, dht_ok, gps_valid, arduino_uptime_ms,
            gateway, timestamp
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, rows)
    conn.commit()
    conn.close()
    print(f"Seeded {len(rows)} weather records.")

if __name__ == "__main__":
    seed()
