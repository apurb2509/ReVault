#!/bin/bash
set -e

echo "Starting ReVault Unified Container..."

# 1. Cloud platforms like Render provide the $PORT env variable automatically.
# We will use it for the Python FastAPI Backend so it handles all internet traffic natively.
EXTERNAL_PORT="${PORT:-8080}"

# 2. Start the Python FastAPI Backend on the public internet port
echo "Starting Python FastAPI Backend on port $EXTERNAL_PORT..."
cd /app/backend
uvicorn main:app --host 0.0.0.0 --port $EXTERNAL_PORT &
PYTHON_PID=$!

# 3. Start the Redis Worker Daemon for background processing
echo "Starting Redis Worker Daemon..."
python services/redis_worker.py &
WORKER_PID=$!

# Wait a few seconds to let Python boot up
sleep 3

# 4. Start Go Microservices (running internally in the background)
echo "Starting Go Microservices..."
cd /app

export PORT="8081"
echo "Starting audit-svc on port 8081..."
audit-svc &
AUDIT_PID=$!

export PORT="8082"
echo "Starting payment-link-svc on port 8082..."
payment-link-svc &
PAYMENT_PID=$!

echo "All services started successfully in a single container!"

# 5. Wait for all background processes so the container doesn't exit
wait $PYTHON_PID $WORKER_PID $AUDIT_PID $PAYMENT_PID
