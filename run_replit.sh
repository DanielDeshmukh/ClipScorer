#!/bin/bash
set -e

echo "=== ClipScorer Setup ==="

# Install Python deps
pip install -r requirements.txt

# Install yt-dlp via pip (more reliable than nix package)
pip install yt-dlp

# Install Node deps
npm install

# Build Next.js
npm run build

echo "=== Starting ClipScorer ==="

# Start backend
cd engine
python -m uvicorn api:app --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!
cd ..

# Wait for backend
sleep 3

# Start frontend (Next.js rewrites proxy API calls to backend)
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
