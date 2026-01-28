/**
 * Emotion Parser - Deprecated Tag Parsing
 * 
 * Replaced by ML-based detection (emotion-ml-detector.ts).
 * Now serves as a backward-compatible wrapper that warns about deprecation
 * and provides basic text cleaning.
 */

import type { EmotionMarker } from '@airi-mods/animation-core'
import { EMOTION_TAG_REGEX } from '@airi-mods/animation-core'

/**
 * Result from emotion parsing
 */
export interface EmotionParseResult {
  /** Text with emotion tags removed (if any existed) */
  cleanText: string

  /** Extracted emotion markers (now always empty as tags are ignored) */
  emotions: EmotionMarker[]

  /** Original text (unchanged) */
  originalText: string
}

/**
 * Clean text by removing any legacy emotion tags.
 * 
 * @param text Text that might contain [EMOTION:x] tags
 * @returns Cleaned text
 */
export function parseEmotions(text: string): EmotionParseResult {
  // Just strip tags, don't extract them
  const cleanText = text.replace(EMOTION_TAG_REGEX, '').trim()
  
  return {
    cleanText,
    emotions: [], // ML detector handles emotions now
    originalText: text
  }
}

/**
 * Estimate timestamps - Deprecated but kept for API compatibility.
 */
export function estimateEmotionTimestamps(
  emotions: EmotionMarker[],
  cleanText: string,
  audioDuration: number,
): EmotionMarker[] {
  return []
}

/**
 * Merge nearby emotions - Deprecated but kept for API compatibility.
 */
export function mergeNearbyEmotions(
  emotions: EmotionMarker[],
  mergeThreshold: number = 1.0,
): EmotionMarker[] {
  return []
}
