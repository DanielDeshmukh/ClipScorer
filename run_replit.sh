#!/bin/bash
set -e

echo "=== ClipScorer Setup ==="

python3 -m pip install -r requirements.txt
python3 -m pip install yt-dlp

npm install
npm run build

echo "=== Starting ClipScorer ==="

cd engine
python3 -m uvicorn api:app --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!
cd ..

sleep 3

API_URL=http://localhost:8000 npm start &
FRONTEND_PID=$!

echo ""
echo "Frontend: https://$REPL_SLUG.$REPL_OWNER.repl.co"
echo "Backend:  http://localhost:8000"

cleanup() {
  kill $BACKEND_PID $FRONTEND_PID 2>/dev/null
  exit 0
}
trap cleanup SIGTERM SIGINT

wait
