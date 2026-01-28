/**
 * Mock Phoneme Timing Provider for Browser/Testing
 *
 * Generates simple phoneme timing without external dependencies.
 * Use this in browser environments where espeak is not available.
 */

import type { TimedPhoneme } from '@airi-mods/animation-core'
import type { PhonemeTimingProvider } from '../types'

export interface MockProviderOptions {
  /** Enable debug logging */
  debug?: boolean
  /** Average phonemes per second (for timing estimation) */
  phonemesPerSecond?: number
}

/**
 * Mock provider that generates simple phoneme timing.
 * Useful for testing and browser environments.
 */
export class MockProvider implements PhonemeTimingProvider {
  public readonly name = 'MockProvider'
  private debug: boolean
  private phonemesPerSecond: number

  constructor(options: MockProviderOptions = {}) {
    this.debug = options.debug ?? false
    this.phonemesPerSecond = options.phonemesPerSecond ?? 10 // ~10 phonemes per second
  }

  async getTimedPhonemes(text: string, audioDuration: number): Promise<TimedPhoneme[]> {
    if (this.debug) {
      console.log('[MockProvider] Generating phonemes for:', text, 'duration:', audioDuration)
    }

    // Simple mock: generate basic phonemes based on text length
    const words = text.split(/\s+/).filter(Boolean)
    const phonemes: TimedPhoneme[] = []

    // Estimate phoneme count based on text length
    const charCount = text.replace(/\s+/g, '').length
    const estimatedPhonemeCount = Math.max(1, Math.floor(charCount * 0.6)) // ~0.6 phonemes per char
    const phoneTimeInterval = audioDuration / estimatedPhonemeCount

    // Generate simple phonemes using phonemes that exist in PHONEME_MAP
    // Mix of vowels and consonants for variety
    const commonPhonemes = [
      'ə',  // schwa (most common vowel)
      'i',  // ee (see)
      'ɑ',  // ah (father)
      'u',  // oo (boot)
      'ɛ',  // eh (bed)
      'æ',  // ae (cat)
      'n',  // n consonant
      'l',  // l consonant
      's',  // s consonant
      't',  // t consonant
    ]

    for (let i = 0; i < estimatedPhonemeCount; i++) {
      const phoneme = commonPhonemes[i % commonPhonemes.length]
      const startTime = i * phoneTimeInterval
      const endTime = (i + 1) * phoneTimeInterval
      const duration = phoneTimeInterval

      phonemes.push({
        phoneme,
        startTime,
        endTime,
        duration,
      })
    }

    if (this.debug) {
      console.log('[MockProvider] Generated', phonemes.length, 'phonemes')
      console.log('[MockProvider] First 5 phonemes:', phonemes.slice(0, 5))
      console.log('[MockProvider] Phoneme duration:', phoneTimeInterval.toFixed(3), 'seconds')
    }

    return phonemes
  }

  async isAvailable(): Promise<boolean> {
    // Mock provider is always available (no external dependencies)
    return true
  }
}
