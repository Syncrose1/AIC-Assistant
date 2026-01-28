#!/bin/bash
# Update AIRI while preserving mods
# This script safely updates AIRI and reapplies our modifications

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MODS_DIR="$(dirname "$SCRIPT_DIR")"
AIRI_DIR="$(dirname "$MODS_DIR")/airi"

echo "=== AIRI Update Script ==="
echo "This will:"
echo "  1. Uninstall mods (reverse patches)"
echo "  2. Pull latest AIRI"
echo "  3. Reinstall mods"
echo ""

# Check if AIRI is a git repo
if [ ! -d "$AIRI_DIR/.git" ]; then
    echo "ERROR: AIRI directory is not a git repository."
    echo "Cannot pull updates automatically."
    exit 1
fi

# Check for uncommitted changes in AIRI
cd "$AIRI_DIR"
if [ -n "$(git status --porcelain)" ]; then
    echo "WARNING: AIRI has uncommitted changes:"
    git status --short
    echo ""
    read -p "Stash these changes and continue? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
    git stash
    STASHED=1
fi

# Step 1: Uninstall mods
echo "[1/4] Uninstalling mods..."
if [ -f "$MODS_DIR/.installed" ]; then
    "$SCRIPT_DIR/uninstall.sh"
else
    echo "  -> Mods not installed, skipping"
fi

# Step 2: Pull latest AIRI
echo "[2/4] Pulling latest AIRI..."
cd "$AIRI_DIR"
BEFORE_HASH=$(git rev-parse HEAD)
git pull --rebase origin main || git pull origin main
AFTER_HASH=$(git rev-parse HEAD)

if [ "$BEFORE_HASH" = "$AFTER_HASH" ]; then
    echo "  -> Already up to date"
else
    echo "  -> Updated from $(echo $BEFORE_HASH | cut -c1-8) to $(echo $AFTER_HASH | cut -c1-8)"
    echo ""
    echo "  Changes:"
    git log --oneline "$BEFORE_HASH..$AFTER_HASH" | head -20
fi

# Step 3: Reinstall mods
echo ""
echo "[3/4] Reinstalling mods..."
"$SCRIPT_DIR/install.sh"

# Step 4: Restore stashed changes if any
if [ -n "$STASHED" ]; then
    echo "[4/4] Restoring stashed changes..."
    cd "$AIRI_DIR"
    git stash pop || {
        echo "WARNING: Failed to restore stashed changes."
        echo "Your changes are still in the stash. Run 'git stash pop' manually."
    }
else
    echo "[4/4] No stashed changes to restore"
fi

echo ""
echo "=== Update Complete ==="
echo ""
echo "If patches failed to apply, you may need to:"
echo "  1. Check $MODS_DIR/patches/ for conflicts"
echo "  2. Update patches for new AIRI version"
echo "  3. Run install.sh again"
