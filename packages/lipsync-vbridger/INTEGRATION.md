# AIRI Integration Guide - VBridger Lip-Sync

Step-by-step guide for integrating VBridger lip-sync into AIRI.

---

## Overview

The VBridger plugin integrates with AIRI's motion-manager system to provide realistic 9-parameter lip-sync animation during TTS playback.

**Architecture:**
```
AIRI TTS Event → Vue Reactive State → VBridger Plugin → Live2D Parameters
                        ↓
                  Phoneme Timing
                 (eSpeak/BFA Provider)
```

---

## Installation

### 1. Link airi-mods packages to AIRI

```bash
cd /home/raahats/AI-Assistant-Project/airi-mods
./scripts/install.sh
```

This will:
- Add `../airi-mods/packages/*` to `airi/pnpm-workspace.yaml`
- Install dependencies
- Build all packages
- Link to AIRI

### 2. Verify espeak-ng is installed

```bash
espeak-ng --version
# Should output: eSpeak NG text-to-speech: 1.52.0 or higher
```

---

## Integration Steps

### Step 1: Create VBridger Composable

Create a Vue composable to manage VBridger state.

**File:** `airi/packages/stage-ui-live2d/src/composables/live2d/vbridger-lipsync.ts`

```typescript
import { ref, watch } from 'vue'
import { useMotionUpdatePluginLipSyncVBridger } from '@airi-mods/lipsync-vbridger'
import { EspeakProvider } from '@airi-mods/phoneme-timing'
import type { MotionManagerPlugin } from '@airi-mods/lipsync-vbridger'

export interface UseVBridgerLipSyncOptions {
  /**
   * Enable VBridger lip-sync.
   * Default: true
   */
  enabled?: boolean

  /**
   * Enable debug logging.
   * Default: false
   */
  debug?: boolean
}

/**
 * Composable for VBridger lip-sync integration with AIRI.
 */
export function useVBridgerLipSync(options: UseVBridgerLipSyncOptions = {}) {
  const { enabled: initialEnabled = true, debug = false } = options

  // Reactive state
  const enabled = ref(initialEnabled)
  const ttsText = ref('')
  const ttsAudioDuration = ref(0)
  const ttsIsPlaying = ref(false)

  // Create timing provider
  const timingProvider = new EspeakProvider({
    binaryPath: 'espeak-ng',
    estimationStrategy: 'uniform',
    debug,
  })

  // Create plugin
  const plugin: MotionManagerPlugin = useMotionUpdatePluginLipSyncVBridger({
    timingProvider,
    serviceOptions: {
      debug,
      smoothingFactor: 35.0,
      neutralReturnFactor: 15.0,
    },
    ttsText,
    ttsAudioDuration,
    ttsIsPlaying,
    enabled,
  })

  /**
   * Prepare lip-sync for new TTS audio.
   * Call this when TTS audio is ready but before playback starts.
   */
  function prepareTTS(text: string, audioDuration: number) {
    ttsText.value = text
    ttsAudioDuration.value = audioDuration
  }

  /**
   * Start TTS playback.
   * Call this when audio actually starts playing.
   */
  function startTTS() {
    ttsIsPlaying.value = true
  }

  /**
   * Stop TTS playback.
   * Call this when audio ends.
   */
  function stopTTS() {
    ttsIsPlaying.value = false
  }

  /**
   * Enable/disable lip-sync.
   */
  function setEnabled(value: boolean) {
    enabled.value = value
  }

  return {
    plugin,
    enabled,
    prepareTTS,
    startTTS,
    stopTTS,
    setEnabled,
  }
}
```

---

### Step 2: Register Plugin in Live2D Component

Integrate the plugin with AIRI's motion manager.

**File:** `airi/packages/stage-ui-live2d/src/components/Live2DStage.vue` (or similar)

```typescript
import { useVBridgerLipSync } from '../composables/live2d/vbridger-lipsync'
import { useLive2DMotionManagerUpdate } from '../composables/live2d/motion-manager'

// Inside setup()
const vbridgerLipSync = useVBridgerLipSync({
  enabled: true,
  debug: import.meta.env.DEV, // Debug in development only
})

// Get motion manager (you should already have this)
const motionManagerUpdate = useLive2DMotionManagerUpdate({
  internalModel,
  motionManager,
  modelParameters,
  live2dIdleAnimationEnabled,
  live2dAutoBlinkEnabled,
  live2dForceAutoBlinkEnabled,
  lastUpdateTime,
})

// Register VBridger plugin (use 'post' stage to run after other plugins)
motionManagerUpdate.register(vbridgerLipSync.plugin, 'post')
```

---

### Step 3: Connect to TTS Events

Wire up TTS audio events to VBridger state.

**Example integration with AIRI's TTS system:**

```typescript
// When TTS is about to generate audio
async function onTtsGenerating(text: string) {
  // Generate audio via speaches or other TTS
  const audioResponse = await fetch('http://localhost:8000/v1/audio/speech', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'kokoro',
      input: text,
      voice: 'af_bella',
    }),
  })

  const audioBuffer = await audioResponse.arrayBuffer()

  // Decode to get duration
  const audioContext = new AudioContext()
  const audioData = await audioContext.decodeAudioData(audioBuffer.slice(0))
  const duration = audioData.duration

  // Prepare VBridger lip-sync
  vbridgerLipSync.prepareTTS(text, duration)

  // Play audio
  const source = audioContext.createBufferSource()
  source.buffer = audioData
  source.connect(audioContext.destination)

  // Start lip-sync when audio starts
  source.onended = () => {
    vbridgerLipSync.stopTTS()
  }

  vbridgerLipSync.startTTS()
  source.start()
}
```

---

### Step 4: Add Settings UI (Optional)

Add VBridger controls to AIRI settings.

**File:** `airi/packages/stage-ui/src/stores/settings/live2d.ts` (or similar)

```typescript
export interface Live2DSettings {
  // ... existing settings ...

  /**
   * Enable VBridger 9-parameter lip-sync.
   * Default: true
   */
  vbridgerLipSyncEnabled?: boolean

  /**
   * VBridger smoothing factor.
   * Higher = smoother but more delayed.
   * Range: 10-100
   * Default: 35
   */
  vbridgerSmoothingFactor?: number
}

// In settings UI component
<template>
  <div class="setting-item">
    <label>
      <input
        type="checkbox"
        v-model="settings.vbridgerLipSyncEnabled"
        @change="onVBridgerEnabledChange"
      />
      Enhanced Lip-Sync (VBridger)
    </label>
  </div>

  <div v-if="settings.vbridgerLipSyncEnabled" class="setting-item">
    <label>
      Smoothing: {{ settings.vbridgerSmoothingFactor }}
      <input
        type="range"
        min="10"
        max="100"
        v-model.number="settings.vbridgerSmoothingFactor"
      />
    </label>
  </div>
</template>

<script setup>
function onVBridgerEnabledChange() {
  vbridgerLipSync.setEnabled(settings.vbridgerLipSyncEnabled)
}
</script>
```

---

## Complete Example

Here's a complete minimal example showing all pieces together:

```typescript
// File: airi/packages/stage-ui-live2d/src/components/Live2DStageWithVBridger.vue

<template>
  <div class="live2d-stage">
    <canvas ref="canvasRef"></canvas>
    <button @click="testSpeak">Test Lip-Sync</button>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useVBridgerLipSync } from '../composables/live2d/vbridger-lipsync'
import { useLive2DMotionManagerUpdate } from '../composables/live2d/motion-manager'

const canvasRef = ref<HTMLCanvasElement | null>(null)

// VBridger lip-sync
const vbridgerLipSync = useVBridgerLipSync({
  enabled: true,
  debug: true,
})

// Motion manager (pseudo-code - you'll use your actual AIRI setup)
const motionManagerUpdate = useLive2DMotionManagerUpdate({
  // ... AIRI motion manager options ...
})

// Register VBridger plugin
motionManagerUpdate.register(vbridgerLipSync.plugin, 'post')

// Test function
async function testSpeak() {
  const text = "Hello! This is a test of VBridger lip-sync."

  // Generate audio (speaches)
  const audioResponse = await fetch('http://localhost:8000/v1/audio/speech', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: 'kokoro',
      input: text,
      voice: 'af_bella',
    }),
  })

  const audioBuffer = await audioResponse.arrayBuffer()

  // Decode audio
  const audioContext = new AudioContext()
  const audioData = await audioContext.decodeAudioData(audioBuffer.slice(0))
  const duration = audioData.duration

  console.log(`Speaking: "${text}" (${duration}s)`)

  // Prepare VBridger
  vbridgerLipSync.prepareTTS(text, duration)

  // Play audio
  const source = audioContext.createBufferSource()
  source.buffer = audioData
  source.connect(audioContext.destination)

  source.onended = () => {
    console.log('Audio ended')
    vbridgerLipSync.stopTTS()
  }

  vbridgerLipSync.startTTS()
  source.start()
}

onMounted(() => {
  // Initialize Live2D model on canvas
  // ... AIRI Live2D setup code ...
})
</script>
```

---

## Troubleshooting

### Lip-sync not working

**1. Check espeak-ng:**
```bash
espeak-ng --version
```

**2. Check console for errors:**
```javascript
// In browser console
vbridgerLipSync.enabled.value  // Should be true
```

**3. Enable debug logging:**
```typescript
const vbridgerLipSync = useVBridgerLipSync({
  debug: true,  // Enable debug logs
})
```

Look for logs like:
```
[VBridgerService] Generating phoneme timing for: "Hello world"
[VBridgerService] Audio duration: 1.2s
[VBridgerService] Using provider: espeak-ng
[VBridgerService] Generated 10 timed phonemes
```

### Parameters not updating

**Check Live2D model supports VBridger parameters:**

Your Live2D model must have these 9 parameters defined:
- `ParamMouthOpenY`
- `ParamJawOpen`
- `ParamMouthForm`
- `ParamMouthShrug`
- `ParamMouthFunnel`
- `ParamMouthPuckerWiden`
- `ParamMouthPressLipOpen`
- `ParamMouthX`
- `ParamCheekPuffC`

If your model doesn't have all parameters, the plugin will still work but some mouth shapes won't be as accurate. You can check available parameters in the Live2D model JSON file.

### Timing is off

**Adjust smoothing factor:**
```typescript
const vbridgerLipSync = useVBridgerLipSync({
  // Lower = more responsive, higher = smoother
  smoothingFactor: 20.0,  // Default: 35.0
})
```

### Performance issues

**Option 1: Disable when model not visible**
```typescript
// Watch for visibility
watch(isLive2DVisible, (visible) => {
  vbridgerLipSync.setEnabled(visible)
})
```

**Option 2: Use tier system (future)**
```typescript
// Will be available in Phase 4-5
vbridgerController.useFallbackEstimation()  // Switch to lighter eSpeak
```

---

## Next Steps

1. ✅ Install espeak-ng
2. ✅ Link airi-mods packages
3. 📋 Create vbridger-lipsync composable
4. 📋 Register plugin with motion manager
5. 📋 Connect TTS events
6. 📋 Test with Live2D model
7. 📋 Add settings UI
8. 📋 (Phase 4-5) Add BFA provider for higher accuracy

---

## Architecture Notes

### Why Reactive State?

The plugin uses Vue `Ref` for TTS state because:
- AIRI is a Vue application
- Reactive state automatically triggers plugin updates
- Clean separation: TTS logic doesn't need to know about VBridger

### Plugin Stages

VBridger uses the `'post'` stage because:
- Runs after idle motion and eye blink plugins
- Ensures mouth parameters aren't overridden
- `ctx.markHandled()` prevents other mouth plugins from interfering

### Performance

The plugin is lightweight:
- Phoneme timing generation: ~1-5ms (eSpeak)
- Update loop: ~0.1ms per frame
- No GPU overhead (only CPU for interpolation)

---

## See Also

- [USAGE.md](./USAGE.md) - Standalone VBridgerService usage
- [README.md](./README.md) - Package overview
- [AIRI Motion Manager](../../airi/packages/stage-ui-live2d/src/composables/live2d/motion-manager.ts)
