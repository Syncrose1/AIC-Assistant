#!/bin/bash
# AIRI Mods Uninstaller
# Removes our modification layer and restores vanilla AIRI

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MODS_DIR="$(dirname "$SCRIPT_DIR")"
AIRI_DIR="$(dirname "$MODS_DIR")/airi"
BACKUP_DIR="$MODS_DIR/.backup"

echo "=== AIRI Mods Uninstaller ==="
echo "Mods directory: $MODS_DIR"
echo "AIRI directory: $AIRI_DIR"
echo ""

# Check if installed
if [ ! -f "$MODS_DIR/.installed" ]; then
    echo "WARNING: Mods don't appear to be installed."
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Step 1: Reverse patches
echo "[1/4] Reversing patches..."
PATCHES_DIR="$MODS_DIR/patches"
if [ -d "$PATCHES_DIR" ] && [ "$(ls -A "$PATCHES_DIR"/*.patch 2>/dev/null)" ]; then
    # Apply patches in reverse order
    for patch in $(ls -r "$PATCHES_DIR"/*.patch 2>/dev/null); do
        echo "  -> Reversing $(basename "$patch")"
        (cd "$AIRI_DIR" && git apply -R "$patch") || {
            echo "  WARNING: Reverse patch $(basename "$patch") failed"
            echo "  Attempting to restore from backup..."

            # Try to restore from backup
            patch_files=$(grep -E "^\+\+\+ " "$patch" | sed 's/+++ [ab]\///' || true)
            for file in $patch_files; do
                backup_file="$BACKUP_DIR/$(dirname "$file")/$(basename "$file").bak"
                if [ -f "$backup_file" ]; then
                    cp "$backup_file" "$AIRI_DIR/$file"
                    echo "    -> Restored $file from backup"
                fi
            done
        }
    done
else
    echo "  -> No patches to reverse"
fi

# Step 2: Restore pnpm-workspace.yaml
echo "[2/4] Restoring AIRI's pnpm-workspace.yaml..."
if [ -f "$BACKUP_DIR/pnpm-workspace.yaml.bak" ]; then
    cp "$BACKUP_DIR/pnpm-workspace.yaml.bak" "$AIRI_DIR/pnpm-workspace.yaml"
    echo "  -> Restored from backup"
else
    # Manual removal of our entry
    echo "  -> No backup found, manually removing mod entry..."
    sed -i "/airi-mods\/packages/d" "$AIRI_DIR/pnpm-workspace.yaml"
fi

# Step 3: Clean node_modules links
echo "[3/4] Cleaning workspace links..."
(cd "$AIRI_DIR" && pnpm install --ignore-scripts) || {
    echo "  WARNING: pnpm install failed. You may need to run it manually."
}

# Step 4: Rebuild
echo "[4/4] Rebuilding AIRI..."
(cd "$AIRI_DIR" && pnpm run build:packages) || {
    echo "  WARNING: Build failed. You may need to build manually."
}

# Remove installation marker
rm -f "$MODS_DIR/.installed"

# Clean up backup directory (optional - comment out to keep backups)
# rm -rf "$BACKUP_DIR"

echo ""
echo "=== Uninstallation Complete ==="
echo ""
echo "AIRI has been restored to vanilla state."
echo "Backup files are preserved in: $BACKUP_DIR"
echo ""
echo "To reinstall mods: ./scripts/install.sh"
