/**
 * @airi-mods/emotion-visual
 *
 * Visual emotion system for AIRI with Live2D expression mapping.
 *
 * Provides emotion parsing, Live2D mapping, TTS adapters, and
 * motion manager plugin for synchronized emotional expressions.
 *
 * @packageDocumentation
 */

// Emotion parsing
export {
  parseEmotions,
  estimateEmotionTimestamps,
  mergeNearbyEmotions,
  type EmotionParseResult,
} from './emotion-parser'

// ML Emotion Detection
export {
  EmotionMLDetector,
  type EmotionDetectionResult,
} from './emotion-ml-detector'

// Emotion mappings
export {
  EMOTION_MAP,
  getEmotionMapping,
  hasExpression,
  hasMotion,
  getSupportedEmotions,
  NEUTRAL_EXPRESSION_ID,
  NEUTRAL_MOTION_GROUP,
} from './emotion-map'

// Emotion store
export {
  EmotionStore,
  type EmotionStoreConfig,
  type EmotionState,
} from './emotion-store'

// TTS adapters
export {
  FishSpeechAdapter,
  Qwen3Adapter,
  BasicTtsAdapter,
  AzureNeuralAdapter,
  createTtsAdapter,
  type TtsEmotionAdapter,
} from './tts-adapters'

// AIRI motion manager plugin
export {
  useMotionUpdatePluginEmotionVisual,
  useEmotionController,
  type MotionManagerPlugin,
  type MotionManagerPluginContext,
  type UseMotionUpdatePluginEmotionVisualOptions,
} from './plugin'
