#!/bin/bash
# ==============================================================================
# API 文档生成器 - 开发环境管理脚本
# 用于快速启动和停止前后端服务
# ==============================================================================

set -e

# 颜色定义
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 项目路径
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
FRONTEND_DIR="${PROJECT_ROOT}/frontend"
PID_DIR="${PROJECT_ROOT}/.pids"
BACKEND_PID_FILE="${PID_DIR}/backend.pid"
FRONTEND_PID_FILE="${PID_DIR}/frontend.pid"
BACKEND_LOG="${PROJECT_ROOT}/.logs/backend.log"
FRONTEND_LOG="${PROJECT_ROOT}/.logs/frontend.log"

# 端口配置
BACKEND_PORT=8080
FRONTEND_PORT=5173

# ==============================================================================
# 工具函数
# ==============================================================================

print_banner() {
    echo -e "${CYAN}"
    echo "╔══════════════════════════════════════════════════════════════╗"
    echo "║          API 文档生成器 - 开发环境管理脚本              ║"
    echo "╚══════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[✓]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[!]${NC} $1"
}

print_error() {
    echo -e "${RED}[✗]${NC} $1"
}

print_step() {
    echo -e "${PURPLE}[▶]${NC} $1"
}

# 检查命令是否存在
check_command() {
    if ! command -v "$1" &> /dev/null; then
        print_error "未找到命令: $1"
        return 1
    fi
    return 0
}

# 创建必要目录
ensure_dirs() {
    mkdir -p "$PID_DIR" "${PROJECT_ROOT}/.logs"
}

# 检查端口是否被占用
check_port() {
    local port=$1
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        return 0  # 端口被占用
    fi
    return 1  # 端口空闲
}

# 根据端口查找进程 PID
find_pid_by_port() {
    local port=$1
    lsof -Pi :$port -sTCP:LISTEN -t 2>/dev/null | head -1
}

# ==============================================================================
# 检查环境依赖
# ==============================================================================

check_environment() {
    print_step "检查运行环境..."

    local missing=0

    if ! check_command "deno"; then
        print_error "请安装 Deno: https://deno.land/"
        missing=1
    else
        print_success "Deno $(deno --version | head -1 | awk '{print $2}')"
    fi

    if ! check_command "node"; then
        print_error "请安装 Node.js: https://nodejs.org/"
        missing=1
    else
        print_success "Node.js $(node --version)"
    fi

    if ! check_command "npm"; then
        print_error "请安装 npm"
        missing=1
    else
        print_success "npm $(npm --version)"
    fi

    if [ $missing -eq 1 ]; then
        exit 1
    fi
}

# ==============================================================================
# 安装前端依赖
# ==============================================================================

install_frontend_deps() {
    if [ ! -d "${FRONTEND_DIR}/node_modules" ]; then
        print_step "安装前端依赖..."
        cd "$FRONTEND_DIR"
        npm install
        cd "$PROJECT_ROOT"
        print_success "前端依赖安装完成"
    else
        print_info "前端依赖已存在，跳过安装"
    fi
}

# ==============================================================================
# 检查服务状态
# ==============================================================================

is_backend_running() {
    if [ -f "$BACKEND_PID_FILE" ]; then
        local pid=$(cat "$BACKEND_PID_FILE" 2>/dev/null)
        if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
            return 0
        fi
    fi
    # 备用检查：通过端口
    if check_port $BACKEND_PORT; then
        return 0
    fi
    return 1
}

is_frontend_running() {
    if [ -f "$FRONTEND_PID_FILE" ]; then
        local pid=$(cat "$FRONTEND_PID_FILE" 2>/dev/null)
        if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
            return 0
        fi
    fi
    # 备用检查：通过端口
    if check_port $FRONTEND_PORT; then
        return 0
    fi
    return 1
}

# ==============================================================================
# 启动后端服务
# ==============================================================================

start_backend() {
    if is_backend_running; then
        print_warning "后端服务已在运行 (端口 $BACKEND_PORT)"
        return 0
    fi

    print_step "启动后端服务 (Deno)..."
    ensure_dirs

    cd "$PROJECT_ROOT"
    nohup deno run --watch --allow-net --allow-read --allow-env main.ts \
        > "$BACKEND_LOG" 2>&1 &
    local pid=$!
    echo $pid > "$BACKEND_PID_FILE"

    # 等待服务启动
    print_info "等待后端服务就绪..."
    local max_attempts=30
    local attempt=0
    while [ $attempt -lt $max_attempts ]; do
        if check_port $BACKEND_PORT; then
            print_success "后端服务已启动 (PID: $pid, 端口: $BACKEND_PORT)"
            print_info "后端日志: $BACKEND_LOG"
            return 0
        fi
        sleep 1
        attempt=$((attempt + 1))
        printf "."
    done
    echo ""

    print_error "后端服务启动超时"
    if [ -f "$BACKEND_LOG" ]; then
        print_error "查看日志: tail -f $BACKEND_LOG"
    fi
    stop_backend
    return 1
}

# ==============================================================================
# 启动前端服务
# ==============================================================================

start_frontend() {
    if is_frontend_running; then
        print_warning "前端服务已在运行 (端口 $FRONTEND_PORT)"
        return 0
    fi

    print_step "启动前端服务 (Vite)..."
    ensure_dirs
    install_frontend_deps

    cd "$FRONTEND_DIR"
    nohup npm run dev > "$FRONTEND_LOG" 2>&1 &
    local pid=$!
    echo $pid > "$FRONTEND_PID_FILE"

    # 等待服务启动
    print_info "等待前端服务就绪..."
    local max_attempts=30
    local attempt=0
    while [ $attempt -lt $max_attempts ]; do
        if check_port $FRONTEND_PORT; then
            print_success "前端服务已启动 (PID: $pid, 端口: $FRONTEND_PORT)"
            print_info "前端日志: $FRONTEND_LOG"
            cd "$PROJECT_ROOT"
            return 0
        fi
        sleep 1
        attempt=$((attempt + 1))
        printf "."
    done
    echo ""

    cd "$PROJECT_ROOT"
    print_error "前端服务启动超时"
    if [ -f "$FRONTEND_LOG" ]; then
        print_error "查看日志: tail -f $FRONTEND_LOG"
    fi
    stop_frontend
    return 1
}

# ==============================================================================
# 停止服务
# ==============================================================================

stop_process() {
    local name=$1
    local pid_file=$2
    local port=$3

    local stopped=0

    # 方法 1: 通过 PID 文件停止
    if [ -f "$pid_file" ]; then
        local pid=$(cat "$pid_file" 2>/dev/null)
        if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
            print_info "停止 $name 服务 (PID: $pid)..."
            kill -TERM "$pid" 2>/dev/null || true

            # 等待进程退出
            local i=0
            while kill -0 "$pid" 2>/dev/null && [ $i -lt 5 ]; do
                sleep 1
                i=$((i + 1))
            done

            # 强制终止
            if kill -0 "$pid" 2>/dev/null; then
                print_warning "强制终止 $name 服务..."
                kill -KILL "$pid" 2>/dev/null || true
            fi

            stopped=1
        fi
        rm -f "$pid_file"
    fi

    # 方法 2: 通过端口查找并停止
    local port_pid=$(find_pid_by_port $port)
    if [ -n "$port_pid" ]; then
        print_info "检测到端口 $port 仍被占用 (PID: $port_pid)，正在停止..."
        kill -TERM "$port_pid" 2>/dev/null || true
        sleep 2
        if kill -0 "$port_pid" 2>/dev/null; then
            kill -KILL "$port_pid" 2>/dev/null || true
        fi
        stopped=1
    fi

    if [ $stopped -eq 1 ]; then
        print_success "$name 服务已停止"
    else
        print_info "$name 服务未运行"
    fi
}

stop_backend() {
    stop_process "后端" "$BACKEND_PID_FILE" $BACKEND_PORT
}

stop_frontend() {
    stop_process "前端" "$FRONTEND_PID_FILE" $FRONTEND_PORT
}

# ==============================================================================
# 查看状态
# ==============================================================================

show_status() {
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${CYAN}服务状态${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

    # 后端状态
    if is_backend_running; then
        local backend_pid=""
        if [ -f "$BACKEND_PID_FILE" ]; then
            backend_pid=$(cat "$BACKEND_PID_FILE" 2>/dev/null)
        fi
        if [ -z "$backend_pid" ]; then
            backend_pid=$(find_pid_by_port $BACKEND_PORT)
        fi
        print_success "后端服务: 运行中 (PID: ${backend_pid:-未知}, 端口: $BACKEND_PORT)"
        print_info "  URL: http://localhost:$BACKEND_PORT"
        print_info "  日志: $BACKEND_LOG"
    else
        print_warning "后端服务: 未运行"
    fi

    echo ""

    # 前端状态
    if is_frontend_running; then
        local frontend_pid=""
        if [ -f "$FRONTEND_PID_FILE" ]; then
            frontend_pid=$(cat "$FRONTEND_PID_FILE" 2>/dev/null)
        fi
        if [ -z "$frontend_pid" ]; then
            frontend_pid=$(find_pid_by_port $FRONTEND_PORT)
        fi
        print_success "前端服务: 运行中 (PID: ${frontend_pid:-未知}, 端口: $FRONTEND_PORT)"
        print_info "  URL: http://localhost:$FRONTEND_PORT"
        print_info "  日志: $FRONTEND_LOG"
    else
        print_warning "前端服务: 未运行"
    fi

    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

# ==============================================================================
# 查看日志
# ==============================================================================

show_logs() {
    local service=$1
    case "$service" in
        backend|b)
            if [ -f "$BACKEND_LOG" ]; then
                tail -f "$BACKEND_LOG"
            else
                print_error "后端日志文件不存在"
            fi
            ;;
        frontend|f)
            if [ -f "$FRONTEND_LOG" ]; then
                tail -f "$FRONTEND_LOG"
            else
                print_error "前端日志文件不存在"
            fi
            ;;
        *)
            print_error "未知服务: $service (使用 backend/frontend 或 b/f)"
            return 1
            ;;
    esac
}

# ==============================================================================
# 显示使用方法
# ==============================================================================

show_usage() {
    echo "使用方法: $0 <命令> [选项]"
    echo ""
    echo "命令:"
    echo "  start           启动前后端服务（默认）"
    echo "  start:backend   仅启动后端服务"
    echo "  start:frontend  仅启动前端服务"
    echo "  stop            停止所有服务"
    echo "  stop:backend    仅停止后端服务"
    echo "  stop:frontend   仅停止前端服务"
    echo "  restart         重启所有服务"
    echo "  status          查看服务状态"
    echo "  logs <服务>     查看日志 (backend|frontend 或 b|f)"
    echo "  clean           清理日志和 PID 文件"
    echo "  help            显示此帮助信息"
    echo ""
    echo "示例:"
    echo "  $0 start              # 启动前后端"
    echo "  $0 start:frontend     # 仅启动前端"
    echo "  $0 stop               # 停止所有服务"
    echo "  $0 status             # 查看状态"
    echo "  $0 logs backend       # 查看后端日志"
}

# ==============================================================================
# 清理
# ==============================================================================

clean() {
    print_step "清理日志和 PID 文件..."
    rm -f "$BACKEND_PID_FILE" "$FRONTEND_PID_FILE"
    rm -f "$BACKEND_LOG" "$FRONTEND_LOG"
    print_success "清理完成"
}

# ==============================================================================
# 主函数
# ==============================================================================

main() {
    print_banner

    local command="${1:-start}"
    shift || true

    case "$command" in
        start)
            check_environment
            start_backend
            start_frontend
            echo ""
            print_success "=========================================="
            print_success "  所有服务已启动!"
            print_success "=========================================="
            print_info "前端: http://localhost:$FRONTEND_PORT"
            print_info "后端: http://localhost:$BACKEND_PORT"
            print_info ""
            print_info "使用 '$0 status' 查看状态"
            print_info "使用 '$0 stop' 停止所有服务"
            print_info "使用 '$0 logs backend/frontend' 查看日志"
            ;;
        start:backend)
            check_environment
            start_backend
            ;;
        start:frontend)
            check_environment
            install_frontend_deps
            start_frontend
            ;;
        stop)
            stop_backend
            stop_frontend
            print_success "所有服务已停止"
            ;;
        stop:backend)
            stop_backend
            ;;
        stop:frontend)
            stop_frontend
            ;;
        restart)
            stop_backend
            stop_frontend
            sleep 2
            check_environment
            start_backend
            start_frontend
            print_success "所有服务已重启"
            ;;
        status)
            show_status
            ;;
        logs)
            show_logs "${1:-}"
            ;;
        clean)
            clean
            ;;
        help|-h|--help)
            show_usage
            ;;
        *)
            print_error "未知命令: $command"
            echo ""
            show_usage
            exit 1
            ;;
    esac
}

main "$@"
