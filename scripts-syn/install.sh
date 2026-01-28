#!/bin/bash
# AIRI Mods Installer
# Installs our modification layer onto AIRI

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MODS_DIR="$(dirname "$SCRIPT_DIR")"
AIRI_DIR="$(dirname "$MODS_DIR")/airi"
BACKUP_DIR="$MODS_DIR/.backup"

echo "=== AIRI Mods Installer ==="
echo "Mods directory: $MODS_DIR"
echo "AIRI directory: $AIRI_DIR"
echo ""

# Check AIRI exists
if [ ! -d "$AIRI_DIR" ]; then
    echo "ERROR: AIRI directory not found at $AIRI_DIR"
    exit 1
fi

# Check if already installed
if [ -f "$MODS_DIR/.installed" ]; then
    echo "WARNING: Mods appear to already be installed."
    echo "Run uninstall.sh first if you want to reinstall."
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Create backup directory
mkdir -p "$BACKUP_DIR"

# Step 1: Backup AIRI's pnpm-workspace.yaml
echo "[1/4] Backing up AIRI's pnpm-workspace.yaml..."
cp "$AIRI_DIR/pnpm-workspace.yaml" "$BACKUP_DIR/pnpm-workspace.yaml.bak"

# Step 2: Add our packages to AIRI's workspace
echo "[2/4] Linking mod packages to AIRI workspace..."

# Check if our packages are already in the workspace
if grep -q "airi-mods/packages" "$AIRI_DIR/pnpm-workspace.yaml"; then
    echo "  -> Mod packages already linked"
else
    # Add our packages directory to AIRI's workspace
    # Using relative path from AIRI directory
    echo "  - '../airi-mods/packages/*'" >> "$AIRI_DIR/pnpm-workspace.yaml"
    echo "  -> Added ../airi-mods/packages/* to workspace"
fi

# Step 3: Apply patches
echo "[3/4] Applying patches..."
PATCHES_DIR="$MODS_DIR/patches"
if [ -d "$PATCHES_DIR" ] && [ "$(ls -A "$PATCHES_DIR"/*.patch 2>/dev/null)" ]; then
    for patch in "$PATCHES_DIR"/*.patch; do
        echo "  -> Applying $(basename "$patch")"

        # Backup original files before patching
        # Extract file paths from patch and backup them
        patch_files=$(grep -E "^\+\+\+ " "$patch" | sed 's/+++ [ab]\///' || true)
        for file in $patch_files; do
            if [ -f "$AIRI_DIR/$file" ]; then
                backup_path="$BACKUP_DIR/$(dirname "$file")"
                mkdir -p "$backup_path"
                cp "$AIRI_DIR/$file" "$backup_path/$(basename "$file").bak"
            fi
        done

        # Apply the patch
        (cd "$AIRI_DIR" && git apply "$patch") || {
            echo "  WARNING: Patch $(basename "$patch") failed to apply cleanly"
            echo "  This might be okay if the patch was already applied"
        }
    done
else
    echo "  -> No patches to apply"
fi

# Step 4: Install dependencies and rebuild
echo "[4/4] Installing dependencies and rebuilding..."
(cd "$AIRI_DIR" && pnpm install --ignore-scripts)

# Check if we have any packages to build
if [ -d "$MODS_DIR/packages" ] && [ "$(ls -A "$MODS_DIR/packages" 2>/dev/null)" ]; then
    echo "  -> Building mod packages..."
    (cd "$AIRI_DIR" && pnpm run build:packages) || {
        echo "  WARNING: Build failed. You may need to build manually."
    }
fi

# Step 5: Setup ML Backend Service
echo "[5/5] Setting up ML Backend Service..."
ML_BACKEND_DIR="$MODS_DIR/services/ml-backend"
if [ -d "$ML_BACKEND_DIR" ]; then
    if [ -f "$ML_BACKEND_DIR/scripts/install.sh" ]; then
        (cd "$ML_BACKEND_DIR" && bash scripts/install.sh) || {
            echo "  WARNING: ML Backend setup failed. Service may not work."
            echo "  You can manually run: $ML_BACKEND_DIR/scripts/install.sh"
        }
    else
        echo "  -> ML Backend install script not found, skipping"
    fi
else
    echo "  -> ML Backend service not found, skipping"
fi

# Mark as installed
echo "$(date)" > "$MODS_DIR/.installed"
echo "$AIRI_DIR" >> "$MODS_DIR/.installed"

echo ""
echo "=== Installation Complete ==="
echo ""
echo "Next steps:"
echo "  1. Create packages in $MODS_DIR/packages/"
echo "  2. Run 'pnpm install' in AIRI to link new packages"
echo "  3. Import your packages in AIRI code or via patches"
echo ""
echo "ML Backend Service:"
echo "  - Setup complete (if no errors above)"
echo "  - Will auto-start when you run the app"
echo "  - Manual start: $ML_BACKEND_DIR/launcher.py"
echo ""
echo "To uninstall: ./scripts/uninstall.sh"
