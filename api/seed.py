import os
import sqlite3

DB_PATH = os.getenv("WEATHER_DB_PATH", "/home/unix/test/mqtt_test/weather.db")
SEED_SQL = os.path.join(os.path.dirname(__file__), "seed.sql")

def seed():
    conn = sqlite3.connect(DB_PATH)
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
    print(f"Database seeded from {SEED_SQL}")

if __name__ == "__main__":
    seed()
