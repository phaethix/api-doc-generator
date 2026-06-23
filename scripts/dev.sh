#!/bin/bash
# ==============================================================================
# API Doc Generator - Development environment manager
# Quickly start / stop backend (Deno) and frontend (Vite) services.
# ==============================================================================

set -e

# --- Colors ------------------------------------------------------------------
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

# --- Paths -------------------------------------------------------------------
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
FRONTEND_DIR="${PROJECT_ROOT}/frontend"
BACKEND_DIR="${PROJECT_ROOT}/backend"
PID_DIR="${PROJECT_ROOT}/.pids"
LOG_DIR="${PROJECT_ROOT}/.logs"
BACKEND_PID_FILE="${PID_DIR}/backend.pid"
FRONTEND_PID_FILE="${PID_DIR}/frontend.pid"
BACKEND_LOG="${LOG_DIR}/backend.log"
FRONTEND_LOG="${LOG_DIR}/frontend.log"

BACKEND_PORT=8080
FRONTEND_PORT=5173

# --- Helpers -----------------------------------------------------------------
info()  { echo -e "${BLUE}[INFO]${NC} $1"; }
ok()    { echo -e "${GREEN}[OK]${NC} $1"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $1"; }
err()   { echo -e "${RED}[ERR]${NC} $1"; }
step()  { echo -e "${PURPLE}[..]${NC} $1"; }

ensure_dirs() {
  mkdir -p "$PID_DIR" "$LOG_DIR"
}

# Check whether a command exists; echo a hint if missing.
require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    err "Command not found: $1"
    case "$1" in
      deno) err "Install Deno from https://deno.land/" ;;
      node) err "Install Node.js from https://nodejs.org/" ;;
      npm)  err "Install npm (usually bundled with Node.js)" ;;
    esac
    return 1
  fi
}

check_environment() {
  step "Checking runtime dependencies..."
  local missing=0
  require_cmd deno   || missing=1
  require_cmd node   || missing=1
  require_cmd npm    || missing=1
  if [ $missing -ne 0 ]; then
    exit 1
  fi
  ok "Deno  $(deno --version | head -1 | awk '{print $2}')"
  ok "Node  $(node --version)"
  ok "npm   $(npm --version)"
}

install_frontend_deps() {
  if [ ! -d "${FRONTEND_DIR}/node_modules" ]; then
    step "Installing frontend dependencies..."
    (cd "$FRONTEND_DIR" && npm install)
    ok "Frontend dependencies installed"
  else
    info "Frontend dependencies already installed, skipping"
  fi
}

# --- Process helpers ---------------------------------------------------------
is_port_listening() {
  lsof -Pi :"$1" -sTCP:LISTEN -t >/dev/null 2>&1
}

pid_from_port() {
  lsof -Pi :"$1" -sTCP:LISTEN -t 2>/dev/null | head -1
}

read_pid_file() {
  local file=$1
  [ -f "$file" ] && cat "$file" 2>/dev/null || true
}

# Returns 0 if the service identified by $1 (pid file) or $2 (port) is running.
is_running() {
  local pid_file=$1 port=$2
  local pid
  pid=$(read_pid_file "$pid_file")
  if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
    return 0
  fi
  is_port_listening "$port"
}

# Stop a service. Args: <display-name> <pid-file> <port>
stop_service() {
  local name=$1 pid_file=$2 port=$3
  local stopped=0

  local pid
  pid=$(read_pid_file "$pid_file")
  if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
    info "Stopping ${name} (PID: ${pid})..."
    kill -TERM "$pid" 2>/dev/null || true
    local i=0
    while kill -0 "$pid" 2>/dev/null && [ $i -lt 5 ]; do
      sleep 1
      i=$((i + 1))
    done
    if kill -0 "$pid" 2>/dev/null; then
      warn "Force-killing ${name}..."
      kill -KILL "$pid" 2>/dev/null || true
    fi
    stopped=1
  fi
  rm -f "$pid_file"

  # Fallback: stop by port if still occupied.
  local port_pid
  port_pid=$(pid_from_port "$port")
  if [ -n "$port_pid" ]; then
    info "Port ${port} still occupied by PID ${port_pid}, stopping..."
    kill -TERM "$port_pid" 2>/dev/null || true
    sleep 2
    kill -0 "$port_pid" 2>/dev/null && kill -KILL "$port_pid" 2>/dev/null || true
    stopped=1
  fi

  if [ $stopped -eq 1 ]; then
    ok "${name} stopped"
  else
    info "${name} was not running"
  fi
}

# --- Start services ----------------------------------------------------------
start_backend() {
  if is_running "$BACKEND_PID_FILE" "$BACKEND_PORT"; then
    warn "Backend already running on port ${BACKEND_PORT}"
    return 0
  fi

  step "Starting backend (Deno)..."
  ensure_dirs
  (cd "$BACKEND_DIR" && nohup deno run --watch --allow-net --allow-read --allow-env main.ts \
    > "$BACKEND_LOG" 2>&1 & echo $! > "$BACKEND_PID_FILE")

  step "Waiting for backend to be ready..."
  local attempt=0
  while [ $attempt -lt 30 ]; do
    if is_port_listening "$BACKEND_PORT"; then
      ok "Backend started (port: ${BACKEND_PORT})"
      info "Log: ${BACKEND_LOG}"
      return 0
    fi
    sleep 1
    printf "."
    attempt=$((attempt + 1))
  done
  echo ""
  err "Backend failed to start within 30s"
  [ -f "$BACKEND_LOG" ] && err "Check log: tail -f ${BACKEND_LOG}"
  stop_service "backend" "$BACKEND_PID_FILE" "$BACKEND_PORT"
  return 1
}

start_frontend() {
  if is_running "$FRONTEND_PID_FILE" "$FRONTEND_PORT"; then
    warn "Frontend already running on port ${FRONTEND_PORT}"
    return 0
  fi

  step "Starting frontend (Vite)..."
  ensure_dirs
  install_frontend_deps
  (cd "$FRONTEND_DIR" && nohup npm run dev > "$FRONTEND_LOG" 2>&1 & echo $! > "$FRONTEND_PID_FILE")

  step "Waiting for frontend to be ready..."
  local attempt=0
  while [ $attempt -lt 30 ]; do
    if is_port_listening "$FRONTEND_PORT"; then
      ok "Frontend started (port: ${FRONTEND_PORT})"
      info "Log: ${FRONTEND_LOG}"
      return 0
    fi
    sleep 1
    printf "."
    attempt=$((attempt + 1))
  done
  echo ""
  err "Frontend failed to start within 30s"
  [ -f "$FRONTEND_LOG" ] && err "Check log: tail -f ${FRONTEND_LOG}"
  stop_service "frontend" "$FRONTEND_PID_FILE" "$FRONTEND_PORT"
  return 1
}

# --- Status / logs / clean ---------------------------------------------------
print_status_line() {
  local label=$1 running=$2 pid=$3 port=$4 url=$5 log=$6
  if [ "$running" = "1" ]; then
    ok "${label}: running (PID: ${pid:-?}, port: ${port})"
    info "  URL:  ${url}"
    info "  Log:  ${log}"
  else
    warn "${label}: not running"
  fi
}

show_status() {
  echo -e "${CYAN}────────────────────────────────────────────────────────────${NC}"
  echo -e "${CYAN}Service status${NC}"
  echo -e "${CYAN}────────────────────────────────────────────────────────────${NC}"

  local backend_pid frontend_pid
  backend_pid=$(read_pid_file "$BACKEND_PID_FILE")
  [ -z "$backend_pid" ] && backend_pid=$(pid_from_port "$BACKEND_PORT")
  frontend_pid=$(read_pid_file "$FRONTEND_PID_FILE")
  [ -z "$frontend_pid" ] && frontend_pid=$(pid_from_port "$FRONTEND_PORT")

  local backend_running=0 frontend_running=0
  is_running "$BACKEND_PID_FILE" "$BACKEND_PORT" && backend_running=1
  is_running "$FRONTEND_PID_FILE" "$FRONTEND_PORT" && frontend_running=1

  print_status_line "Backend"  "$backend_running"  "$backend_pid"  "$BACKEND_PORT" \
    "http://localhost:${BACKEND_PORT}" "$BACKEND_LOG"
  echo ""
  print_status_line "Frontend" "$frontend_running" "$frontend_pid" "$FRONTEND_PORT" \
    "http://localhost:${FRONTEND_PORT}" "$FRONTEND_LOG"

  echo -e "${CYAN}────────────────────────────────────────────────────────────${NC}"
}

show_logs() {
  local target=$1
  case "$target" in
    backend|b)
      if [ -f "$BACKEND_LOG" ]; then tail -f "$BACKEND_LOG"; else err "Backend log not found: ${BACKEND_LOG}"; return 1; fi ;;
    frontend|f)
      if [ -f "$FRONTEND_LOG" ]; then tail -f "$FRONTEND_LOG"; else err "Frontend log not found: ${FRONTEND_LOG}"; return 1; fi ;;
    *)
      err "Unknown service: ${target} (use 'backend'/'frontend' or 'b'/'f')"
      return 1 ;;
  esac
}

clean() {
  step "Cleaning logs and PID files..."
  rm -f "$BACKEND_PID_FILE" "$FRONTEND_PID_FILE"
  rm -f "$BACKEND_LOG" "$FRONTEND_LOG"
  ok "Cleanup complete"
}

show_usage() {
  cat <<EOF
Usage: $(basename "$0") <command> [options]

Commands:
  start            Start backend and frontend (default)
  start:backend    Start backend only
  start:frontend   Start frontend only
  stop             Stop all services
  stop:backend     Stop backend only
  stop:frontend    Stop frontend only
  restart          Restart all services
  status           Show service status
  logs <svc>       Tail logs (backend|frontend or b|f)
  clean            Remove logs and PID files
  help             Show this help

Examples:
  $(basename "$0") start
  $(basename "$0") start:frontend
  $(basename "$0") stop
  $(basename "$0") status
  $(basename "$0") logs backend
EOF
}

# --- Main --------------------------------------------------------------------
main() {
  local cmd="${1:-start}"
  shift || true

  case "$cmd" in
    start)
      check_environment
      start_backend
      start_frontend
      echo ""
      ok "=========================================="
      ok "  All services started!"
      ok "=========================================="
      info "Frontend: http://localhost:${FRONTEND_PORT}"
      info "Backend:  http://localhost:${BACKEND_PORT}"
      info ""
      info "Run '$(basename "$0") status' to check status"
      info "Run '$(basename "$0") stop'   to stop all services"
      info "Run '$(basename "$0") logs <svc>' to tail logs"
      ;;
    start:backend)
      check_environment
      start_backend ;;
    start:frontend)
      check_environment
      install_frontend_deps
      start_frontend ;;
    stop)
      stop_service "backend"  "$BACKEND_PID_FILE"  "$BACKEND_PORT"
      stop_service "frontend" "$FRONTEND_PID_FILE" "$FRONTEND_PORT"
      ok "All services stopped" ;;
    stop:backend)
      stop_service "backend" "$BACKEND_PID_FILE" "$BACKEND_PORT" ;;
    stop:frontend)
      stop_service "frontend" "$FRONTEND_PID_FILE" "$FRONTEND_PORT" ;;
    restart)
      stop_service "backend"  "$BACKEND_PID_FILE"  "$BACKEND_PORT"
      stop_service "frontend" "$FRONTEND_PID_FILE" "$FRONTEND_PORT"
      sleep 2
      check_environment
      start_backend
      start_frontend
      ok "All services restarted" ;;
    status)  show_status ;;
    logs)    show_logs "${1:-}" ;;
    clean)   clean ;;
    help|-h|--help) show_usage ;;
    *)
      err "Unknown command: ${cmd}"
      echo ""
      show_usage
      exit 1 ;;
  esac
}

main "$@"
