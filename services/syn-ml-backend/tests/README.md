# ML Backend Service - Test Suite

**Location**: `airi-mods/services/ml-backend/tests/`  
**Purpose**: Comprehensive testing for reliability, performance, and correctness

---

## Overview

This test suite provides multiple layers of testing for the ML Backend Service:

1. **Quick Diagnostic** (`scripts/test_service.py`) - Manual CLI tool
2. **PyTest Suite** (`tests/test_api.py`) - Automated pytest-based tests
3. **Integration Tests** - End-to-end workflow validation
4. **Performance Benchmarks** - Latency and throughput measurements

---

## Quick Start

### Option 1: Comprehensive Diagnostic (Recommended)

```bash
cd airi-mods/services/ml-backend

# Ensure service is running
./launcher.py &

# Run full diagnostic
python scripts/test_service.py
```

This runs all tests and generates a detailed report.

### Option 2: Run Specific Tests

```bash
# Test only health endpoint
python scripts/test_service.py --test health

# Test only emotion detection
python scripts/test_service.py --test emotion

# Test performance
python scripts/test_service.py --test performance

# Test stability
python scripts/test_service.py --test stability
```

### Option 3: PyTest Suite

```bash
# Install test dependencies
source venv/bin/activate
pip install pytest pytest-asyncio aiohttp psutil requests

# Run all tests
python -m pytest tests/test_api.py -v

# Run specific test class
python -m pytest tests/test_api.py::TestHealth -v

# Run with coverage
python -m pytest tests/test_api.py --cov=src --cov-report=html
```

---

## Test Coverage

### 1. Health Check Tests
- ✓ Endpoint availability
- ✓ Response structure validation
- ✓ Model loading status
- ✓ Timestamp format

### 2. Emotion Detection Tests
- ✓ All 7 emotions accuracy
- ✓ Empty/whitespace text handling
- ✓ Markdown text handling
- ✓ Long text handling
- ✓ Confidence distribution
- ✓ All emotion labels present

### 3. Error Handling Tests
- ✓ Empty text → neutral
- ✓ Missing fields → error
- ✓ Invalid JSON → error
- ✓ Wrong HTTP method → 405
- ✓ Missing audio file → 400

### 4. Performance Tests
- ✓ Emotion detection latency (<100ms average)
- ✓ Health check latency (<50ms)
- ✓ Concurrent request handling
- ✓ Memory usage monitoring

### 5. Stability Tests
- ✓ 100 sequential requests
- ✓ Error rate measurement
- ✓ Service remains stable

### 6. Integration Tests
- ✓ Full workflow (health → emotion → health)
- ✓ End-to-end validation

---

## Test Data

### Emotion Test Cases

| Emotion | Example Texts |
|---------|--------------|
| Joy | "I am so happy!", "This is wonderful!" |
| Sadness | "I feel sad", "This makes me cry" |
| Anger | "I am furious!", "This makes me angry!" |
| Fear | "I am scared", "This is terrifying" |
| Surprise | "Wow! Amazing!", "I can't believe it!" |
| Neutral | "The weather is cloudy", "It's Tuesday" |
| Disgust | "This is disgusting", "That's gross" |

### Performance Thresholds

| Metric | Threshold | Current |
|--------|-----------|---------|
| Emotion detection | <100ms avg | ~25ms |
| Health check | <50ms | ~5ms |
| Error rate | <5% | ~0% |
| Memory increase | <2GB | ~500MB |

---

## Interpreting Results

### Success Criteria

✅ **All tests pass** when:
- Health endpoint returns 200
- All 7 emotions detected correctly
- Average latency <100ms
- Error rate <5%
- No memory leaks

⚠️ **Partial pass** when:
- Some emotion misclassifications (neutral ambiguous)
- Latency slightly above threshold but acceptable
- Minor errors in edge cases

❌ **Failure** when:
- Service won't start
- Frequent errors (>5%)
- Extreme latency (>500ms)
- Memory leaks

### Common Issues

#### Service Not Running
```
✗ Cannot connect to service. Is it running?
```
**Solution**: Start the service first:
```bash
./launcher.py
```

#### CUDA Not Available
```
Device: cpu (expected: cuda)
```
**Solution**: Check NVIDIA drivers:
```bash
nvidia-smi
python -c "import torch; print(torch.cuda.is_available())"
```

#### High Latency
```
⚠ Average latency 150.2ms exceeds 100ms threshold
```
**Possible causes**:
- First request (model loading)
- GPU thermal throttling
- Background processes

**Solution**: Run test multiple times, ignore first run

#### Emotion Misclassifications
```
⚠ joy: 2/3 correct (67%)
```
**This is normal** for:
- Ambiguous text
- Context-dependent emotions
- Neutral category

The model is working if most emotions have >50% accuracy.

---

## Continuous Testing

### For Development

Add to your workflow:
```bash
# Before committing
python scripts/test_service.py

# Or run quick check
curl http://localhost:8000/health
```

### For CI/CD

```yaml
# .github/workflows/test.yml (example)
- name: Test ML Backend
  run: |
    cd airi-mods/services/ml-backend
    bash scripts/install.sh
    ./launcher.py &
    sleep 10
    python scripts/test_service.py
    kill %1
```

---

## Manual Testing

### Quick Health Check

```bash
curl http://127.0.0.1:8000/health | jq
```

### Test Emotion Detection

```bash
curl -X POST http://127.0.0.1:8000/emotion/detect \
  -H "Content-Type: application/json" \
  -d '{"text": "I am so happy today!"}' | jq
```

### Test Phoneme Alignment

```bash
curl -X POST http://127.0.0.1:8000/align/phonemes \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Hello world",
    "audio_path": "/path/to/audio.wav"
  }' | jq
```

---

## Test Files

| File | Purpose |
|------|---------|
| `scripts/test_service.py` | Main diagnostic tool (CLI) |
| `scripts/run_tests.sh` | Automated test runner |
| `tests/test_api.py` | PyTest suite |
| `test_assets/` | Test audio files (create as needed) |

---

## Adding New Tests

### To `test_service.py`

```python
def test_my_feature(self) -> bool:
    """Test description"""
    print("\n" + "="*60)
    print("TEST X: My Feature")
    print("="*60)
    
    try:
        # Test logic
        response = requests.get(f"{self.base_url}/my/endpoint")
        
        if response.status_code == 200:
            log_success("My feature works")
            return True
        else:
            log_error(f"Failed: HTTP {response.status_code}")
            return False
            
    except Exception as e:
        log_error(f"Error: {e}")
        return False
```

### To `test_api.py`

```python
class TestMyFeature:
    """Test suite for my feature"""
    
    @pytest.mark.asyncio
    async def test_my_feature(self, http_client):
        """Test description"""
        async with http_client.get(f"{BASE_URL}/my/endpoint") as resp:
            assert resp.status == 200
            data = await resp.json()
            assert "expected_field" in data
```

---

## Performance Profiling

### Profile Service

```bash
# Install profiling tools
pip install py-spy

# Profile while running
py-spy top -- python -m uvicorn src.main:app

# Or record flamegraph
py-spy record -o profile.svg -- python -m uvicorn src.main:app
```

### Benchmark Endpoint

```bash
# Install Apache Bench
sudo apt-get install apache2-utils

# Benchmark health endpoint
ab -n 1000 -c 10 http://127.0.0.1:8000/health

# Benchmark emotion endpoint
ab -n 100 -c 5 -p /tmp/payload.json \
   -T application/json \
   http://127.0.0.1:8000/emotion/detect
```

---

## Debugging Failed Tests

### Enable Verbose Logging

```python
# In test_service.py, change:
logging.basicConfig(level=logging.DEBUG)
```

### Check Service Logs

```bash
# If running via launcher
./launcher.py 2>&1 | tee service.log

# In another terminal
python scripts/test_service.py
```

### Test Individual Components

```python
# Test just the model
python -c "
from transformers import pipeline
model = pipeline('text-classification', 
                 model='j-hartmann/emotion-english-distilroberta-base')
print(model('I am happy!'))
"
```

---

## Best Practices

1. **Run tests before committing**
2. **Monitor performance trends** (save results over time)
3. **Test after model updates**
4. **Test on different hardware** (if possible)
5. **Automate in CI/CD pipeline**

---

## Results Archive

Consider saving test results:

```bash
# Save with timestamp
python scripts/test_service.py > results/$(date +%Y%m%d_%H%M%S).txt

# Compare with previous
diff results/20260128_120000.txt results/20260128_130000.txt
```

---

**Last Updated**: 2026-01-28  
**Status**: Comprehensive test suite ready
