# AIC-Assistant (AI Companion) - SYN Conventions

**Date:** 2026-01-28  
**Purpose:** Document the SYN prefix convention and architecture decisions

## What is SYN?

**SYN** is the personal tag prefix used to identify all custom code, components, and modifications in the AIC-Assistant fork. It stands for **Syncrose1/AIC-Assistant** and serves as a clear visual and organizational marker distinguishing custom work from upstream AIRI code.

## Why Use SYN Prefix?

### 1. **Clear Ownership**
When browsing the codebase, anything prefixed with SYN is immediately identifiable as custom code:
- `syn-ml-backend/` - Our ML service (not upstream)
- `docs-syn/` - Our documentation (not upstream)
- `SYNServiceManager` - Our service management class
- `[SYN]` log tags - Our log messages

### 2. **Upstream Compatibility**
Using SYN-prefixed directories and files ensures zero conflicts when syncing with upstream AIRI:
- Upstream changes to `docs/` won't conflict with `docs-syn/`
- Upstream changes to `services/` won't conflict with `services/syn-*`
- Different namespaces = clean merges

### 3. **Maintainability**
Future developers (including yourself in 6 months) can instantly understand:
- What's custom vs. what's upstream
- Where to make changes
- What can be safely modified

### 4. **Debugging**
When reviewing logs or stack traces, SYN prefixes make it obvious which code is executing:
```
[SYN] Starting ML Backend on port 8001
[SYN] ✓ syn-ml-backend is ready
[SYN] Detected emotion: joy (0.95 confidence)
```

## SYN Naming Conventions

### Directories
All custom directories use `syn-` prefix or `-syn` suffix:

| Convention | Example | Purpose |
|------------|---------|---------|
| `syn-<name>` | `syn-ml-backend/` | Custom service/module |
| `<name>-syn` | `docs-syn/`, `scripts-syn/` | Custom supporting files |
| `packages/<name>` | `packages/emotion-visual/` | npm packages (no prefix needed, in separate location) |

### Files
All custom files in upstream directories use `syn-` prefix:

| Location | Example |
|----------|---------|
| `apps/stage-tamagotchi/src/main/` | `syn-service-manager.ts` |
| Root configuration | `syn-*.sh` scripts |

### Classes and Functions
All custom classes and exported instances use SYN prefix:

```typescript
// Class definition
class SYNServiceManager { ... }

// Export instance
export const synServiceManager = new SYNServiceManager()

// Function
function synStartServices() { ... }
```

### Log Tags
All console.log messages from custom code use `[SYN]` tag:

```typescript
console.log('[SYN] Starting services...')
console.log('[SYN] ✓ All services ready')
console.error('[SYN] ✗ Service failed to start')
```

### Git Commits
All commits to the fork should include `[SYN]` tag:

```bash
git commit -m "[SYN] feat: Add emotion detection endpoint"
git commit -m "[SYN] fix: Correct service manager paths"
git commit -m "[SYN] docs: Update testing guide"
```

## Current SYN Components

### Services (`services/`)
- `syn-ml-backend/` - ML inference service (emotion detection, BFA)
- `syn-speaches/` (future) - TTS/ASR service
- `launch-services.sh` - Unified service launcher
- `README.md` - Service documentation

### Documentation (`docs-syn/`)
- `SYN_CONVENTIONS.md` - This file
- `ARCHITECTURE.md` - Custom architecture documentation
- `DEBUGGING_GUIDE.md` - Troubleshooting guide
- `TESTING_VBRIDGER.md` - VBridger lip-sync testing
- `TESTING_EMOTIONS.md` - Emotion system testing
- `MASTER_CONTEXT.md` - Project context
- `EMOTION_DETECTION_IMPLEMENTATION.md` - Implementation details
- `VBRIDGER_TESTING_RESULTS.md` - Test results

### Scripts (`scripts-syn/`)
- `install.sh` - Install script
- `uninstall.sh` - Uninstall script
- `update-airi.sh` - Update from upstream
- `launch-services.sh` - Launch services
- `create-patch.sh` - Create patches
- `test-phase2.sh` - Phase 2 testing

### Code Components
- `apps/stage-tamagotchi/src/main/syn-service-manager.ts` - Service management
- `packages/` - All custom npm packages (animation-core, emotion-visual, lipsync-vbridger, phoneme-timing)

## Architecture: Separation vs Integration

The project follows the principle: **"Separation where reasonable, integration where necessary"**

### What Stays Separate (SYN Directories)
- ✅ Custom packages in `packages/` (npm workspace)
- ✅ ML Backend in `services/syn-ml-backend/` (Python service)
- ✅ Documentation in `docs-syn/` (separate from upstream docs)
- ✅ Scripts in `scripts-syn/` (custom tooling)

### What Integrates Directly (In Upstream Locations)
- ✅ Service manager in `apps/stage-tamagotchi/src/main/` (core functionality)
- ✅ Package dependencies in `package.json` (required for build)

### Why This Balance?
- **Separation** allows clean upstream syncs (no conflicts)
- **Integration** ensures core features work out-of-the-box
- **SYN prefix** makes the distinction clear

## Future Plans

### Phase 3: Emotion System Integration (Current)
- [ ] Integrate syn-ml-backend emotion detection into UI
- [ ] Test end-to-end workflow
- [ ] Document integration points

### Phase 4: Blink + Motion Priority
- [ ] Create `@airi-mods/blink-physiological` package
- [ ] Implement motion priority system

### Phase 5: Emotional TTS (Fish Speech)
- [ ] Replace syn-speaches with internal Fish Speech
- [ ] Integrate emotional prosody with visual emotions

### Phase 6: Vision System
- [ ] Implement screen capture
- [ ] Implement camera capture

### Phase 7: Sage Attention Optimization
- [ ] Optimize all ML components
- [ ] 50% VRAM reduction target

## Upstream Sync Workflow

### Regular Sync (Weekly/Monthly)
```bash
cd /home/raahats/AI-Assistant-Project/aic-assistant

# Fetch upstream changes
git fetch upstream

# Create sync branch
git checkout -b sync-$(date +%Y%m%d)

# Merge upstream
git merge upstream/main

# Resolve any conflicts (should be minimal due to SYN separation)
# - Conflicts in apps/ might occur if upstream changed same files
# - No conflicts in docs-syn/, services/syn-*/, scripts-syn/

# Test everything
cd services/syn-ml-backend && python scripts/test_service.py
cd ../.. && pnpm dev:tamagotchi

# Merge back to main
git checkout main
git merge sync-$(date +%Y%m%d)
git push origin main
```

### When SYN Components Break After Sync
1. Check if upstream changed files we integrated into
2. Update SYN components to match new upstream APIs
3. Test thoroughly
4. Document changes in commit message

## Important Files to Never Modify

❌ **NEVER modify these upstream files:**
- `packages/` (upstream packages)
- `apps/` core files (except SYN additions)
- `docs/` (upstream documentation)
- Root configuration files without `-syn` suffix

✅ **Always modify these SYN files:**
- `syn-service-manager.ts`
- `services/syn-*/`
- `docs-syn/`
- `scripts-syn/`
- Custom packages in `packages/`

## Summary

The SYN convention ensures:
1. **Clarity** - Instant identification of custom code
2. **Compatibility** - Clean upstream syncs
3. **Maintainability** - Easy to understand and modify
4. **Debugging** - Clear log attribution

**When in doubt: Add SYN prefix to anything custom.**

---

**Last Updated:** 2026-01-28  
**Next Review:** After Phase 3 completion
