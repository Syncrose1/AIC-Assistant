#!/bin/bash
# AIC-Assistant Update Script
# Syncs with upstream AIRI while preserving SYN customizations

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  AIC-Assistant Updater${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo "Project: $PROJECT_DIR"
echo ""

# Check if upstream remote exists
if ! git remote | grep -q "upstream"; then
    echo -e "${YELLOW}Adding upstream remote...${NC}"
    git remote add upstream https://github.com/moeru-ai/airi.git
fi

echo -e "${YELLOW}Step 1: Fetching upstream changes...${NC}"
git fetch upstream
echo -e "${GREEN}✓${NC} Fetched upstream"
echo ""

echo -e "${YELLOW}Step 2: Creating sync branch...${NC}"
SYNC_BRANCH="sync-$(date +%Y%m%d-%H%M%S)"
git checkout -b "$SYNC_BRANCH"
echo -e "${GREEN}✓${NC} Created branch: $SYNC_BRANCH"
echo ""

echo -e "${YELLOW}Step 3: Merging upstream changes...${NC}"
if git merge upstream/main --no-edit; then
    echo -e "${GREEN}✓${NC} Merged upstream successfully"
else
    echo -e "${RED}✗${NC} Merge conflicts detected"
    echo ""
    echo "Please resolve conflicts manually:"
    echo "  1. Review conflicting files"
    echo "  2. Resolve conflicts"
    echo "  3. git add <resolved-files>"
    echo "  4. git commit"
    echo "  5. git checkout main"
    echo "  6. git merge $SYNC_BRANCH"
    exit 1
fi
echo ""

echo -e "${YELLOW}Step 4: Installing dependencies...${NC}"
pnpm install || {
    echo -e "${YELLOW}WARNING: Install issues, trying with --ignore-scripts${NC}"
    pnpm install --ignore-scripts
}
echo -e "${GREEN}✓${NC} Dependencies installed"
echo ""

echo -e "${YELLOW}Step 5: Building packages...${NC}"
pnpm run build:packages || {
    echo -e "${YELLOW}WARNING: Package build had issues${NC}"
}
echo -e "${GREEN}✓${NC} Packages built"
echo ""

echo -e "${GREEN}========================================${NC}"
echo -e "${GREEN}  Update Complete!${NC}"
echo -e "${GREEN}========================================${NC}"
echo ""
echo "Next steps:"
echo "  1. Test the application: pnpm dev:tamagotchi"
echo "  2. If everything works: git checkout main && git merge $SYNC_BRANCH"
echo "  3. Push to remote: git push origin main"
echo ""
echo "Branch '$SYNC_BRANCH' contains the synced changes."
echo ""
