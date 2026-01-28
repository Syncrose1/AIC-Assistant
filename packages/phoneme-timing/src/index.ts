/**
 * @airi-mods/phoneme-timing
 *
 * TTS-agnostic phoneme timing system for VBridger lip-sync.
 * Provides multiple backends for obtaining timed phonemes.
 */

export * from './types'

// EspeakProvider uses Node.js APIs (child_process) - only for server-side use
// export { EspeakProvider } from './providers/espeak'
// export type { EspeakProviderOptions } from './providers/espeak'

// MockProvider works in browser (no Node.js dependencies)
export { MockProvider } from './providers/mock'
export type { MockProviderOptions } from './providers/mock'

// Future providers (not yet implemented):
// export { MfaProvider } from './providers/mfa'
// export { AzureProvider } from './providers/azure'
// export { FishSpeechProvider } from './providers/fish-speech'
