# Handover Document: Next Agent

**Date**: January 28, 2026
**From**: Current Session
**To**: Next Agent
**Project**: VTuber AI Personal Assistant - Phase 3 ML Emotion Detection

---

## ✅ What's Complete

### Phase 3: ML Emotion Detection - IMPLEMENTED
- Model: `MicahB/roberta-base-go_emotions` (28 emotions)
- Integration: Working with VBridger TTS pipeline
- Mapping: 28 emotions → 18 AIRI EmotionEmoji types
- Timeout: Set to 5 minutes for WASM compilation
- Debug logging: Comprehensive console output
- Build: ✅ TypeScript compiles successfully

### Phase 2: VBridger Lip-Sync ✅ COMPLETE
- Fully functional 9-parameter lip-sync
- Integrated with AIRI motion manager
- Debug mode shows real-time overrides

---

## 🔄 Current State

**Working**:
- Model downloads successfully (125MB from HuggingFace)
- WASM compilation completes (48-120 seconds)
- Emotion mapping logic functional
- TTS integration operational
- Live2D expressions applied

**Known Issue**:
- First initialization takes 2-3 minutes (ONNX WASM compilation)
- This is CPU-bound and cannot be precompiled
- Subsequent runs are instant (cached in IndexedDB)

**Logs You Should See**:
```
[EmotionMLDetector] Loading model: MicahB/roberta-base-go_emotions...
[EmotionMLDetector] Creating pipeline...
[EmotionMLDetector] Model loaded successfully (go_emotions, 28 labels)
[EmotionVisual] TTS text changed: "I'm so happy!"
[EmotionMLDetector] Detection complete in 150ms: joy (0.95) → 😊
[EmotionVisual] Emotion store updated: 😊 (hold: 3s)
```

---

## 🎯 Next Priority: Upgrade to Transformers.js v3

### Why Upgrade?
- WebGPU support = 10-100x faster inference
- Better API design
- Official Hugging Face backing
- More quantization options

### Steps to Complete

#### 1. Update Package Dependency
**File**: `airi-mods/packages/emotion-visual/package.json`
```json
{
  "dependencies": {
    "@xenova/transformers": "^2.17.2"  // REMOVE THIS
    "@huggingface/transformers": "^3.0.0"  // ADD THIS
  }
}
```

#### 2. Update Import Statements
**File**: `airi-mods/packages/emotion-visual/src/emotion-ml-detector.ts`
```typescript
// OLD
import { pipeline, env } from '@xenova/transformers'

// NEW
import { pipeline, env } from '@huggingface/transformers'
```

#### 3. Update Pipeline Options
**File**: `airi-mods/packages/emotion-visual/src/emotion-ml-detector.ts`
```typescript
// OLD (v2 API)
this.classifier = await pipeline('text-classification', this.modelName)

// NEW (v3 API with WebGPU)
this.classifier = await pipeline('text-classification', this.modelName, {
  dtype: 'q8',           // 8-bit quantization
  device: 'webgpu',      // Use GPU for inference
  // or device: 'cpu' for WASM fallback
})
```

#### 4. Handle WebGPU Availability
```typescript
// Check WebGPU support
const hasWebGPU = 'gpu' in navigator;

const classifier = await pipeline('text-classification', this.modelName, {
  dtype: 'q8',
  device: hasWebGPU ? 'webgpu' : 'cpu',
})
```

#### 5. Install and Build
```bash
cd airi-mods/packages/emotion-visual
pnpm install
pnpm build
```

#### 6. Clear Caches and Test
```bash
# Clear Vite cache
rm -rf airi/node_modules/.vite

# Clear model cache (optional - to test fresh download)
# DevTools → Application → IndexedDB → transformers-cache → Clear

# Start dev server
cd airi && pnpm dev:tamagotchi
```

#### 7. Verify WebGPU Working
- Open Chrome/Edge (best WebGPU support)
- Check console for: WebGPU initialization messages
- Inference should be 5-50ms instead of 50-200ms

---

## 🔍 Testing Checklist

### After v3 Upgrade:
- [ ] Model loads without errors
- [ ] WebGPU detected and used (check console)
- [ ] Inference time <50ms (vs current 50-200ms)
- [ ] 28 emotions detected correctly
- [ ] Live2D expressions change appropriately
- [ ] Fallback to CPU works if WebGPU unavailable

### Test Phrases:
- [ ] "I'm so happy!" → 😊
- [ ] "That's hilarious" → 😂
- [ ] "I'm angry" → 😤
- [ ] "I'm confused" → 🤔
- [ ] "I love you" → 💕
- [ ] "I'm scared" → 😅

---

## 📚 Key Files

### Implementation:
1. `airi-mods/packages/emotion-visual/src/emotion-ml-detector.ts` - ML detector
2. `airi-mods/packages/emotion-visual/src/plugin.ts` - Motion manager plugin
3. `airi/packages/stage-ui-live2d/src/composables/live2d/emotion-visual.ts` - Integration

### Documentation:
1. `airi-mods/docs/EMOTION_DETECTION_IMPLEMENTATION.md` - Full implementation details
2. `airi-mods/docs/PROJECT_STATUS.md` - Overall project status
3. `airi-mods/docs/HANDOVER_NEXT_AGENT.md` - This file

### Configuration:
1. `airi-mods/packages/emotion-visual/package.json` - Dependencies

---

## 🐛 Known Issues to Watch For

### 1. PostHog Errors
**Symptom**: `ERR_NAME_NOT_RESOLVED` for us.i.posthog.com
**Cause**: AIRI's analytics can't resolve
**Action**: Ignore - harmless noise

### 2. Lip-Sync + Idle Animation Mixing
**Symptom**: Idle mouth movements visible during speech
**Status**: Known issue from Phase 2
**Priority**: Low - acceptable behavior
**Fix**: Would require motion priority system (Phase 4)

### 3. "Anime Girl" Personality
**Symptom**: AI acting overly enthusiastic/expressive
**Likely Cause**: Hidden system prompt in AIRI
**Files to Check**:
- `airi/apps/tamagotchi/src/stores/conversation.ts`
- `airi/packages/stage-ui/src/stores/llm.ts`
- Character configuration files

---

## 🎓 Context & Decisions

### Why Not Precompile WASM?
**Answer**: Investigated - not practical. WASM compilation is browser-specific (V8/SpiderMonkey/JavaScriptCore). No standard ahead-of-time compiler exists for ONNX Runtime Web in browsers.

### Why go_emotions (28 emotions) vs 7 emotions?
**Answer**: More expressive range for VTuber. Trade-off is 125MB model size and compile time. Alternative 7-emotion models don't have proper ONNX support or are less accurate.

### Why Not Python Backend?
**Answer**: Project goal is standalone browser application. Adding backend adds deployment complexity. Browser WASM acceptable for this use case.

### RTX 3060 12GB Constraints:
- ✅ Emotion model: ~0.5GB VRAM
- ✅ Can run alongside other models
- ⚠️ Can't run multiple heavy models simultaneously
- ✅ WebGPU v3 will use GPU efficiently

---

## 🚀 After v3 Upgrade: What's Next?

### Priority 1: Verify Everything Works
- Test all 28 emotions
- Check WebGPU performance
- Ensure fallback to CPU works

### Priority 2: Phase 4 Planning
**Vision System** (from Open-LLM-VTuber):
- Screen capture
- Camera input
- Vision-language model integration

**TTS/ASR Internalization**:
- Replace speaches server
- Fish Speech V1.5 or Qwen3-TTS
- Trainable voice models

**Motion Priority System**:
- Prevent emotion/idle conflicts
- Priority-based motion blending

---

## 💬 Communication Preferences

The developer prefers:
- Technical, in-depth discussions
- Clear reasoning for decisions
- Honest assessment of trade-offs
- Systematic problem-solving
- Minimal formatting
- No excessive enthusiasm

---

## 📞 Quick Reference

**Build emotion-visual**:
```bash
cd airi-mods/packages/emotion-visual && pnpm build
```

**Clear caches**:
```bash
rm -rf airi/node_modules/.vite
# For model cache: DevTools → Application → IndexedDB
```

**Start dev server**:
```bash
cd airi && pnpm dev:tamagotchi
```

**Important logs to watch**:
- `[EmotionMLDetector] Model loaded successfully`
- `[EmotionVisual] Detection complete:`
- WebGPU initialization messages (after v3 upgrade)

---

## ⚠️ Critical Reminder

**Wait 2-3 minutes after page load for model initialization!**

The model compiles WASM on first run. This is not a bug - it's expected behavior. The console will show:
1. Model downloading (0-30s)
2. WASM compilation (30-180s) 
3. Ready message

Only then will emotion detection work.

---

**Document Version**: 1.0
**Last Updated**: January 28, 2026
**Next Expected Update**: After Transformers.js v3 upgrade
