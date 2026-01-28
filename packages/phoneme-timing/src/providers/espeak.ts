/**
 * eSpeak-ng Phoneme Timing Provider
 *
 * Uses eSpeak-ng to convert text → IPA phonemes, then estimates timing.
 *
 * Pros:
 * - Fast (real-time)
 * - Lightweight
 * - Fully local
 * - IPA output compatible with VBridger
 *
 * Cons:
 * - Timing is estimated, not frame-accurate
 * - Requires espeak-ng binary installed
 */

import { exec } from 'node:child_process'
import { promisify } from 'node:util'
import type { TimedPhoneme } from '@airi-mods/animation-core'
import {
  TimingEstimationStrategy,
  type PhonemeConversionResult,
  type PhonemeTimingOptions,
  type PhonemeTimingProvider,
} from '../types'

// Characters to ignore when parsing phonemes (stress markers, length markers, etc.)
const PHONEME_IGNORE_CHARS = /[ˈˌːˑ]/g

const execAsync = promisify(exec)

/**
 * eSpeak-ng configuration options.
 */
export interface EspeakProviderOptions {
  /**
   * Path to espeak-ng binary.
   * Default: 'espeak-ng' (assumes in PATH)
   */
  binaryPath?: string

  /**
   * Timing estimation strategy.
   * Default: UNIFORM (for MVP)
   */
  estimationStrategy?: TimingEstimationStrategy

  /**
   * Enable debug logging.
   * Default: false
   */
  debug?: boolean
}

/**
 * eSpeak-ng phoneme timing provider.
 *
 * Example usage:
 * ```typescript
 * const provider = new EspeakProvider()
 * const phonemes = await provider.getTimedPhonemes("Hello world", 1.2)
 * // [
 * //   { phoneme: "h", startTime: 0, endTime: 0.15 },
 * //   { phoneme: "ə", startTime: 0.15, endTime: 0.3 },
 * //   ...
 * // ]
 * ```
 */
export class EspeakProvider implements PhonemeTimingProvider {
  readonly name = 'espeak-ng'

  private binaryPath: string
  private estimationStrategy: TimingEstimationStrategy
  private debug: boolean

  constructor(options: EspeakProviderOptions = {}) {
    this.binaryPath = options.binaryPath ?? 'espeak-ng'
    this.estimationStrategy = options.estimationStrategy ?? TimingEstimationStrategy.UNIFORM
    this.debug = options.debug ?? false
  }

  /**
   * Check if espeak-ng is installed and accessible.
   */
  async isAvailable(): Promise<boolean> {
    try {
      const { stdout } = await execAsync(`${this.binaryPath} --version`)
      if (this.debug) {
        console.log(`[EspeakProvider] Found: ${stdout.split('\n')[0]}`)
      }
      return true
    }
    catch (error) {
      if (this.debug) {
        console.error('[EspeakProvider] Not found:', error)
      }
      return false
    }
  }

  /**
   * Convert text to timed phonemes using eSpeak + estimation.
   */
  async getTimedPhonemes(
    text: string,
    audioLengthSeconds: number,
    options: PhonemeTimingOptions = {},
  ): Promise<TimedPhoneme[]> {
    // 1. Convert text to phonemes using eSpeak
    const conversion = await this.textToPhonemes(text, options.language)

    if (this.debug) {
      console.log('[EspeakProvider] Phoneme string:', conversion.phonemeString)
      console.log('[EspeakProvider] Parsed phonemes:', conversion.phonemes)
    }

    // 2. Estimate timing based on strategy
    const timedPhonemes = this.estimateTiming(
      conversion,
      audioLengthSeconds,
      options.speechRate ?? 1.0,
    )

    if (this.debug) {
      console.log('[EspeakProvider] Timed phonemes:', timedPhonemes)
    }

    return timedPhonemes
  }

  /**
   * Convert text to phonemes using eSpeak-ng.
   *
   * Uses `--ipa -x` flags to get IPA phoneme output.
   */
  private async textToPhonemes(
    text: string,
    language = 'en-us',
  ): Promise<PhonemeConversionResult> {
    // Sanitize text for shell command
    const sanitizedText = text.replace(/"/g, '\\"')

    // Run eSpeak with IPA output
    // -q: quiet (no audio output)
    // --ipa: IPA phoneme output
    // -x: phonemes only (no text)
    // -v: voice/language
    const command = `${this.binaryPath} -q --ipa -x -v "${this.mapLanguageToVoice(language)}" "${sanitizedText}"`

    try {
      const { stdout, stderr } = await execAsync(command)

      if (stderr && this.debug) {
        console.warn('[EspeakProvider] eSpeak stderr:', stderr)
      }

      const phonemeString = stdout.trim()

      // Parse phonemes (filter stress/length markers)
      const phonemes = this.parsePhonemeString(phonemeString)

      return {
        phonemeString,
        phonemes,
      }
    }
    catch (error) {
      throw new Error(`eSpeak execution failed: ${error}`)
    }
  }

  /**
   * Parse phoneme string into individual IPA symbols.
   * Filters out stress markers and length markers.
   */
  private parsePhonemeString(phonemeString: string): string[] {
    const phonemes: string[] = []

    for (const char of phonemeString) {
      // Skip whitespace
      if (char === ' ' || char === '\n' || char === '\t') {
        continue
      }

      // Skip stress/length markers
      if (PHONEME_IGNORE_CHARS.test(char)) {
        continue
      }

      phonemes.push(char)
    }

    return phonemes
  }

  /**
   * Estimate phoneme timing based on audio duration.
   *
   * Strategies:
   * - UNIFORM: Distribute evenly
   * - AVERAGE_DURATIONS: Use typical phoneme durations (TODO: future)
   * - DURATION_HINTS: Use eSpeak stress markers (TODO: future)
   */
  private estimateTiming(
    conversion: PhonemeConversionResult,
    audioLengthSeconds: number,
    speechRate: number,
  ): TimedPhoneme[] {
    const { phonemes } = conversion
    const timedPhonemes: TimedPhoneme[] = []

    if (phonemes.length === 0) {
      return timedPhonemes
    }

    // Adjust for speech rate (faster speech = shorter phonemes)
    const adjustedDuration = audioLengthSeconds / speechRate

    // MVP: Uniform distribution
    // TODO: Implement AVERAGE_DURATIONS and DURATION_HINTS strategies
    if (this.estimationStrategy === TimingEstimationStrategy.UNIFORM) {
      const timePerPhoneme = adjustedDuration / phonemes.length

      for (let i = 0; i < phonemes.length; i++) {
        const startTime = i * timePerPhoneme
        const endTime = (i + 1) * timePerPhoneme
        timedPhonemes.push({
          phoneme: phonemes[i],
          startTime,
          endTime,
          duration: endTime - startTime,
        })
      }
    }
    else {
      throw new Error(`Estimation strategy '${this.estimationStrategy}' not yet implemented`)
    }

    return timedPhonemes
  }

  /**
   * Map language code to eSpeak voice name.
   *
   * eSpeak uses voice names like 'en-us', 'en-gb', 'ja', etc.
   */
  private mapLanguageToVoice(language: string): string {
    // eSpeak voice names mostly match language codes
    // but we can add special mappings here if needed
    const voiceMap: Record<string, string> = {
      'en': 'en-us',
      'english': 'en-us',
      // Add more mappings as needed
    }

    return voiceMap[language.toLowerCase()] ?? language
  }
}
