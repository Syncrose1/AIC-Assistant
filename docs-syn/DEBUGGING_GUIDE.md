# Debugging Guide for AIRI Mods

## Common Issues & Solutions

### Issue: Changes to airi-mods packages not appearing in running app

**Symptoms:**
- Modified code in `/airi-mods/packages/*`
- Rebuilt package with `pnpm build`
- Restarted dev server but changes not reflected
- Console logs don't appear

**Root Cause:**
Vite caches pre-bundled dependencies in `node_modules/.vite` directories. When workspace packages are rebuilt, Vite may continue using cached versions.

**Solution:**
```bash
# 1. Rebuild the modified package
cd /airi-mods/packages/[package-name]
pnpm build

# 2. Clear ALL Vite caches
cd /home/raahats/AI-Assistant-Project/airi
rm -rf node_modules/.vite
rm -rf apps/stage-tamagotchi/node_modules/.vite
rm -rf apps/stage-web/node_modules/.vite

# 3. Restart dev server (Ctrl+C then restart)
pnpm dev:tamagotchi
# or
pnpm dev
```

**Pro Tip:** If you're making frequent changes, create a helper script:
```bash
#!/bin/bash
# rebuild-and-clear.sh
cd /home/raahats/AI-Assistant-Project/airi-mods/packages/$1
pnpm build
cd /home/raahats/AI-Assistant-Project/airi
rm -rf node_modules/.vite apps/*/node_modules/.vite
echo "✅ Rebuilt $1 and cleared caches. Restart dev server now."
```

Usage: `./rebuild-and-clear.sh lipsync-vbridger`

---

### Issue: Pinia store ref unwrapping confusion

**Symptoms:**
- Error: `Cannot create property 'value' on string`
- Store properties seem to be strings/numbers instead of Refs

**Root Cause:**
Pinia automatically unwraps refs when accessing store properties in components.

**Correct Usage:**
```typescript
// In store definition (live2d.ts)
const myValue = ref(0)
return { myValue }  // Returns Ref<number>

// In components (Stage.vue, Model.vue)
import { useLive2d } from './stores/live2d'
const store = useLive2d()
store.myValue = 42  // ✅ Correct - Pinia unwraps automatically

// WRONG:
store.myValue.value = 42  // ❌ Error - already unwrapped!

// When passing to composables
const refs = {
  myValue: store.myValue  // This is still a Ref object
}
// Composables receive actual Ref objects and should use .value
```

**Key Insight:**
- Store properties ARE Refs internally
- Component access is unwrapped for convenience
- Passing store properties to functions/composables passes the Ref object
- Inside those functions, use `.value` normally

---

### Issue: Motion priority - VBridger overridden by idle animations

**Debugging Checklist:**

1. **Is the plugin running at all?**
   ```typescript
   console.log('[VBridger] Plugin executing, frame:', ctx.now)
   ```

2. **Is isActive() returning true when TTS plays?**
   ```typescript
   console.log('[VBridger] isActive:', vbridger.isActive())
   console.log('[VBridger] Playback state:', vbridger.getStatus())
   ```

3. **Are we calling stopAllMotions()?**
   ```typescript
   if (isActive) {
     console.log('[VBridger] Stopping all motions')
     ctx.motionManager.stopAllMotions()
   }
   ```

4. **Are we calling markHandled()?**
   ```typescript
   if (isActive) {
     // ... apply parameters ...
     console.log('[VBridger] Marking handled')
     ctx.markHandled()
   }
   ```

5. **What's the plugin priority?**
   - Check Model.vue registration:
   ```typescript
   motionManagerUpdate.register(vbridgerPlugin, 'pre')  // ✅ Runs before idle
   // vs
   motionManagerUpdate.register(vbridgerPlugin, 'post') // ❌ Runs after idle
   ```

6. **Are parameters actually being applied?**
   ```typescript
   const prevValue = ctx.model.getParameterValueById('ParamMouthOpenY')
   ctx.model.setParameterValueById('ParamMouthOpenY', pose.mouthOpenY)
   const newValue = ctx.model.getParameterValueById('ParamMouthOpenY')
   console.log('[VBridger] Param change:', { prevValue, newValue })
   ```

---

### Issue: TTS state not syncing with VBridger

**Symptoms:**
- Lips move before/after audio plays
- Console shows state changes but no lip movement
- State changes but VBridger not reacting

**Debug Strategy:**

1. **Verify state updates reach the store:**
   ```typescript
   // In Stage.vue
   playbackManager.onStart(({ item }) => {
     console.log('[Stage.vue] TTS started, setting state:', {
       text: item.text,
       duration: item.audio?.duration,
     })
     live2dStore.vbridgerTtsIsPlaying = true
     console.log('[Stage.vue] State after set:', live2dStore.vbridgerTtsIsPlaying)
   })
   ```

2. **Verify refs are reactive:**
   ```typescript
   // In plugin creation
   import { watch } from 'vue'

   export function useMotionUpdatePluginLipSyncVBridger(options) {
     const { ttsIsPlaying } = options

     console.log('[VBridger Plugin] Ref check:', {
       isRef: 'value' in ttsIsPlaying,
       currentValue: ttsIsPlaying.value
     })

     watch(ttsIsPlaying, (newVal, oldVal) => {
       console.log('[VBridger Plugin] ttsIsPlaying changed:', { oldVal, newVal })
     })

     // ... rest of plugin ...
   }
   ```

3. **Verify VBridgerService receives updates:**
   ```typescript
   // In plugin frame loop
   const currentTtsIsPlaying = ttsIsPlaying?.value ?? false
   console.log('[VBridger Plugin] Frame state:', {
     ttsIsPlaying: currentTtsIsPlaying,
     isActive: vbridger.isActive(),
     playbackState: vbridger.getStatus()
   })
   ```

**Expected Log Flow:**
```
[Stage.vue] TTS started, setting state: {text: 'Hello', duration: 1.5}
[Stage.vue] State after set: true
[VBridger Plugin] ttsIsPlaying changed: {oldVal: false, newVal: true}
[VBridger Plugin] Frame state: {ttsIsPlaying: true, isActive: true, ...}
[VBridger] ========== TTS PLAYBACK STARTED ==========
[VBridger] ========== ACTIVE BLOCK ENTERED ==========
```

---

## Useful Console Commands

### Check VBridger State
```javascript
// Access Live2D store
const live2dStore = window.store?.live2d || window.$pinia?._s.get('live2d')

// Check current state
console.log({
  text: live2dStore.vbridgerTtsText,
  duration: live2dStore.vbridgerTtsAudioDuration,
  isPlaying: live2dStore.vbridgerTtsIsPlaying,
  enabled: live2dStore.vbridgerTtsEnabled
})

// Manually trigger lip-sync
live2dStore.vbridgerTtsText = "Test phrase"
live2dStore.vbridgerTtsAudioDuration = 2.0
live2dStore.vbridgerTtsIsPlaying = true

// Stop after 2 seconds
setTimeout(() => {
  live2dStore.vbridgerTtsIsPlaying = false
}, 2000)
```

### Check Emotion State
```javascript
const live2dStore = window.store?.live2d || window.$pinia?._s.get('live2d')

console.log({
  currentEmotion: live2dStore.emotionState.currentEmotion,
  intensity: live2dStore.emotionState.intensity
})

// Set emotion
live2dStore.emotionState.currentEmotion = 'happy'
live2dStore.emotionState.intensity = 0.8
```

### Check Model Parameters
```javascript
// Find the Live2D model instance
const model = window.Live2DModel || document.querySelector('canvas')?.__vueParentComponent?.ctx?.model

if (model) {
  // Read parameter
  const value = model.getParameterValueById('ParamMouthOpenY')
  console.log('ParamMouthOpenY:', value)

  // Set parameter
  model.setParameterValueById('ParamMouthOpenY', 0.8)
}
```

---

## Development Workflow Best Practices

### Making Changes to airi-mods Packages

**Always follow this sequence:**

1. **Make code changes** in `/airi-mods/packages/[package]/src/`

2. **Rebuild the package:**
   ```bash
   cd /airi-mods/packages/[package]
   pnpm build
   ```

3. **Clear Vite caches:**
   ```bash
   cd /airi
   rm -rf node_modules/.vite apps/*/node_modules/.vite
   ```

4. **Restart dev server:**
   - Ctrl+C to stop
   - `pnpm dev:tamagotchi` or `pnpm dev` to restart

5. **Verify changes loaded:**
   - Check console for your new logs
   - Check browser DevTools Sources tab to verify code

### Modifying AIRI Core Files

**Use the patch system!**

1. **Make changes** in `/airi/packages/...`

2. **Create patch:**
   ```bash
   cd /airi-mods
   ./scripts/create-patch.sh "Brief description of change"
   ```

3. **Test clean install:**
   ```bash
   cd /airi
   git checkout .  # Revert changes
   cd /airi-mods
   ./scripts/install.sh  # Reapply patches
   ```

**Benefits:**
- Changes are documented
- Can be version controlled
- Easy to revert
- Easy to reapply after AIRI updates

### Adding Debug Logging

**Best Practices:**

✅ **Good logging:**
```typescript
// Contextual, structured, informative
console.log('[VBridger Plugin] TTS state changed:', {
  isPlaying: newValue,
  wasPlaying: oldValue,
  audioReady: this.audioReady,
  timestamp: performance.now()
})
```

❌ **Bad logging:**
```typescript
// Vague, unstructured, no context
console.log('changed')
console.log(newValue)
```

**Log Prefixes:**
- `[PackageName]` - General logs from package
- `[PackageName:ClassName]` - Logs from specific class
- `[PackageName:ClassName] METHOD_NAME` - Logs from specific method
- `[PackageName Debug]` - Verbose debug logs (can be filtered)

**Conditional Debug Logging:**
```typescript
// In plugin/service
const DEBUG = true  // Set false for production

if (DEBUG) {
  console.log('[VBridger Debug] Detailed state:', {...})
}

// Frame-rate limited logging (don't spam console)
if (Math.floor(ctx.now) % 100 === 0) {
  console.log('[VBridger Debug] Periodic check:', {...})
}
```

---

## Testing Patterns

### Manual Testing via Console

**Advantage:** Fast iteration without triggering full TTS pipeline

```javascript
// Get store
const live2dStore = window.$pinia._s.get('live2d')

// Simulate TTS sequence
async function testLipSync(text, duration) {
  console.log('=== Starting Lip-Sync Test ===')

  // 1. Prepare audio
  live2dStore.vbridgerTtsText = text
  live2dStore.vbridgerTtsAudioDuration = duration
  await new Promise(r => setTimeout(r, 100))  // Wait for phoneme generation

  // 2. Start playback
  console.log('Starting playback...')
  live2dStore.vbridgerTtsIsPlaying = true

  // 3. Auto-stop after duration
  setTimeout(() => {
    console.log('Ending playback...')
    live2dStore.vbridgerTtsIsPlaying = false
    console.log('=== Lip-Sync Test Complete ===')
  }, duration * 1000)
}

// Run test
testLipSync("Hello world, this is a test", 3.0)
```

### Automated Testing

For future implementation - testing framework for animation systems:

```typescript
// packages/lipsync-vbridger/src/__tests__/plugin.test.ts
import { describe, it, expect, vi } from 'vitest'
import { ref } from 'vue'
import { useMotionUpdatePluginLipSyncVBridger } from '../plugin'
import { MockProvider } from '@airi-mods/phoneme-timing'

describe('VBridger Plugin', () => {
  it('should apply parameters when active', () => {
    const ttsIsPlaying = ref(false)
    const plugin = useMotionUpdatePluginLipSyncVBridger({
      timingProvider: new MockProvider(),
      ttsText: ref('test'),
      ttsAudioDuration: ref(1.0),
      ttsIsPlaying
    })

    const ctx = createMockContext()
    ttsIsPlaying.value = true

    plugin(ctx)

    expect(ctx.model.setParameterValueById).toHaveBeenCalled()
    expect(ctx.markHandled).toHaveBeenCalled()
  })
})
```

---

## Performance Debugging

### Frame Rate Impact

**Check if your plugin is causing performance issues:**

```typescript
return (ctx: MotionManagerPluginContext) => {
  const startTime = performance.now()

  // ... your plugin logic ...

  const elapsed = performance.now() - startTime
  if (elapsed > 5) {  // Log if takes >5ms
    console.warn('[VBridger] Slow frame:', elapsed.toFixed(2), 'ms')
  }
}
```

**Target:** Each plugin should take <5ms per frame for 60 FPS

### Memory Leaks

**Watch for:**
- Creating new objects every frame
- Not cleaning up event listeners
- Accumulating arrays without clearing

**Example - Leak:**
```typescript
// ❌ BAD - Creates new pose object every frame
return { ...NEUTRAL_POSE, mouthOpenY: value }
```

**Example - No Leak:**
```typescript
// ✅ GOOD - Reuses existing pose object
this.currentPose.mouthOpenY = value
return this.currentPose
```

---

## Related Documentation

- `/airi-mods/ARCHITECTURE.md` - Package structure and design decisions
- `/airi-mods/IMPLEMENTATION_PLAN.md` - Original porting plan
- `/airi-mods/TESTING_RESULTS.md` - Current testing status and issues
- `/AIRI_ARCHITECTURE.md` - AIRI core architecture overview
