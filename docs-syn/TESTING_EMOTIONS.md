# Emotion Visual System Testing Guide

## Overview

The Emotion Visual System is now fully integrated into AIRI. This guide explains how to test emotional expressions on Sunday when you're back at your machine.

## Current Status

✅ **Phase 3 Complete:**
- Emotion parser (canonical `[EMOTION:😊]` format)
- Live2D expression/motion mappings (17 emotions)
- Emotion store with auto-revert to neutral
- TTS adapters (Fish Speech, Qwen3-TTS, Basic, Azure)
- AIRI motion manager plugin integration

## Supported Emotions (17 + Neutral)

### Positive Emotions
- 😊 happy
- 🤩 excited
- 😎 cool
- 😏 smug
- 💪 determined

### Reactive Emotions
- 😳 embarrassed
- 😲 shocked
- 🤔 thinking
- 👀 curious

### Negative Emotions
- 😤 frustrated
- 😢 sad
- 😅 nervous
- 🙄 annoyed

### Expressive Emotions
- 💕 adoring
- 😂 laughing
- 🔥 passionate
- ✨ sparkle

### Neutral
- 😐 neutral

## Integration Points

### 1. Automatic Integration (Already Done)

The emotion plugin is **automatically registered** in `/home/raahats/AI-Assistant-Project/airi/packages/stage-ui-live2d/src/components/scenes/live2d/Model.vue`:

```typescript
// Line ~174-177: Emotion state is initialized
const emotionVisualState = ref<ReturnType<typeof useEmotionVisual>['emotionState'] | null>(null)

// Line ~328-330: Plugin is created and registered
const { plugin: emotionPlugin, emotionState } = useEmotionVisual()
emotionVisualState.value = emotionState

// Line ~335: Plugin registered before VBridger
motionManagerUpdate.register(emotionPlugin, 'post')
```

### 2. Emotion State Access

The `emotionVisualState` ref is available in the Live2D Model component:

```typescript
{
  currentEmotion: Ref<EmotionEmoji | null>,  // Current emotion
  enabled: Ref<boolean>,                     // Enable/disable
  holdDuration: Ref<number>                  // Hold time (default 3s)
}
```

## Testing Methods

### Method 1: Browser Console Test (Quickest)

1. **Start AIRI:**
   ```bash
   cd /home/raahats/AI-Assistant-Project/airi
   pnpm dev  # or pnpm dev:tamagotchi
   ```

2. **Open Browser DevTools** (F12)

3. **Access emotionVisualState via Vue DevTools:**
   - Install Vue DevTools extension
   - Find the Live2D Model component
   - Access `emotionVisualState` in component data

4. **Manually trigger emotions:**
   ```javascript
   // In browser console
   const emotionState = emotionVisualState.value

   // Set happy emotion
   emotionState.currentEmotion.value = '😊'

   // Wait 3 seconds, should auto-revert to neutral

   // Try different emotions
   emotionState.currentEmotion.value = '😢'  // Sad
   setTimeout(() => {
     emotionState.currentEmotion.value = '🤩'  // Excited
   }, 4000)
   ```

### Method 2: LLM Response Simulation

Create a test component to parse emotion tags from text:

```vue
<script setup lang="ts">
import { ref } from 'vue'
import { applyEmotionFromResponse } from '../../composables/live2d/emotion-visual'
import type { EmotionVisualState } from '../../composables/live2d/emotion-visual'

const props = defineProps<{
  emotionState: EmotionVisualState
}>()

const testText = ref('Hello! [EMOTION:😊] How are you today? [EMOTION:😢] I miss you.')

async function runTest() {
  await applyEmotionFromResponse(props.emotionState, testText.value)
}
</script>

<template>
  <div style="position: fixed; top: 10px; right: 10px; z-index: 9999; background: white; padding: 10px; border: 1px solid black;">
    <h3>Emotion Test</h3>
    <textarea v-model="testText" placeholder="Text with [EMOTION:😊] tags" style="width: 300px; height: 100px;"></textarea>
    <button @click="runTest">Parse & Apply Emotion</button>
    <div>
      <label><input v-model="emotionState.enabled.value" type="checkbox"> Enabled</label>
    </div>
    <div>
      Current: {{ emotionState.currentEmotion.value }}
    </div>
  </div>
</template>
```

### Method 3: TTS Adapter Testing

Test the TTS adapters for different TTS systems:

```typescript
import {
  parseEmotions,
  FishSpeechAdapter,
  Qwen3Adapter,
  BasicTtsAdapter
} from '@airi-mods/emotion-visual'

// Test text with emotion tags
const text = "Hello! [EMOTION:😊] How are you? [EMOTION:😢] I'm sad."

// Parse canonical format
const { cleanText, emotions } = parseEmotions(text)
console.log('Clean text:', cleanText)
console.log('Emotions:', emotions)

// Test Fish Speech adapter
const fishAdapter = new FishSpeechAdapter()
const fishText = fishAdapter.convertText(cleanText, emotions)
console.log('Fish Speech:', fishText)
// Expected: "Hello! (happy) How are you? (sad) I'm sad."

// Test Qwen3 adapter
const qwenAdapter = new Qwen3Adapter()
const qwenText = qwenAdapter.convertText(cleanText, emotions)
console.log('Qwen3-TTS:', qwenText)
// Expected: "[TONE: warm and cheerful] Hello! How are you? I'm sad."

// Test Basic adapter (strips emotions)
const basicAdapter = new BasicTtsAdapter()
const basicText = basicAdapter.convertText(cleanText, emotions)
console.log('Basic TTS:', basicText)
// Expected: "Hello! How are you? I'm sad."
```

## Expected Behavior

When emotions are working correctly, you should see:

1. **Expression Changes:**
   - Model's facial expression changes to match emotion
   - Uses Live2D expression files (e.g., `happy.exp3.json`)

2. **Motion Triggers:**
   - Appropriate motion plays (e.g., `Happy` motion group)
   - Motion priority overrides idle animations

3. **Auto-Revert:**
   - Expression holds for 3 seconds (configurable)
   - Automatically reverts to neutral
   - Smooth transition back

4. **TTS Emotion Sync:**
   - When integrated with TTS, expressions change during speech
   - Emotions match the emotional tone of the voice

## TTS Integration (Future)

When connecting to TTS systems:

**Fish Speech V1.5:**
```typescript
// LLM generates: "Hello! [EMOTION:😊] How are you?"
const { cleanText, emotions } = parseEmotions(llmResponse)
const fishAdapter = new FishSpeechAdapter()
const ttsText = fishAdapter.convertText(cleanText, emotions)
// Send to Fish Speech: "Hello! (happy) How are you?"

// Also apply visual emotion
emotionState.currentEmotion.value = emotions[0].emotion
```

**Qwen3-TTS:**
```typescript
// LLM generates: "Hello! [EMOTION:😊] How are you?"
const { cleanText, emotions } = parseEmotions(llmResponse)
const qwenAdapter = new Qwen3Adapter()
const ttsText = qwenAdapter.convertText(cleanText, emotions)
// Send to Qwen3: "[TONE: warm and cheerful] Hello! How are you?"

// Apply visual emotion
emotionState.currentEmotion.value = emotions[0].emotion
```

## Live2D Model Requirements

Your Live2D model should have:

**Expression Files** (in model directory):
- `happy.exp3.json`
- `sad.exp3.json`
- `excited_star.exp3.json`
- `shocked.exp3.json`
- etc.

**Motion Groups** (in `model3.json`):
- `Happy`
- `Sad`
- `Excited`
- `Surprised`
- `Nervous`
- `Angry`
- `Thinking`
- `Confident`
- `Annoyed`
- `Talking` (neutral)

**Note:** If your model doesn't have all expressions/motions, the system will gracefully skip missing ones. You can customize the mappings in `emotion-map.ts` to match your model's available assets.

## Debugging

### Enable Debug Mode

For detailed logging, modify the plugin options:

```typescript
// In emotion-visual.ts composable
const plugin = useMotionUpdatePluginEmotionVisual({
  currentEmotion: emotionState.currentEmotion,
  enabled: emotionState.enabled,
  holdDuration: emotionState.holdDuration.value,
  applyDuringSpeech: true,
  // Add debug logging (you'll need to implement this)
})
```

### Check Plugin Registration

In browser console:
```javascript
// Check if emotion state is accessible
console.log(emotionVisualState.value)

// Manually set emotion
emotionVisualState.value.currentEmotion.value = '😊'

// Check enabled state
console.log(emotionVisualState.value.enabled.value)
```

### Common Issues

**Issue: No expression change**
- Check that `emotionState.enabled.value` is `true`
- Verify model has the expression file
- Check console for errors
- Try neutral emotion first: `emotionState.currentEmotion.value = '😐'`

**Issue: Expression doesn't revert to neutral**
- Check hold duration: `emotionState.holdDuration.value`
- Verify time is progressing (check `ctx.now` in plugin)
- Try manually setting to neutral

**Issue: Wrong expression applied**
- Check emotion mapping in `emotion-map.ts`
- Verify your model's expression IDs match
- Try using emoji directly instead of name

**Issue: Emotion parser not working**
- Check tag format: `[EMOTION:😊]` or `[EMOTION:happy]`
- Verify no extra spaces: `[EMOTION: 😊]` won't work
- Check regex in `emotion-parser.ts`

## Test Checklist

- [ ] AIRI starts without errors
- [ ] Live2D model loads correctly
- [ ] Emotion plugin is registered (check console)
- [ ] Manual emotion trigger works
- [ ] Expression changes when emotion set
- [ ] Expression reverts to neutral after 3s
- [ ] Multiple emotion changes work smoothly
- [ ] TTS adapters convert tags correctly
- [ ] Can enable/disable emotions dynamically

## Combined Testing (Emotions + Lip-Sync)

Since both VBridger and Emotions are integrated, you can test them together:

```javascript
// Set emotion
emotionState.currentEmotion.value = '😊'

// Trigger lip-sync (when TTS implemented)
vbridgerTtsState.value.text.value = "Hello world"
vbridgerTtsState.value.audioDuration.value = 2.0
vbridgerTtsState.value.isPlaying.value = true

// Should see: Happy expression + mouth moving
// After 2s: Mouth stops, expression holds for 3s total, then reverts to neutral
```

## Next Steps After Testing

Once basic emotions are working:

1. **Fine-tune hold duration:** Adjust based on natural conversation flow
2. **Test with LLM:** Integrate with actual LLM responses containing emotion tags
3. **Test TTS adapters:** Verify Fish Speech and Qwen3 produce expected emotional tone
4. **Add emotion intelligence:** LLM learns when to use which emotions
5. **Implement emotion blending:** Smooth transitions between emotions
6. **Add intensity control:** Some emotions should be more/less intense

## Support

If you encounter issues:
1. Check that model has required expression files
2. Verify emotion mappings match your model
3. Test with simple emotions first (😊, 😢, 😐)
4. Check TypeScript compilation
5. Review Phase 3 commit history

Good luck with testing! 😊✨
