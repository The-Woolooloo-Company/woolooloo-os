#!/usr/bin/env bash
set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"

# --- Ports ---
BACKEND_PORT=5002
FRONTEND_PORT=5003

# --- vLLM (assumed running) ---
VLLM_HOST="http://192.168.1.161:8002"
VLLM_API_KEY="XcMRQkc6AhkgYSmf"

# --- PIDs for cleanup ---
BACKEND_PID=""
FRONTEND_PID=""

cleanup() {
  echo ""
  echo "Shutting down..."
  [ -n "$BACKEND_PID" ] && kill "$BACKEND_PID" 2>/dev/null && echo "  Backend stopped"
  [ -n "$FRONTEND_PID" ] && kill "$FRONTEND_PID" 2>/dev/null && echo "  Frontend stopped"
  exit 0
}
trap cleanup SIGINT SIGTERM

# --- 1. Start Backend (uvicorn) ---
echo "╔══════════════════════════════════════════╗"
echo "║  Woolooloo AI OS — Dev Startup          ║"
echo "╚══════════════════════════════════════════╝"
echo ""
echo "Backend  : http://localhost:$BACKEND_PORT"
echo "Frontend : http://localhost:$FRONTEND_PORT"
echo "vLLM     : $VLLM_HOST"
echo ""

cd "$ROOT"
VLLM_HOST="$VLLM_HOST" \
VLLM_API_KEY="$VLLM_API_KEY" \
VLLM_MODEL="qwen3.6-27b-fp8" \
OPENCODE_API_URL="http://localhost:18888" \
uvicorn src.main:app \
  --host 0.0.0.0 \
  --port "$BACKEND_PORT" \
  --reload \
  --log-level info &
BACKEND_PID=$!
echo "[Backend]  started (PID $BACKEND_PID)"

# Brief pause so FastAPI boots before the frontend connects
sleep 2

# --- 2. Start Frontend (Next.js) ---
cd "$ROOT/frontend"
NEXT_PUBLIC_API_URL="http://localhost:$BACKEND_PORT" \
  npm run dev -- -p "$FRONTEND_PORT" &
FRONTEND_PID=$!
echo "[Frontend] started (PID $FRONTEND_PID)"

echo ""
echo "Press Ctrl+C to stop both."
wait
