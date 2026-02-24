#!/usr/bin/env bash
# OpenThreatDetection - تشغيل الـ Backend والـ Frontend معاً
# Run from project root: ./run-all.sh

set -e
ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

# 1) Backend (Flask على المنفذ 5000، Webhook على 5001)
start_backend() {
  if pgrep -f "python3 app.py" >/dev/null 2>&1; then
    echo "[OK] Backend (Flask) يعمل بالفعل."
    return 0
  fi
  echo "[*] تشغيل Backend..."
  source venv/bin/activate
  python3 app.py &
  sleep 3
  echo "[OK] Backend يعمل على http://localhost:5000"
}

# 2) Frontend (Next.js على المنفذ 3000)
start_frontend() {
  if ss -tlnp 2>/dev/null | grep -q ':3000 '; then
    echo "[OK] Frontend (Next.js) يعمل بالفعل."
    return 0
  fi
  echo "[*] تشغيل Frontend..."
  export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
  if [ -s "$NVM_DIR/nvm.sh" ]; then
    . "$NVM_DIR/nvm.sh"
  fi
  cd frontend && npm run dev &
  cd "$ROOT"
  sleep 5
  echo "[OK] Frontend يعمل على http://localhost:3000"
}

start_backend
start_frontend

echo ""
echo "---"
echo "Backend:  http://localhost:5000"
echo "Frontend: http://localhost:3000"
echo "Webhook:  http://localhost:5001 (للتوقيت الفعلي)"
echo "---"
echo "لإيقاف الخدمات: pkill -f 'python3 app.py'; pkill -f 'next dev'"
