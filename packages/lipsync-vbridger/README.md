# @airi-mods/lipsync-vbridger

**VBridger 9-Parameter Lip-Sync System for AIRI**

Ported from: [Handcrafted Persona Engine](https://github.com/tylersuehr7/handcrafted-persona-engine)

---

## Overview

This package provides realistic lip-sync animation for AIRI using the VBridger 9-parameter mouth system, dramatically improving upon AIRI's default 2-parameter system.

### Parameter Comparison

| System | Parameters | Realism |
|--------|------------|---------|
| **AIRI (Default)** | 2 (MouthOpenY, JawOpen) | Basic |
| **VBridger** | 9 (see below) | High fidelity |

### The 9 VBridger Parameters

1. **MouthOpenY** (0-1): Vertical mouth opening
2. **JawOpen** (0-1): Jaw opening (independent from lips)
3. **MouthForm** (-1 to 1): Smile (+1) to Frown (-1)
4. **MouthShrug** (0-1): Upward lip tension
5. **MouthFunnel** (0-1): Lips forward/pursed
6. **MouthPuckerWiden** (-1 to 1): Wide (-1) to Pucker (+1)
7. **MouthPressLipOpen** (-1 to 1): Pressed (-1) to Teeth showing (+1)
8. **MouthX** (-1 to 1): Horizontal mouth shift
9. **CheekPuffC** (0-1): Cheek puff (for plosives like 'b', 'p')

---

## Quick Start

```typescript
import { VBridgerService } from '@airi-mods/lipsync-vbridger'
import { EspeakProvider } from '@airi-mods/phoneme-timing'

// 1. Create timing provider
const timingProvider = new EspeakProvider()

// 2. Create VBridger service
const vbridger = new VBridgerService(timingProvider)

// 3. When TTS audio is ready
await vbridger.onTtsAudioReady("Hello world", 1.2)  // text, duration

// 4. Start audio playback
vbridger.onTtsAudioStart()

// 5. Update every frame (60 FPS)
function animate() {
  const pose = vbridger.update(deltaTime)
  applyToLive2DModel(pose)
  requestAnimationFrame(animate)
}
```

**See [USAGE.md](./USAGE.md) for complete examples and integration guides.**

---

## Features

- **70+ Phoneme Mappings**: IPA phoneme symbols → mouth poses
  - Plosives: b, p, d, t, g, k
  - Fricatives: f, v, s, z, h, ʃ, ʒ, ð, θ
  - Nasals: m, n, ŋ
  - Liquids/Glides: l, ɹ, w, j
  - Vowels: i, u, ɑ, ɔ, ɛ, ɜ, ɪ, ʊ, ʌ, ə
  - Diphthongs: A (ay), I (eye), W (ow), Y (oy)
  - Regional variants (American vs British)

- **Smooth Interpolation**: Ease-in-out transitions between phonemes
- **Special Effects**: Cheek puff for plosives, faster decay
- **Configurable**: Smoothing factors, decay rates

---

## Status

**Phase 2 Progress:**

✅ **Completed:**
- Type definitions (`types.ts`)
- 70+ phoneme-to-pose mappings (`phoneme-map.ts`)
- Interpolation functions (`interpolation.ts`)
- Package structure

⏳ **TODO:**
- Phoneme timing integration (investigate Kokoro TTS)
- Main service implementation (`vbridger-service.ts`)
- AIRI motion plugin (`plugin.ts`)
- Live2D model parameter application
- Testing with AIRI

---

## Usage (Planned)

```typescript
import {
  getPoseForPhoneme,
  lerpPose,
  VBRIDGER_CONFIG,
} from '@airi-mods/lipsync-vbridger'

// Get pose for a phoneme
const pose = getPoseForPhoneme('i') // 'ee' sound
// { mouthOpenY: 0.1, jawOpen: 0.1, mouthForm: 0.7, ... }

// Interpolate between poses
const currentPose = getPoseForPhoneme('m')
const nextPose = getPoseForPhoneme('i')
const interpolated = lerpPose(currentPose, nextPose, 0.5)
```

---

## How It Works

### 1. Phoneme Timing Data

TTS engine provides phonemes with timestamps:
```typescript
interface TimedPhoneme {
  phoneme: string    // IPA symbol (e.g., "i", "m")
  startTime: number  // Seconds
  endTime: number    // Seconds
}
```

### 2. Pose Interpolation

For each frame:
1. Find current and next phoneme based on playback time
2. Get poses for both phonemes from `PHONEME_MAP`
3. Ease-in-out interpolation between poses
4. Smooth transition to target using exponential smoothing
5. Apply 9 parameters to Live2D model

### 3. Smoothing

Parameters smoothly transition using:
```typescript
currentValue = lerp(currentValue, targetValue, SMOOTHING_FACTOR * deltaTime)
```

Special case: `CheekPuffC` decays faster (CHEEK_PUFF_DECAY_FACTOR = 80)

---

## Configuration

```typescript
import { VBRIDGER_CONFIG } from '@airi-mods/lipsync-vbridger'

// Smoothing speed (higher = faster response)
VBRIDGER_CONFIG.SMOOTHING_FACTOR // 35.0

// Return to neutral speed when idle
VBRIDGER_CONFIG.NEUTRAL_RETURN_FACTOR // 15.0

// Cheek puff decay speed
VBRIDGER_CONFIG.CHEEK_PUFF_DECAY_FACTOR // 80.0

// Neutral detection threshold
VBRIDGER_CONFIG.NEUTRAL_THRESHOLD // 0.02
```

---

## Dependencies

### Required

- `@airi-mods/animation-core`: Shared types and utilities

### Integration Needs

1. **Phoneme Timing Source**:
   - Kokoro TTS (our current TTS) - investigate if it provides timing
   - Alternative: Montreal Forced Aligner, g2p estimation
   - Fallback: Audio-reactive (amplitude-based)

2. **Live2D Model**:
   - Model must have VBridger-compatible parameters
   - Graceful degradation if parameters missing

3. **AIRI Motion System**:
   - Plugin integration via `MotionManagerPlugin`
   - Subscribe to TTS playback events
   - Update parameters each frame

---

## Example Phoneme Mappings

```typescript
// 'ee' sound (see)
'i': {
  mouthOpenY: 0.1,
  jawOpen: 0.1,
  mouthForm: 0.7,        // Smile
  mouthShrug: 0.4,       // Tension
  mouthPuckerWiden: -0.9, // Wide
  mouthPressLipOpen: 0.9, // Teeth showing
  // ...
}

// 'oo' sound (food)
'u': {
  mouthOpenY: 0.15,
  jawOpen: 0.15,
  mouthFunnel: 1.0,       // Strong funnel
  mouthPuckerWiden: 1.0,  // Strong pucker
  // ...
}

// 'b' sound (plosive)
'b': {
  mouthPressLipOpen: -1.0, // Lips pressed
  cheekPuffC: 0.6,         // Cheek puff
  // ...
}
```

---

## References

- **Source Code**: `handcrafted-persona-engine/src/PersonaEngine/PersonaEngine.Lib/Live2D/Behaviour/LipSync/VBridgerLipSyncService.cs`
- **Analysis**: `/home/raahats/AI-Assistant-Project/PHASE2_VBRIDGER_ANALYSIS.md`
- **Implementation Plan**: `/home/raahats/AI-Assistant-Project/IMPLEMENTATION_PLAN.md` (Phase 2)

---

## License

MIT (same as AIRI)
