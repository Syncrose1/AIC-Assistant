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
echo "[4/5] Setting up SYN ML Backend Service..."
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

# Setup Speaches Service (Optional but recommended)
echo "[5/5] Setting up Speaches (TTS/ASR) Service..."
echo ""
echo "Speaches provides local Text-to-Speech and Speech Recognition."
echo "This is recommended for the best experience."
echo ""
read -p "Install Speaches? [Y/n] (default: yes): " -n 1 -r
REPLY=${REPLY:-Y}  # Default to Y if empty
echo ""

if [[ $REPLY =~ ^[Yy]$ ]]; then
    SPEACHES_DIR="$PROJECT_DIR/services/syn-speaches"
    
    if [ -d "$SPEACHES_DIR" ]; then
        echo "  -> Speaches already installed at $SPEACHES_DIR"
        echo "  -> Skipping installation"
    else
        echo "  -> Cloning Speaches repository..."
        (cd "$PROJECT_DIR/services" && git clone https://github.com/speaches-ai/speaches.git syn-speaches) || {
            echo -e "${YELLOW}WARNING: Failed to clone Speaches repository${NC}"
            echo "  You can manually install later:"
            echo "    cd services && git clone https://github.com/speaches-ai/speaches.git syn-speaches"
        }
        
        if [ -d "$SPEACHES_DIR" ]; then
            echo ""
            echo -e "${GREEN}✓ Speaches cloned successfully${NC}"
            echo ""
            echo "  IMPORTANT: Speaches requires additional setup:"
            echo "    1. cd $SPEACHES_DIR"
            echo "    2. Follow the setup instructions in the speaches README"
            echo "    3. Typically involves: docker compose up -d or Python venv setup"
            echo ""
            echo "  After setup, both services will start with: ./services/launch-services.sh"
        fi
    fi
else
    echo "  -> Skipping Speaches installation"
    echo "  -> You can install later if needed (see docs-syn/SETUP.md)"
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
