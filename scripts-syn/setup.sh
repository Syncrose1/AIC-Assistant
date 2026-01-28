#!/bin/bash
# AIC-Assistant Setup Script
# Sets up the development environment for the fork
# Idempotent: Can be run multiple times safely

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo "=== AIC-Assistant Setup ==="
echo "Project directory: $PROJECT_DIR"
echo ""

# Track what we're doing
STEPS_COMPLETED=0
STEPS_SKIPPED=0

# Step 1: Check prerequisites
echo -e "${BLUE}[1/5]${NC} Checking prerequisites..."
if ! command -v pnpm &> /dev/null; then
    echo -e "${RED}ERROR: pnpm is not installed${NC}"
    echo "Install with: npm install -g pnpm"
    exit 1
fi
echo "  ✓ pnpm found"
echo ""

# Step 2: Install Node dependencies (if needed)
echo -e "${BLUE}[2/5]${NC} Checking Node dependencies..."
if [ -d "$PROJECT_DIR/node_modules" ]; then
    echo "  ✓ node_modules already exists, skipping pnpm install"
    ((STEPS_SKIPPED++))
else
    echo "  -> Installing dependencies..."
    cd "$PROJECT_DIR"
    pnpm install || {
        echo -e "${YELLOW}WARNING: Install failed, trying with --ignore-scripts${NC}"
        pnpm install --ignore-scripts
    }
    echo "  ✓ Dependencies installed"
    ((STEPS_COMPLETED++))
fi
echo ""

# Step 3: Build packages (if needed)
echo -e "${BLUE}[3/5]${NC} Checking packages build..."
# Check if packages are built by looking for dist directories
PACKAGES_NEED_BUILD=0
for pkg in animation-core emotion-visual lipsync-vbridger phoneme-timing; do
    if [ ! -d "$PROJECT_DIR/packages/$pkg/dist" ] && [ -f "$PROJECT_DIR/packages/$pkg/package.json" ]; then
        PACKAGES_NEED_BUILD=1
        break
    fi
done

if [ $PACKAGES_NEED_BUILD -eq 0 ] && [ -d "$PROJECT_DIR/node_modules/.pnpm" ]; then
    echo "  ✓ Packages appear to be built, skipping build"
    ((STEPS_SKIPPED++))
else
    echo "  -> Building packages..."
    cd "$PROJECT_DIR"
    pnpm run build:packages || {
        echo -e "${YELLOW}WARNING: Package build had warnings${NC}"
    }
    echo "  ✓ Packages built"
    ((STEPS_COMPLETED++))
fi
echo ""

# Step 4: Setup ML Backend Service (if needed)
echo -e "${BLUE}[4/5]${NC} Checking SYN ML Backend Service..."
ML_BACKEND_DIR="$PROJECT_DIR/services/syn-ml-backend"

if [ ! -d "$ML_BACKEND_DIR" ]; then
    echo -e "${YELLOW}  -> ML Backend service not found at $ML_BACKEND_DIR${NC}"
    echo ""
else
    # Check if venv exists and has key dependencies
    VENV_OK=0
    if [ -d "$ML_BACKEND_DIR/venv" ] && [ -f "$ML_BACKEND_DIR/venv/bin/python" ]; then
        # Check if transformers is installed (key dependency)
        if "$ML_BACKEND_DIR/venv/bin/pip" show transformers &> /dev/null; then
            VENV_OK=1
        fi
    fi
    
    if [ $VENV_OK -eq 1 ]; then
        echo "  ✓ ML Backend virtual environment already set up with dependencies"
        ((STEPS_SKIPPED++))
    else
        if [ -f "$ML_BACKEND_DIR/scripts/install.sh" ]; then
            echo "  -> Setting up ML Backend (this may take 5-10 minutes)..."
            (cd "$ML_BACKEND_DIR" && bash scripts/install.sh) || {
                echo -e "${YELLOW}WARNING: ML Backend setup failed${NC}"
                echo "  You can manually run: cd $ML_BACKEND_DIR && bash scripts/install.sh"
            }
            echo "  ✓ ML Backend setup complete"
            ((STEPS_COMPLETED++))
        else
            echo -e "${YELLOW}  -> ML Backend install script not found${NC}"
        fi
    fi
fi
echo ""

# Step 5: Setup Speaches Service (prompt if not installed)
echo -e "${BLUE}[5/5]${NC} Checking Speaches (TTS/ASR) Service..."
SPEACHES_DIR="$PROJECT_DIR/services/syn-speaches"

if [ -d "$SPEACHES_DIR" ]; then
    echo "  ✓ Speaches already installed at $SPEACHES_DIR"
    echo "  -> If you need to reconfigure speaches, cd $SPEACHES_DIR and follow its README"
    ((STEPS_SKIPPED++))
else
    echo ""
    echo "Speaches provides local Text-to-Speech and Speech Recognition."
    echo "This is recommended for the best experience."
    echo ""
    read -p "Install Speaches? [Y/n] (default: yes): " -n 1 -r
    REPLY=${REPLY:-Y}  # Default to Y if empty
    echo ""
    
    if [[ $REPLY =~ ^[Yy]$ ]]; then
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
            ((STEPS_COMPLETED++))
        fi
    else
        echo "  -> Skipping Speaches installation"
        echo "  -> You can install later if needed:"
        echo "     cd services && git clone https://github.com/speaches-ai/speaches.git syn-speaches"
    fi
fi
echo ""

# Summary
echo -e "${GREEN}=== Setup Complete ===${NC}"
echo ""
if [ $STEPS_COMPLETED -gt 0 ]; then
    echo "Actions completed: $STEPS_COMPLETED"
fi
if [ $STEPS_SKIPPED -gt 0 ]; then
    echo "Already installed (skipped): $STEPS_SKIPPED"
fi
echo ""
echo "Next steps:"
echo "  1. Start services: ./scripts-syn/launch-services.sh"
echo "  2. Run the app:   pnpm dev:tamagotchi"
echo ""
echo "Documentation:"
echo "  - SYN Conventions: docs-syn/SYN_CONVENTIONS.md"
echo "  - Project Status:  docs-syn/PROJECT_STATUS.md"
echo ""
