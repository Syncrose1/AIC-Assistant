# VBridger Lip-Sync Testing Guide

## Overview

The VBridger 9-parameter lip-sync system is now fully integrated into AIRI. This guide explains how to test it on Sunday when you're back at your machine with the Live2D model.

## Current Status

✅ **Phase 2 Complete:**
- VBridger service with phoneme-to-pose mapping
- Interpolation and smoothing algorithms
- eSpeak-ng phoneme timing provider
- AIRI motion manager plugin
- Vue composable integration
- All interfaces aligned and type-checked

## Integration Points

### 1. Automatic Integration (Already Done)

The VBridger plugin is **automatically registered** in `/home/raahats/AI-Assistant-Project/airi/packages/stage-ui-live2d/src/components/scenes/live2d/Model.vue`:

```typescript
// Line ~167: VBridger TTS state is initialized
const vbridgerTtsState = ref<ReturnType<typeof useVBridgerLipSync>['ttsState'] | null>(null)

// Line ~316-317: Plugin is created and registered
const { plugin: vbridgerPlugin, ttsState } = useVBridgerLipSync()
vbridgerTtsState.value = ttsState

// Line ~321: Plugin registered in 'post' stage
motionManagerUpdate.register(vbridgerPlugin, 'post')
```

### 2. TTS State Access

The `vbridgerTtsState` ref is available in the Live2D Model component and contains:

```typescript
{
  text: Ref<string>,          // Current TTS text
  audioDuration: Ref<number>, // Audio length in seconds
  isPlaying: Ref<boolean>,    // Playback state
  enabled: Ref<boolean>       // Enable/disable lip-sync
}
```

## Testing Methods

### Method 1: Browser Console Test (Quickest)

1. **Start AIRI:**
   ```bash
   cd /home/raahats/AI-Assistant-Project/airi
   pnpm dev  # or pnpm dev:tamagotchi for desktop
   ```

2. **Open Browser DevTools** (F12)

3. **Access vbridgerTtsState via Vue DevTools:**
   - Install Vue DevTools extension
   - Find the Live2D Model component
   - Access `vbridgerTtsState` in component data

4. **Manually trigger lip-sync:**
   ```javascript
   // In browser console (you'll need to access the Vue component instance)
   // This is a pseudo-code example - actual access depends on Vue DevTools

   const ttsState = vbridgerTtsState.value

   // Simulate TTS audio
   ttsState.text.value = "Hello world, this is a test"
   ttsState.audioDuration.value = 2.5  // 2.5 seconds
   ttsState.isPlaying.value = true

   // After 2.5 seconds, stop
   setTimeout(() => {
     ttsState.isPlaying.value = false
   }, 2500)
   ```

### Method 2: Test Audio Element (More Realistic)

1. **Create a test audio file** with known text (e.g., "Hello world")

2. **Modify AIRI to add a test button** (temporary test code):

   Create `/home/raahats/AI-Assistant-Project/airi/packages/stage-ui-live2d/src/components/test/VBridgerTest.vue`:

   ```vue
   <script setup lang="ts">
   import { ref } from 'vue'
   import { connectTtsAudioToVBridger } from '../../composables/live2d/lipsync-vbridger'
   import type { TtsLipSyncState } from '../../composables/live2d/lipsync-vbridger'

   const props = defineProps<{
     ttsState: TtsLipSyncState
   }>()

   const testText = ref('Hello world, this is a test of the VBridger lip-sync system')
   const audioUrl = ref('')  // Set to your test audio URL

   async function runTest() {
     if (!audioUrl.value) {
       console.error('Please set an audio URL first')
       return
     }

     const audio = new Audio(audioUrl.value)

     // Get duration
     await new Promise((resolve) => {
       audio.addEventListener('loadedmetadata', resolve, { once: true })
       audio.load()
     })

     // Connect to VBridger
     const cleanup = connectTtsAudioToVBridger(
       props.ttsState,
       testText.value,
       audio,
       audio.duration
     )

     // Play
     await audio.play()

     // Cleanup will be called automatically when audio ends
   }
   </script>

   <template>
     <div style="position: fixed; top: 10px; right: 10px; z-index: 9999; background: white; padding: 10px; border: 1px solid black;">
       <h3>VBridger Test</h3>
       <input v-model="testText" placeholder="Test text" style="width: 300px;">
       <input v-model="audioUrl" placeholder="Audio URL" style="width: 300px;">
       <button @click="runTest">Test Lip-Sync</button>
       <div>
         <label><input v-model="ttsState.enabled.value" type="checkbox"> Enabled</label>
       </div>
       <div>
         Playing: {{ ttsState.isPlaying.value }}
       </div>
     </div>
   </template>
   ```

3. **Import and use in Live2D.vue** (or Model.vue)

### Method 3: Integration with AIRI TTS (Future)

When AIRI's TTS system is implemented, connect it like this:

```typescript
// In TTS audio handler
function onTtsAudioReady(text: string, audioElement: HTMLAudioElement) {
  const cleanup = connectTtsAudioToVBridger(
    vbridgerTtsState.value!,
    text,
    audioElement,
    audioElement.duration
  )

  // Store cleanup function to call when component unmounts
  return cleanup
}
```

## Expected Behavior

When lip-sync is working correctly, you should see:

1. **Phoneme Generation:**
   - Check console for `[EspeakProvider]` debug logs (if debug enabled)
   - Text should be converted to IPA phonemes via eSpeak-ng

2. **Pose Application:**
   - Model's mouth should move according to phonemes
   - 9 parameters: MouthOpenY, JawOpen, MouthForm, MouthShrug, MouthFunnel, MouthPuckerWiden, MouthPressLipOpen, MouthX, CheekPuffC

3. **Smooth Transitions:**
   - Mouth movements should be smooth, not jerky
   - Interpolation should blend between phoneme poses
   - Return to neutral pose when audio ends

## Debugging

### Enable Debug Logging

Edit `/home/raahats/AI-Assistant-Project/airi/packages/stage-ui-live2d/src/composables/live2d/lipsync-vbridger.ts`:

```typescript
const timingProvider = new EspeakProvider({
  debug: true,  // Change from false to true
})
```

Rebuild AIRI:
```bash
cd /home/raahats/AI-Assistant-Project/airi
pnpm dev
```

### Check eSpeak-ng Installation

```bash
espeak-ng --version  # Should show version 1.52.0
espeak-ng --ipa -x "Hello world"  # Should output IPA phonemes
```

### Verify Plugin Registration

In browser console, check if VBridger plugin is registered:
- Look for console logs from motion manager
- Check that mouth parameters are being set during playback

### Common Issues

**Issue: No mouth movement**
- Check that `vbridgerTtsState.enabled.value` is `true`
- Verify audio is actually playing (`ttsState.isPlaying.value`)
- Check console for errors

**Issue: Jerky movement**
- Check smoothing config in VBridgerService
- Verify frame rate (should be 60 FPS)

**Issue: Wrong phonemes**
- Enable debug logging in EspeakProvider
- Check eSpeak-ng output for the test text

**Issue: TypeScript errors**
- Run `pnpm typecheck` in airi directory
- Check Vue version matches (3.5.26)

## Live2D Model Requirements

Your Live2D model must have these parameters:
- `ParamMouthOpenY` - Vertical mouth opening
- `ParamJawOpen` - Jaw position
- `ParamMouthForm` - Smile/frown
- `ParamMouthShrug` - Upper lip raise
- `ParamMouthFunnel` - Lips forward
- `ParamMouthPuckerWiden` - Pucker/wide
- `ParamMouthPressLipOpen` - Pressed/open
- `ParamMouthX` - Horizontal shift
- `ParamCheekPuffC` - Cheek puff

If your model doesn't have all parameters, the system will still work but with reduced expressiveness.

## Next Steps After Testing

Once basic lip-sync is working:

1. **Fine-tune smoothing:** Adjust VBRIDGER_CONFIG values
2. **Test with different voices:** Try various TTS outputs
3. **Optimize performance:** Monitor CPU usage, implement pause/resume for invisible models
4. **Add BFA support:** Integrate Montreal Forced Aligner for accurate timing
5. **Connect to AIRI TTS:** Integrate with actual TTS system (Phase 1B)

## Test Checklist

- [ ] AIRI starts without errors
- [ ] Live2D model loads correctly
- [ ] eSpeak-ng is installed and accessible
- [ ] VBridger plugin is registered (check console)
- [ ] Manual TTS state trigger works
- [ ] Mouth moves during playback
- [ ] Movement is smooth and natural
- [ ] Returns to neutral after playback ends
- [ ] Can enable/disable lip-sync dynamically

## Support

If you encounter issues:
1. Check debug logs (enable debug mode)
2. Verify eSpeak-ng installation
3. Check TypeScript compilation
4. Review commit history for Phase 2 changes
5. Test with simple text first ("Hello world")

Good luck with testing! 🎤
