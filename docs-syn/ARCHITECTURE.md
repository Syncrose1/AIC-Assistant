# AIRI-Mods Architecture

**Last Updated:** 2026-01-28

## Overview

This directory contains our custom platform layer built on top of AIRI. The architecture uses a **modular package + patch system** to maintain clean separation between our code and AIRI's core.

## Design Principles

1. **Product Independence** - Our code is self-contained and can evolve separately from AIRI
2. **Clean Upgrades** - Pull AIRI improvements without merge conflicts
3. **Minimal Patches** - Only patch AIRI where integration is absolutely necessary
4. **Maximal Modularity** - Keep custom logic in standalone packages

## Directory Structure

```
airi-mods/
├── packages/                  # Our custom packages
│   ├── animation-core/        # Shared types (types-only, no build needed)
│   ├── lipsync-vbridger/      # 9-parameter lip-sync plugin
│   ├── emotion-visual/        # Visual emotion system
│   └── phoneme-timing/        # TTS-agnostic phoneme timing
├── patches/                   # Minimal integration patches for AIRI core
│   └── 01-vbridger-tts-state-integration-and-motion-priority-fix.patch
├── scripts/                   # Installation and maintenance scripts
│   ├── install.sh             # Links packages + applies patches
│   ├── uninstall.sh           # Restores AIRI to vanilla
│   ├── create-patch.sh        # Creates patches from git diff
│   └── update-airi.sh         # Pulls AIRI updates + reintegrates
└── .backup/                   # Automatic backups of patched files

```

## Package System

### Our Custom Packages

| Package | Type | Purpose | Exports | Status |
|---------|------|---------|---------|--------|
| `@airi-mods/animation-core` | Types | Shared TypeScript interfaces | Phoneme, Emotion, Priority types | ✅ Complete |
| `@airi-mods/phoneme-timing` | Runtime | Phoneme timing providers | MockProvider, (EspeakProvider) | ✅ Complete |
| `@airi-mods/lipsync-vbridger` | Runtime | VBridger 9-parameter lip-sync | Plugin, Service, Types | ✅ Tested & Working |
| `@airi-mods/emotion-visual` | Runtime | ML-based emotion detection | Plugin, MLDetector, EmotionState | 🔄 Overhauling to ML |

### Package Linking

Packages are linked to AIRI's workspace via `pnpm-workspace.yaml`:

```yaml
packages:
  - packages/**
  - plugins/**
  - services/**
  - examples/**
  - docs/**
  - apps/**
  - '../airi-mods/packages/*'  # <-- Our packages
  - '!**/dist/**'
```

**CRITICAL:** The path MUST be in the `packages` array, NOT in `onlyBuiltDependencies`. The latter will cause pnpm to fail to resolve the packages.

## Patch System

### What Gets Patched vs What Stays Modular

**Modular (in `/airi-mods/packages/`):**
- Custom plugins (VBridger, Emotion)
- Phoneme timing providers
- Shared type definitions
- Standalone services

**Patched (in `/airi-mods/patches/`):**
- Integration points where AIRI needs to call our plugins
- State management additions (Live2D store)
- TTS playback event handlers

### Current Patches

#### `01-vbridger-tts-state-integration-and-motion-priority-fix.patch`

**What it does:**
1. Adds VBridger TTS state to Live2D store (`live2d.ts`)
2. Connects `useVBridgerLipSync()` to use store refs (`lipsync-vbridger.ts`)
3. Updates Stage.vue to set VBridger state on TTS playback events
4. Changes VBridger plugin priority from 'post' to 'pre' (`Model.vue`)

**Files modified:**
- `/airi/packages/stage-ui-live2d/src/stores/live2d.ts`
- `/airi/packages/stage-ui-live2d/src/composables/live2d/lipsync-vbridger.ts`
- `/airi/packages/stage-ui/src/components/scenes/Stage.vue`
- `/airi/packages/stage-ui-live2d/src/components/scenes/live2d/Model.vue`

## Installation Process

### Initial Setup

```bash
cd /home/raahats/AI-Assistant-Project/airi-mods
./scripts/install.sh
```

**What it does:**
1. Backs up `pnpm-workspace.yaml`
2. Adds `../airi-mods/packages/*` to AIRI's workspace
3. Applies all patches from `/patches/` directory
4. Runs `pnpm install` and `pnpm build:packages`
5. Creates `.installed` marker file

### Uninstalling

```bash
./scripts/uninstall.sh
```

**What it does:**
1. Reverses all patches (`git apply -R`)
2. Restores `pnpm-workspace.yaml` from backup
3. Runs `pnpm install` to remove workspace links
4. Rebuilds AIRI
5. Removes `.installed` marker

### Creating New Patches

```bash
# 1. Make changes to AIRI core files
vim /path/to/airi/packages/some-file.ts

# 2. Create patch from git diff
./scripts/create-patch.sh "description of changes"

# 3. Patch is saved to patches/ and will be auto-applied on next install
```

### Updating AIRI

```bash
./scripts/update-airi.sh
```

**What it does:**
1. Uninstalls current mods
2. Pulls latest AIRI from upstream
3. Reinstalls mods (applies patches)
4. Handles merge conflicts if patches fail

## Integration Architecture

### VBridger Lip-Sync Integration Flow

```
┌─────────────────────────────────────────────────────────────┐
│ Stage.vue (AIRI core, patched)                              │
│                                                              │
│ playbackManager.onStart(({ item }) => {                     │
│   live2dStore.vbridgerTtsText.value = item.text            │
│   live2dStore.vbridgerTtsAudioDuration.value = duration    │
│   live2dStore.vbridgerTtsIsPlaying.value = true   ◄────────┼─── Patch adds this
│ })                                                           │
└──────────────────────────┬───────────────────────────────────┘
                           │
                           │ (reactive state update)
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ Live2D Store (AIRI core, patched)                           │
│                                                              │
│ const vbridgerTtsText = ref('')                  ◄──────────┼─── Patch adds state
│ const vbridgerTtsAudioDuration = ref(0)                     │
│ const vbridgerTtsIsPlaying = ref(false)                     │
└──────────────────────────┬───────────────────────────────────┘
                           │
                           │ (consumed by)
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ useVBridgerLipSync() (AIRI core, patched)                   │
│                                                              │
│ const ttsState = {                                           │
│   text: live2dStore.vbridgerTtsText,            ◄───────────┼─── Patch connects to store
│   audioDuration: live2dStore.vbridgerTtsAudioDuration,      │
│   isPlaying: live2dStore.vbridgerTtsIsPlaying,              │
│ }                                                            │
└──────────────────────────┬───────────────────────────────────┘
                           │
                           │ (passed to)
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ VBridger Plugin (@airi-mods/lipsync-vbridger)               │
│                                                              │
│ useMotionUpdatePluginLipSyncVBridger({                      │
│   ttsText: ttsState.text,                                   │
│   ttsIsPlaying: ttsState.isPlaying,              ◄──────────┼─── Our modular package
│ })                                                           │
│                                                              │
│ ├─ Watches refs for changes                                 │
│ ├─ Generates phoneme timing                                 │
│ ├─ Stops idle motion when active                            │
│ └─ Applies 9-parameter poses to Live2D model                │
└─────────────────────────────────────────────────────────────┘
```

### Motion Priority System

```
Plugin Execution Order (Model.vue):
┌─────────────────────────────────────────────────┐
│ PRE-PRIORITY (runs before idle motion)          │
│  1. BeatSync                                    │
│  2. IdleDisable                                 │
│  3. VBridger  ◄─ Runs here (was post initially) │
├─────────────────────────────────────────────────┤
│ IDLE MOTION UPDATE (hookedUpdate)               │
│  - If ctx.handled = true, this is SKIPPED       │
│  - Applies .motion3.json parameters             │
├─────────────────────────────────────────────────┤
│ POST-PRIORITY (runs after idle motion)          │
│  4. Emotion  ◄─ Overrides expressions           │
│  5. IdleFocus                                   │
│  6. AutoEyeBlink                                │
└─────────────────────────────────────────────────┘

VBridger behavior:
- When active (lip-syncing):
  - Calls ctx.motionManager.stopAllMotions()
  - Calls ctx.markHandled() to prevent idle motion
  - Applies VBridger 9 mouth parameters
- When inactive:
  - Does nothing, allows idle motion to play normally
```

### Emotion Visual Integration Flow (ML-Based)

**Architecture Decision (Jan 28, 2026)**: Switched from tag-based `[EMOTION:😊]` to ML-based detection.

```
┌─────────────────────────────────────────────────────────────┐
│ LLM generates response text (no emotion tags needed)        │
│                                                              │
│ "I'm so excited to help you with this project!"            │
└──────────────────────────┬───────────────────────────────────┘
                           │
                           │ (sent to)
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ Emotion ML Detector (@airi-mods/emotion-visual)             │
│                                                              │
│ Uses @xenova/transformers with RoBERTa:                     │
│   pipeline('text-classification',                           │
│            'j-hartmann/emotion-english-distilroberta-base') │
│                                                              │
│ Detects: "joy" (confidence: 0.87)               ◄───────────┼─── ML inference
└──────────────────────────┬───────────────────────────────────┘
                           │
                           │ (mapped to)
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ RoBERTa → EmotionEmoji Mapping                              │
│                                                              │
│ {                                                            │
│   'joy':      '😊',  // happy                               │
│   'sadness':  '😢',  // sad                                 │
│   'anger':    '😤',  // frustrated                          │
│   'fear':     '😳',  // embarrassed                         │
│   'surprise': '😲',  // shocked                             │
│   'disgust':  '🙄',  // annoyed                             │
│   'neutral':  '😐'   // neutral                             │
│ }                                                            │
│                                                              │
│ Result: '😊' (happy)                              ◄──────────┼─── Emoji output
└──────────────────────────┬───────────────────────────────────┘
                           │
                           │ (stored in)
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ Emotion Store (emotion-visual)                              │
│                                                              │
│ - Stores current emotion with timestamp                     │
│ - Auto-reverts to neutral after 3 seconds                   │
│ - Manages emotion timing and hold duration                  │
└──────────────────────────┬───────────────────────────────────┘
                           │
                           │ (consumed by)
                           ▼
┌─────────────────────────────────────────────────────────────┐
│ Emotion Visual Plugin (motion manager, post phase)          │
│                                                              │
│ - Gets current emotion from store                           │
│ - Maps to Live2D expression ID                              │
│ - Applies expression to model                               │
│ - Triggers motion if available                              │
└─────────────────────────────────────────────────────────────┘

Performance Characteristics:
- ML Inference: ~50-200ms per response
- VRAM: ~125MB (0.5GB with ONNX runtime)
- Strategy: Run in parallel with TTS generation
- Caching: Last 100 detections to avoid redundant inference
```

**Migration Status**:
- **Before**: Tag-based system with `[EMOTION:😊]` parsing
- **After**: ML-based detection from raw text
- **Reason**: Simpler architecture, removes burden on LLM
- **Implementation**: In progress (Jan 28, 2026)

## Development Workflow

### Adding a New Feature

**Option 1: Pure Modular Package (Preferred)**
1. Create package in `/airi-mods/packages/my-feature/`
2. Define plugin interface matching AIRI's expectations
3. Register plugin via existing integration point
4. No patches needed!

**Option 2: Requires AIRI Integration**
1. Create modular package for core logic
2. Make minimal changes to AIRI core files
3. Create patch: `./scripts/create-patch.sh "description"`
4. Test: `./scripts/uninstall.sh && ./scripts/install.sh`

### Testing Changes

```bash
# Quick iteration (modular package only)
cd /airi-mods/packages/my-feature
pnpm build
cd /airi
pnpm dev:tamagotchi

# Full reinstall (after creating/updating patch)
cd /airi-mods
./scripts/uninstall.sh
./scripts/install.sh
cd /airi
pnpm dev:tamagotchi
```

### Debugging

**Check if mods are installed:**
```bash
ls -la /airi-mods/.installed
```

**Check if patches applied:**
```bash
cd /airi
git status  # Should show M (modified) for patched files
```

**Check if packages linked:**
```bash
ls -la /airi/node_modules/.pnpm/node_modules/@airi-mods/
```

## Common Issues

### Issue: `@airi-mods/xxx not found in workspace`

**Cause:** The `../airi-mods/packages/*` path is in the wrong section of `pnpm-workspace.yaml` (likely `onlyBuiltDependencies` instead of `packages`).

**Fix:**
```yaml
# WRONG:
onlyBuiltDependencies:
  - '../airi-mods/packages/*'

# CORRECT:
packages:
  - '../airi-mods/packages/*'
```

### Issue: Changes not taking effect

**Cause:** Dev server cached old code.

**Fix:**
```bash
# Clear Vite cache
rm -rf /airi/node_modules/.vite
rm -rf /airi/apps/stage-tamagotchi/.vite

# Restart dev server
pnpm dev:tamagotchi
```

### Issue: Patch fails to apply

**Cause:** AIRI core files changed upstream.

**Fix:**
```bash
# Manually apply changes
# Create new patch
git diff > /airi-mods/patches/XX-updated-patch.patch

# Or use update script
./scripts/update-airi.sh
```

## Future Improvements

1. **Automated patch testing** - CI/CD to verify patches apply cleanly
2. **Version pinning** - Lock AIRI version in install.sh
3. **Conflict resolution helper** - Script to assist with patch conflicts
4. **Package templates** - Scaffolding for new modular packages
5. **Type checking** - Ensure mod packages match AIRI's type expectations
