#!/bin/bash
# Create a patch file from changes in AIRI
# Usage: ./create-patch.sh "description of changes"

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MODS_DIR="$(dirname "$SCRIPT_DIR")"
AIRI_DIR="$(dirname "$MODS_DIR")/airi"
PATCHES_DIR="$MODS_DIR/patches"

if [ -z "$1" ]; then
    echo "Usage: $0 \"description of changes\""
    echo ""
    echo "This script creates a patch file from uncommitted changes in AIRI."
    echo "The patch will be saved to: $PATCHES_DIR/"
    exit 1
fi

DESCRIPTION="$1"

# Create patches directory if it doesn't exist
mkdir -p "$PATCHES_DIR"

# Get next patch number
NEXT_NUM=$(printf "%02d" $(($(ls "$PATCHES_DIR"/*.patch 2>/dev/null | wc -l) + 1)))

# Sanitize description for filename
SAFE_DESC=$(echo "$DESCRIPTION" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9]/-/g' | sed 's/--*/-/g' | sed 's/^-//' | sed 's/-$//')

PATCH_FILE="$PATCHES_DIR/${NEXT_NUM}-${SAFE_DESC}.patch"

echo "=== Creating Patch ==="
echo "Description: $DESCRIPTION"
echo "Output file: $PATCH_FILE"
echo ""

# Check for changes
cd "$AIRI_DIR"

if [ -z "$(git status --porcelain)" ]; then
    echo "ERROR: No changes detected in AIRI directory."
    echo "Make your changes first, then run this script."
    exit 1
fi

# Show what will be included
echo "Changes to be included in patch:"
echo "--------------------------------"
git status --short
echo "--------------------------------"
echo ""

read -p "Create patch from these changes? (y/N) " -n 1 -r
echo

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Aborted."
    exit 1
fi

# Create the patch
git diff > "$PATCH_FILE"

# Add a header comment to the patch
TEMP_FILE=$(mktemp)
cat > "$TEMP_FILE" << EOF
# Patch: $DESCRIPTION
# Created: $(date)
# Apply with: git apply [this-file]
# Reverse with: git apply -R [this-file]
#
$(cat "$PATCH_FILE")
EOF
mv "$TEMP_FILE" "$PATCH_FILE"

echo ""
echo "Patch created: $PATCH_FILE"
echo ""
echo "Next steps:"
echo "  1. Review the patch: cat $PATCH_FILE"
echo "  2. Test applying: cd $AIRI_DIR && git apply $PATCH_FILE"
echo "  3. Revert AIRI changes: cd $AIRI_DIR && git checkout ."
echo ""
echo "The patch will be applied automatically by install.sh"
