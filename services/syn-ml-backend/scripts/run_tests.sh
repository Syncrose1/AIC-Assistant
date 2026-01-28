#!/bin/bash
#
# Quick test runner for ML Backend Service
# Usage: ./scripts/run_tests.sh
#

set -e

cd "$(dirname "$0")/.."

echo "=========================================="
echo "ML Backend Service Test Suite"
echo "=========================================="
echo ""

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "Error: Virtual environment not found"
    echo "Run: bash scripts/install.sh"
    exit 1
fi

# Activate virtual environment
echo "Activating virtual environment..."
if [ -f "venv/bin/activate" ]; then
    source venv/bin/activate
else
    echo "Error: Could not find venv activation script"
    exit 1
fi

# Install test dependencies
echo "Installing test dependencies..."
pip install -q pytest pytest-asyncio aiohttp psutil requests

# Check if service is running
echo ""
echo "Checking if service is running..."
if curl -s http://127.0.0.1:8001/health > /dev/null 2>&1; then
    echo "✓ Service is running"
else
    echo "⚠ Service not running. Starting it now..."
    python -m uvicorn src.main:app --host 127.0.0.1 --port 8001 &
    SERVICE_PID=$!
    
    # Wait for service to start
    echo "Waiting for service to start..."
    for i in {1..30}; do
        if curl -s http://127.0.0.1:8001/health > /dev/null 2>&1; then
            echo "✓ Service started"
            break
        fi
        sleep 1
    done
fi

echo ""
echo "=========================================="
echo "Running Comprehensive Diagnostic..."
echo "=========================================="
echo ""

# Run comprehensive test
python scripts/test_service.py

# Cleanup
if [ ! -z "$SERVICE_PID" ]; then
    echo ""
    echo "Stopping temporary service..."
    kill $SERVICE_PID 2>/dev/null || true
fi

echo ""
echo "=========================================="
echo "Test Complete"
echo "=========================================="
