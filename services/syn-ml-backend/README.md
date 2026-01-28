# ML Backend Service

**Location**: `airi-mods/services/ml-backend/`  
**Purpose**: External Python-based ML inference service  
**Why**: Browser ONNX Runtime is unreliable (WebGPU corruption bugs)

---

## Overview

This service provides HTTP endpoints for ML inference tasks that are too heavy or unreliable to run in the browser:

1. **Emotion Detection** - From text using `j-hartmann/emotion-english-distilroberta-base`
2. **Phoneme Alignment** - From audio+text using Bournemouth Forced Aligner (BFA)
3. **Future**: TTS (Fish Speech), ASR (Whisper)

### Why Not Browser ML?

| Issue | Browser ONNX | Python Backend |
|-------|--------------|----------------|
| WebGPU bugs | ❌ Returns wrong results (fear for everything) | ✅ PyTorch/CUDA works |
| Speed | ❌ 800-4000ms (WASM) | ✅ 20-50ms (CUDA) |
| Startup | ❌ 60-180s compile | ✅ ~10s load |
| Models | ❌ Only ONNX-converted | ✅ Any HuggingFace model |
| Memory | ❌ ~1GB browser tab | ✅ ~2.5GB dedicated |

---

## 🧪 Testing (CRITICAL - READ THIS FIRST)

**When debugging or developing, ALWAYS run tests first to verify service health.**

### Quick Test

```bash
cd airi-mods/services/ml-backend
python scripts/test_service.py
```

### Test Suite Location

**All tests are in**: `tests/` directory  
**Test runner**: `scripts/test_service.py` (main diagnostic)  
**Documentation**: `tests/README.md`

### What Gets Tested

- ✅ Service health and availability
- ✅ Emotion detection accuracy (all 7 emotions)
- ✅ API endpoint functionality
- ✅ Error handling (empty text, invalid JSON, missing files)
- ✅ Performance benchmarks (<100ms latency)
- ✅ Stability (100 concurrent requests)
- ✅ Resource usage monitoring

### Common Test Commands

```bash
# Full diagnostic (recommended)
python scripts/test_service.py

# Test specific component
python scripts/test_service.py --test health
python scripts/test_service.py --test emotion
python scripts/test_service.py --test performance

# Automated test run
bash scripts/run_tests.sh

# PyTest suite
python -m pytest tests/test_api.py -v
```

### Interpreting Results

- ✓ **ALL TESTS PASSED** - Service is healthy, proceed with confidence
- ⚠ **Partial pass** - Some edge cases failed (often acceptable)
- ✗ **TESTS FAILED** - Service has issues, check error output

**Never commit changes without running tests first!**

---

## Architecture

```
AIRI Desktop App (Tauri)
    │
    ├─► Spawns Python process on startup
    │   └─► ML Backend Service (localhost:8000)
    │
    └─► Frontend HTTP calls ──► FastAPI ──► Models on GPU
```

### Components

1. **FastAPI Server** (`src/main.py`)
   - `/health` - Health check
   - `/emotion/detect` - Emotion detection
   - `/align/phonemes` - Phoneme alignment (BFA)

2. **Launcher** (`launcher.py`)
   - Manages virtual environment
   - Installs dependencies
   - Starts/stops service
   - Handles logs

3. **Tauri Integration** (`patches/src-tauri/src/ml_backend.rs`)
   - Spawns service on app startup
   - Monitors health
   - Cleanup on exit

4. **TypeScript Client** (`packages/emotion-visual/src/ml-client.ts`)
   - HTTP client for frontend
   - Replaces transformers.js

---

## Installation

### Automatic (via main install.sh)

```bash
cd airi-mods
./scripts/install.sh  # Installs AIRI mods + ML backend
```

### Manual

```bash
cd airi-mods/services/ml-backend

# Run install script
bash scripts/install.sh

# Or manually:
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
```

### System Dependencies

```bash
# Arch/CachyOS
sudo pacman -S espeak-ng ffmpeg

# Ubuntu/Debian
sudo apt-get install espeak-ng ffmpeg
```

---

## Usage

### Auto-start (with Tauri app)

The service starts automatically when you run:
```bash
cd airi && pnpm dev:tamagotchi
```

### Manual Start

```bash
cd airi-mods/services/ml-backend
./launcher.py  # Uses virtual environment
```

### Manual Stop

```bash
# Find process
lsof -i :8000

# Kill process
kill <PID>
```

---

## API Endpoints

### Health Check

```bash
curl http://localhost:8000/health
```

Response:
```json
{
  "status": "healthy",
  "device": "cuda",
  "models_loaded": {
    "emotion": true,
    "aligner": true
  },
  "timestamp": "2026-01-28T16:00:00"
}
```

### Emotion Detection

```bash
curl -X POST http://localhost:8000/emotion/detect \
  -H "Content-Type: application/json" \
  -d '{"text": "I am so happy today!"}'
```

Response:
```json
{
  "emotion": "joy",
  "confidence": 0.95,
  "all_emotions": [
    {"label": "joy", "score": 0.95},
    {"label": "neutral", "score": 0.03},
    ...
  ],
  "processing_time_ms": 25.5
}
```

### Phoneme Alignment

```bash
curl -X POST http://localhost:8000/align/phonemes \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Hello world",
    "audio_path": "/tmp/audio.wav"
  }'
```

Response:
```json
{
  "phonemes": [
    {
      "phoneme": "h",
      "ipa": "h",
      "start_ms": 0.0,
      "end_ms": 50.0,
      "confidence": 0.98
    },
    ...
  ],
  "words": [...],
  "processing_time_ms": 150.0
}
```

---

## Models

### Emotion Detection

- **Model**: `j-hartmann/emotion-english-distilroberta-base`
- **Emotions**: 7 (anger, disgust, fear, joy, neutral, sadness, surprise)
- **Framework**: Transformers (PyTorch)
- **Device**: CUDA (RTX 3060)
- **Inference**: ~25ms

### Phoneme Alignment

- **Model**: Bournemouth Forced Aligner (BFA)
- **Architecture**: Contextless Universal Phoneme Encoder (CUPE)
- **Languages**: 80+ (Indo-European + related)
- **Framework**: PyTorch
- **Device**: CUDA (RTX 3060)
- **Speed**: 0.2s for 10s audio (240x faster than MFA!)

---

## Development

### Project Structure

```
airi-mods/services/ml-backend/
├── src/
│   └── main.py              # FastAPI server
├── scripts/
│   └── install.sh           # Setup script
├── launcher.py              # Service launcher
├── requirements.txt         # Python dependencies
└── README.md               # This file
```

### Adding New Endpoints

1. Add endpoint to `src/main.py`:
```python
@app.post("/new/endpoint")
async def new_endpoint(request: NewRequest):
    # Implementation
    return NewResponse(...)
```

2. Update TypeScript client in `packages/emotion-visual/src/ml-client.ts`:
```typescript
export async function newEndpoint(data: NewRequest): Promise<NewResponse> {
  const response = await fetch(`${ML_BACKEND_URL}/new/endpoint`, {...})
  return response.json()
}
```

3. Test manually, then integrate into AIRI

---

## Troubleshooting

### Service won't start

1. Check Python version (3.8+ required):
```bash
python3 --version
```

2. Check virtual environment:
```bash
ls venv/bin/python  # Should exist
```

3. Check dependencies:
```bash
source venv/bin/activate
pip list | grep transformers
```

4. Check logs:
```bash
./launcher.py  # Run manually to see errors
```

### CUDA not available

```bash
# Check CUDA
python3 -c "import torch; print(torch.cuda.is_available())"

# Should print: True
# If False, check NVIDIA drivers
nvidia-smi
```

### Port already in use

```bash
# Find process using port 8000
lsof -i :8000

# Kill it
kill <PID>
```

### BFA (espeak) not found

```bash
# Install espeak-ng
sudo pacman -S espeak-ng  # Arch/CachyOS
sudo apt-get install espeak-ng  # Ubuntu/Debian
```

---

## Performance

### VRAM Usage

- Emotion model: ~300MB
- BFA model: ~500MB
- PyTorch overhead: ~200MB
- **Total**: ~1GB VRAM

### RAM Usage

- Service overhead: ~500MB
- **Total**: ~1.5GB RAM

### Inference Times

- Emotion detection: ~25ms
- Phoneme alignment (10s audio): ~200ms
- **Much faster than browser!**

---

## Future Roadmap

### Phase 1: Core ML (Current)
- ✅ Emotion detection
- ✅ Phoneme alignment

### Phase 2: TTS Internalization
- Fish Speech V1.5 integration
- Replace speaches server
- Endpoint: `/tts/synthesize`

### Phase 3: ASR Internalization
- faster-whisper integration
- Real-time transcription
- Endpoint: `/asr/transcribe`

### Phase 4: Vision (Future)
- Camera capture analysis
- Screen understanding
- Integration with LLM

---

## References

- **Bournemouth Forced Aligner**: https://github.com/tabahi/bournemouth-forced-aligner
- **BFA Paper**: https://arxiv.org/abs/2509.23147
- **Emotion Model**: https://huggingface.co/j-hartmann/emotion-english-distilroberta-base
- **FastAPI**: https://fastapi.tiangolo.com/

---

**Last Updated**: 2026-01-28  
**Status**: Core service implemented, ready for integration
