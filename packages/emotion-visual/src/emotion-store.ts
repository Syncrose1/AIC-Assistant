/**
 * Emotion Store - Track emotion state with timing
 *
 * Manages current emotion, auto-revert to neutral, and timing.
 * Thread-safe for use in animation loops.
 */

import type { EmotionEmoji, EmotionTiming } from '@airi-mods/animation-core'
import { DEFAULT_EXPRESSION_HOLD_DURATION } from '@airi-mods/animation-core'

/**
 * Emotion store configuration
 */
export interface EmotionStoreConfig {
  /** How long to hold an expression before reverting to neutral (seconds) */
  holdDuration?: number

  /** Neutral emotion to revert to */
  neutralEmotion?: EmotionEmoji
}

/**
 * Current emotion state
 */
export interface EmotionState {
  /** Current emotion being displayed */
  currentEmotion: EmotionEmoji

  /** When this emotion started (timestamp in seconds) */
  startTime: number

  /** When this emotion should end (timestamp in seconds) */
  endTime: number

  /** Whether currently in neutral state */
  isNeutral: boolean
}

/**
 * Store for managing emotion state with automatic neutral revert.
 *
 * @example
 * ```typescript
 * const store = new EmotionStore()
 *
 * // Set emotion during TTS playback
 * store.setEmotion('😊', currentTime)
 *
 * // In animation loop
 * const state = store.getState(currentTime)
 * applyExpression(state.currentEmotion)
 * ```
 */
export class EmotionStore {
  private currentEmotion: EmotionEmoji
  private emotionStartTime: number = 0
  private emotionEndTime: number = 0
  private holdDuration: number
  private neutralEmotion: EmotionEmoji

  constructor(config: EmotionStoreConfig = {}) {
    this.holdDuration = config.holdDuration ?? DEFAULT_EXPRESSION_HOLD_DURATION
    this.neutralEmotion = config.neutralEmotion ?? '😐'
    this.currentEmotion = this.neutralEmotion
  }

  /**
   * Set a new emotion with timing.
   *
   * @param emotion - Emotion to display
   * @param currentTime - Current time in seconds
   * @param holdDuration - Override default hold duration (optional)
   */
  setEmotion(emotion: EmotionEmoji, currentTime: number, holdDuration?: number): void {
    this.currentEmotion = emotion
    this.emotionStartTime = currentTime
    this.emotionEndTime = currentTime + (holdDuration ?? this.holdDuration)
  }

  /**
   * Set emotions from TTS timing data.
   *
   * Stores all emotions and will automatically switch at correct times.
   *
   * @param emotions - Timed emotion array from TTS
   */
  setEmotionTimings(emotions: EmotionTiming[]): void {
    // For now, just use the first emotion
    // TODO: Implement timeline-based emotion switching
    if (emotions.length > 0) {
      const first = emotions[0]
      this.setEmotion(first.emotion, first.timestamp, first.holdDuration)
    }
  }

  /**
   * Get current emotion state at a given time.
   *
   * Automatically reverts to neutral if hold duration expired.
   *
   * @param currentTime - Current time in seconds
   */
  getState(currentTime: number): EmotionState {
    // Check if emotion has expired
    if (currentTime >= this.emotionEndTime && this.currentEmotion !== this.neutralEmotion) {
      // Revert to neutral
      this.currentEmotion = this.neutralEmotion
      this.emotionStartTime = currentTime
      this.emotionEndTime = Number.POSITIVE_INFINITY // Neutral has no end time
    }

    return {
      currentEmotion: this.currentEmotion,
      startTime: this.emotionStartTime,
      endTime: this.emotionEndTime,
      isNeutral: this.currentEmotion === this.neutralEmotion,
    }
  }

  /**
   * Get current emotion without state update.
   */
  getCurrentEmotion(): EmotionEmoji {
    return this.currentEmotion
  }

  /**
   * Check if currently showing neutral emotion.
   */
  isNeutral(): boolean {
    return this.currentEmotion === this.neutralEmotion
  }

  /**
   * Force revert to neutral immediately.
   */
  resetToNeutral(currentTime: number): void {
    this.currentEmotion = this.neutralEmotion
    this.emotionStartTime = currentTime
    this.emotionEndTime = Number.POSITIVE_INFINITY
  }

  /**
   * Extend current emotion hold time.
   *
   * Useful for keeping expression during long speech.
   *
   * @param additionalSeconds - Seconds to add to current hold time
   */
  extendHold(additionalSeconds: number): void {
    if (!this.isNeutral()) {
      this.emotionEndTime += additionalSeconds
    }
  }
}
