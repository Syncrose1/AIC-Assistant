/**
 * Emotion to Live2D Expression/Motion Mapping
 *
 * Maps canonical emotion emojis to Live2D assets.
 * Ported from Handcrafted Persona Engine EmotionAnimationService.
 */

import type { EmotionEmoji, EmotionMapping } from '@airi-mods/animation-core'

/**
 * Map emotion emojis to Live2D expressions and motion groups.
 *
 * Expression IDs should match your Live2D model's expression files.
 * Motion groups should match your model's motion.json groups.
 *
 * If your model doesn't have a specific expression/motion, you can:
 * - Set it to undefined (will skip)
 * - Map to a similar expression (e.g., 'cool' → 'happy')
 * - Use neutral as fallback
 */
export const EMOTION_MAP: Record<EmotionEmoji, EmotionMapping> = {
  // ===== Positive Emotions =====
  '😊': {
    expressionId: 'happy',
    motionGroup: 'Happy',
    intensity: 1.0,
  },
  '🤩': {
    expressionId: 'excited_star',
    motionGroup: 'Excited',
    intensity: 1.0,
  },
  '😎': {
    expressionId: 'cool',
    motionGroup: 'Confident',
    intensity: 1.0,
  },
  '😏': {
    expressionId: 'smug',
    motionGroup: 'Confident',
    intensity: 0.8,
  },
  '💪': {
    expressionId: 'determined',
    motionGroup: 'Confident',
    intensity: 1.0,
  },

  // ===== Reactive Emotions =====
  '😳': {
    expressionId: 'embarrassed',
    motionGroup: 'Nervous',
    intensity: 1.0,
  },
  '😲': {
    expressionId: 'shocked',
    motionGroup: 'Surprised',
    intensity: 1.0,
  },
  '🤔': {
    expressionId: 'thinking',
    motionGroup: 'Thinking',
    intensity: 0.9,
  },
  '👀': {
    expressionId: 'suspicious',
    motionGroup: 'Thinking',
    intensity: 0.7,
  },

  // ===== Negative Emotions =====
  '😤': {
    expressionId: 'frustrated',
    motionGroup: 'Angry',
    intensity: 1.0,
  },
  '😢': {
    expressionId: 'sad',
    motionGroup: 'Sad',
    intensity: 1.0,
  },
  '😅': {
    expressionId: 'awkward',
    motionGroup: 'Nervous',
    intensity: 0.8,
  },
  '🙄': {
    expressionId: 'dismissive',
    motionGroup: 'Annoyed',
    intensity: 0.9,
  },

  // ===== Expressive Emotions =====
  '💕': {
    expressionId: 'adoring',
    motionGroup: 'Happy',
    intensity: 1.0,
  },
  '😂': {
    expressionId: 'laughing',
    motionGroup: 'Happy',
    intensity: 1.0,
  },
  '🔥': {
    expressionId: 'passionate',
    motionGroup: 'Excited',
    intensity: 1.0,
  },
  '✨': {
    expressionId: 'sparkle',
    motionGroup: 'Happy',
    intensity: 0.9,
  },

  // ===== Neutral =====
  '😐': {
    expressionId: 'neutral',
    motionGroup: undefined, // Don't trigger motion for neutral
    intensity: 1.0,
  },
}

/**
 * Get Live2D mapping for an emotion.
 *
 * @param emotion - Emotion emoji
 * @returns Mapping to expression/motion, or undefined if not found
 */
export function getEmotionMapping(emotion: EmotionEmoji): EmotionMapping | undefined {
  return EMOTION_MAP[emotion]
}

/**
 * Check if an emotion has a mapped expression.
 */
export function hasExpression(emotion: EmotionEmoji): boolean {
  const mapping = EMOTION_MAP[emotion]
  return mapping !== undefined && mapping.expressionId !== undefined
}

/**
 * Check if an emotion has a mapped motion.
 */
export function hasMotion(emotion: EmotionEmoji): boolean {
  const mapping = EMOTION_MAP[emotion]
  return mapping !== undefined && mapping.motionGroup !== undefined
}

/**
 * Get all supported emotion emojis.
 */
export function getSupportedEmotions(): EmotionEmoji[] {
  return Object.keys(EMOTION_MAP) as EmotionEmoji[]
}

/**
 * Neutral expression constants
 */
export const NEUTRAL_EXPRESSION_ID = 'neutral'
export const NEUTRAL_MOTION_GROUP = 'Talking' // Default talking motion during speech
