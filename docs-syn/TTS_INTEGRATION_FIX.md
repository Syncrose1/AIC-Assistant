# TTS/Lip-Sync Timing Integration Fix

## Problem
Lip-sync animation starts before TTS audio actually plays, causing visible desync. The `vbridgerTtsState.isPlaying` is set to `true` when the TTS request is made, but the audio element hasn't fired its 'play' event yet due to network latency and buffering.

## Solution
Find where AIRI plays TTS audio and integrate the `connectTtsAudioToVBridger()` helper that was already created in `/airi/packages/stage-ui-live2d/src/composables/live2d/lipsync-vbridger.ts`.

## Integration Steps

### 1. Find TTS Audio Playback Location
Search for where AIRI:
- Calls `generateSpeech()` from `@xsai/generate-speech`
- Creates audio elements (HTMLAudioElement) for TTS
- Plays TTS audio in response to chat messages

**Likely locations:**
- `/airi/packages/stage-ui/src/stores/character/index.ts` - Character store that handles chat
- `/airi/packages/stage-ui/src/stores/modules/speech.ts` - Speech generation
- Look for mediabunny usage or HTMLAudioElement creation

### 2. Import VBridger State and Helper

```typescript
// In the file where TTS audio is played
import { connectTtsAudioToVBridger } from '@proj-airi/stage-ui-live2d/composables/live2d/lipsync-vbridger'
import { useLive2dStore } from '@proj-airi/stage-ui-live2d/stores/live2d'

// Get VBridger state
const live2dStore = useLive2dStore()
const vbridgerTtsState = live2dStore.vbridgerTtsState // Need to expose this from Live2D Model component
```

### 3. Connect Audio Element to VBridger

When TTS audio is about to play:

```typescript
async function playTtsAudio(text: string, audioUrl: string) {
  // Create audio element
  const audio = new Audio(audioUrl)

  // Get audio duration (may need to wait for metadata)
  await new Promise(resolve => {
    audio.addEventListener('loadedmetadata', resolve, { once: true })
    audio.load()
  })

  const duration = audio.duration

  // Connect to VBridger - this sets up event listeners
  const cleanup = connectTtsAudioToVBridger(
    vbridgerTtsState,
    text,
    audio,
    duration
  )

  // Play audio - isPlaying will be set when 'play' event fires
  await audio.play()

  // Cleanup when done
  audio.addEventListener('ended', cleanup, { once: true })
}
```

### 4. Alternative: Manual Integration

If `connectTtsAudioToVBridger()` doesn't fit the architecture, implement event listeners manually:

```typescript
function setupLipSyncForTts(text: string, audio: HTMLAudioElement, duration: number) {
  // Set text and duration immediately
  vbridgerTtsState.text.value = text
  vbridgerTtsState.audioDuration.value = duration

  // DON'T set isPlaying yet - wait for audio to actually play

  // Listen for playback start
  audio.addEventListener('play', () => {
    vbridgerTtsState.isPlaying.value = true
    console.log('[VBridger] TTS playback started')
  }, { once: true })

  // Listen for playback end
  audio.addEventListener('ended', () => {
    vbridgerTtsState.isPlaying.value = false
    console.log('[VBridger] TTS playback ended')
  }, { once: true })

  // Handle pause (if applicable)
  audio.addEventListener('pause', () => {
    vbridgerTtsState.isPlaying.value = false
  })
}
```

## Testing After Fix

1. Start Tamagotchi app
2. Send a chat message that triggers TTS
3. Observe:
   - Mouth should NOT move until audio actually starts playing
   - Lip-sync should be synchronized with audio
   - Mouth should stop moving when audio ends

## Files to Modify

**Find and modify:**
- TTS audio playback location (search for `generateSpeech`, `HTMLAudioElement`, `new Audio()`)
- Likely in `/airi/packages/stage-ui/src/stores/character/index.ts` or similar

**Use existing helpers:**
- `/airi/packages/stage-ui-live2d/src/composables/live2d/lipsync-vbridger.ts` - `connectTtsAudioToVBridger()` helper
- `/airi/packages/stage-ui-live2d/src/components/scenes/live2d/Model.vue` - May need to expose `vbridgerTtsState` via store

## Additional Considerations

### Expose VBridger State via Store

The `vbridgerTtsState` is currently only accessible from Model.vue component scope. For easier integration, consider exposing it via the Live2D store:

```typescript
// In /airi/packages/stage-ui-live2d/src/stores/live2d.ts (or create if doesn't exist)
import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useLive2dStore = defineStore('live2d', () => {
  // This will be set by Model.vue when it initializes
  const vbridgerTtsState = ref(null)

  return {
    vbridgerTtsState
  }
})

// In Model.vue, after creating vbridgerTtsState:
const live2dStore = useLive2dStore()
live2dStore.vbridgerTtsState = vbridgerTtsState
```

### Streaming TTS Support

If AIRI supports streaming TTS (audio chunks arriving progressively):
- Set `isPlaying = true` when first chunk starts playing
- Keep `isPlaying = true` until final chunk ends
- Update `audioDuration` as total duration becomes known

### Error Handling

Handle cases where audio fails to load or play:

```typescript
audio.addEventListener('error', (e) => {
  console.error('[VBridger] TTS audio error:', e)
  vbridgerTtsState.isPlaying.value = false
})
```

## Status

- ❌ **NOT IMPLEMENTED** - Requires finding TTS integration point in AIRI codebase
- ✅ Helper function already exists (`connectTtsAudioToVBridger`)
- ✅ VBridger plugin ready to receive properly-timed state changes

## Next Steps

1. Find where AIRI plays TTS audio (search codebase)
2. Integrate `connectTtsAudioToVBridger()` or implement event listeners manually
3. Test with real TTS playback
4. Document any additional findings or edge cases
