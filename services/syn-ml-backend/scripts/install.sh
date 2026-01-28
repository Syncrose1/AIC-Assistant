#!/bin/bash
#
# Install script for ML Backend Service
# Called by main install.sh in airi-mods/
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SERVICE_DIR="$(dirname "$SCRIPT_DIR")"
VENV_DIR="$SERVICE_DIR/venv"

echo "========================================"
echo "Setting up ML Backend Service"
echo "========================================"

# Check Python version
if ! command -v python3 &> /dev/null; then
    echo "Error: python3 is required but not installed"
    exit 1
fi

PYTHON_VERSION=$(python3 --version 2>&1 | grep -oP '\d+\.\d+' | head -1)
REQUIRED_VERSION="3.8"

if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$PYTHON_VERSION" | sort -V | head -n1)" != "$REQUIRED_VERSION" ]; then
    echo "Error: Python 3.8+ required (found $PYTHON_VERSION)"
    exit 1
fi

echo "✓ Python version: $PYTHON_VERSION"

# Create virtual environment if it doesn't exist
if [ ! -d "$VENV_DIR" ]; then
    echo "Creating virtual environment..."
    python3 -m venv "$VENV_DIR"
    echo "✓ Virtual environment created"
else
    echo "✓ Virtual environment exists"
fi

# Install dependencies
echo "Installing dependencies..."
if [ -f "$VENV_DIR/bin/pip" ]; then
    "$VENV_DIR/bin/pip" install -q --upgrade pip
    "$VENV_DIR/bin/pip" install -q -r "$SERVICE_DIR/requirements.txt"
else
    "$VENV_DIR/Scripts/pip" install -q --upgrade pip
    "$VENV_DIR/Scripts/pip" install -q -r "$SERVICE_DIR/requirements.txt"
fi

echo "✓ Dependencies installed"

# Check system dependencies
echo "Checking system dependencies..."
if ! command -v espeak-ng &> /dev/null; then
    echo "⚠ Warning: espeak-ng not found. Install with:"
    echo "   sudo pacman -S espeak-ng    # Arch/CachyOS"
    echo "   sudo apt-get install espeak-ng  # Ubuntu/Debian"
fi

if ! command -v ffmpeg &> /dev/null; then
    echo "⚠ Warning: ffmpeg not found. Install with:"
    echo "   sudo pacman -S ffmpeg       # Arch/CachyOS"
    echo "   sudo apt-get install ffmpeg   # Ubuntu/Debian"
fi

echo "✓ System dependencies checked"

echo "========================================"
echo "ML Backend Service setup complete!"
echo "========================================"
echo ""
echo "The service will start automatically when you run the app."
echo "Manual start: $SERVICE_DIR/launcher.py"
echo ""
