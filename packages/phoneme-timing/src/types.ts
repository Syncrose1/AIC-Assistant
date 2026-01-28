/**
 * Phoneme Timing System - Type Definitions
 *
 * TTS-agnostic architecture for obtaining phoneme timing data.
 * Supports multiple backends: eSpeak, MFA, Azure, etc.
 */

import type { TimedPhoneme } from '@airi-mods/animation-core'

/**
 * Abstract interface for phoneme timing providers.
 *
 * Implementations can use different backends (eSpeak, MFA, cloud APIs, etc.)
 * without VBridger needing to know the details.
 */
export interface PhonemeTimingProvider {
  /**
   * Convert text to timed phonemes.
   *
   * @param text Input text to phonemize
   * @param audioLengthSeconds Total audio duration (for estimation)
   * @param options Provider-specific options
   * @returns Array of timed phonemes (IPA symbols with timestamps)
   */
  getTimedPhonemes(
    text: string,
    audioLengthSeconds: number,
    options?: PhonemeTimingOptions,
  ): Promise<TimedPhoneme[]>

  /**
   * Check if this provider is available/installed.
   *
   * @returns true if the provider can be used
   */
  isAvailable(): Promise<boolean>

  /**
   * Get the provider name for debugging/logging.
   */
  readonly name: string
}

/**
 * Options for phoneme timing generation.
 */
export interface PhonemeTimingOptions {
  /**
   * Language code (e.g., 'en-us', 'en-gb', 'ja')
   * Default: 'en-us'
   */
  language?: string

  /**
   * Speech rate multiplier from TTS
   * Used to adjust timing estimates
   * Default: 1.0
   */
  speechRate?: number

  /**
   * Provider-specific options
   */
  [key: string]: unknown
}

/**
 * Result from text-to-phoneme conversion (without timing).
 */
export interface PhonemeConversionResult {
  /**
   * Raw phoneme string (IPA symbols)
   * Example: "həloʊ wɝld"
   */
  phonemeString: string

  /**
   * Parsed phonemes as individual symbols
   * Example: ["h", "ə", "l", "oʊ", "w", "ɝ", "l", "d"]
   */
  phonemes: string[]

  /**
   * Optional: Duration hints from phonemizer (if available)
   * Used to improve timing estimation
   */
  durationHints?: number[]
}

/**
 * Strategy for timing estimation when exact timing unavailable.
 */
export enum TimingEstimationStrategy {
  /**
   * Distribute phonemes evenly across audio duration.
   * Simple but inaccurate for varying phoneme lengths.
   */
  UNIFORM = 'uniform',

  /**
   * Use phoneme-specific average durations.
   * More accurate than uniform distribution.
   */
  AVERAGE_DURATIONS = 'average_durations',

  /**
   * Use duration hints from phonemizer (e.g., eSpeak stress marks).
   * Most accurate estimation without forced alignment.
   */
  DURATION_HINTS = 'duration_hints',
}

/**
 * Cache entry for phoneme timing results.
 * Useful for caching BFA results or frequently-used phrases.
 */
export interface CachedPhonemeTiming {
  /**
   * Original text (cache key)
   */
  text: string

  /**
   * Timed phonemes
   */
  phonemes: TimedPhoneme[]

  /**
   * Audio duration this timing was generated for
   */
  audioDuration: number

  /**
   * Timestamp when cached
   */
  cachedAt: number

  /**
   * Provider that generated this timing
   */
  provider: string
}

/**
 * Configuration for timing cache.
 */
export interface TimingCacheConfig {
  /**
   * Maximum cache entries
   * Default: 1000
   */
  maxEntries?: number

  /**
   * Time-to-live in milliseconds
   * Default: 24 hours
   */
  ttl?: number

  /**
   * Enable cache persistence to disk
   * Default: false
   */
  persistent?: boolean
}
