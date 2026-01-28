/**
 * @airi-mods/animation-core
 *
 * Shared types and interfaces for AIRI animation enhancements.
 * This package provides the foundation types used by all other
 * airi-mods packages.
 */

// Phoneme/Lip-sync types (VBridger 9-parameter system)
export type {
  PhonemePose,
  PhonemeTiming,
  LipSyncSmoothingConfig,
} from './types/phoneme'

// Alias for consistency with documentation
export type { PhonemeTiming as TimedPhoneme } from './types/phoneme'

export {
  NEUTRAL_POSE,
  DEFAULT_SMOOTHING_CONFIG,
  VBRIDGER_PARAM_IDS,
} from './types/phoneme'

// Emotion types
export type {
  EmotionEmoji,
  EmotionMapping,
  EmotionMarker,
  EmotionTiming,
  EmotionProsody,
  EmotionCategory,
} from './types/emotion'

export {
  EMOTION_NAMES,
  DEFAULT_EMOTION_PROSODY,
  EMOTION_TAG_REGEX,
  DEFAULT_EXPRESSION_HOLD_DURATION,
  EMOTION_CATEGORIES,
} from './types/emotion'

// Motion priority types
export {
  MotionPriority,
  canOverrideMotion,
  DEFAULT_QUEUE_WAIT_TIME,
} from './types/priority'

export type {
  MotionState,
  MotionRequest,
  QueuedMotion,
} from './types/priority'

// Vision types
export {
  ImageSource,
  toOpenAIFormat,
  toClaudeFormat,
  isSupportedImageType,
  SUPPORTED_IMAGE_TYPES,
  MAX_IMAGE_SIZE_BYTES,
  DEFAULT_COMPRESSION_QUALITY,
} from './types/vision'

export type {
  ImageData,
  VisionInput,
  OpenAIImageContent,
  ClaudeImageContent,
  ScreenCaptureOptions,
  CameraCaptureOptions,
  SupportedImageType,
} from './types/vision'
