# AIC-Assistant Documentation (docs-syn/)

**SYN Documentation Hub** - All custom documentation for the AIC-Assistant fork

## Quick Navigation

### Essential Reading (Start Here)
| Document | Purpose | Audience |
|----------|---------|----------|
| **[SETUP.md](./SETUP.md)** | Complete setup instructions | New users |
| **[SYN_CONVENTIONS.md](./SYN_CONVENTIONS.md)** | Architecture & naming conventions | Everyone |
| **[PROJECT_STATUS.md](./PROJECT_STATUS.md)** | Current status & what's done | New team members |
| **[ARCHITECTURE.md](./ARCHITECTURE.md)** | Technical architecture overview | Developers |

### Testing & Debugging
| Document | Purpose |
|----------|---------|
| [TESTING_VBRIDGER.md](./TESTING_VBRIDGER.md) | VBridger lip-sync testing guide |
| [TESTING_EMOTIONS.md](./TESTING_EMOTIONS.md) | Emotion system testing guide |
| [TESTING_RESULTS.md](./TESTING_RESULTS.md) | Complete test results & analysis |
| [VBRIDGER_TESTING_RESULTS.md](./VBRIDGER_TESTING_RESULTS.md) | VBridger-specific results |
| [DEBUGGING_GUIDE.md](./DEBUGGING_GUIDE.md) | Troubleshooting common issues |
| [TTS_INTEGRATION_FIX.md](./TTS_INTEGRATION_FIX.md) | TTS integration debugging |

### Implementation Details
| Document | Purpose |
|----------|---------|
| [EMOTION_DETECTION_IMPLEMENTATION.md](./EMOTION_DETECTION_IMPLEMENTATION.md) | ML emotion detection details |
| [MASTER_CONTEXT.md](./MASTER_CONTEXT.md) | Project context & background |
| [PHASE2_DEPLOYMENT_CHECKLIST.md](./PHASE2_DEPLOYMENT_CHECKLIST.md) | Phase 2 deployment steps |
| [HANDOVER_NEXT_AGENT.md](./HANDOVER_NEXT_AGENT.md) | Handover notes for next AI agent |

## Current Status

**Phase 2:** ✅ VBridger Lip-Sync - COMPLETE & TESTED  
**Phase 3:** 🔄 Emotion Visual System - IN PROGRESS

See [PROJECT_STATUS.md](./PROJECT_STATUS.md) for detailed status.

## Key Concepts

### SYN Prefix
All custom components use **SYN** prefix to distinguish from upstream AIRI code:
- `syn-ml-backend/` - Our ML service
- `docs-syn/` - Our documentation (this directory)
- `SYNServiceManager` - Our service manager class
- `[SYN]` - Log message prefix

See [SYN_CONVENTIONS.md](./SYN_CONVENTIONS.md) for complete convention guide.

### Architecture Philosophy
> **"Separation where reasonable, integration where necessary"**

- **Separated:** `docs-syn/`, `services/syn-*/`, `scripts-syn/`, `packages/`
- **Integrated:** `syn-service-manager.ts` (core functionality)

This ensures clean upstream syncs while maintaining core features.

## Documentation Standards

When adding new documentation to this directory:

1. **Use SYN prefix** in filename if it's a core convention doc
2. **Reference other docs** using relative links
3. **Include last updated date** at the top
4. **Add to this README** in appropriate section
5. **Use markdown tables** for structured info

## External Documentation

- **Upstream AIRI docs:** See `docs/` directory (don't modify)
- **Root README:** See `README.md` for project overview
- **Services README:** See `services/README.md` for service docs

## Contributing

When working with this fork:
1. Check [SYN_CONVENTIONS.md](./SYN_CONVENTIONS.md) first
2. Follow the naming conventions
3. Add documentation for new features
4. Update PROJECT_STATUS.md when completing phases

---

**Last Updated:** 2026-01-28  
**Documentation Count:** 14 files  
**Next Review:** After Phase 3 completion
