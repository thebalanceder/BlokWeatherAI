import os
import sqlite3

DB_PATH = os.getenv("WEATHER_DB_PATH", "/home/unix/test/mqtt_test/weather.db")
SEED_SQL = os.path.join(os.path.dirname(__file__), "seed.sql")

SCHEMA = """
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
"""

def seed():
    conn = sqlite3.connect(DB_PATH)
    conn.execute(SCHEMA)
    cur = conn.execute("SELECT COUNT(*) FROM weather")
    count = cur.fetchone()[0]
    if count > 0:
        print(f"Database already has {count} records, skipping seed.")
        conn.close()
        return

    if not os.path.exists(SEED_SQL):
        print(f"Seed file not found at {SEED_SQL}")
        conn.close()
        return

    with open(SEED_SQL) as f:
        sql = f.read()
    conn.executescript(sql)
    conn.close()
    print(f"Seeded {SEED_SQL} into {DB_PATH}")

if __name__ == "__main__":
    seed()
