/**
 * VBridger-compatible phoneme pose interface
 *
 * These 9 parameters control mouth shape with much more nuance than
 * AIRI's default 2-parameter (MouthOpenY, JawOpen) system.
 *
 * Reference: handcrafted-persona-engine VBridgerLipSyncService.cs
 */
export interface PhonemePose {
  /** Mouth open amount (0-1) - Primary vertical opening */
  mouthOpenY: number

  /** Jaw open amount (0-1) - Lower jaw position */
  jawOpen: number

  /** Mouth form (-1 to +1) - Frown to Smile */
  mouthForm: number

  /** Mouth shrug (0-1) - Upper lip raise */
  mouthShrug: number

  /** Mouth funnel (0-1) - Lips pushed forward (like "oo") */
  mouthFunnel: number

  /** Mouth pucker/widen (-1 to +1) - Wide to Pucker */
  mouthPuckerWiden: number

  /** Mouth press/lip open (-1 to +1) - Pressed lips to visible teeth */
  mouthPressLipOpen: number

  /** Mouth horizontal (-1 to +1) - Left to Right offset */
  mouthX: number

  /** Cheek puff (0-1) - Inflated cheeks (for 'b', 'p', 'm') */
  cheekPuffC: number
}

/** Neutral pose - all parameters at rest */
export const NEUTRAL_POSE: Readonly<PhonemePose> = Object.freeze({
  mouthOpenY: 0,
  jawOpen: 0,
  mouthForm: 0,
  mouthShrug: 0,
  mouthFunnel: 0,
  mouthPuckerWiden: 0,
  mouthPressLipOpen: 0,
  mouthX: 0,
  cheekPuffC: 0,
})

/**
 * Phoneme timing information from TTS
 */
export interface PhonemeTiming {
  /** The phoneme symbol (IPA or similar) */
  phoneme: string

  /** Start time in seconds */
  startTime: number

  /** End time in seconds */
  endTime: number

  /** Duration in seconds */
  duration: number
}

/**
 * Smoothing configuration for lip-sync interpolation
 * Reference: VBridgerLipSyncService.cs constants
 */
export interface LipSyncSmoothingConfig {
  /** General smoothing factor (default: 35.0) */
  smoothingFactor: number

  /** Cheek puff decay rate (default: 80.0) */
  cheekPuffDecayFactor: number

  /** Return to neutral smoothing (default: 15.0) */
  neutralReturnFactor: number
}

export const DEFAULT_SMOOTHING_CONFIG: Readonly<LipSyncSmoothingConfig> = Object.freeze({
  smoothingFactor: 35.0,
  cheekPuffDecayFactor: 80.0,
  neutralReturnFactor: 15.0,
})

/**
 * Live2D parameter IDs for VBridger-compatible models
 */
export const VBRIDGER_PARAM_IDS = {
  mouthOpenY: 'ParamMouthOpenY',
  jawOpen: 'ParamJawOpen',
  mouthForm: 'ParamMouthForm',
  mouthShrug: 'ParamMouthShrug',
  mouthFunnel: 'ParamMouthFunnel',
  mouthPuckerWiden: 'ParamMouthPuckerWiden',
  mouthPressLipOpen: 'ParamMouthPressLipOpen',
  mouthX: 'ParamMouthX',
  cheekPuffC: 'ParamCheekPuff',
} as const
