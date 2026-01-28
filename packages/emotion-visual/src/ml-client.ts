/**
 * ML Backend HTTP Client
 *
 * Replaces browser-based transformers.js with Python backend service.
 * Communicates via HTTP to localhost:8001
 *
 * Benefits:
 * - Reliable GPU acceleration (no WebGPU bugs)
 * - Faster inference (~20-50ms vs 800-4000ms)
 * - Better models (j-hartmann emotion, BFA aligner)
 * - Unified service for all ML needs
 */

const ML_BACKEND_URL = 'http://127.0.0.1:8001'

export interface EmotionResult {
  emotion: string
  confidence: number
  all_emotions: Array<{ label: string, score: number }>
  processing_time_ms: number
}

export interface PhonemeTimestamp {
  phoneme: string
  ipa: string
  start_ms: number
  end_ms: number
  confidence: number
}

export interface PhonemeAlignment {
  phonemes: PhonemeTimestamp[]
  words: Array<{ word: string, start_ms: number, end_ms: number }>
  processing_time_ms: number
}

export interface HealthStatus {
  status: string
  device: string
  models_loaded: {
    emotion: boolean
    aligner: boolean
  }
  timestamp: string
}

/**
 * Check if ML Backend service is healthy
 */
export async function checkHealth(): Promise<HealthStatus> {
  const response = await fetch(`${ML_BACKEND_URL}/health`)
  if (!response.ok) {
    throw new Error(`Health check failed: ${response.status}`)
  }
  return response.json()
}

/**
 * Detect emotion from text
 * Uses j-hartmann/emotion-english-distilroberta-base model
 * Returns 7 emotions: anger, disgust, fear, joy, neutral, sadness, surprise
 */
export async function detectEmotion(text: string): Promise<EmotionResult> {
  const response = await fetch(`${ML_BACKEND_URL}/emotion/detect`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Emotion detection failed: ${error}`)
  }

  return response.json()
}

/**
 * Align phonemes to audio using Bournemouth Forced Aligner (BFA)
 *
 * @param text - The text transcript
 * @param audioPath - Path to audio file (temporary, accessible to backend)
 * @returns Precise phoneme timestamps with IPA notation
 */
export async function alignPhonemes(
  text: string,
  audioPath: string,
): Promise<PhonemeAlignment> {
  const response = await fetch(`${ML_BACKEND_URL}/align/phonemes`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ text, audio_path: audioPath }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Phoneme alignment failed: ${error}`)
  }

  return response.json()
}

/**
 * Wait for ML Backend service to be ready
 * Polls health endpoint until service responds
 */
export async function waitForService(maxRetries = 30, delayMs = 1000): Promise<void> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const health = await checkHealth()
      if (health.status === 'healthy') {
        console.log('[ML Client] ✓ Service ready')
        return
      }
    }
    catch {
      // Service not ready yet
    }

    console.log(`[ML Client] Waiting for service... (${i + 1}/${maxRetries})`)
    await new Promise(resolve => setTimeout(resolve, delayMs))
  }

  throw new Error('ML Backend service failed to start')
}

/**
 * Check if service is available
 */
export async function isServiceAvailable(): Promise<boolean> {
  try {
    await checkHealth()
    return true
  }
  catch {
    return false
  }
}

// Export fallback message
export const FALLBACK_MESSAGE = 'ML Backend service not available. Using browser fallback.'
