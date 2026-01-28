# AIC-Assistant Setup Guide

**Date:** 2026-01-28
**Purpose:** Complete setup instructions for the AIC-Assistant fork

## Quick Start (5 minutes)

```bash
# 1. Clone the repository
git clone https://github.com/Syncrose1/AIC-Assistant.git
cd AIC-Assistant

# 2. Run setup
./scripts-syn/setup.sh

# 3. Start services
./services/launch-services.sh

# 4. Run the app (in another terminal)
pnpm dev:tamagotchi
```

## Prerequisites

### Required Software

- **Node.js** 18+ and **pnpm**
  ```bash
  # Install pnpm
  npm install -g pnpm
  ```

- **Python** 3.11+ (for ML Backend)
  ```bash
  # Verify Python version
  python3 --version  # Should be 3.11 or higher
  ```

- **Git** with upstream support

### Optional

- **CUDA** 12.0+ (for GPU acceleration)
- **speaches** (for TTS/ASR - see Optional Services below)

## Detailed Setup

### Step 1: Clone Repository

```bash
git clone https://github.com/Syncrose1/AIC-Assistant.git
cd AIC-Assistant
```

### Step 2: Setup Development Environment

Run the automated setup script:

```bash
./scripts-syn/setup.sh
```

This will:
1. ✅ Check prerequisites (pnpm, node)
2. ✅ Install dependencies (`pnpm install`)
3. ✅ Build packages (`pnpm run build:packages`)
4. ✅ Setup **syn-ml-backend** service (create venv, install Python deps)
5. ✅ Prompt to install **syn-speaches** (TTS/ASR) - **Optional, defaults to YES**

**What's installed:**
- ✅ syn-ml-backend (ML Backend for emotion detection) - **Required**
- ✅ syn-speaches (TTS/ASR) - **Optional, defaults to YES**

**Expected output:**
```
=== AIC-Assistant Setup ===
Project directory: /path/to/AIC-Assistant

[1/5] Checking prerequisites...
  ✓ pnpm found
[2/5] Installing dependencies...
  ✓ Dependencies installed
[3/5] Building packages...
  ✓ Packages built
[4/5] Setting up SYN ML Backend Service...
  -> Running ML Backend install script...
  ✓ ML Backend setup complete
[5/5] Setting up Speaches (TTS/ASR) Service...

Speaches provides local Text-to-Speech and Speech Recognition.
This is recommended for the best experience.

Install Speaches? [Y/n] (default: yes): Y
  -> Cloning Speaches repository...
  -> Speaches cloned successfully

IMPORTANT: Speaches requires additional setup:
  1. cd /path/to/AIC-Assistant/services/syn-speaches
  2. Follow the setup instructions in the speaches README
  3. Typically involves: docker compose up -d or Python venv setup

=== Setup Complete ===

Next steps:
  1. Start services: ./scripts-syn/launch-services.sh
  2. Run the app:   pnpm dev:tamagotchi
```

### Step 3: Start Services

Start the ML Backend and optionally Speaches:

```bash
./services/launch-services.sh
```

**Expected output (without Speaches):**
```
AI Assistant Service Launcher
==============================

Starting ML Backend (emotion + BFA)...
✓ ML Backend ready on port 8001

Starting Speaches (TTS + ASR)...
✗ Speaches directory not found at /path/to/AIC-Assistant/services/syn-speaches
Please clone and setup speaches first
```

**This is OK!** Speaches is optional. The ML Backend (required) is running.

**Expected output (with Speaches installed):**
```
AI Assistant Service Launcher
==============================

Starting ML Backend (emotion + BFA)...
✓ ML Backend ready on port 8001

Starting Speaches (TTS + ASR)...
✓ Speaches ready on port 8000

✓ All services started successfully!
```

### Step 4: Run the Application

In a **new terminal**:

```bash
cd /path/to/AIC-Assistant
pnpm dev:tamagotchi
```

The app will open in a desktop window. You should see:
- `[SYN] Starting external services...` in console
- `[SYN] ✓ ML Backend ready on port 8001`
- `[SYN] ✓ All services started successfully`

## Optional Services

### syn-speaches (TTS/ASR)

**syn-speaches is OPTIONAL but prompted during setup (defaults to YES).**

**What is it?**
- Text-to-Speech (Kokoro TTS)
- Automatic Speech Recognition (Whisper)
- **Status:** Temporary solution, will be replaced with internal TTS in Phase 5

**Do you need it?**
- ✅ **Yes:** If you want local TTS/ASR instead of cloud APIs
- ❌ **No:** If you're using ElevenLabs, Azure, or other cloud TTS providers

**The app works perfectly without it** - you'll just use cloud TTS providers instead.

**During setup:**
The setup script will ask: `Install Speaches? [Y/n] (default: yes)`
- Press **Enter** or type **Y** → Clones speaches repository
- Type **N** → Skips speaches installation

**Manual installation (if you skipped during setup):**
```bash
cd /path/to/AIC-Assistant/services

# Clone speaches
git clone https://github.com/speaches-ai/speaches.git syn-speaches
cd syn-speaches

# Follow speaches setup instructions
# (usually involves Docker or Python venv setup)
```

**After installing:**
```bash
# Now launch-services.sh will start both
./services/launch-services.sh
```

## Verification

Run the test suite to verify everything is working:

```bash
./scripts-syn/test.sh
```

**Expected output:**
```
========================================
  AIC-Assistant Test Suite
========================================

========================================
  1. Directory Structure
========================================

✓ syn-ml-backend service exists
✓ docs-syn/ documentation exists
✓ scripts-syn/ exists

========================================
  2. Service Files
========================================

✓ ML Backend launcher exists
✓ ML Backend main.py exists
✓ Service launcher script exists

[... more tests ...]

========================================
  Test Summary
========================================

Passed: 15
Failed: 0

✓ All tests passed!
```

## Manual Setup (If Automated Script Fails)

If `./scripts-syn/setup.sh` fails, you can do it manually:

### 1. Install Node Dependencies

```bash
pnpm install
```

### 2. Build Packages

```bash
pnpm run build:packages
```

### 3. Setup ML Backend

```bash
cd services/syn-ml-backend

# Create virtual environment
python3 -m venv venv

# Activate
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Test installation
python scripts/test_service.py
```

### 4. Start Services Manually

```bash
# Terminal 1: ML Backend
cd services/syn-ml-backend
source venv/bin/activate
python launcher.py

# Terminal 2: App
cd /path/to/AIC-Assistant
pnpm dev:tamagotchi
```

## Common Issues

### Issue: "pnpm: command not found"

**Solution:**
```bash
npm install -g pnpm
```

### Issue: "Python dependencies fail to install"

**Solution:**
```bash
# Ensure Python 3.11+ is installed
python3 --version

# Install system dependencies (Ubuntu/Debian)
sudo apt-get install python3-dev python3-pip

# Try again
cd services/syn-ml-backend
pip install -r requirements.txt
```

### Issue: "venv/bin/activate: No such file or directory"

**Cause:** The virtual environment was copied from another location or corrupted. Virtual environments contain absolute paths that break when moved.

**Solution:**
```bash
cd /path/to/AIC-Assistant/services/syn-ml-backend

# Remove old venv
rm -rf venv

# Recreate venv in the correct location
python3 -m venv venv

# Activate and install dependencies
source venv/bin/activate
pip install -r requirements.txt
```

### Issue: "No space left on device" during pip install

**Cause:** The pip cache in `/tmp` or `~/.cache/pip` has filled up.

**Solution:**
```bash
# Clean up pip cache
rm -rf ~/.cache/pip
rm -rf /tmp/pip-*

# Also clean other caches to free space
rm -rf ~/.npm
rm -rf ~/.pnpm-store
sudo apt-get clean  # Clean apt cache (Ubuntu/Debian)

# Check disk space
df -h

# Then retry setup
cd /path/to/AIC-Assistant
./scripts-syn/setup.sh
```

**Prevention:** If you encounter this error frequently, you may need to increase your disk space or regularly clean caches.

### Issue: "Services fail to start - port already in use"

**Solution:**
```bash
# Find and kill processes on ports 8000 and 8001
lsof -ti:8000 | xargs kill -9
lsof -ti:8001 | xargs kill -9

# Or stop gracefully
./services/launch-services.sh --stop
```

### Issue: "Build fails with TypeScript errors"

**Solution:**
```bash
# Clear cache
rm -rf node_modules/.vite
rm -rf node_modules/.cache

# Reinstall
pnpm install

# Rebuild
pnpm run build:packages
```

## Next Steps After Setup

1. **Test Emotion Detection:**
   ```bash
   curl -X POST http://localhost:8001/detect-emotion \
     -H "Content-Type: application/json" \
     -d '{"text": "I am so happy today!"}'
   ```

2. **Configure AIRI Settings:**
   - Open app settings (gear icon)
   - Set TTS provider to your local speaches instance
   - Set ASR provider to local

3. **Read Documentation:**
   - [SYN_CONVENTIONS.md](./SYN_CONVENTIONS.md) - Understanding the architecture
   - [PROJECT_STATUS.md](./PROJECT_STATUS.md) - What's implemented
   - [TESTING_VBRIDGER.md](./TESTING_VBRIDGER.md) - Testing lip-sync

## Development Workflow

### Daily Development

```bash
# 1. Start services (if not running)
./services/launch-services.sh

# 2. Run app with hot reload
pnpm dev:tamagotchi

# 3. Make changes to code
# 4. App auto-reloads
```

### Sync with Upstream

```bash
# Weekly or when you want updates
./scripts-syn/update.sh

# Test after update
./scripts-syn/test.sh
```

### Stop Everything

```bash
# Stop services
./services/launch-services.sh --stop

# Or kill all at once
lsof -ti:8000,8001 | xargs kill -9
```

## File Structure Reference

```
AIC-Assistant/
├── apps/
│   └── stage-tamagotchi/          # Electron app
│       └── src/main/
│           └── syn-service-manager.ts  # Service management
├── packages/                      # All packages (custom + upstream)
│   ├── animation-core/           # Custom: Shared types
│   ├── emotion-visual/           # Custom: Emotion system
│   ├── lipsync-vbridger/         # Custom: Lip-sync
│   ├── phoneme-timing/           # Custom: Phoneme timing
│   └── ... (upstream packages)
├── services/
│   ├── syn-ml-backend/           # ML inference service
│   └── launch-services.sh        # Service launcher
├── scripts-syn/                   # Utility scripts
│   ├── setup.sh                  # Initial setup
│   ├── update.sh                 # Sync upstream
│   └── test.sh                   # Test suite
├── docs-syn/                      # Documentation
│   ├── SYN_CONVENTIONS.md        # Convention guide
│   ├── PROJECT_STATUS.md         # Current status
│   └── README.md                 # Documentation hub
└── README.md                      # Main project README
```

## Support

If you encounter issues:

1. Check [DEBUGGING_GUIDE.md](./DEBUGGING_GUIDE.md)
2. Run `./scripts-syn/test.sh` to diagnose
3. Review [SYN_CONVENTIONS.md](./SYN_CONVENTIONS.md) for architecture
4. Check service logs in respective directories

## Summary

**One-command setup:**
```bash
./scripts-syn/setup.sh && ./services/launch-services.sh && pnpm dev:tamagotchi
```

**You're ready to go!** 🎉

---

**Last Updated:** 2026-01-28
**Setup Time:** ~5 minutes automated, ~15 minutes manual
**Next:** See [PROJECT_STATUS.md](./PROJECT_STATUS.md) for what's implemented
