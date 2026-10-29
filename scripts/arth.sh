
#!/bin/bash
# ARTH local development manager for macOS.
# Usage from the project root: ./scripts/arth.sh start|status|stop

set -u

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BACKEND_DIR="$ROOT/arth-backend"
FRONTEND_DIR="$ROOT/arth-frontend"
RUN_DIR="$ROOT/.arth-run"

BACKEND_PID="$RUN_DIR/backend.pid"
FRONTEND_PID="$RUN_DIR/frontend.pid"
BACKEND_LOG="$RUN_DIR/backend.log"
FRONTEND_LOG="$RUN_DIR/frontend.log"

mkdir -p "$RUN_DIR"

is_running() {
    local pid_file="$1"
    local pid

    if [[ ! -f "$pid_file" ]]; then
        return 1
    fi

    pid="$(cat "$pid_file" 2>/dev/null || true)"

    if [[ "$pid" =~ ^[0-9]+$ ]] && kill -0 "$pid" 2>/dev/null; then
        return 0
    fi

    return 1
}

kill_tree() {
    local pid="$1"
    local child

    for child in $(pgrep -P "$pid" 2>/dev/null || true); do
        kill_tree "$child"
    done

    kill -TERM "$pid" 2>/dev/null || true
}

start_backend() {
    if is_running "$BACKEND_PID"; then
        echo "Backend process is already running (PID $(cat "$BACKEND_PID"))."
        return 0
    fi

    rm -f "$BACKEND_PID"

    if [[ ! -x "$BACKEND_DIR/.venv/bin/python" ]]; then
        echo "ERROR: Backend virtual environment is missing."
        echo "Set it up as described in README.md."
        return 1
    fi

    if [[ ! -f "$BACKEND_DIR/.env" ]]; then
        echo "ERROR: $BACKEND_DIR/.env is missing."
        echo "Configure it before starting ARTH."
        return 1
    fi

    (
        cd "$BACKEND_DIR" || exit 1

        nohup "$BACKEND_DIR/.venv/bin/python" -m uvicorn app.main:app \
            --host 127.0.0.1 --port 8000 \
            >>"$BACKEND_LOG" 2>&1 < /dev/null &

        echo $! > "$BACKEND_PID"
    )

    echo "Starting backend; log: $BACKEND_LOG"
}

start_frontend() {
    if is_running "$FRONTEND_PID"; then
        echo "Frontend process is already running (PID $(cat "$FRONTEND_PID"))."
        return 0
    fi

    rm -f "$FRONTEND_PID"

    if [[ ! -x "$FRONTEND_DIR/node_modules/.bin/next" ]]; then
        echo "ERROR: Frontend dependencies are missing."
        echo "Run npm ci inside arth-frontend."
        return 1
    fi

    (
        cd "$FRONTEND_DIR" || exit 1

        nohup npm run dev -- --hostname 127.0.0.1 \
            >>"$FRONTEND_LOG" 2>&1 < /dev/null &

        echo $! > "$FRONTEND_PID"
    )

    echo "Starting frontend; log: $FRONTEND_LOG"
}

status_one() {
    local label="$1"
    local pid_file="$2"

    if is_running "$pid_file"; then
        echo "$label: process running (PID $(cat "$pid_file"))"
    else
        echo "$label: not running"
        rm -f "$pid_file"
    fi
}

start_services() {
    start_backend || return 1
    start_frontend || return 1

    sleep 2

    echo
    status_services
}

status_services() {
    status_one "Backend" "$BACKEND_PID"

    if curl -fsS --max-time 2 \
        "http://127.0.0.1:8000/health" >/dev/null 2>&1; then
        echo "Backend health: OK (http://127.0.0.1:8000/health)"
    else
        echo "Backend health: not responding yet"
    fi

    status_one "Frontend" "$FRONTEND_PID"

    if curl -fsS --max-time 2 \
        "http://127.0.0.1:3000/" >/dev/null 2>&1; then
        echo "Frontend HTTP: OK (http://localhost:3000)"
    else
        echo "Frontend HTTP: not responding yet"
    fi
}

stop_services() {
    local pid
    local item
    local label
    local pid_file

    for item in "Frontend:$FRONTEND_PID" "Backend:$BACKEND_PID"; do
        label="${item%%:*}"
        pid_file="${item#*:}"

        if [[ -f "$pid_file" ]]; then
            pid="$(cat "$pid_file" 2>/dev/null || true)"

            if [[ "$pid" =~ ^[0-9]+$ ]] && kill -0 "$pid" 2>/dev/null; then
                echo "Stopping $label (PID $pid)..."
                kill_tree "$pid"
            else
                echo "$label is not running."
            fi

            rm -f "$pid_file"
        else
            echo "$label PID file not found; nothing to stop via this script."
        fi
    done

    echo "Stop signal sent. Check './scripts/arth.sh status' if a service still responds."
}

case "${1:-}" in
    start)
        start_services
        ;;
    status)
        status_services
        ;;
    stop)
        stop_services
        ;;
    *)
        echo "Usage: $0 {start|status|stop}"
        exit 2
        ;;
esac
