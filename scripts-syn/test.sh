#!/bin/bash
# AIC-Assistant Comprehensive Test Suite
# Tests all SYN custom components and services

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Counters
TESTS_PASSED=0
TESTS_FAILED=0

# Test functions
test_pass() {
    echo -e "${GREEN}✓${NC} $1"
    ((TESTS_PASSED++))
}

test_fail() {
    echo -e "${RED}✗${NC} $1"
    ((TESTS_FAILED++))
}

test_section() {
    echo ""
    echo -e "${BLUE}========================================${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}========================================${NC}"
    echo ""
}

# Main test suite
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  AIC-Assistant Test Suite${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo "Project: $PROJECT_DIR"
echo "Date: $(date)"
echo ""

# Test 1: Directory Structure
test_section "1. Directory Structure"

if [ -d "$PROJECT_DIR/services/syn-ml-backend" ]; then
    test_pass "syn-ml-backend service exists"
else
    test_fail "syn-ml-backend service not found"
fi

if [ -d "$PROJECT_DIR/docs-syn" ]; then
    test_pass "docs-syn/ documentation exists"
else
    test_fail "docs-syn/ not found"
fi

if [ -d "$PROJECT_DIR/scripts-syn" ]; then
    test_pass "scripts-syn/ exists"
else
    test_fail "scripts-syn/ not found"
fi

# Test 2: Services
test_section "2. Service Files"

if [ -f "$PROJECT_DIR/services/syn-ml-backend/launcher.py" ]; then
    test_pass "ML Backend launcher exists"
else
    test_fail "ML Backend launcher not found"
fi

if [ -f "$PROJECT_DIR/services/syn-ml-backend/src/main.py" ]; then
    test_pass "ML Backend main.py exists"
else
    test_fail "ML Backend main.py not found"
fi

if [ -f "$PROJECT_DIR/services/launch-services.sh" ]; then
    test_pass "Service launcher script exists"
else
    test_fail "Service launcher script not found"
fi

# Test 3: Documentation
test_section "3. Documentation"

if [ -f "$PROJECT_DIR/docs-syn/SYN_CONVENTIONS.md" ]; then
    test_pass "SYN_CONVENTIONS.md exists"
else
    test_fail "SYN_CONVENTIONS.md not found"
fi

if [ -f "$PROJECT_DIR/docs-syn/PROJECT_STATUS.md" ]; then
    test_pass "PROJECT_STATUS.md exists"
else
    test_fail "PROJECT_STATUS.md not found"
fi

if [ -f "$PROJECT_DIR/docs-syn/README.md" ]; then
    test_pass "docs-syn/README.md exists"
else
    test_fail "docs-syn/README.md not found"
fi

# Test 4: Custom Code
test_section "4. Custom Code Integration"

if [ -f "$PROJECT_DIR/apps/stage-tamagotchi/src/main/syn-service-manager.ts" ]; then
    test_pass "SYNServiceManager exists"
else
    test_fail "SYNServiceManager not found"
fi

# Check if packages exist
CUSTOM_PACKAGES=("animation-core" "emotion-visual" "lipsync-vbridger" "phoneme-timing")
for pkg in "${CUSTOM_PACKAGES[@]}"; do
    if [ -d "$PROJECT_DIR/packages/$pkg" ]; then
        test_pass "Package '$pkg' exists"
    else
        test_fail "Package '$pkg' not found"
    fi
done

# Test 5: Scripts
test_section "5. Utility Scripts"

SCRIPTS=("setup.sh" "update.sh" "launch-services.sh")
for script in "${SCRIPTS[@]}"; do
    if [ -f "$PROJECT_DIR/scripts-syn/$script" ]; then
        test_pass "Script '$script' exists"
    else
        test_fail "Script '$script' not found"
    fi
done

# Test 6: Service Health (if running)
test_section "6. Service Health"

if curl -s "http://127.0.0.1:8001/health" > /dev/null 2>&1; then
    test_pass "ML Backend (port 8001) is running"
    
    # Test emotion detection
    EMOTION_RESULT=$(curl -s -X POST "http://127.0.0.1:8001/detect-emotion" \
        -H "Content-Type: application/json" \
        -d '{"text": "I am so happy today!"}' 2>/dev/null || echo "")
    
    if echo "$EMOTION_RESULT" | grep -q "emotion"; then
        test_pass "Emotion detection endpoint working"
    else
        test_fail "Emotion detection endpoint not responding correctly"
    fi
else
    test_fail "ML Backend (port 8001) is not running"
    echo -e "${YELLOW}  Tip: Run ./services/launch-services.sh to start services${NC}"
fi

# Summary
echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  Test Summary${NC}"
echo -e "${BLUE}========================================${NC}"
echo ""
echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Failed: $TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All tests passed!${NC}"
    echo ""
    echo "The AIC-Assistant fork is properly set up and ready to use."
    exit 0
else
    echo -e "${YELLOW}⚠ Some tests failed${NC}"
    echo ""
    echo "Please review the failures above and:"
    echo "  1. Ensure all files were properly transferred"
    echo "  2. Run ./scripts-syn/setup.sh if needed"
    echo "  3. Start services with ./services/launch-services.sh"
    exit 1
fi
