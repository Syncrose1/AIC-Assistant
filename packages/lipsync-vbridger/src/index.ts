/**
 * @airi-mods/lipsync-vbridger
 *
 * VBridger 9-parameter lip-sync system for AIRI.
 *
 * Ported from: Handcrafted Persona Engine
 * Source: PersonaEngine.Lib/Live2D/Behaviour/LipSync/VBridgerLipSyncService.cs
 *
 * This package provides realistic lip-sync animation using 9 mouth parameters
 * instead of AIRI's default 2 parameters.
 *
 * @packageDocumentation
 */

// Core types and constants (from animation-core)
export type { PhonemePose, TimedPhoneme } from '@airi-mods/animation-core'
export { NEUTRAL_POSE } from '@airi-mods/animation-core'

// VBridger-specific constants
export {
  VBRIDGER_CONFIG,
  VBRIDGER_PARAM_NAMES,
  PHONEME_IGNORE_CHARS,
} from './types'

// Phoneme mappings
export {
  PHONEME_MAP,
  getPoseForPhoneme,
  hasPhonemeMapping,
  getSupportedPhonemes,
} from './phoneme-map'

// Interpolation functions
export {
  easeInOutQuad,
  lerp,
  lerpPose,
  posesEqual,
  smoothToTarget,
  smoothPoseToTarget,
} from './interpolation'

// Main VBridger service
export {
  VBridgerService,
  type VBridgerServiceOptions,
} from './vbridger-service'

// AIRI motion manager plugin
export {
  useMotionUpdatePluginLipSyncVBridger,
  useVBridgerController,
  type MotionManagerPlugin,
  type MotionManagerPluginContext,
  type UseMotionUpdatePluginLipSyncVBridgerOptions,
} from './plugin'
