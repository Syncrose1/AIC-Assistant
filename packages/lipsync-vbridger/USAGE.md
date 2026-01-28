# VBridger Lip-Sync Service - Usage Guide

Complete guide for using the VBridger lip-sync system with AIRI.

---

## Quick Start

```typescript
import { VBridgerService } from '@airi-mods/lipsync-vbridger'
import { EspeakProvider } from '@airi-mods/phoneme-timing'

// 1. Create timing provider
const timingProvider = new EspeakProvider({
  binaryPath: 'espeak-ng',
  estimationStrategy: 'uniform',
  debug: false
})

// 2. Create VBridger service
const vbridger = new VBridgerService(timingProvider, {
  debug: false,
  smoothingFactor: 35.0,
  neutralReturnFactor: 15.0
})

// 3. Prepare phoneme timing when TTS audio is ready
await vbridger.onTtsAudioReady("Hello world", 1.2)  // text, duration in seconds

// 4. Start playback
vbridger.onTtsAudioStart()
audioElement.play()

// 5. Update loop (60 FPS)
let lastTime = performance.now()

function animate() {
  const currentTime = performance.now()
  const deltaTime = (currentTime - lastTime) / 1000  // Convert to seconds
  lastTime = currentTime

  // Get current pose
  const pose = vbridger.update(deltaTime)

  // Apply to Live2D model
  live2dModel.setParameter('MouthOpenY', pose.mouthOpenY)
  live2dModel.setParameter('JawOpen', pose.jawOpen)
  live2dModel.setParameter('MouthForm', pose.mouthForm)
  live2dModel.setParameter('MouthShrug', pose.mouthShrug)
  live2dModel.setParameter('MouthFunnel', pose.mouthFunnel)
  live2dModel.setParameter('MouthPuckerWiden', pose.mouthPuckerWiden)
  live2dModel.setParameter('MouthPressLipOpen', pose.mouthPressLipOpen)
  live2dModel.setParameter('MouthX', pose.mouthX)
  live2dModel.setParameter('CheekPuffC', pose.cheekPuffC)

  live2dModel.update()

  requestAnimationFrame(animate)
}

animate()

// 6. When audio ends
audioElement.addEventListener('ended', () => {
  vbridger.onTtsAudioEnd()
})
```

---

## Complete Example with TTS Integration

```typescript
import { VBridgerService } from '@airi-mods/lipsync-vbridger'
import { EspeakProvider } from '@airi-mods/phoneme-timing'

class AiriLipSyncManager {
  private vbridger: VBridgerService
  private audioContext: AudioContext
  private currentAudio: AudioBufferSourceNode | null = null

  constructor() {
    // Initialize timing provider
    const timingProvider = new EspeakProvider({
      debug: true
    })

    // Initialize VBridger
    this.vbridger = new VBridgerService(timingProvider, {
      debug: true
    })

    // Audio context for duration calculation
    this.audioContext = new AudioContext()
  }

  /**
   * Speak text with lip-sync
   */
  async speak(text: string) {
    // 1. Generate audio with TTS (e.g., via speaches)
    const audioResponse = await fetch('http://localhost:8000/v1/audio/speech', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'kokoro',
        input: text,
        voice: 'af_bella'
      })
    })

    const audioBuffer = await audioResponse.arrayBuffer()

    // 2. Decode audio to get duration
    const audioData = await this.audioContext.decodeAudioData(audioBuffer.slice(0))
    const duration = audioData.duration

    console.log(`Speaking: "${text}" (${duration}s)`)

    // 3. Prepare phoneme timing
    await this.vbridger.onTtsAudioReady(text, duration)

    // 4. Play audio
    this.currentAudio = this.audioContext.createBufferSource()
    this.currentAudio.buffer = audioData
    this.currentAudio.connect(this.audioContext.destination)

    // Start playback
    this.vbridger.onTtsAudioStart()
    this.currentAudio.start()

    // When audio ends
    this.currentAudio.addEventListener('ended', () => {
      this.vbridger.onTtsAudioEnd()
      this.currentAudio = null
    })
  }

  /**
   * Update loop - call this every frame
   */
  update(deltaTime: number, live2dModel: any) {
    const pose = this.vbridger.update(deltaTime)

    // Apply to Live2D model
    const params = this.vbridger.getCurrentParameters()
    for (const [paramName, value] of Object.entries(params)) {
      live2dModel.setParameter(paramName, value)
    }

    live2dModel.update()
  }

  /**
   * Stop current speech
   */
  stop() {
    if (this.currentAudio) {
      this.currentAudio.stop()
      this.currentAudio = null
    }
    this.vbridger.onTtsAudioEnd()
  }
}

// Usage
const lipSyncManager = new AiriLipSyncManager()

// Speak
await lipSyncManager.speak("Hello! How are you today?")

// Update loop
let lastTime = performance.now()
function animate() {
  const currentTime = performance.now()
  const deltaTime = (currentTime - lastTime) / 1000
  lastTime = currentTime

  lipSyncManager.update(deltaTime, live2dModel)

  requestAnimationFrame(animate)
}
animate()
```

---

## Resource Tier System Integration

```typescript
import { VBridgerService } from '@airi-mods/lipsync-vbridger'
import { EspeakProvider, BfaProvider } from '@airi-mods/phoneme-timing'

class TieredLipSyncManager {
  private vbridger: VBridgerService
  private bfaProvider: BfaProvider
  private espeakProvider: EspeakProvider
  private currentTier: 1 | 2 | 3 = 1

  constructor() {
    // Create both providers
    this.bfaProvider = new BfaProvider()
    this.espeakProvider = new EspeakProvider()

    // Start with BFA (Tier 1)
    this.vbridger = new VBridgerService(this.bfaProvider)
    this.vbridger.setFallbackProvider(this.espeakProvider)
  }

  /**
   * Switch to Tier 1: Full quality with BFA
   */
  async switchToTier1() {
    console.log('Switching to Tier 1: BFA real-time alignment')
    this.vbridger.useAccurateTiming()
    this.vbridger.resume()
    this.currentTier = 1
  }

  /**
   * Switch to Tier 2: eSpeak estimation
   */
  switchToTier2() {
    console.log('Switching to Tier 2: eSpeak estimation')
    this.vbridger.useFallbackEstimation()
    this.vbridger.resume()
    this.currentTier = 2
  }

  /**
   * Switch to Tier 3: No lip-sync (gaming mode)
   */
  switchToTier3() {
    console.log('Switching to Tier 3: Lip-sync disabled')
    this.vbridger.pause()
    this.currentTier = 3
  }

  /**
   * Monitor GPU usage and switch tiers dynamically
   */
  async monitorResources() {
    setInterval(async () => {
      const gpuUsage = await this.getGpuUsage()

      if (gpuUsage > 90) {
        // Heavy load - disable lip-sync
        if (this.currentTier !== 3) {
          this.switchToTier3()
        }
      } else if (gpuUsage > 80) {
        // Moderate load - use estimation
        if (this.currentTier !== 2) {
          this.switchToTier2()
        }
      } else {
        // Light load - full quality
        if (this.currentTier !== 1) {
          await this.switchToTier1()
        }
      }
    }, 5000)  // Check every 5 seconds
  }

  private async getGpuUsage(): Promise<number> {
    // TODO: Implement GPU usage monitoring
    // Could use nvidia-smi or similar
    return 0
  }
}
```

---

## Visibility-Based Optimization

```typescript
import { VBridgerService } from '@airi-mods/lipsync-vbridger'

class VisibilityOptimizedLipSync {
  private vbridger: VBridgerService
  private observer: IntersectionObserver

  constructor(live2dElement: HTMLElement) {
    const timingProvider = new EspeakProvider()
    this.vbridger = new VBridgerService(timingProvider)

    // Observe visibility
    this.observer = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          // Model is visible - resume lip-sync
          this.vbridger.resume()
          console.log('Model visible - lip-sync enabled')
        } else {
          // Model not visible - pause to save CPU
          this.vbridger.pause()
          console.log('Model hidden - lip-sync paused')
        }
      }
    }, {
      threshold: 0.1  // At least 10% visible
    })

    this.observer.observe(live2dElement)
  }

  destroy() {
    this.observer.disconnect()
  }
}

// Usage
const lipSync = new VisibilityOptimizedLipSync(live2dCanvasElement)
```

---

## Custom Configuration

```typescript
import { VBridgerService, type VBridgerServiceOptions } from '@airi-mods/lipsync-vbridger'

// More responsive (less smooth)
const responsiveConfig: VBridgerServiceOptions = {
  smoothingFactor: 20.0,           // Default: 35.0 (lower = more responsive)
  neutralReturnFactor: 10.0,       // Default: 15.0 (lower = faster return)
  cheekPuffDecayFactor: 50.0,      // Default: 80.0 (lower = faster decay)
  debug: true
}

// Smoother (more delayed)
const smoothConfig: VBridgerServiceOptions = {
  smoothingFactor: 50.0,           // Higher = smoother transitions
  neutralReturnFactor: 25.0,       // Higher = slower return to neutral
  cheekPuffDecayFactor: 100.0,     // Higher = slower cheek puff decay
  debug: false
}

const vbridger = new VBridgerService(timingProvider, smoothConfig)
```

---

## Debugging

```typescript
import { VBridgerService } from '@airi-mods/lipsync-vbridger'

const vbridger = new VBridgerService(timingProvider, {
  debug: true  // Enable debug logging
})

// Get service status
const status = vbridger.getStatus()
console.log('VBridger Status:', {
  isPaused: status.isPaused,
  isPlaying: status.isPlaying,
  currentProvider: status.currentProvider,
  phonemeCount: status.phonemeCount,
  currentPose: status.currentPose,
  targetPose: status.targetPose
})

// Log pose values each frame
function animate() {
  const pose = vbridger.update(deltaTime)

  console.log('Current pose:', {
    mouthOpen: pose.mouthOpenY.toFixed(2),
    jawOpen: pose.jawOpen.toFixed(2),
    mouthForm: pose.mouthForm.toFixed(2),
    cheekPuff: pose.cheekPuffC.toFixed(2)
  })

  requestAnimationFrame(animate)
}
```

---

## Error Handling

```typescript
import { VBridgerService } from '@airi-mods/lipsync-vbridger'
import { EspeakProvider } from '@airi-mods/phoneme-timing'

async function initializeLipSync() {
  const timingProvider = new EspeakProvider()

  // Check if espeak-ng is available
  const available = await timingProvider.isAvailable()
  if (!available) {
    console.error('espeak-ng not found! Install: sudo pacman -S espeak-ng')
    // Fall back to no lip-sync
    return null
  }

  const vbridger = new VBridgerService(timingProvider)

  return vbridger
}

// Usage
const vbridger = await initializeLipSync()
if (!vbridger) {
  console.warn('Lip-sync disabled - espeak-ng not available')
  // Continue without lip-sync
}
```

---

## Performance Considerations

### Frame Rate

```typescript
// Target 60 FPS for smooth animation
const TARGET_FPS = 60
const FRAME_TIME = 1000 / TARGET_FPS

let lastTime = performance.now()
let lag = 0

function animate(currentTime: number) {
  const elapsed = currentTime - lastTime
  lastTime = currentTime
  lag += elapsed

  // Fixed timestep update
  while (lag >= FRAME_TIME) {
    const deltaTime = FRAME_TIME / 1000  // Convert to seconds
    const pose = vbridger.update(deltaTime)
    applyToLive2DModel(pose)
    lag -= FRAME_TIME
  }

  live2dModel.update()
  requestAnimationFrame(animate)
}

animate(performance.now())
```

### Memory Management

```typescript
// Clean up when done
class LipSyncManager {
  destroy() {
    // Stop any active playback
    this.vbridger.onTtsAudioEnd()

    // Clear references
    this.vbridger = null
    this.timingProvider = null
  }
}
```

---

## Integration with AIRI Motion System

Coming soon: AIRI MotionManagerPlugin for automatic integration with AIRI's animation system.

```typescript
// Future API (Phase 2 - next step)
import { useMotionUpdatePluginLipSyncVBridger } from '@airi-mods/lipsync-vbridger'

const lipSyncPlugin = useMotionUpdatePluginLipSyncVBridger({
  timingProvider: new EspeakProvider(),
  config: {
    smoothingFactor: 35.0
  }
})

// Register with AIRI motion manager
motionManager.registerPlugin(lipSyncPlugin)
```

---

## Troubleshooting

### Lip-sync not syncing with audio

1. **Check audio duration calculation:**
   ```typescript
   const audioData = await audioContext.decodeAudioData(audioBuffer)
   console.log('Audio duration:', audioData.duration)  // Should match actual audio
   ```

2. **Verify onTtsAudioStart() is called:**
   ```typescript
   vbridger.onTtsAudioStart()  // Must call when audio actually starts
   audioElement.play()
   ```

3. **Check timing provider:**
   ```typescript
   const status = vbridger.getStatus()
   console.log('Phoneme count:', status.phonemeCount)  // Should have phonemes
   ```

### Mouth movements too fast/slow

Adjust smoothing factor:
```typescript
const vbridger = new VBridgerService(timingProvider, {
  smoothingFactor: 20.0  // Lower = more responsive, higher = smoother
})
```

### Mouth not returning to neutral

Check that `onTtsAudioEnd()` is called:
```typescript
audioElement.addEventListener('ended', () => {
  console.log('Audio ended')
  vbridger.onTtsAudioEnd()  // Essential!
})
```

---

## Next Steps

1. Install espeak-ng: `sudo pacman -S espeak-ng`
2. Test with your Live2D model
3. Tune smoothing parameters for your preference
4. Integrate with AIRI motion system (next phase)
5. Add BFA provider for higher accuracy (Phase 4-5)
