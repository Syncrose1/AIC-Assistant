/**
 * VBridger Lip-Sync Service
 *
 * Core service for VBridger 9-parameter lip-sync animation.
 * Orchestrates phoneme timing, pose interpolation, and Live2D updates.
 */

import type { TimedPhoneme } from '@airi-mods/animation-core'
import type { PhonemeTimingProvider } from '@airi-mods/phoneme-timing'
import {
  type PhonemePose,
  NEUTRAL_POSE,
  VBRIDGER_CONFIG,
  VBRIDGER_PARAM_NAMES,
} from './types'
import { PHONEME_MAP } from './phoneme-map'
import { easeInOutQuad, lerpPose, smoothPoseToTarget } from './interpolation'

/**
 * VBridger service configuration options.
 */
export interface VBridgerServiceOptions {
  /**
   * Enable debug logging.
   * Default: false
   */
  debug?: boolean

  /**
   * Smoothing factor for pose transitions.
   * Higher = smoother but more delayed.
   * Default: 35.0
   */
  smoothingFactor?: number

  /**
   * Factor for returning to neutral pose.
   * Default: 15.0
   */
  neutralReturnFactor?: number

  /**
   * Decay factor for cheek puff parameter.
   * Default: 80.0
   */
  cheekPuffDecayFactor?: number

  /**
   * Threshold for considering a parameter at neutral.
   * Default: 0.02
   */
  neutralThreshold?: number
}

/**
 * TTS audio playback state.
 */
interface AudioPlaybackState {
  isPlaying: boolean
  startTime: number  // Performance.now() timestamp when audio started
  audioDuration: number  // Total audio length in seconds
  timedPhonemes: TimedPhoneme[]
}

/**
 * VBridger Lip-Sync Service.
 *
 * Manages phoneme-driven lip-sync animation with 9-parameter mouth control.
 *
 * @example
 * ```typescript
 * const timingProvider = new EspeakProvider()
 * const vbridger = new VBridgerService(timingProvider)
 *
 * // When TTS audio is about to play
 * await vbridger.onTtsAudioReady("Hello world", 1.2)
 *
 * // Update loop (60 FPS)
 * function animate() {
 *   const pose = vbridger.update(deltaTime)
 *   applyToLive2DModel(pose)
 *   requestAnimationFrame(animate)
 * }
 * ```
 */
export class VBridgerService {
  private timingProvider: PhonemeTimingProvider
  private fallbackProvider?: PhonemeTimingProvider
  private debug: boolean

  // Configuration
  private smoothingFactor: number
  private neutralReturnFactor: number
  private cheekPuffDecayFactor: number
  private neutralThreshold: number

  // State
  private currentPose: PhonemePose = { ...NEUTRAL_POSE }
  private targetPose: PhonemePose = { ...NEUTRAL_POSE }
  private playbackState: AudioPlaybackState | null = null
  private isPaused: boolean = false
  private lastLoggedPhoneme: string = ''

  // Extensibility hooks for tier system
  private useAccurateProvider: boolean = true

  constructor(
    timingProvider: PhonemeTimingProvider,
    options: VBridgerServiceOptions = {}
  ) {
    this.timingProvider = timingProvider
    this.debug = options.debug ?? false

    // Configuration from options or defaults
    this.smoothingFactor = options.smoothingFactor ?? VBRIDGER_CONFIG.SMOOTHING_FACTOR
    this.neutralReturnFactor = options.neutralReturnFactor ?? VBRIDGER_CONFIG.NEUTRAL_RETURN_FACTOR
    this.cheekPuffDecayFactor = options.cheekPuffDecayFactor ?? VBRIDGER_CONFIG.CHEEK_PUFF_DECAY_FACTOR
    this.neutralThreshold = options.neutralThreshold ?? VBRIDGER_CONFIG.NEUTRAL_THRESHOLD

    if (this.debug) {
      console.log('[VBridgerService] Initialized with config:', {
        smoothingFactor: this.smoothingFactor,
        neutralReturnFactor: this.neutralReturnFactor,
        cheekPuffDecayFactor: this.cheekPuffDecayFactor,
        neutralThreshold: this.neutralThreshold,
      })
    }
  }

  /**
   * Set a fallback timing provider for tier system.
   * When resources are constrained, service can switch to fallback.
   */
  setFallbackProvider(provider: PhonemeTimingProvider) {
    this.fallbackProvider = provider
  }

  /**
   * Switch between accurate and fallback timing provider.
   * Hook for resource tier system.
   */
  async switchProvider(provider: PhonemeTimingProvider) {
    this.timingProvider = provider

    if (this.debug) {
      console.log(`[VBridgerService] Switched to provider: ${provider.name}`)
    }

    // If currently playing, regenerate timing with new provider
    if (this.playbackState) {
      const { audioDuration } = this.playbackState
      // TODO: Store original text to regenerate timing
      // For now, continue with existing timing
    }
  }

  /**
   * Enable accurate timing provider (BFA).
   * Called when resources available (Tier 1).
   */
  useAccurateTiming() {
    if (this.fallbackProvider) {
      this.useAccurateProvider = true
      if (this.debug) {
        console.log('[VBridgerService] Enabled accurate timing')
      }
    }
  }

  /**
   * Use fallback estimation provider (eSpeak).
   * Called when resources constrained (Tier 2).
   */
  useFallbackEstimation() {
    if (this.fallbackProvider) {
      this.useAccurateProvider = false
      if (this.debug) {
        console.log('[VBridgerService] Using fallback estimation')
      }
    }
  }

  /**
   * Pause lip-sync animation.
   * Hook for visibility optimization - don't waste CPU if model not visible.
   */
  pause() {
    this.isPaused = true
    if (this.debug) {
      console.log('[VBridgerService] Paused')
    }
  }

  /**
   * Resume lip-sync animation.
   */
  resume() {
    this.isPaused = false
    if (this.debug) {
      console.log('[VBridgerService] Resumed')
    }
  }

  /**
   * Called when TTS audio is about to play.
   * Generates timed phonemes and prepares playback state.
   *
   * @param text The text being spoken
   * @param audioDuration Total audio duration in seconds
   */
  async onTtsAudioReady(text: string, audioDuration: number) {
    // Choose provider based on tier setting
    const provider = this.useAccurateProvider && this.fallbackProvider
      ? this.timingProvider
      : this.fallbackProvider ?? this.timingProvider

    if (this.debug) {
      console.log(`[VBridgerService] Generating phoneme timing for: "${text}"`)
      console.log(`[VBridgerService] Audio duration: ${audioDuration}s`)
      console.log(`[VBridgerService] Using provider: ${provider.name}`)
    }

    // Generate timed phonemes
    const timedPhonemes = await provider.getTimedPhonemes(text, audioDuration, {
      language: 'en-us',
      speechRate: 1.0,
    })

    if (this.debug) {
      console.log(`[VBridgerService] Generated ${timedPhonemes.length} timed phonemes`)
      console.log('[VBridgerService] First 5 phonemes:', timedPhonemes.slice(0, 5))
    }

    // Set playback state
    this.playbackState = {
      isPlaying: true,
      startTime: performance.now(),
      audioDuration,
      timedPhonemes,
    }
  }

  /**
   * Called when TTS audio playback starts.
   * Synchronizes timing with actual audio start.
   */
  onTtsAudioStart() {
    if (this.playbackState) {
      this.playbackState.startTime = performance.now()
      this.playbackState.isPlaying = true

      if (this.debug) {
        console.log('[VBridgerService] Audio playback started')
      }
    }
  }

  /**
   * Called when TTS audio playback ends.
   * Clears playback state and returns to neutral.
   */
  onTtsAudioEnd() {
    if (this.playbackState) {
      this.playbackState.isPlaying = false
      this.playbackState = null

      if (this.debug) {
        console.log('[VBridgerService] Audio playback ended')
      }
    }
  }

  /**
   * Update lip-sync animation.
   * Call this every frame (e.g., 60 FPS) to update the current pose.
   *
   * @param deltaTime Time since last frame in seconds
   * @returns Current pose to apply to Live2D model
   */
  update(deltaTime: number): PhonemePose {
    // Skip update if paused
    if (this.isPaused) {
      return this.currentPose
    }

    // Calculate target pose based on current playback state
    if (this.playbackState?.isPlaying) {
      this.targetPose = this.calculateTargetPose()
    } else {
      // No audio playing - return to neutral
      this.targetPose = { ...NEUTRAL_POSE }
    }

    // Smooth current pose towards target
    this.currentPose = smoothPoseToTarget(
      this.currentPose,
      this.targetPose,
      this.playbackState?.isPlaying ? this.smoothingFactor : this.neutralReturnFactor,
      deltaTime,
      this.cheekPuffDecayFactor
    )

    // DEBUG: Log target vs current (commented out - too spammy)
    // if (this.debug && this.playbackState?.isPlaying) {
    //   console.log('[VBridgerService] Pose smoothing:', {
    //     targetMouth: this.targetPose.mouthOpenY.toFixed(3),
    //     currentMouth: this.currentPose.mouthOpenY.toFixed(3),
    //     factor: ((this.playbackState?.isPlaying ? this.smoothingFactor : this.neutralReturnFactor) * deltaTime).toFixed(3),
    //     deltaTime: deltaTime.toFixed(4)
    //   })
    // }

    return this.currentPose
  }

  /**
   * Get current pose parameters as object for Live2D.
   *
   * @returns Object mapping Live2D parameter names to values
   */
  getCurrentParameters(): Record<string, number> {
    const pose = this.currentPose

    return {
      [VBRIDGER_PARAM_NAMES.MOUTH_OPEN_Y]: pose.mouthOpenY,
      [VBRIDGER_PARAM_NAMES.JAW_OPEN]: pose.jawOpen,
      [VBRIDGER_PARAM_NAMES.MOUTH_FORM]: pose.mouthForm,
      [VBRIDGER_PARAM_NAMES.MOUTH_SHRUG]: pose.mouthShrug,
      [VBRIDGER_PARAM_NAMES.MOUTH_FUNNEL]: pose.mouthFunnel,
      [VBRIDGER_PARAM_NAMES.MOUTH_PUCKER_WIDEN]: pose.mouthPuckerWiden,
      [VBRIDGER_PARAM_NAMES.MOUTH_PRESS_LIP_OPEN]: pose.mouthPressLipOpen,
      [VBRIDGER_PARAM_NAMES.MOUTH_X]: pose.mouthX,
      [VBRIDGER_PARAM_NAMES.CHEEK_PUFF_C]: pose.cheekPuffC,
    }
  }

  /**
   * Calculate target pose based on current playback time.
   * Finds active phoneme and interpolates between phonemes.
   */
  private calculateTargetPose(): PhonemePose {
    if (!this.playbackState) {
      return { ...NEUTRAL_POSE }
    }

    const { startTime, timedPhonemes } = this.playbackState

    // Calculate current audio time (in seconds)
    const elapsedMs = performance.now() - startTime
    const currentTime = elapsedMs / 1000

    // Find active phonemes
    const { current, next } = this.findActivePhonemes(currentTime, timedPhonemes)

    if (!current) {
      // Before first phoneme or after last phoneme
      return { ...NEUTRAL_POSE }
    }

    // DEBUG: Log active phoneme (reduced frequency - only when phoneme changes)
    if (this.debug && this.lastLoggedPhoneme !== current.phoneme) {
      console.log('[VBridgerService] Active phoneme:', {
        phoneme: current.phoneme,
        time: currentTime.toFixed(3),
        startTime: current.startTime.toFixed(3),
        endTime: current.endTime.toFixed(3),
        next: next?.phoneme || 'none'
      })
      this.lastLoggedPhoneme = current.phoneme
    }

    // Get poses for current and next phoneme
    const currentPose = this.getPoseForPhoneme(current.phoneme)

    if (!next) {
      // Last phoneme - no interpolation needed
      return currentPose
    }

    const nextPose = this.getPoseForPhoneme(next.phoneme)

    // Calculate interpolation factor using EaseInOutQuad
    const phonemeDuration = next.startTime - current.startTime
    const timeInPhoneme = currentTime - current.startTime
    const rawT = timeInPhoneme / phonemeDuration
    const t = easeInOutQuad(rawT)

    // Interpolate between current and next pose
    return lerpPose(currentPose, nextPose, t)
  }

  /**
   * Find the current and next phoneme based on playback time.
   */
  private findActivePhonemes(
    currentTime: number,
    timedPhonemes: TimedPhoneme[]
  ): { current: TimedPhoneme | null; next: TimedPhoneme | null } {
    // Find the phoneme that contains currentTime
    for (let i = 0; i < timedPhonemes.length; i++) {
      const phoneme = timedPhonemes[i]

      if (currentTime >= phoneme.startTime && currentTime < phoneme.endTime) {
        // Found current phoneme
        return {
          current: phoneme,
          next: timedPhonemes[i + 1] ?? null,
        }
      }

      if (currentTime < phoneme.startTime) {
        // We're before this phoneme - it's the next one
        return {
          current: i > 0 ? timedPhonemes[i - 1] : null,
          next: phoneme,
        }
      }
    }

    // After all phonemes
    return {
      current: timedPhonemes[timedPhonemes.length - 1] ?? null,
      next: null,
    }
  }

  /**
   * Get the pose for a specific phoneme.
   * Falls back to neutral if phoneme not in map.
   */
  private getPoseForPhoneme(phoneme: string): PhonemePose {
    const pose = PHONEME_MAP[phoneme]

    if (!pose) {
      if (this.debug) {
        console.warn(`[VBridgerService] Unknown phoneme: ${phoneme}, using neutral`)
      }
      return { ...NEUTRAL_POSE }
    }

    // DEBUG: Log pose from map (commented out - too spammy)
    // if (this.debug) {
    //   console.log(`[VBridgerService] Phoneme '${phoneme}' pose:`, {
    //     mouthOpenY: pose.mouthOpenY.toFixed(3),
    //     jawOpen: pose.jawOpen.toFixed(3),
    //     mouthForm: pose.mouthForm.toFixed(3)
    //   })
    // }

    return pose
  }

  /**
   * Check if service is actively animating lip-sync.
   * Returns true when TTS audio is playing.
   */
  isActive(): boolean {
    return this.playbackState?.isPlaying ?? false
  }

  /**
   * Get current service status for debugging.
   */
  getStatus() {
    return {
      isPaused: this.isPaused,
      isPlaying: this.playbackState?.isPlaying ?? false,
      currentProvider: this.timingProvider.name,
      useAccurateProvider: this.useAccurateProvider,
      phonemeCount: this.playbackState?.timedPhonemes.length ?? 0,
      currentPose: this.currentPose,
      targetPose: this.targetPose,
    }
  }
}
