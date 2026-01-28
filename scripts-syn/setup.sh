#!/bin/bash
# AIC-Assistant Setup Script
# Sets up the development environment for the fork

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo "=== AIC-Assistant Setup ==="
echo "Project directory: $PROJECT_DIR"
echo ""

# Check Node.js and pnpm
echo "[1/4] Checking prerequisites..."
if ! command -v pnpm &> /dev/null; then
    echo -e "${RED}ERROR: pnpm is not installed${NC}"
    echo "Install with: npm install -g pnpm"
    exit 1
fi
echo "  ✓ pnpm found"

# Install dependencies
echo "[2/4] Installing dependencies..."
cd "$PROJECT_DIR"
pnpm install || {
    echo -e "${YELLOW}WARNING: Install failed, trying with --ignore-scripts${NC}"
    pnpm install --ignore-scripts
}
echo "  ✓ Dependencies installed"

# Build packages
echo "[3/4] Building packages..."
pnpm run build:packages || {
    echo -e "${YELLOW}WARNING: Package build failed${NC}"
    echo "  You may need to build manually with: pnpm run build:packages"
}
echo "  ✓ Packages built"

# Setup ML Backend Service
echo "[4/4] Setting up SYN ML Backend Service..."
ML_BACKEND_DIR="$PROJECT_DIR/services/syn-ml-backend"
if [ -d "$ML_BACKEND_DIR" ]; then
    if [ -f "$ML_BACKEND_DIR/scripts/install.sh" ]; then
        echo "  -> Running ML Backend install script..."
        (cd "$ML_BACKEND_DIR" && bash scripts/install.sh) || {
            echo -e "${YELLOW}WARNING: ML Backend setup failed${NC}"
            echo "  You can manually run: cd $ML_BACKEND_DIR && bash scripts/install.sh"
        }
    else
        echo -e "${YELLOW}  -> ML Backend install script not found${NC}"
    fi
else
    echo -e "${YELLOW}  -> ML Backend service not found at $ML_BACKEND_DIR${NC}"
fi

echo ""
echo -e "${GREEN}=== Setup Complete ===${NC}"
echo ""
echo "Next steps:"
echo "  1. Start services: ./scripts-syn/launch-services.sh"
echo "  2. Run the app:   pnpm dev:tamagotchi"
echo ""
echo "Documentation:"
echo "  - SYN Conventions: docs-syn/SYN_CONVENTIONS.md"
echo "  - Project Status:  docs-syn/PROJECT_STATUS.md"
echo ""
