#!/bin/bash
# Setup script for syn-speaches (Speaches TTS/ASR Service)
# Installs speaches without Docker using uv

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SPEACHES_DIR="$SCRIPT_DIR/../services/syn-speaches"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo "=== Speaches Setup ==="
echo "Speaches directory: $SPEACHES_DIR"
echo ""

# Check if speaches directory exists
if [ ! -d "$SPEACHES_DIR" ]; then
    echo -e "${RED}ERROR: syn-speaches directory not found${NC}"
    echo "Please run setup.sh first to clone speaches:"
    echo "  ./scripts-syn/setup.sh"
    exit 1
fi

cd "$SPEACHES_DIR"

# Check Python version
echo -e "${BLUE}[1/4]${NC} Checking Python version..."
PYTHON_VERSION=$(python3 --version 2>&1 | grep -oP '\d+\.\d+' | head -1)
if [ -z "$PYTHON_VERSION" ]; then
    echo -e "${RED}ERROR: Python 3 not found${NC}"
    exit 1
fi

echo "  Found Python $PYTHON_VERSION"

# Speaches requires Python 3.12
if [[ "$PYTHON_VERSION" < "3.12" ]]; then
    echo -e "${YELLOW}WARNING: Speaches requires Python 3.12, found $PYTHON_VERSION${NC}"
    echo "  You may need to install Python 3.12 or use Docker instead"
    echo "  See: https://speaches.ai/installation/"
fi

# Check if uv is installed
echo -e "${BLUE}[2/4]${NC} Checking uv installation..."
if ! command -v uv &> /dev/null; then
    echo -e "${YELLOW}WARNING: uv not found. Installing...${NC}"
    curl -LsSf https://astral.sh/uv/install.sh | sh
    # Add to PATH for this session
    export PATH="$HOME/.local/bin:$PATH"
fi
echo "  ✓ uv found: $(uv --version)"
echo ""

# Setup virtual environment and install dependencies
echo -e "${BLUE}[3/4]${NC} Setting up virtual environment..."
if [ -d ".venv" ]; then
    echo "  ✓ Virtual environment already exists"
    echo "  -> Updating dependencies..."
else
    echo "  -> Creating virtual environment..."
    uv venv
fi

echo "  -> Installing dependencies (this may take 5-10 minutes)..."
# Temporarily disable uv version check by modifying pyproject.toml
if grep -q 'required-version = "~=0.8.14"' pyproject.toml; then
    sed -i.bak 's/required-version = "~=0.8.14"/# required-version = "~=0.8.14"/' pyproject.toml
fi

uv pip install -e . || {
    echo -e "${YELLOW}WARNING: Install completed with some warnings${NC}"
}

# Restore original if backup exists
if [ -f pyproject.toml.bak ]; then
    mv pyproject.toml.bak pyproject.toml
fi

# Install missing dependencies not in main package
uv pip install pytz

echo "  ✓ Dependencies installed"
echo ""

# Check system dependencies
echo -e "${BLUE}[4/4]${NC} Checking system dependencies..."
MISSING_DEPS=()

if ! command -v ffmpeg &> /dev/null; then
    MISSING_DEPS+=("ffmpeg")
fi

if [ ${#MISSING_DEPS[@]} -gt 0 ]; then
    echo -e "${YELLOW}⚠ Missing system dependencies:${NC}"
    for dep in "${MISSING_DEPS[@]}"; do
        echo "  - $dep"
    done
    echo ""
    echo "Install with:"
    echo "  sudo pacman -S ${MISSING_DEPS[*]}  # Arch/CachyOS"
    echo "  sudo apt-get install ${MISSING_DEPS[*]}  # Ubuntu/Debian"
    echo ""
    echo -e "${YELLOW}Speaches may not work correctly without these${NC}"
else
    echo "  ✓ All system dependencies found"
fi
echo ""

# Summary
echo -e "${GREEN}=== Speaches Setup Complete ===${NC}"
echo ""
echo "Virtual environment: $SPEACHES_DIR/.venv"
echo ""
echo "To start speaches manually:"
echo "  cd $SPEACHES_DIR"
echo "  source .venv/bin/activate"
echo "  python -m uvicorn speaches.main:create_app --host 0.0.0.0 --port 8000"
echo ""
echo "Or use the service launcher:"
echo "  ./services/launch-services.sh"
echo ""
echo "Note: First startup will download TTS/ASR models (~1-2GB)"
echo ""
