/**
 * Emotion system types for visual expression and TTS prosody
 *
 * Emotions are extracted from LLM output via [EMOTION:emoji] tags,
 * then mapped to both Live2D expressions and TTS voice parameters.
 *
 * Reference: handcrafted-persona-engine EmotionProcessor
 */

/**
 * Supported emotion emojis
 * These are extracted from LLM responses and mapped to expressions/motions
 */
export type EmotionEmoji =
  // Positive emotions
  | '\u{1F60A}' // 😊 Happy/Content
  | '\u{1F929}' // 🤩 Excited/Starstruck
  | '\u{1F60E}' // 😎 Cool/Confident
  | '\u{1F60F}' // 😏 Smug/Sly
  | '\u{1F4AA}' // 💪 Determined/Strong
  // Reactive emotions
  | '\u{1F633}' // 😳 Embarrassed/Flustered
  | '\u{1F632}' // 😲 Shocked/Surprised
  | '\u{1F914}' // 🤔 Thinking/Pondering
  | '\u{1F440}' // 👀 Curious/Looking
  // Negative emotions
  | '\u{1F624}' // 😤 Frustrated/Huffing
  | '\u{1F622}' // 😢 Sad/Crying
  | '\u{1F605}' // 😅 Nervous/Awkward
  | '\u{1F644}' // 🙄 Annoyed/Eye-roll
  // Expressive emotions
  | '\u{1F495}' // 💕 Adoring/Loving
  | '\u{1F602}' // 😂 Laughing
  | '\u{1F525}' // 🔥 Passionate/Intense
  | '\u{2728}'  // ✨ Sparkle/Magical
  // Neutral
  | '\u{1F610}' // 😐 Neutral

/**
 * Human-readable emotion names for debugging/logging
 */
export const EMOTION_NAMES: Record<EmotionEmoji, string> = {
  '\u{1F60A}': 'happy',
  '\u{1F929}': 'excited',
  '\u{1F60E}': 'cool',
  '\u{1F60F}': 'smug',
  '\u{1F4AA}': 'determined',
  '\u{1F633}': 'embarrassed',
  '\u{1F632}': 'shocked',
  '\u{1F914}': 'thinking',
  '\u{1F440}': 'curious',
  '\u{1F624}': 'frustrated',
  '\u{1F622}': 'sad',
  '\u{1F605}': 'nervous',
  '\u{1F644}': 'annoyed',
  '\u{1F495}': 'adoring',
  '\u{1F602}': 'laughing',
  '\u{1F525}': 'passionate',
  '\u{2728}': 'sparkle',
  '\u{1F610}': 'neutral',
}

/**
 * Mapping from emotion to Live2D expression/motion
 */
export interface EmotionMapping {
  /** Live2D expression ID (e.g., 'happy', 'sad') */
  expressionId?: string

  /** Motion group to trigger (e.g., 'Happy', 'Surprised') */
  motionGroup?: string

  /** Expression intensity (0-1, default 1.0) */
  intensity?: number
}

/**
 * Emotion marker extracted from text with timestamp
 */
export interface EmotionMarker {
  /** The emotion emoji */
  emotion: EmotionEmoji

  /** Character position in original text */
  position: number

  /** Estimated timestamp in audio (seconds) */
  timestamp?: number
}

/**
 * Emotion timing synchronized to audio playback
 */
export interface EmotionTiming {
  /** Timestamp in audio (seconds) */
  timestamp: number

  /** The emotion to display */
  emotion: EmotionEmoji

  /** How long to hold this expression (seconds) */
  holdDuration: number
}

/**
 * TTS prosody parameters for emotional voice
 */
export interface EmotionProsody {
  /** Pitch multiplier (1.0 = normal, >1 = higher, <1 = lower) */
  pitch: number

  /** Energy/volume multiplier */
  energy: number

  /** Speed multiplier */
  speed: number

  /** Optional style tag for TTS systems that support it */
  styleTag?: string
}

/**
 * Default emotion-to-prosody mappings for emotional TTS
 */
export const DEFAULT_EMOTION_PROSODY: Record<EmotionEmoji, EmotionProsody> = {
  // Positive - higher pitch, more energy
  '\u{1F60A}': { pitch: 1.1, energy: 1.1, speed: 1.05, styleTag: 'happy' },
  '\u{1F929}': { pitch: 1.2, energy: 1.3, speed: 1.15, styleTag: 'excited' },
  '\u{1F60E}': { pitch: 0.95, energy: 1.0, speed: 0.95, styleTag: 'confident' },
  '\u{1F60F}': { pitch: 1.0, energy: 0.9, speed: 0.9, styleTag: 'playful' },
  '\u{1F4AA}': { pitch: 1.0, energy: 1.2, speed: 1.0, styleTag: 'determined' },

  // Reactive
  '\u{1F633}': { pitch: 1.15, energy: 0.85, speed: 1.1, styleTag: 'nervous' },
  '\u{1F632}': { pitch: 1.25, energy: 1.2, speed: 1.2, styleTag: 'surprised' },
  '\u{1F914}': { pitch: 1.0, energy: 0.9, speed: 0.85, styleTag: 'thoughtful' },
  '\u{1F440}': { pitch: 1.05, energy: 1.0, speed: 1.0, styleTag: 'curious' },

  // Negative - lower pitch, varied energy
  '\u{1F624}': { pitch: 1.0, energy: 1.3, speed: 1.1, styleTag: 'angry' },
  '\u{1F622}': { pitch: 0.9, energy: 0.7, speed: 0.85, styleTag: 'sad' },
  '\u{1F605}': { pitch: 1.1, energy: 0.9, speed: 1.1, styleTag: 'nervous' },
  '\u{1F644}': { pitch: 0.95, energy: 0.85, speed: 0.9, styleTag: 'annoyed' },

  // Expressive
  '\u{1F495}': { pitch: 1.15, energy: 1.0, speed: 0.95, styleTag: 'loving' },
  '\u{1F602}': { pitch: 1.2, energy: 1.2, speed: 1.1, styleTag: 'laughing' },
  '\u{1F525}': { pitch: 1.1, energy: 1.3, speed: 1.1, styleTag: 'passionate' },
  '\u{2728}': { pitch: 1.15, energy: 1.1, speed: 1.0, styleTag: 'cheerful' },

  // Neutral
  '\u{1F610}': { pitch: 1.0, energy: 1.0, speed: 1.0, styleTag: 'neutral' },
}

/**
 * Regex for extracting emotion tags from text
 * Matches: [EMOTION:😊] or [EMOTION:happy]
 */
export const EMOTION_TAG_REGEX = /\[EMOTION:([^\]]+)\]/g

/**
 * Default hold duration for expressions (seconds)
 */
export const DEFAULT_EXPRESSION_HOLD_DURATION = 3.0

/**
 * Emotion categories for grouping similar emotions
 */
export type EmotionCategory = 'positive' | 'reactive' | 'negative' | 'expressive' | 'neutral'

export const EMOTION_CATEGORIES: Record<EmotionEmoji, EmotionCategory> = {
  '\u{1F60A}': 'positive',
  '\u{1F929}': 'positive',
  '\u{1F60E}': 'positive',
  '\u{1F60F}': 'positive',
  '\u{1F4AA}': 'positive',
  '\u{1F633}': 'reactive',
  '\u{1F632}': 'reactive',
  '\u{1F914}': 'reactive',
  '\u{1F440}': 'reactive',
  '\u{1F624}': 'negative',
  '\u{1F622}': 'negative',
  '\u{1F605}': 'negative',
  '\u{1F644}': 'negative',
  '\u{1F495}': 'expressive',
  '\u{1F602}': 'expressive',
  '\u{1F525}': 'expressive',
  '\u{2728}': 'expressive',
  '\u{1F610}': 'neutral',
}
