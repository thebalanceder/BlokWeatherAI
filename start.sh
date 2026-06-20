#!/bin/bash
pkill -f "uvicorn" 2>/dev/null
pkill -f "next start" 2>/dev/null
sleep 1

cd /home/unix/test/mqtt_test
nohup uvicorn api.main:app --host 0.0.0.0 --port 8000 > /tmp/backend.log 2>&1 &
echo "Backend started (PID $!)"

cd /home/unix/test/mqtt_test/dashboard
nohup node_modules/.bin/next start -p 3000 > /tmp/dashboard.log 2>&1 &
echo "Frontend started (PID $!)"

sleep 3
curl -s -o /dev/null -w "Backend: %{http_code}\n" http://localhost:8000/api/stats
curl -s -o /dev/null -w "Frontend: %{http_code}\n" http://localhost:3000
echo "Open http://localhost:3000"
