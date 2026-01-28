#!/bin/bash
#
# Unified Service Launcher for AI Assistant
# 
# Starts all required services:
# - ML Backend (emotion + BFA) on port 8001
# - Speaches (TTS + ASR) on port 8000
# 
# Usage:
#   ./launch-services.sh          # Start all services
#   ./launch-services.sh --stop   # Stop all services
#   ./launch-services.sh --status # Check service status
#

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Directories
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
ML_BACKEND_DIR="$PROJECT_DIR/services/syn-ml-backend"
SPEACHES_DIR="$PROJECT_DIR/services/syn-speaches"

# Ports
ML_PORT=8001
SPEACHES_PORT=8000

# PIDs file
PIDS_FILE="/tmp/airi-services.pid"

show_help() {
    echo "AI Assistant Service Manager"
    echo ""
    echo "Usage: $0 [command]"
    echo ""
    echo "Commands:"
    echo "  (none)    Start all services"
    echo "  --stop    Stop all running services"
    echo "  --status  Check service status"
    echo "  --help    Show this help"
    echo ""
    echo "Services:"
    echo "  ML Backend (emotion + BFA) : http://localhost:$ML_PORT"
    echo "  Speaches (TTS + ASR)       : http://localhost:$SPEACHES_PORT"
}

check_service() {
    local port=$1
    if curl -s "http://127.0.0.1:$port/health" > /dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

start_ml_backend() {
    echo -e "${YELLOW}Starting ML Backend (emotion + BFA)...${NC}"
    
    if check_service $ML_PORT; then
        echo -e "${GREEN}✓ ML Backend is already running on port $ML_PORT${NC}"
        return 0
    fi
    
    cd "$ML_BACKEND_DIR"
    
    if [ ! -d "venv" ]; then
        echo -e "${RED}✗ ML Backend virtual environment not found${NC}"
        echo "Run: cd $ML_BACKEND_DIR && bash scripts/install.sh"
        return 1
    fi
    
    source venv/bin/activate
    python launcher.py &
    ML_PID=$!
    
    # Wait for service to be ready
    for i in {1..30}; do
        if check_service $ML_PORT; then
            echo -e "${GREEN}✓ ML Backend ready on port $ML_PORT${NC}"
            echo $ML_PID >> "$PIDS_FILE"
            return 0
        fi
        sleep 1
    done
    
    echo -e "${RED}✗ ML Backend failed to start${NC}"
    kill $ML_PID 2>/dev/null || true
    return 1
}

start_speaches() {
    echo -e "${YELLOW}Starting Speaches (TTS + ASR)...${NC}"
    
    if check_service $SPEACHES_PORT; then
        echo -e "${GREEN}✓ Speaches is already running on port $SPEACHES_PORT${NC}"
        return 0
    fi
    
    if [ ! -d "$SPEACHES_DIR" ]; then
        echo -e "${RED}✗ Speaches directory not found at $SPEACHES_DIR${NC}"
        echo "Please clone and setup speaches first"
        return 1
    fi
    
    cd "$SPEACHES_DIR"
    
    if [ ! -f ".venv/bin/uvicorn" ]; then
        echo -e "${RED}✗ Speaches virtual environment not found${NC}"
        echo "Run setup in: $SPEACHES_DIR"
        return 1
    fi
    
    ALLOW_ORIGINS='["http://localhost:5173"]' \
      LD_LIBRARY_PATH="$(pwd)/.cuda-compat:$LD_LIBRARY_PATH" \
      .venv/bin/uvicorn --factory --host 0.0.0.0 --port $SPEACHES_PORT speaches.main:create_app &
    SPEACHES_PID=$!
    
    # Wait for service to be ready
    for i in {1..30}; do
        if check_service $SPEACHES_PORT; then
            echo -e "${GREEN}✓ Speaches ready on port $SPEACHES_PORT${NC}"
            echo $SPEACHES_PID >> "$PIDS_FILE"
            return 0
        fi
        sleep 1
    done
    
    echo -e "${RED}✗ Speaches failed to start${NC}"
    kill $SPEACHES_PID 2>/dev/null || true
    return 1
}

stop_services() {
    echo -e "${YELLOW}Stopping all services...${NC}"
    
    # Kill from PID file
    if [ -f "$PIDS_FILE" ]; then
        while read -r pid; do
            if kill -0 "$pid" 2>/dev/null; then
                echo "Stopping process $pid..."
                kill "$pid" 2>/dev/null || true
                sleep 1
                kill -9 "$pid" 2>/dev/null || true
            fi
        done < "$PIDS_FILE"
        rm -f "$PIDS_FILE"
    fi
    
    # Kill any remaining uvicorn processes on our ports
    lsof -ti:$ML_PORT | xargs kill -9 2>/dev/null || true
    lsof -ti:$SPEACHES_PORT | xargs kill -9 2>/dev/null || true
    
    echo -e "${GREEN}✓ All services stopped${NC}"
}

show_status() {
    echo "AI Assistant Service Status"
    echo "==========================="
    echo ""
    
    if check_service $ML_PORT; then
        echo -e "ML Backend (emotion + BFA) : ${GREEN}✓ Running${NC} on port $ML_PORT"
    else
        echo -e "ML Backend (emotion + BFA) : ${RED}✗ Not running${NC}"
    fi
    
    if check_service $SPEACHES_PORT; then
        echo -e "Speaches (TTS + ASR)       : ${GREEN}✓ Running${NC} on port $SPEACHES_PORT"
    else
        echo -e "Speaches (TTS + ASR)       : ${RED}✗ Not running${NC}"
    fi
    
    echo ""
    echo "Access URLs:"
    echo "  ML Backend API: http://localhost:$ML_PORT"
    echo "  Speaches API:   http://localhost:$SPEACHES_PORT"
}

# Main
main() {
    case "${1:-}" in
        --stop)
            stop_services
            ;;
        --status)
            show_status
            ;;
        --help|-h)
            show_help
            ;;
        "")
            echo "AI Assistant Service Launcher"
            echo "=============================="
            echo ""
            
            # Clear old PID file
            rm -f "$PIDS_FILE"
            
            # Start services
            start_ml_backend
            start_speaches
            
            echo ""
            echo -e "${GREEN}✓ All services started successfully!${NC}"
            echo ""
            show_status
            ;;
        *)
            echo "Unknown command: $1"
            show_help
            exit 1
            ;;
    esac
}

main "$@"
