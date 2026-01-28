# @airi-mods/phoneme-timing

TTS-agnostic phoneme timing system for VBridger lip-sync animation.

## Overview

This package provides an abstract interface for obtaining timed phoneme data from various sources. It decouples VBridger's lip-sync system from specific TTS engines, allowing easy switching between Kokoro, Fish Speech, or other TTS providers.

## Architecture

```
┌─────────────────────────────────────────┐
│  VBridger Lip-Sync Service              │
│  (Uses timed phonemes)                  │
└─────────────┬───────────────────────────┘
              │
              │ PhonemeTimingProvider
              │ interface
              ▼
┌─────────────────────────────────────────┐
│  Timing Provider Implementations        │
│  ┌───────────────┐  ┌─────────────────┐│
│  │ EspeakProvider│  │ MfaProvider     ││
│  │ (MVP)         │  │ (Production)    ││
│  └───────────────┘  └─────────────────┘│
│  ┌───────────────┐  ┌─────────────────┐│
│  │ FishSpeech    │  │ AzureProvider   ││
│  │ Provider      │  │ (Cloud)         ││
│  └───────────────┘  └─────────────────┘│
└─────────────────────────────────────────┘
```

## Features

- **TTS-agnostic design** - Works with any TTS engine
- **Multiple timing strategies** - Uniform, average durations, duration hints
- **Caching support** - Cache slow but accurate MFA alignments
- **Extensible** - Easy to add new provider implementations

## Installation

```bash
pnpm add @airi-mods/phoneme-timing
```

## Usage

### Basic Example (eSpeak Provider)

```typescript
import { EspeakProvider } from '@airi-mods/phoneme-timing'

const provider = new EspeakProvider({
  binaryPath: 'espeak-ng',
  estimationStrategy: 'uniform',
  debug: false
})

// Check if espeak-ng is available
const available = await provider.isAvailable()
if (!available) {
  throw new Error('espeak-ng not found. Install: pacman -S espeak-ng')
}

// Generate audio with TTS (e.g., via speaches API)
const audioResponse = await fetch('http://localhost:8000/v1/audio/speech', {
  method: 'POST',
  body: JSON.stringify({
    model: 'kokoro',
    input: 'Hello world',
    voice: 'af_bella'
  })
})
const audioBuffer = await audioResponse.arrayBuffer()

// Get audio duration
const audioContext = new AudioContext()
const audioData = await audioContext.decodeAudioData(audioBuffer)
const duration = audioData.duration

// Generate timed phonemes
const timedPhonemes = await provider.getTimedPhonemes(
  'Hello world',
  duration,
  { language: 'en-us', speechRate: 1.0 }
)

// Result:
// [
//   { phoneme: 'h', startTime: 0.00, endTime: 0.15 },
//   { phoneme: 'ə', startTime: 0.15, endTime: 0.30 },
//   { phoneme: 'l', startTime: 0.30, endTime: 0.45 },
//   ...
// ]
```

### With VBridger Service

```typescript
import { VBridgerService } from '@airi-mods/lipsync-vbridger'
import { EspeakProvider } from '@airi-mods/phoneme-timing'

const timingProvider = new EspeakProvider()
const vbridger = new VBridgerService(timingProvider)

// When TTS audio is ready
vbridger.onTtsAudioReady(text, audioLengthSeconds)

// Update loop (60 FPS)
setInterval(() => {
  const pose = vbridger.update(deltaTime)
  applyToLive2DModel(pose)
}, 1000 / 60)
```

## Provider Implementations

### EspeakProvider (MVP)

Fast, local phoneme timing using eSpeak-ng for text → phonemes conversion with uniform timing estimation.

**Pros:**
- Fast (real-time)
- Lightweight
- Fully local
- IPA output compatible with VBridger

**Cons:**
- Timing is estimated, not frame-accurate
- Requires espeak-ng binary installed

**Installation:**
```bash
# CachyOS / Arch
pacman -S espeak-ng

# Ubuntu / Debian
apt install espeak-ng

# macOS
brew install espeak-ng
```

**Configuration:**
```typescript
const provider = new EspeakProvider({
  binaryPath: 'espeak-ng',
  estimationStrategy: 'uniform',  // MVP: uniform distribution
  debug: false
})
```

### BfaProvider (Future - High Accuracy)

Real-time phoneme alignment using Bournemouth Forced Aligner (BFA).

**Pros:**
- 240× faster than traditional forced aligners
- Real-time capable (millisecond precision)
- Frame-accurate alignment with actual audio
- Works with any TTS output
- GPU acceleration support

**Cons:**
- Requires additional VRAM (~2GB estimated)
- More complex setup than eSpeak

**Use case:** High accuracy lip-sync when resources available (Tier 1 mode)

**Status:** Not yet implemented (planned for Phase 4-5)

### FishSpeechProvider (Future)

Native timing support when using Fish Speech TTS.

**Status:** Not yet implemented (awaiting Fish Speech integration)

### AzureProvider (Future)

Use Azure Neural TTS viseme data for cloud-based deployments.

**Status:** Not yet implemented

## API Reference

### PhonemeTimingProvider Interface

```typescript
interface PhonemeTimingProvider {
  /**
   * Convert text to timed phonemes.
   */
  getTimedPhonemes(
    text: string,
    audioLengthSeconds: number,
    options?: PhonemeTimingOptions
  ): Promise<TimedPhoneme[]>

  /**
   * Check if this provider is available/installed.
   */
  isAvailable(): Promise<boolean>

  /**
   * Provider name for debugging/logging.
   */
  readonly name: string
}
```

### PhonemeTimingOptions

```typescript
interface PhonemeTimingOptions {
  /**
   * Language code (e.g., 'en-us', 'en-gb', 'ja')
   * Default: 'en-us'
   */
  language?: string

  /**
   * Speech rate multiplier from TTS
   * Used to adjust timing estimates
   * Default: 1.0
   */
  speechRate?: number

  /**
   * Provider-specific options
   */
  [key: string]: unknown
}
```

### TimingEstimationStrategy

```typescript
enum TimingEstimationStrategy {
  /**
   * Distribute phonemes evenly across audio duration.
   * Simple but inaccurate for varying phoneme lengths.
   */
  UNIFORM = 'uniform',

  /**
   * Use phoneme-specific average durations.
   * More accurate than uniform distribution.
   */
  AVERAGE_DURATIONS = 'average_durations',

  /**
   * Use duration hints from phonemizer (e.g., eSpeak stress marks).
   * Most accurate estimation without forced alignment.
   */
  DURATION_HINTS = 'duration_hints'
}
```

## Timing Estimation Strategies

### Uniform Distribution (MVP)

Simplest approach - divide audio duration evenly across all phonemes.

```typescript
const timePerPhoneme = audioLengthSeconds / phonemes.length

phonemes.map((phoneme, i) => ({
  phoneme,
  startTime: i * timePerPhoneme,
  endTime: (i + 1) * timePerPhoneme
}))
```

**When to use:** MVP, quick testing, "good enough" lip-sync

### Average Durations (Future)

Use phoneme-specific average durations based on phonetic research.

```typescript
const avgDurations = {
  'i': 80,   // ms
  'ɑ': 120,  // ms
  'p': 50,   // ms (plosives are short)
  ...
}
```

**When to use:** Better accuracy without forced alignment overhead

### Duration Hints (Future)

Parse eSpeak's stress markers and length indicators.

```typescript
// eSpeak output: həˈloʊ (stress on second syllable)
// → 'h' shorter, 'ə' much shorter, 'l' normal, 'oʊ' longer (stressed)
```

**When to use:** Best estimation without forced alignment

## Hybrid Provider Strategy

For optimal quality with resource constraints:

```typescript
class HybridTimingProvider implements PhonemeTimingProvider {
  constructor(
    private accurateProvider: BfaProvider,      // High accuracy, uses VRAM
    private fallbackProvider: EspeakProvider    // Fast, zero VRAM
  ) {}

  async getTimedPhonemes(text: string, audioLengthSeconds: number) {
    // Use BFA when resources available, fall back to eSpeak under pressure
    if (await this.hasAvailableResources()) {
      return this.accurateProvider.getTimedPhonemes(text, audioLengthSeconds)
    } else {
      return this.fallbackProvider.getTimedPhonemes(text, audioLengthSeconds)
    }
  }
}
```

**Use case:** Dynamic resource management for gaming/multitasking scenarios.

## Design Philosophy

This package follows the **TTS-agnostic** principle:

1. VBridger depends on `PhonemeTimingProvider` interface, NOT specific TTS
2. Easy to swap TTS engines (Kokoro → Fish Speech) without changing VBridger code
3. Multiple providers can coexist (fast for real-time, accurate for cached)
4. Provider selection happens at runtime via config

## Related Packages

- `@airi-mods/animation-core` - Core types (TimedPhoneme)
- `@airi-mods/lipsync-vbridger` - VBridger lip-sync service (consumer of this package)

## References

- [eSpeak-ng Documentation](https://github.com/espeak-ng/espeak-ng)
- [Bournemouth Forced Aligner (BFA)](https://github.com/tabahi/bournemouth-forced-aligner)
- [PHONEME_TIMING_INVESTIGATION.md](../../../PHONEME_TIMING_INVESTIGATION.md)
- [PERSONA_ENGINE_TIMING_ANALYSIS.md](../../../PERSONA_ENGINE_TIMING_ANALYSIS.md)

## License

MIT
