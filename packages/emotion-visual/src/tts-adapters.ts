/**
 * TTS Emotion Adapters - Convert canonical emotions to TTS-specific formats
 *
 * Supports:
 * - Fish Speech V1.5 (tag-based)
 * - Qwen3-TTS (natural language)
 * - Basic TTS (strips emotions)
 */

import type { EmotionEmoji, EmotionMarker } from '@airi-mods/animation-core'
import { EMOTION_NAMES } from '@airi-mods/animation-core'

/**
 * TTS emotion adapter interface
 */
export interface TtsEmotionAdapter {
  /** TTS system name for identification */
  readonly name: string

  /** Check if this TTS supports emotions */
  supportsEmotions(): boolean

  /** Convert canonical format to TTS-specific format */
  convertText(text: string, emotions: EmotionMarker[]): string
}

/**
 * Fish Speech V1.5 Emotion Adapter
 *
 * Converts [EMOTION:😊] → (happy)
 *
 * Fish Speech uses inline tags: (emotion)
 * Tags are inserted at emotion positions.
 */
export class FishSpeechAdapter implements TtsEmotionAdapter {
  readonly name = 'fish-speech'

  supportsEmotions(): boolean {
    return true
  }

  convertText(text: string, emotions: EmotionMarker[]): string {
    if (emotions.length === 0) return text

    // Sort emotions by position (descending) to insert tags back-to-front
    // This prevents position shifts during insertion
    const sorted = [...emotions].sort((a, b) => b.position - a.position)

    let result = text
    for (const emotion of sorted) {
      const tag = this.emojiToFishTag(emotion.emotion)
      // Insert tag at position
      result = result.slice(0, emotion.position) + `(${tag}) ` + result.slice(emotion.position)
    }

    return result
  }

  /**
   * Map emoji to Fish Speech emotion tag.
   *
   * Fish Speech supports ~50+ tags. We map our 17 emotions to closest matches.
   * Reference: https://docs.fish.audio/developer-guide/core-features/emotions
   */
  private emojiToFishTag(emoji: EmotionEmoji): string {
    const mapping: Record<EmotionEmoji, string> = {
      // Positive
      '😊': 'happy',
      '🤩': 'excited',
      '😎': 'confident',
      '😏': 'smug',
      '💪': 'determined',
      // Reactive
      '😳': 'embarrassed',
      '😲': 'surprised',
      '🤔': 'curious',
      '👀': 'interested',
      // Negative
      '😤': 'frustrated',
      '😢': 'sad',
      '😅': 'nervous',
      '🙄': 'disdainful',
      // Expressive
      '💕': 'joyful',
      '😂': 'laughing',
      '🔥': 'passionate',
      '✨': 'delighted',
      // Neutral
      '😐': 'neutral',
    }

    return mapping[emoji] || 'neutral'
  }
}

/**
 * Qwen3-TTS 0.6B Emotion Adapter
 *
 * Converts [EMOTION:😊] → [TONE: warm and cheerful]
 *
 * Qwen3-TTS uses natural language instructions.
 * We prepend tone descriptions to guide the model.
 */
export class Qwen3Adapter implements TtsEmotionAdapter {
  readonly name = 'qwen3-tts'

  supportsEmotions(): boolean {
    return true
  }

  convertText(text: string, emotions: EmotionMarker[]): string {
    if (emotions.length === 0) return text

    // For Qwen3, we prepend tone instructions
    // Use the first/dominant emotion (or most frequent)
    const dominantEmotion = this.getDominantEmotion(emotions)
    const tone = this.emojiToNaturalLanguage(dominantEmotion)

    // Format: [TONE: warm and cheerful] Text here
    return `[TONE: ${tone}] ${text}`
  }

  /**
   * Get dominant emotion from markers.
   * Simple strategy: use first emotion.
   * Could be enhanced to find most frequent or weighted by position.
   */
  private getDominantEmotion(emotions: EmotionMarker[]): EmotionEmoji {
    return emotions[0].emotion
  }

  /**
   * Map emoji to natural language tone description for Qwen3.
   *
   * These descriptions guide the model's emotional expression.
   * Can be customized based on testing results.
   */
  private emojiToNaturalLanguage(emoji: EmotionEmoji): string {
    const mapping: Record<EmotionEmoji, string> = {
      // Positive
      '😊': 'warm and cheerful',
      '🤩': 'excited and energetic',
      '😎': 'cool and confident',
      '😏': 'playful and sly',
      '💪': 'determined and strong',
      // Reactive
      '😳': 'flustered and embarrassed',
      '😲': 'shocked and surprised',
      '🤔': 'thoughtful and contemplative',
      '👀': 'curious and interested',
      // Negative
      '😤': 'frustrated and intense',
      '😢': 'sad and melancholic',
      '😅': 'nervous and awkward',
      '🙄': 'dismissive and annoyed',
      // Expressive
      '💕': 'loving and adoring',
      '😂': 'amused and laughing',
      '🔥': 'passionate and intense',
      '✨': 'bright and cheerful',
      // Neutral
      '😐': 'neutral and calm',
    }

    return mapping[emoji] || 'naturally'
  }
}

/**
 * Basic TTS Adapter (No Emotion Support)
 *
 * Simply strips emotion tags and returns clean text.
 * Use for TTS systems that don't support emotional control.
 */
export class BasicTtsAdapter implements TtsEmotionAdapter {
  readonly name = 'basic-tts'

  supportsEmotions(): boolean {
    return false
  }

  convertText(text: string, emotions: EmotionMarker[]): string {
    // Just return clean text, emotions are ignored
    return text
  }
}

/**
 * Azure Neural TTS Adapter (Future)
 *
 * Would convert to SSML with <mstts:express-as> tags.
 * Placeholder for future implementation.
 */
export class AzureNeuralAdapter implements TtsEmotionAdapter {
  readonly name = 'azure-neural-tts'

  supportsEmotions(): boolean {
    return true
  }

  convertText(text: string, emotions: EmotionMarker[]): string {
    // TODO: Implement SSML conversion
    // <speak><mstts:express-as style="cheerful">Text</mstts:express-as></speak>
    return text
  }
}

/**
 * Create appropriate adapter based on TTS system name.
 */
export function createTtsAdapter(ttsSystem: string): TtsEmotionAdapter {
  switch (ttsSystem.toLowerCase()) {
    case 'fish-speech':
    case 'fish':
      return new FishSpeechAdapter()

    case 'qwen3-tts':
    case 'qwen3':
    case 'qwen':
      return new Qwen3Adapter()

    case 'azure-neural':
    case 'azure':
      return new AzureNeuralAdapter()

    default:
      return new BasicTtsAdapter()
  }
}
