# Project Status and Documentation

## Session Date: January 28, 2026
## Current Phase: Phase 3 - ML-Based Emotion Detection

---

## What We've Accomplished

### Phase 2: VBridger Lip-Sync ✅ COMPLETE
- Implemented 9-parameter lip-sync motion plugin
- Fixed 6 critical bugs (deltaTime, Pinia refs, phoneme map)
- Working with visible mouth movements synchronized to TTS
- Debug mode shows real-time mouth parameter overrides

**Known Issue (Low Priority)**: Idle mouth animations mix with lip-sync during big "O" shapes - acceptable behavior.

### Phase 3: ML-Based Emotion Detection ✅ IMPLEMENTED (Testing)

#### Model Selection Journey
1. **Attempt 1**: j-hartmann/emotion-english-distilroberta-base ❌
   - Failed: No ONNX files available (404 error)

2. **Attempt 2**: MicahB/emotion_text_classifier ✅ (Previous)
   - 7 emotions, working but limited

3. **Attempt 3**: MicahB/roberta-base-go_emotions ❌ (BROKEN)
   - 28 emotions from GoEmotions dataset
   - **CRITICAL BUG**: Returns neutral (91%) for "I'm so happy!"
   - Model trained on Reddit cannot understand conversational AI text
   - **Status**: ABANDONED

4. **Attempt 4**: MicahB/emotion_text_classifier ✅ (CURRENT)
   - 7 emotions from Friends TV show dialogue
   - ~82MB, trained on conversational text
   - **Actually works**: Correctly detects joy, anger, fear, etc.
   - **Text preprocessing**: Removes markdown/formatting that confuses model
   - **Status**: Working with preprocessing

#### Current Implementation
- **Model**: MicahB/emotion_text_classifier (7 emotions)
- **Architecture**: DistilRoBERTa-base
- **Size**: ~82MB (smaller, faster)
- **Library**: @huggingface/transformers v3.8.1
- **Mapping**: 7 emotions → AIRI EmotionEmoji
- **Preprocessing**: Removes markdown (`**bold**`, `*italic*`, `` `code` ``) before detection
- **Buffering**: Accumulates TTS fragments, debounces 300ms, minimum 15 chars
- **Timeout**: 5 minutes for WASM compilation
- **Cache**: 100-entry LRU for detection results

#### Emotion Mapping (7 emotions)
- joy → 😊 Happy
- sadness → 😢 Sad
- anger → 😤 Frustrated
- fear → 😅 Nervous/Awkward
- surprise → 😲 Shocked
- disgust → 🙄 Annoyed
- neutral → 😐 Neutral

#### Technical Details
- Package: `@airi-mods/emotion-visual`
- Integration: Watches `vbridgerTtsText` Pinia state
- Trigger: Automatic on TTS text change
- Fallback: Returns neutral (😊) on initialization failure
- Debug logging: Comprehensive console output for troubleshooting

#### Performance Characteristics
- **First run**: 60-180 seconds for ONNX WASM compilation
- **Subsequent runs**: <1 second from IndexedDB cache
- **Inference time**: 800-4000ms per detection (slower than expected, investigating)
- **VRAM usage**: ~0.5GB during inference
- **Model size**: ~82MB (7-emotion model, smaller than 125MB 28-emotion)

---

## Current Issues and Solutions

### Issue 1: Model Initialization Timeout (RESOLVED)
**Problem**: 60-second timeout insufficient for WASM compilation
**Solution**: Increased timeout to 5 minutes
**Status**: Model loads successfully after 48-120 seconds

### Issue 2: ONNX WASM Compilation Slow (ACCEPTED)
**Problem**: Model takes 1-3 minutes to compile on first run
**Root Cause**: CPU-bound WASM compilation (not GPU-accelerated)
**Solution Attempted**: Timeout increased to 5 minutes
**Status**: Working, but slow initial load

### Issue 3: Inference Speed Issues (INVESTIGATING)
**Problem**: Detection takes 800-4000ms instead of expected 50-200ms
**Symptoms**: WebGPU enabled but inference still slow
**Likely Cause**: Some model operations falling back to CPU
**Logs**: "Some nodes were not assigned to preferred execution providers"
**Status**: Investigating WebGPU configuration

### Issue 4: Model Formatting Sensitivity (FIXED)
**Problem**: 7-emotion model trained on clean text, confused by markdown
**Symptoms**: "**Angry** as a *glitched* `logo`" → fear (91%)
**Root Cause**: Model interprets markdown syntax as anxiety/fear
**Solution**: Added `preprocessText()` function to clean text
**Result**: Now strips formatting before analysis, correctly detects emotions

### Issue 5: PostHog Analytics Errors (IGNORE)
**Problem**: `ERR_NAME_NOT_RESOLVED` for us.i.posthog.com
**Cause**: AIRI's built-in analytics can't resolve
**Impact**: None - just noise in console
**Action**: Safe to ignore

### Issue 3: PostHog Analytics Errors (IGNORE)
**Problem**: `ERR_NAME_NOT_RESOLVED` for us.i.posthog.com
**Cause**: AIRI's built-in analytics can't resolve
**Impact**: None - just noise in console
**Action**: Safe to ignore

---

## Testing Instructions

### To Test Emotion Detection:
1. Clear Vite cache: `rm -rf airi/node_modules/.vite`
2. Start dev server: `cd airi && pnpm dev:tamagotchi`
3. **Wait 2-3 minutes** after page loads for model initialization
4. Watch console for: `[EmotionMLDetector] Model loaded successfully`
5. Speak to assistant and watch for:
   - `[EmotionVisual] TTS text changed: "..."`
   - `[EmotionMLDetector] Detection complete: joy (0.95) → 😊`
   - Live2D expression changes

### Expected Console Output (Success):
```
[EmotionMLDetector] Loading model: MicahB/roberta-base-go_emotions...
[EmotionMLDetector] Creating pipeline...
[EmotionMLDetector] Model loaded successfully (go_emotions, 28 labels)
[EmotionVisual] Detection complete: joy (0.95) → 😊
```

---

## Planned Next Steps

### Immediate (Next Session):

#### 1. Upgrade to Transformers.js v3 ⏳ HIGH PRIORITY
**Why**: WebGPU support for 10-100x faster inference
**Changes Needed**:
- Update package.json: `@xenova/transformers@^2.17.2` → `@huggingface/transformers@^3.0.0`
- Update imports in `emotion-ml-detector.ts`
- Change pipeline options (`dtype: 'q8'` instead of `quantized`)
- Add `device: 'webgpu'` option
- Test WebGPU initialization

**Benefits**:
- WebGPU acceleration on RTX 3060
- Better API design
- More quantization options
- Official Hugging Face support

**Trade-offs**:
- Still CPU-bound for initial WASM compile
- WebGPU browser support ~70% (need feature flags in some)

#### 2. Verify 28-Emotion Detection Works ⏳ MEDIUM PRIORITY
**Test Cases**:
- "I'm so happy!" → 😊 (joy)
- "That's hilarious" → 😂 (amusement)
- "I'm angry about this" → 😤 (anger)
- "I'm confused" → 🤔 (confusion)
- "I love you" → 💕 (love)

#### 3. Address Anime Girl Personality ⏳ LOW PRIORITY
**Observation**: AI acting like "lunatic anime girl"
**Likely Cause**: Hidden system prompt in AIRI
**Action**: Search for personality/system prompts in AIRI codebase
**Location to Check**: 
- `airi/apps/tamagotchi/src/stores/conversation.ts`
- `airi/packages/stage-ui/src/stores/llm.ts`
- Character/personality configuration files

### Short Term (Next Few Sessions):

#### 4. Optimize Model Loading UX
**Options**:
- Show loading indicator: "Initializing emotions... (2-3 min)"
- Delay model init until first text arrives
- Background loading with progress callback

#### 5. Test Edge Cases
- Empty text handling
- Very long text (1000+ chars)
- Special characters and markdown
- Multiple emotions in one text

#### 6. Integration with Motion Priority System
**Future Enhancement**: Currently emotion and idle motions may conflict
**Solution**: Implement priority-based motion system (Phase 4 planned)

### Long Term (Phase 4+):

#### 7. TTS/ASR Internalization
**Goal**: Replace speaches server (Kokoro TTS) with internal solution
**Target**: Fish Speech V1.5 or Qwen3-TTS
**Requirements**:
- Trainable voice models
- Emotional expression support
- Local inference on RTX 3060

#### 8. Vision System Implementation
**Source**: Open-LLM-VTuber patterns
**Features**:
- Screen capture
- Camera input
- Clipboard image processing
- Vision-language model integration

#### 9. Motion Priority System
**Goal**: Prevent emotion expressions from conflicting with lip-sync
**Approach**: Priority-based motion blending
**Priority Levels**:
- 1: Idle animations (lowest)
- 2: Speech/lip-sync
- 3: Emotion expressions (highest)

---

## Architecture Decisions

### Why MicahB/roberta-base-go_emotions?
- ✅ 28 emotions (more expressive than 7-emotion alternatives)
- ✅ Proper ONNX files for transformers.js
- ✅ INT8 quantized (125MB vs 499MB FP32)
- ✅ Transformers.js compatible
- ❌ Slow WASM compilation (accepted trade-off)

### Why Not Precompile WASM?
- Browser-specific compilation (V8/SpiderMonkey/JavaScriptCore)
- No standard ahead-of-time compiler available
- Cache invalidation complexity
- Distribution challenges

### Why Upgrade to v3?
- WebGPU = 10-100x faster inference
- Official Hugging Face package
- Better long-term support
- More architectures supported

---

## Files Modified This Session

1. **airi-mods/packages/emotion-visual/src/emotion-ml-detector.ts**
   - Updated to use go_emotions model (28 labels)
   - Added comprehensive emotion mapping
   - Added 5-minute timeout for WASM compilation
   - Added detailed debug logging

2. **airi-mods/packages/emotion-visual/src/plugin.ts**
   - Added TTS text watcher debug logs
   - Improved error handling

3. **airi-mods/packages/emotion-visual/package.json**
   - Dependency: @xenova/transformers@^2.17.2

4. **airi/packages/stage-ui-live2d/src/composables/live2d/emotion-visual.ts**
   - Integration with VBridger TTS state

5. **airi-mods/docs/EMOTION_DETECTION_IMPLEMENTATION.md**
   - Comprehensive documentation of implementation

---

## Reference Documentation

- **Transformers.js v3 Blog**: https://huggingface.co/blog/transformersjs-v3
- **GoEmotions Dataset**: 28 emotions from Reddit data
- **Model**: MicahB/roberta-base-go_emotions (Transformers.js conversion)
- **Base Model**: SamLowe/roberta-base-go_emotions (original)

---

## Handover Notes for Next Agent

**Current State**:
- Model implementation complete and built
- Timeout set to 5 minutes (sufficient for WASM compile)
- Debug logging enabled for troubleshooting
- 28-emotion detection ready for testing

**Next Priority**:
1. Upgrade to Transformers.js v3 for WebGPU
2. Verify emotion detection with various phrases
3. Document any issues encountered

**Testing**:
- Wait 2-3 minutes after page load for model initialization
- Check IndexedDB (Application tab) for transformers-cache entries
- Monitor console for `[EmotionMLDetector]` logs

**Known Working**:
- Model downloads successfully (125MB)
- WASM compilation completes (48-120s)
- Emotion mapping logic functional
- Integration with TTS pipeline operational

**Needs Verification**:
- Actual emotion detection on real TTS text
- Live2D expression changes visible
- WebGPU acceleration (after v3 upgrade)

---

**Document Version**: 1.0
**Last Updated**: January 28, 2026
**Next Review**: After Transformers.js v3 upgrade
