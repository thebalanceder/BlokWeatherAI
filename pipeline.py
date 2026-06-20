import paho.mqtt.client as mqtt
import ssl
import json
import threading
import time
from data_store import init_db, insert_weather, get_stats
from model_trainer import get_online_model, save_online_model, train_online, retrain_long_term

HOST = "s7672121.ala.asia-southeast1.emqxsl.com"
PORT = 8883
USERNAME = "vsyong"
PASSWORD = "vsyong"
TOPIC = "pipedream_pptx2mqtt/robot/weather"

online_model = get_online_model()
total_samples = 0

def on_connect(client, userdata, flags, rc, properties=None):
    if rc == 0:
        print(f"Connected. Subscribed to {TOPIC}", flush=True)
        client.subscribe(TOPIC, qos=0)
    else:
        print(f"Connection failed: {rc}", flush=True)

def on_message(client, userdata, msg):
    global online_model, total_samples
    try:
        data = json.loads(msg.payload)
        if data.get("device_id") and data.get("temperature_c") is not None:
            insert_weather(data)
            online_model, result = train_online(online_model, data)
            total_samples += 1
            if result:
                print(
                    f"Stored | Pred temp={result['y_pred']:.1f}C "
                    f"actual={result['y_true']:.1f}C "
                    f"err={result['error']:.2f}C "
                    f"total={total_samples}",
                    flush=True
                )
            else:
                print(f"Stored (no pred yet) total={total_samples}", flush=True)
    except json.JSONDecodeError:
        pass
    except Exception as e:
        print(f"Error: {e}", flush=True)

def periodic_save():
    global online_model
    while True:
        time.sleep(60)
        save_online_model(online_model)
        print("Online model saved", flush=True)

def periodic_long_term():
    while True:
        time.sleep(300)
        try:
            retrain_long_term()
        except Exception as e:
            print(f"Long-term retrain error: {e}", flush=True)

client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2)
client.username_pw_set(USERNAME, PASSWORD)
client.on_connect = on_connect
client.on_message = on_message
client.tls_set(cert_reqs=ssl.CERT_REQUIRED)

init_db()

threading.Thread(target=periodic_save, daemon=True).start()
threading.Thread(target=periodic_long_term, daemon=True).start()

print("Starting pipeline: record + online train + long-term model...", flush=True)
client.connect(HOST, PORT, keepalive=60)
client.loop_forever()
