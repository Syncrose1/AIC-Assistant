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

# Helper function to increment counters without triggering set -e
increment_completed() {
    STEPS_COMPLETED=$((STEPS_COMPLETED + 1))
}

increment_skipped() {
    STEPS_SKIPPED=$((STEPS_SKIPPED + 1))
}

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
    increment_skipped
else
    echo "  -> Installing dependencies..."
    cd "$PROJECT_DIR"
    pnpm install || {
        echo -e "${YELLOW}WARNING: Install failed, trying with --ignore-scripts${NC}"
        pnpm install --ignore-scripts
    }
    echo "  ✓ Dependencies installed"
    increment_completed
fi
echo ""

# Step 3: Build packages (if needed)
echo -e "${BLUE}[3/5]${NC} Checking packages build..."
# Check if packages are built by looking for dist directories
# Only check packages that have a "build" script in package.json
PACKAGES_NEED_BUILD=0
for pkg in emotion-visual lipsync-vbridger phoneme-timing; do
    if [ -f "$PROJECT_DIR/packages/$pkg/package.json" ]; then
        # Check if package has a build script AND doesn't have dist
        if grep -q '"build"' "$PROJECT_DIR/packages/$pkg/package.json" 2>/dev/null; then
            if [ ! -d "$PROJECT_DIR/packages/$pkg/dist" ]; then
                PACKAGES_NEED_BUILD=1
                break
            fi
        fi
    fi
done

if [ $PACKAGES_NEED_BUILD -eq 0 ]; then
    echo "  ✓ Packages already built (or don't need building)"
    increment_skipped
else
    echo "  -> Building packages..."
    cd "$PROJECT_DIR"
    pnpm run build:packages 2>&1 | tail -5 || {
        echo -e "${YELLOW}WARNING: Package build completed with warnings${NC}"
    }
    echo "  ✓ Packages built"
    increment_completed
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
        increment_skipped
    else
        if [ -f "$ML_BACKEND_DIR/scripts/install.sh" ]; then
            echo "  -> Setting up ML Backend (this may take 5-10 minutes)..."
            (cd "$ML_BACKEND_DIR" && bash scripts/install.sh) || {
                echo -e "${YELLOW}WARNING: ML Backend setup failed${NC}"
                echo "  You can manually run: cd $ML_BACKEND_DIR && bash scripts/install.sh"
            }
            echo "  ✓ ML Backend setup complete"
            increment_completed
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
    increment_skipped
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
            
            # Automatically run setup-speaches.sh
            echo "  -> Setting up Speaches dependencies (this may take 5-10 minutes)..."
            if [ -f "$SCRIPT_DIR/setup-speaches.sh" ]; then
                "$SCRIPT_DIR/setup-speaches.sh" || {
                    echo -e "${YELLOW}WARNING: Speaches setup had some issues${NC}"
                    echo "  You can retry manually with: ./scripts-syn/setup-speaches.sh"
                }
            else
                echo -e "${YELLOW}WARNING: setup-speaches.sh not found${NC}"
                echo "  Please run manually: ./scripts-syn/setup-speaches.sh"
            fi
            increment_completed
        fi
    else
        echo "  -> Skipping Speaches installation"
        echo "  -> You can install later if needed:"
        echo "     cd services && git clone https://github.com/speaches-ai/speaches.git syn-speaches"
        echo "     ./scripts-syn/setup-speaches.sh"
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
echo "Next step: Run the app"
echo "  pnpm dev:tamagotchi"
echo ""
echo "Services will auto-start when the app launches!"
echo ""
echo "Optional: Download TTS/ASR models for Speaches"
echo "After starting the app, run these commands to download models:"
echo ""
echo "1. Kokoro TTS model (~350MB):"
echo "   curl -X POST \"http://localhost:8000/v1/models/speaches-ai%2FKokoro-82M-v1.0-ONNX-fp16\""
echo ""
echo "2. Whisper STT model (~1.5GB):"
echo "   curl -X POST \"http://localhost:8000/v1/models/Systran%2Ffaster-distil-whisper-large-v3\""
echo ""
echo "Or visit http://localhost:8000/ to use the web UI for model downloads."
echo ""
echo "Documentation:"
echo "  - SYN Conventions: docs-syn/SYN_CONVENTIONS.md"
echo "  - Project Status:  docs-syn/PROJECT_STATUS.md"
echo ""
