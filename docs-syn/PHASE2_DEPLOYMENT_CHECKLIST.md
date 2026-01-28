# Phase 2 VBridger Deployment Checklist

**Status:** Code complete, ready for integration testing!

---

## What Was Built

### Packages (3 total)

1. **@airi-mods/animation-core** (~150 lines)
   - Foundation types (VBridger, emotions, vision, priorities)
   - Shared across all airi-mods packages

2. **@airi-mods/phoneme-timing** (~800 lines)
   - TTS-agnostic phoneme timing system
   - EspeakProvider implementation (MVP)
   - Ready for BFA provider (Phase 4-5)
   - Caching support for future optimization

3. **@airi-mods/lipsync-vbridger** (~1500 lines)
   - 70+ phoneme-to-pose mappings (IPA → Live2D)
   - VBridgerService core engine
   - AIRI MotionManagerPlugin
   - Complete documentation (README, USAGE, INTEGRATION)

**Total:** ~2500+ lines of production-ready TypeScript

---

## Prerequisites

- [x] **espeak-ng installed** (✅ Verified: version 1.52.0)
- [x] **speaches server running** (http://localhost:8000)
- [x] **AIRI dev server running** (http://localhost:5173)

---

## Deployment Steps

### Step 1: Link Packages

```bash
cd /home/raahats/AI-Assistant-Project/airi-mods
./scripts/install.sh
```

**This will:**
- Add `../airi-mods/packages/*` to `airi/pnpm-workspace.yaml`
- Run `pnpm install` in AIRI
- Build all packages
- Link to AIRI node_modules

**Expected output:**
```
✓ Added airi-mods to workspace
✓ Installing dependencies...
✓ Building @airi-mods/animation-core
✓ Building @airi-mods/phoneme-timing
✓ Building @airi-mods/lipsync-vbridger
✓ Packages linked successfully!
```

---

### Step 2: Create VBridger Composable

**File:** `airi/packages/stage-ui-live2d/src/composables/live2d/vbridger-lipsync.ts`

Copy the code from: `airi-mods/packages/lipsync-vbridger/INTEGRATION.md` (Step 1)

Or create minimal version:

```typescript
import { ref } from 'vue'
import { useMotionUpdatePluginLipSyncVBridger } from '@airi-mods/lipsync-vbridger'
import { EspeakProvider } from '@airi-mods/phoneme-timing'

export function useVBridgerLipSync() {
  const ttsText = ref('')
  const ttsAudioDuration = ref(0)
  const ttsIsPlaying = ref(false)

  const timingProvider = new EspeakProvider()

  const plugin = useMotionUpdatePluginLipSyncVBridger({
    timingProvider,
    ttsText,
    ttsAudioDuration,
    ttsIsPlaying,
  })

  return {
    plugin,
    prepareTTS: (text: string, duration: number) => {
      ttsText.value = text
      ttsAudioDuration.value = duration
    },
    startTTS: () => { ttsIsPlaying.value = true },
    stopTTS: () => { ttsIsPlaying.value = false },
  }
}
```

---

### Step 3: Register Plugin

Find where AIRI creates the motion manager (likely in Live2DStage component).

**Add:**

```typescript
import { useVBridgerLipSync } from '../composables/live2d/vbridger-lipsync'

// In setup()
const vbridgerLipSync = useVBridgerLipSync()

// Register with motion manager
motionManagerUpdate.register(vbridgerLipSync.plugin, 'post')
```

---

### Step 4: Connect TTS Events

Find where AIRI handles TTS audio playback.

**Add:**

```typescript
// When TTS audio is ready
async function onTtsAudioReady(text: string, audioBuffer: ArrayBuffer) {
  // Decode to get duration
  const audioContext = new AudioContext()
  const audioData = await audioContext.decodeAudioData(audioBuffer)
  const duration = audioData.duration

  // Prepare VBridger
  vbridgerLipSync.prepareTTS(text, duration)

  // ... continue with audio playback ...
}

// When audio starts
vbridgerLipSync.startTTS()

// When audio ends
audioElement.addEventListener('ended', () => {
  vbridgerLipSync.stopTTS()
})
```

---

### Step 5: Test

```bash
# Rebuild AIRI
cd /home/raahats/AI-Assistant-Project/airi
pnpm build

# Restart dev server
pnpm dev
```

**Test in browser:**
1. Open AIRI (http://localhost:5173)
2. Trigger TTS ("Hello world")
3. Check console for VBridger logs
4. Observe Live2D mouth movements

**Expected logs:**
```
[EspeakProvider] Found: eSpeak NG text-to-speech: 1.52.0
[VBridgerService] Generating phoneme timing for: "Hello world"
[VBridgerService] Audio duration: 1.2s
[VBridgerService] Using provider: espeak-ng
[VBridgerService] Generated 10 timed phonemes
[VBridgerService] Audio playback started
```

---

## Troubleshooting

### Issue: Packages not found

**Error:** `Cannot find module '@airi-mods/lipsync-vbridger'`

**Fix:**
```bash
cd /home/raahats/AI-Assistant-Project/airi
pnpm install
```

### Issue: espeak-ng not found

**Error:** `[EspeakProvider] Not found`

**Fix:**
```bash
espeak-ng --version  # Verify installed
which espeak-ng      # Check path
```

### Issue: No lip movement

**Check:**
1. VBridger plugin registered? (Check console for logs)
2. TTS events connected? (`prepareTTS`, `startTTS`, `stopTTS` called?)
3. Live2D model has VBridger parameters? (Check model.json)

**Enable debug:**
```typescript
const timingProvider = new EspeakProvider({ debug: true })
const vbridgerService = new VBridgerService(timingProvider, { debug: true })
```

### Issue: Build errors

**Error:** TypeScript errors in AIRI

**Fix:**
```bash
# Rebuild packages
cd /home/raahats/AI-Assistant-Project/airi-mods
pnpm -r build

# Clear AIRI cache
cd /home/raahats/AI-Assistant-Project/airi
rm -rf node_modules/.vite
pnpm dev
```

---

## Verification Checklist

- [ ] `./scripts/install.sh` runs without errors
- [ ] `pnpm list | grep @airi-mods` shows 3 packages
- [ ] AIRI dev server starts without TypeScript errors
- [ ] Console shows VBridger initialization logs
- [ ] TTS triggers VBridger phoneme generation
- [ ] Live2D mouth moves during TTS playback
- [ ] Mouth returns to neutral after TTS ends

---

## Next Steps After Testing

**If working:**
- ✅ Phase 2 complete!
- 📋 Move to Phase 3 (Visual Emotion System)
- 📋 Or Phase 4-5 (BFA integration, Fish Speech)

**If issues:**
- Check logs in browser console
- Enable debug mode
- Test espeak-ng directly: `espeak-ng -q --ipa -x "Hello"`
- Review INTEGRATION.md troubleshooting section

---

## Files Reference

| File | Purpose |
|------|---------|
| `airi-mods/packages/lipsync-vbridger/INTEGRATION.md` | Complete integration guide |
| `airi-mods/packages/lipsync-vbridger/USAGE.md` | VBridgerService usage examples |
| `airi-mods/packages/lipsync-vbridger/README.md` | Package overview |
| `airi-mods/packages/phoneme-timing/README.md` | Phoneme timing system docs |
| `airi-mods/scripts/install.sh` | Package linking script |
| `PROGRESS.md` | Development progress log |
| `PHASE2_VBRIDGER_ANALYSIS.md` | Original C# analysis |

---

## Success Criteria

**Phase 2 is successful when:**
1. ✅ espeak-ng installed and working
2. ✅ Packages built and linked to AIRI
3. ✅ Plugin registered with motion manager
4. ✅ TTS events trigger phoneme generation
5. ✅ Live2D mouth animates with 9 parameters during speech
6. ✅ Mouth returns to neutral after speech ends
7. ✅ No console errors

**Expected result:** Realistic lip-sync that surpasses AIRI's default 2-parameter system!

---

## Time Estimate

- Package linking: ~2 minutes
- Creating composable: ~5 minutes
- Registering plugin: ~10 minutes
- Connecting TTS events: ~15 minutes
- Testing and debugging: ~30 minutes
- **Total: ~1 hour**

---

**Ready to deploy? Run `./scripts/install.sh` and follow the steps above!**
