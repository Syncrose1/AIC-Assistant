/**
 * VBridger Lip-Sync System - Type Definitions
 *
 * Ported from: Handcrafted Persona Engine
 * Source: PersonaEngine.Lib/Live2D/Behaviour/LipSync/VBridgerLipSyncService.cs
 */

// Re-export PhonemePose from animation-core (single source of truth)
export type { PhonemePose } from '@airi-mods/animation-core'

/**
 * Configuration constants for VBridger lip-sync animation.
 *
 * Ported from C# constants in VBridgerLipSyncService.
 */
export const VBRIDGER_CONFIG = {
  /**
   * How quickly parameters move towards target (higher = faster)
   * Original: 35.0f
   */
  SMOOTHING_FACTOR: 35.0,

  /**
   * How quickly parameters return to neutral when idle (higher = faster)
   * Original: 15.0f
   */
  NEUTRAL_RETURN_FACTOR: 15.0,

  /**
   * How quickly CheekPuff decays (higher = faster)
   * CheekPuff decays faster than other parameters
   * Original: 80.0f
   */
  CHEEK_PUFF_DECAY_FACTOR: 80.0,

  /**
   * Threshold for considering a value as neutral
   * Original: 0.02f
   */
  NEUTRAL_THRESHOLD: 0.02,
} as const

// Re-export NEUTRAL_POSE from animation-core (single source of truth)
export { NEUTRAL_POSE } from '@airi-mods/animation-core'

/**
 * Live2D parameter names for VBridger system.
 *
 * These must match the parameter names in the Live2D model.
 */
export const VBRIDGER_PARAM_NAMES = {
  MOUTH_OPEN_Y: 'ParamMouthOpenY',
  JAW_OPEN: 'ParamJawOpen',
  MOUTH_FORM: 'ParamMouthForm',
  MOUTH_SHRUG: 'ParamMouthShrug',
  MOUTH_FUNNEL: 'ParamMouthFunnel',
  MOUTH_PUCKER_WIDEN: 'ParamMouthPuckerWiden',
  MOUTH_PRESS_LIP_OPEN: 'ParamMouthPressLipOpen',
  MOUTH_X: 'ParamMouthX',
  CHEEK_PUFF_C: 'ParamCheekPuffC',
} as const

/**
 * Characters to ignore when parsing phoneme strings.
 * These are IPA stress and length markers.
 */
export const PHONEME_IGNORE_CHARS = new Set(['ˈ', 'ˌ', 'ː'])
