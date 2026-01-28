# AIC-Assistant Services

This directory contains all the external services required for AIC-Assistant to function.

## Services

### syn-ml-backend
**Port:** 8001

ML Backend service providing:
- Emotion detection from text (RoBERTa model)
- Bournemouth Forced Aligner (BFA) for phoneme timing

**Start:** `cd syn-ml-backend && python launcher.py`

### syn-speaches (Optional)
**Port:** 8000

TTS/ASR server providing:
- Text-to-Speech (Kokoro TTS)
- Automatic Speech Recognition (Whisper)

**Note:** This is a temporary solution. Will be replaced with internal TTS in Phase 5.

## Quick Start

```bash
# Start all services
./launch-services.sh

# Check status
./launch-services.sh --status

# Stop all services
./launch-services.sh --stop
```

## Service Architecture

```
services/
├── launch-services.sh      # Unified launcher
├── syn-ml-backend/         # ML inference service
│   ├── src/
│   ├── scripts/
│   └── tests/
└── syn-speaches/           # TTS/ASR server (future)
```

All services are prefixed with **SYN** to identify them as custom components.

## Integration

Services are automatically started by `SYNServiceManager` when the Electron app launches:

- Located at: `apps/stage-tamagotchi/src/main/syn-service-manager.ts`
- Auto-starts on app launch
- Auto-stops on app exit
- Health checks on ports 8000 and 8001

## Manual Testing

```bash
# Test ML Backend
curl http://localhost:8001/health
curl -X POST http://localhost:8001/detect-emotion \
  -H "Content-Type: application/json" \
  -d '{"text": "I am so happy today!"}'

# Test Speaches
curl http://localhost:8000/health
```

## Setup

### syn-ml-backend
```bash
cd syn-ml-backend
bash scripts/install.sh
```

### syn-speaches
```bash
# Clone speaches repo
git clone https://github.com/speaches-ai/speaches.git syn-speaches
cd syn-speaches
# Follow speaches setup instructions
```

## Ports

| Service | Port | Purpose |
|---------|------|---------|
| syn-ml-backend | 8001 | Emotion detection + BFA |
| syn-speaches | 8000 | TTS + ASR (temporary) |

## Troubleshooting

**Services won't start:**
- Check if ports are already in use: `lsof -i :8000` and `lsof -i :8001`
- Check virtual environments are set up
- View logs in service directories

**SYNServiceManager not finding services:**
- Ensure services are in the correct directories
- Check paths in `syn-service-manager.ts`
- Verify health endpoints are accessible

## Future

- Phase 5: Replace syn-speaches with internal TTS (Fish Speech)
- Phase 7: Optimize with Sage Attention for 50% VRAM reduction
