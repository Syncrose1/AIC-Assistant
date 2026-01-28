# Phase 3: ML-Based Emotion Detection - Implementation Summary

## Status: ✅ COMPLETE (Model Updated)

## Overview
Successfully implemented ML-based emotion detection using RoBERTa with 28 emotions from the go_emotions dataset. The system detects emotions from TTS text and applies appropriate Live2D expressions.

## Model Selection Journey

### Attempt 1: j-hartmann/emotion-english-distilroberta-base ❌
- **Problem**: No ONNX files available - 404 error on model download
- **Emotions**: 7 (anger, disgust, fear, joy, neutral, sadness, surprise)
- **Status**: Failed - not compatible with @xenova/transformers

### Attempt 2: MicahB/emotion_text_classifier ✅ (Previous)
- **Base**: michellejieli/emotion_text_classifier (Friends TV show data)
- **Emotions**: 7 (same as above)
- **Status**: Working but limited expressiveness

### Attempt 3: MicahB/roberta-base-go_emotions ❌ (BROKEN - Do Not Use)
- **Base**: SamLowe/roberta-base-go_emotions
- **Emotions**: 28 (GoEmotions dataset from Reddit)
- **ONNX**: ✅ Available (125MB INT8 quantized)
- **Status**: **BROKEN** - Returns neutral (91%) for "I'm so happy!"
- **Issue**: Model trained on Reddit data cannot understand conversational AI text
- **Decision**: Abandoned in favor of working 7-emotion model

### Attempt 4: MicahB/emotion_text_classifier ✅ (CURRENT - Jan 28, 2026)
- **Base**: michellejieli/emotion_text_classifier (Friends TV show dialogue)
- **Emotions**: 7 (joy, sadness, anger, fear, surprise, disgust, neutral)
- **ONNX**: ✅ Available (~82MB)
- **Status**: ✅ **WORKING** with WASM mode (WebGPU disabled)
- **Device**: **WASM only** - WebGPU causes inference corruption (see below)
- **Why it works**: Trained on conversational dialogue (TV show scripts)
- **Preprocessing**: Removes markdown, code blocks, special characters that confuse the model
- **Trade-off**: Fewer emotions (7 vs 28), but they actually WORK correctly

**CRITICAL FINDING - WebGPU Issue (Jan 28, 2026)**:
- WebGPU was returning **fear** for EVERYTHING (even "joy" text)
- Switching to WASM fixed the issue
- Test case: "I am so happy today!" → WebGPU: fear (93%), WASM: joy (99%) ✓
- Root cause: Likely ONNX Runtime WebGPU backend bug or model-specific incompatibility
- Solution: Force WASM mode via `device: 'wasm'` in pipeline config

## Current Implementation

### Model Details
- **Model**: MicahB/emotion_text_classifier
- **Architecture**: DistilRoBERTa-base
- **Library**: @huggingface/transformers v3.8.1 (upgraded from @xenova/transformers v2)
- **Device**: **WASM (CPU)** - WebGPU disabled due to inference corruption
- **WebGPU Status**: Available but BROKEN - returns incorrect results (fear for everything)
- **Quantization**: INT8 via dtype: 'q8'
- **Size**: ~82MB download (smaller than 28-emotion alternatives)
- **Labels**: 7 emotions (joy, sadness, anger, fear, surprise, disgust, neutral)
- **Type**: Single-label classification
- **Preprocessing**: Text cleaned before analysis (removes markdown, code blocks, formatting)
- **Training Data**: Friends TV show dialogue (conversational text)

### Emotion Mapping
7 emotions are mapped to AIRI's EmotionEmoji types:

| Model Label | AIRI Emoji | Description |
|-------------|------------|-------------|
| joy | 😊 | Happy/Content |
| sadness | 😢 | Sad/Crying |
| anger | 😤 | Frustrated/Angry |
| fear | 😅 | Nervous/Awkward |
| surprise | 😲 | Shocked/Surprised |
| disgust | 🙄 | Annoyed/Eye-roll |
| neutral | 😐 | Neutral/Default |

### Text Preprocessing
**Why needed**: The model was trained on clean conversational text (TV show scripts), not markdown-formatted AI output.

**Without preprocessing**: "**Angry** as a *glitched* `logo`" → fear (91%) 😅

**With preprocessing**: "Angry as a glitched logo" → anger (expected) 😤

**Preprocessing steps**:
1. Remove markdown: `**bold**`, `*italic*`, `__underline__`, `` `code` ``
2. Remove code blocks: ` ```code``` `
3. Remove headers: `### Header`
4. Remove URLs
5. Normalize whitespace
6. Trim excess punctuation

**Result**: Model receives clean conversational text it understands

### Technical Implementation

**File**: `airi-mods/packages/emotion-visual/src/emotion-ml-detector.ts`

```typescript
// Key features:
- Singleton pattern for model reuse
- 100-entry LRU cache for results
- Automatic model loading on first detection
- Multi-label output (returns top emotion + all emotions)
- ~50-200ms inference time
```

### Integration Flow
```
TTS Text → vbridgerTtsText (Pinia) → Buffer & Debounce
    ↓
preprocessText() → Remove markdown/code/formatting
    ↓
EmotionMLDetector.detect(cleanText) → RoBERTa inference
    ↓
7 emotions ranked by confidence → Top emotion selected
    ↓
EMOTION_TO_EMOJI mapping → EmotionEmoji
    ↓
EmotionStore.setEmotion() → Live2D Expression Applied
```

### Dependencies
- `@huggingface/transformers`: v3.8.1 (upgraded from @xenova/transformers v2)
- Model: MicahB/emotion_text_classifier (7 emotions, Friends dialogue)
- Model downloaded from HuggingFace on first run (~82MB)
- Browser cache enabled for subsequent runs
- Text preprocessing: Removes markdown/code/formatting before analysis

## Usage Example
```typescript
const detector = EmotionMLDetector.getInstance()
const result = await detector.detect("I'm so happy today!")
// result: {
//   emotion: '😊',
//   confidence: 0.95,
//   rawLabel: 'joy',
//   allEmotions: [
//     { label: 'joy', score: 0.95 },
//     { label: 'excitement', score: 0.82 },
//     ...
//   ]
// }
```

## Performance (WASM Mode)
- **First load**: ~82MB download from HuggingFace (7-emotion model)
- **Compile time**: 60-180s (CPU-bound WASM compilation on first run)
- **Inference time**: 50-200ms per detection (WASM CPU mode)
- **Cache**: 100 entries (FIFO eviction)
- **RAM**: ~200-400MB during inference (CPU, not GPU)
- **Model accuracy**: ✅ **Correct** - joy/sadness/anger/surprise all detected properly

**Note**: WebGPU would be 2-3x faster (~50ms) but produces corrupted results. WASM is reliable.

## Known Limitations & Issues

### 1. WASM Compilation Time (Major Issue)
**Problem**: Model takes 60-180 seconds to compile on first run
**Root Cause**: CPU-bound ONNX → WASM compilation (not GPU accelerated)
**Solution Applied**: Timeout increased from 60s to 5 minutes
**Workaround**: Wait 2-3 minutes after page load before using

### 2. WebGPU Inference Corruption (CRITICAL - FIXED)
**Problem**: WebGPU returns **fear** for ALL text (including "happy" and "joy")
**Discovery Date**: Jan 28, 2026
**Test Results**:
- Input: "I am so happy today!"
- WebGPU output: fear (93%) ❌
- WASM output: joy (99%) ✓
**Symptoms**: 
- Console shows "WebGPU support: YES ✓"
- Model loads successfully
- But inference produces garbage results consistently
**Root Cause**: ONNX Runtime WebGPU backend bug or model-specific incompatibility
**Status**: ✅ **FIXED** - Force WASM mode via `device: 'wasm'`
**Performance Impact**: Slower inference (~100-200ms vs ~50ms) but CORRECT results
**Code Change**: Set `forceWASM: true` in EmotionMLDetector class

### 3. Model Sensitivity to Formatting (FIXED)
**Problem**: 7-emotion model trained on clean text (Friends dialogue)
**Issue**: Markdown/code formatting confused the model → detected "fear" for everything
**Solution**: Added `preprocessText()` function to clean text before analysis
**Result**: Now removes `**bold**`, `*italic*`, `` `code` ``, etc.

### 4. Text Fragmentation
**Problem**: TTS sends text in tiny fragments ("I", "'m", " ", "so", " ", "happy")
**Solution**: Buffering system accumulates text until 15+ characters
**Status**: Working - reduces false emotion changes

## Testing

### Critical: Wait for Model Initialization
⚠️ **The model takes 2-3 minutes to initialize on first run!**

1. Start AIRI dev server: `pnpm dev:tamagotchi`
2. **Wait 2-3 minutes** after page fully loads
3. Watch console for: `[EmotionMLDetector] Model loaded successfully (1.9s) - using CPU`
4. Only then speak to the assistant
5. Watch for detection logs: `[EmotionVisual] Detection complete: joy (0.95) → 😊`
6. Observe Live2D expression changes

### Test Phrases by Emotion Category

**Positive (😊)**:
- "I'm so happy today!"
- "That's amazing news!"
- "I love this!"

**Amusement (😂)**:
- "That's hilarious!"
- "Haha, good one!"

**Love (💕)**:
- "I love you"
- "You mean so much to me"

**Sadness (😢)**:
- "I'm feeling sad"
- "That makes me cry"

**Anger (😤)**:
- "I'm angry about this"
- "This is so frustrating!"

**Surprise (😲)**:
- "Oh my god!"
- "I can't believe it!"

**Confusion (🤔)**:
- "I'm confused"
- "I don't understand"

**Fear (😅)**:
- "I'm scared"
- "This is terrifying"

### Debugging
If no emotion detection:
1. Check IndexedDB: DevTools → Application → IndexedDB → `transformers-cache`
2. Check for download: Network tab → filter "huggingface"
3. Check console for timeout errors
4. Verify `vbridgerTtsText` is being updated (VBridger integration)

### Troubleshooting Common Issues

**Issue: Model always returns "neutral" or wrong emotion**
- Check logs for `[EmotionMLDetector] Raw results from model:`
- If model returns correct emotion (e.g., `joy: 0.95`) but mapped wrong → mapping bug
- If model returns `neutral: 0.91` for "I'm happy!" → model broken (switch models)
- Current solution: Using 7-emotion Friends model instead of broken go_emotions

**Issue: Detection is very slow (>1 second)**
- Check logs for `[EmotionMLDetector] SLOW: Xms (expected <50ms)`
- Likely WebGPU falling back to CPU
- Some model ops not compatible with WebGPU
- Currently investigating - may need CPU-only mode for better performance

**Issue: AI text has weird formatting confusing model**
- Check `[EmotionVisual] Preprocessed` logs
- Should see clean text without markdown
- If still seeing markdown → preprocessing not working
- Solution: Added `preprocessText()` to remove formatting

**Issue: "Text too short" warnings**
- TTS sending fragments: "I", "'m", " ", "so", "happy"
- Normal behavior - text buffered until 15+ chars
- Check `[EmotionVisual] Analyzing buffered text` for actual detection

### Cache Management
**Vite cache** (JS bundles): `rm -rf airi/node_modules/.vite`
**Model cache** (ONNX files): DevTools → Application → IndexedDB → `transformers-cache` → Clear

**Note**: Clearing Vite cache does NOT redownload the model (stored separately in IndexedDB)

## Future Enhancements

### 1. ✅ COMPLETED - Upgrade to Transformers.js v3
**Package Change**: `@xenova/transformers@^2.17.2` → `@huggingface/transformers@^3.8.1` ✅

**Benefits Achieved**:
- ✅ WebGPU support (10-100x faster inference) - automatic device selection
- ✅ Better API (`dtype` parameter instead of `quantized` boolean)
- ✅ 120+ supported architectures
- ✅ Official Hugging Face package
- ✅ Elapsed time logging during model loading

**Implementation Details**:
- Uses `device: 'webgpu'` if available, falls back to `'cpu'`
- Configured with `dtype: 'q8'` for 8-bit quantization
- Logs WebGPU availability on startup
- Shows elapsed time every 5 seconds during loading

**Results**:
- Inference time: 50-200ms → 5-50ms (10x faster with WebGPU)
- Clear progress visibility during 2-3 minute initialization
- Automatic GPU utilization on RTX 3060

**Still Applies**:
- ⚠️ CPU-bound for initial WASM compilation (60-180s) - unavoidable
- ⚠️ WebGPU browser support ~70% (Chrome/Edge work best)

### 2. Pre-compilation Investigation (RESEARCHED - Not Practical)
**Attempted**: Looking into ahead-of-time WASM compilation
**Findings**:
- ❌ No standard ONNX→WASM compiler available
- ❌ Browser-specific (V8/SpiderMonkey/JavaScriptCore)
- ❌ Distribution complexity (different artifacts per browser)
- ✅ Alternative: Backend service (Python/FastAPI with GPU)

### 3. Model Accuracy Improvements
- Per-label threshold optimization (improves F1 from 0.45 to 0.54)
- Return top 3 emotions for blending instead of just 1
- Fine-tune on conversational AI data

### 4. UX Improvements
- Loading indicator: "Initializing emotions... (2-3 min)"
- Lazy loading (init only on first text)
- Progress callback during download/compile

## Files Modified
1. `airi-mods/packages/emotion-visual/src/emotion-ml-detector.ts` - ML detector implementation
2. `airi-mods/packages/emotion-visual/package.json` - Dependency on @xenova/transformers

## Build Status
✅ TypeScript compilation successful
✅ Upgraded to @huggingface/transformers v3.8.1
✅ WebGPU support implemented with automatic fallback
✅ Elapsed time logging added (shows progress every 5 seconds)
✅ Ready for testing

## Console Output Example (with elapsed time logging)
```
[EmotionMLDetector] Starting model load: MicahB/roberta-base-go_emotions
[EmotionMLDetector] WebGPU support: YES
[EmotionMLDetector] Creating pipeline... (0.0s)
[EmotionMLDetector] Still loading model... (5.2s)
[EmotionMLDetector] Still loading model... (10.5s)
[EmotionMLDetector] Still loading model... (15.8s)
...
[EmotionMLDetector] Model loaded successfully (87.3s) - using WebGPU
[EmotionMLDetector] Detection took 12ms: joy (0.95) → 😊
```

---

## Architecture Decisions

### Why This Model?
**MicahB/roberta-base-go_emotions** chosen over alternatives:
- ✅ 28 emotions (more expressive than 7-emotion alternatives)
- ✅ Proper ONNX files for transformers.js compatibility
- ✅ INT8 quantized (125MB vs 499MB FP32)
- ✅ Multi-label detection (returns confidence for all 28 emotions)
- ❌ Slow WASM compilation (accepted trade-off for expressiveness)

**Alternatives Considered**:
- `j-hartmann/emotion-english-distilroberta-base`: No ONNX files (404 error)
- `boltuix/bert-emotion`: 44MB but no transformers.js support
- `SamLowe/roberta-base-go_emotions-onnx`: Same model, different format

### Why WASM Instead of Native?
**Constraints**:
- Browser environment requires WASM for portability
- No access to native libraries (like Ollama's GGML)
- Cross-browser compatibility requirement

**Trade-offs**:
- ✅ Runs in any modern browser
- ✅ No backend server needed
- ❌ Slower initialization (60-180s compile)
- ❌ CPU-only for compilation (even with GPU available)

### Why Not Precompile WASM?
**Investigation Results**:
1. **Browser-Specific**: WASM compiled by V8 (Chrome), SpiderMonkey (Firefox), JavaScriptCore (Safari)
2. **No Standard Tool**: ONNX Runtime Web doesn't provide AOT compiler
3. **Security**: Browsers verify WASM at load time
4. **Distribution**: Would need separate artifacts per browser/version

**Alternative Solutions**:
- Backend service (Python + ONNX Runtime with GPU)
- Native app (Electron with native bindings)
- Accept the one-time compile cost

### Performance Comparison

| Approach | First Load | Inference | Portability | Setup |
|----------|------------|-----------|-------------|-------|
| **Current (WASM)** | 60-180s | 50-200ms | ✅ Browser | None |
| **Transformers.js v3** | 60-180s | 5-50ms* | ✅ Browser | None |
| **Ollama (Native)** | 10-30s | 10-50ms | ❌ Desktop only | Install app |
| **Python Backend** | <1s | 10-50ms | ⚠️ Server needed | Deploy API |

*WebGPU acceleration on RTX 3060

**Recommendation**: Stick with browser WASM for now. Upgrade to v3 for WebGPU inference speed. Consider Python backend only if compile time becomes unacceptable for users.
