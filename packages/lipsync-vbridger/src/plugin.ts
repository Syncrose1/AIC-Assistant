/**
 * AIRI Motion Manager Plugin for VBridger Lip-Sync
 *
 * Integrates VBridgerService with AIRI's Live2D motion system.
 */

import type { Ref } from 'vue'
import { watch } from 'vue'
import type { PhonemeTimingProvider } from '@airi-mods/phoneme-timing'
import { VBridgerService, type VBridgerServiceOptions } from './vbridger-service'
import { VBRIDGER_PARAM_NAMES } from './types'

/**
 * Motion manager plugin context (from AIRI).
 * Simplified type definition matching AIRI's structure.
 */
export interface MotionManagerPluginContext {
  model: {
    setParameterValueById: (id: string, value: number) => void
    getParameterValueById: (id: string) => number
  }
  motionManager: {
    stopAllMotions: () => void
    [key: string]: any
  }
  now: number
  timeDelta: number
  handled: boolean
  markHandled: () => void
  isIdleMotion: boolean
}

/**
 * Motion manager plugin function type (from AIRI).
 */
export type MotionManagerPlugin = (ctx: MotionManagerPluginContext) => void

/**
 * VBridger plugin configuration options.
 */
export interface UseMotionUpdatePluginLipSyncVBridgerOptions {
  /**
   * Phoneme timing provider (e.g., EspeakProvider).
   */
  timingProvider: PhonemeTimingProvider

  /**
   * Optional fallback provider for tier system.
   */
  fallbackProvider?: PhonemeTimingProvider

  /**
   * VBridgerService configuration.
   */
  serviceOptions?: VBridgerServiceOptions

  /**
   * TTS text reference (reactive).
   * Updated when new TTS audio is about to play.
   */
  ttsText?: Ref<string>

  /**
   * TTS audio duration reference (reactive).
   * Updated when new TTS audio is about to play.
   */
  ttsAudioDuration?: Ref<number>

  /**
   * TTS playing state reference (reactive).
   * Set to true when audio starts, false when it ends.
   */
  ttsIsPlaying?: Ref<boolean>

  /**
   * Enable VBridger lip-sync.
   * Default: true
   */
  enabled?: Ref<boolean>
}

/**
 * Create VBridger lip-sync plugin for AIRI motion manager.
 *
 * @example
 * ```typescript
 * import { useMotionUpdatePluginLipSyncVBridger } from '@airi-mods/lipsync-vbridger'
 * import { EspeakProvider } from '@airi-mods/phoneme-timing'
 * import { ref } from 'vue'
 *
 * // Create timing provider
 * const timingProvider = new EspeakProvider()
 *
 * // Create reactive refs for TTS state
 * const ttsText = ref('')
 * const ttsAudioDuration = ref(0)
 * const ttsIsPlaying = ref(false)
 *
 * // Create plugin
 * const lipSyncPlugin = useMotionUpdatePluginLipSyncVBridger({
 *   timingProvider,
 *   ttsText,
 *   ttsAudioDuration,
 *   ttsIsPlaying
 * })
 *
 * // Register with motion manager
 * motionManager.register(lipSyncPlugin, 'post')
 *
 * // When TTS is about to play
 * ttsText.value = "Hello world"
 * ttsAudioDuration.value = 1.2
 * ttsIsPlaying.value = true
 * // ... play audio ...
 * // When audio ends
 * ttsIsPlaying.value = false
 * ```
 */
export function useMotionUpdatePluginLipSyncVBridger(
  options: UseMotionUpdatePluginLipSyncVBridgerOptions
): MotionManagerPlugin {
  const {
    timingProvider,
    fallbackProvider,
    serviceOptions = {},
    ttsText,
    ttsAudioDuration,
    ttsIsPlaying,
    enabled = { value: true } as Ref<boolean>,
  } = options

  // DEBUG: Log what refs we received
  console.log('[VBridger Plugin] Created with refs:', {
    ttsTextType: typeof ttsText,
    ttsIsPlayingType: typeof ttsIsPlaying,
    ttsTextIsRef: ttsText && 'value' in ttsText,
    ttsIsPlayingIsRef: ttsIsPlaying && 'value' in ttsIsPlaying,
    currentTtsIsPlaying: ttsIsPlaying?.value,
  })

  // DEBUG: Watch ttsIsPlaying for changes
  if (ttsIsPlaying) {
    watch(ttsIsPlaying, (newVal, oldVal) => {
      console.log('[VBridger Plugin] ttsIsPlaying changed:', { oldVal, newVal })
    })
  }

  // Create VBridger service
  const vbridger = new VBridgerService(timingProvider, serviceOptions)

  // Set fallback provider if provided
  if (fallbackProvider) {
    vbridger.setFallbackProvider(fallbackProvider)
  }

  // Track TTS state
  let lastTtsText = ''
  let lastTtsAudioDuration = 0
  let lastTtsIsPlaying = false
  let audioReady = false

  // Last update timestamp for delta time calculation
  let lastUpdateTime = 0

  /**
   * The plugin function called every frame by AIRI.
   */
  return (ctx: MotionManagerPluginContext) => {
    // CRITICAL: Calculate delta time FIRST, before any early returns
    // Otherwise lastUpdateTime becomes stale and deltaTime will be wrong
    // NOTE: ctx.now is ALREADY in seconds, not milliseconds!
    const deltaTime = lastUpdateTime > 0 ? (ctx.now - lastUpdateTime) : 0.016 // Use 16ms as fallback (60 FPS)

    // DEBUG: Log deltaTime calculation (reduced frequency)
    // if (Math.floor(ctx.now) % 5000 < 50) {
    //   console.log('[VBridger Plugin] DeltaTime calc:', {
    //     lastUpdateTime,
    //     ctxNow: ctx.now,
    //     diff: (ctx.now - lastUpdateTime).toFixed(4),
    //     deltaTime: deltaTime.toFixed(4)
    //   })
    // }

    lastUpdateTime = ctx.now

    // Skip if disabled or already handled
    if (!enabled.value || ctx.handled) {
      return
    }

    // Check if VBridger should be active
    const isActive = vbridger.isActive()

    // DEBUG: Log every frame to see what's happening
    if (Math.floor(ctx.now) % 100 === 0) {
      console.log('[VBridger Plugin] Frame check:', {
        isActive,
        isIdleMotion: ctx.isIdleMotion,
        ttsIsPlaying: ttsIsPlaying?.value,
        playbackStateIsPlaying: vbridger.getStatus().isPlaying
      })
    }

    // Only run during idle motion UNLESS we're actively lip-syncing
    // (lip-sync should override even non-idle animations like "Think")
    if (!isActive && !ctx.isIdleMotion) {
      return
    }

    // Watch for TTS state changes
    const currentTtsText = ttsText?.value ?? ''
    const currentTtsAudioDuration = ttsAudioDuration?.value ?? 0
    const currentTtsIsPlaying = ttsIsPlaying?.value ?? false

    // Debug: Log state periodically
    if (Math.floor(ctx.now / 1000) % 2 === 0 && Math.floor(ctx.now) % 100 < 20) {
      console.log('[VBridger Debug] State:', {
        isPlaying: currentTtsIsPlaying,
        text: currentTtsText.substring(0, 30),
        duration: currentTtsAudioDuration,
        audioReady,
        isActive,
        isIdleMotion: ctx.isIdleMotion
      })
    }

    // Detect new TTS audio
    if (
      currentTtsText !== lastTtsText
      || currentTtsAudioDuration !== lastTtsAudioDuration
    ) {
      if (currentTtsText && currentTtsAudioDuration > 0) {
        // New TTS audio ready - generate phoneme timing
        vbridger.onTtsAudioReady(currentTtsText, currentTtsAudioDuration)
          .then(() => {
            audioReady = true
          })
          .catch((error) => {
            console.error('[VBridger Plugin] Failed to generate phoneme timing:', error)
          })

        lastTtsText = currentTtsText
        lastTtsAudioDuration = currentTtsAudioDuration
      }
    }

    // Detect TTS playback start
    if (currentTtsIsPlaying && !lastTtsIsPlaying && audioReady) {
      console.log('[VBridger] ========== TTS PLAYBACK STARTED ==========')
      vbridger.onTtsAudioStart()
    }

    // Detect TTS playback end
    if (!currentTtsIsPlaying && lastTtsIsPlaying) {
      console.log('[VBridger] ========== TTS PLAYBACK ENDED ==========')
      vbridger.onTtsAudioEnd()
      audioReady = false
    }

    lastTtsIsPlaying = currentTtsIsPlaying

    // Update VBridger service state every frame (even when inactive)
    const pose = vbridger.update(deltaTime)

    // ONLY override mouth parameters when actively lip-syncing
    if (isActive) {
      console.log('[VBridger] ========== ACTIVE - OVERRIDING MOUTH ==========')

      // STRATEGY: Run in 'post' phase AFTER motion has played
      // Motion animates body/head/eyes/mouth
      // We forcefully override ONLY the 9 mouth parameters
      // This repeats every frame: motion sets mouth → we override mouth
      // Result: Body/head/eyes from motion, mouth from VBridger

      console.log('[VBridger] Overriding mouth with lip-sync:', {
        mouthOpenY: pose.mouthOpenY.toFixed(3),
        jawOpen: pose.jawOpen.toFixed(3),
        mouthForm: pose.mouthForm.toFixed(3),
        deltaTime: deltaTime.toFixed(4)
      })

      // FORCEFULLY override mouth parameters (motion already set them, we replace)
      ctx.model.setParameterValueById(VBRIDGER_PARAM_NAMES.MOUTH_OPEN_Y, pose.mouthOpenY)
      ctx.model.setParameterValueById(VBRIDGER_PARAM_NAMES.JAW_OPEN, pose.jawOpen)
      ctx.model.setParameterValueById(VBRIDGER_PARAM_NAMES.MOUTH_FORM, pose.mouthForm)
      ctx.model.setParameterValueById(VBRIDGER_PARAM_NAMES.MOUTH_SHRUG, pose.mouthShrug)
      ctx.model.setParameterValueById(VBRIDGER_PARAM_NAMES.MOUTH_FUNNEL, pose.mouthFunnel)
      ctx.model.setParameterValueById(VBRIDGER_PARAM_NAMES.MOUTH_PUCKER_WIDEN, pose.mouthPuckerWiden)
      ctx.model.setParameterValueById(VBRIDGER_PARAM_NAMES.MOUTH_PRESS_LIP_OPEN, pose.mouthPressLipOpen)
      ctx.model.setParameterValueById(VBRIDGER_PARAM_NAMES.MOUTH_X, pose.mouthX)
      ctx.model.setParameterValueById(VBRIDGER_PARAM_NAMES.CHEEK_PUFF_C, pose.cheekPuffC)

      // DEBUG: Log all 9 parameters being applied (reduced frequency)
      if (Math.floor(ctx.now * 10) % 10 === 0) {
        console.log('[VBridger] Full pose applied:', {
          mouthOpenY: pose.mouthOpenY.toFixed(3),
          jawOpen: pose.jawOpen.toFixed(3),
          mouthForm: pose.mouthForm.toFixed(3),
          mouthShrug: pose.mouthShrug.toFixed(3),
          mouthFunnel: pose.mouthFunnel.toFixed(3),
          mouthPuckerWiden: pose.mouthPuckerWiden.toFixed(3),
          mouthPressLipOpen: pose.mouthPressLipOpen.toFixed(3),
          mouthX: pose.mouthX.toFixed(3),
          cheekPuffC: pose.cheekPuffC.toFixed(3)
        })
      }

      // DON'T call markHandled() - let motion, emotions, eye blinks continue
      // We just override mouth parameters every frame in 'post' phase
    }
  }
}

/**
 * Create a standalone VBridger controller for manual integration.
 *
 * Use this if you need more control over the VBridger lifecycle
 * or want to integrate outside of the plugin system.
 *
 * @example
 * ```typescript
 * const controller = useVBridgerController({
 *   timingProvider: new EspeakProvider()
 * })
 *
 * // When TTS audio is ready
 * await controller.onTtsAudioReady("Hello world", 1.2)
 * controller.start()
 *
 * // In animation loop
 * function animate() {
 *   const pose = controller.update(deltaTime)
 *   applyToLive2DModel(pose)
 * }
 *
 * // When audio ends
 * controller.stop()
 * ```
 */
export function useVBridgerController(
  options: Pick<UseMotionUpdatePluginLipSyncVBridgerOptions, 'timingProvider' | 'fallbackProvider' | 'serviceOptions'>
) {
  const { timingProvider, fallbackProvider, serviceOptions } = options

  const vbridger = new VBridgerService(timingProvider, serviceOptions)

  if (fallbackProvider) {
    vbridger.setFallbackProvider(fallbackProvider)
  }

  return {
    /**
     * Prepare phoneme timing for new TTS audio.
     */
    onTtsAudioReady: (text: string, audioDuration: number) =>
      vbridger.onTtsAudioReady(text, audioDuration),

    /**
     * Start TTS audio playback.
     */
    start: () => vbridger.onTtsAudioStart(),

    /**
     * Stop TTS audio playback.
     */
    stop: () => vbridger.onTtsAudioEnd(),

    /**
     * Update lip-sync animation (call every frame).
     */
    update: (deltaTime: number) => vbridger.update(deltaTime),

    /**
     * Get current pose as Live2D parameter map.
     */
    getCurrentParameters: () => vbridger.getCurrentParameters(),

    /**
     * Pause lip-sync updates (visibility optimization).
     */
    pause: () => vbridger.pause(),

    /**
     * Resume lip-sync updates.
     */
    resume: () => vbridger.resume(),

    /**
     * Switch timing provider (tier system).
     */
    switchProvider: (provider: PhonemeTimingProvider) =>
      vbridger.switchProvider(provider),

    /**
     * Use accurate timing (BFA, Tier 1).
     */
    useAccurateTiming: () => vbridger.useAccurateTiming(),

    /**
     * Use fallback estimation (eSpeak, Tier 2).
     */
    useFallbackEstimation: () => vbridger.useFallbackEstimation(),

    /**
     * Get service status for debugging.
     */
    getStatus: () => vbridger.getStatus(),

    /**
     * Access underlying VBridgerService.
     */
    service: vbridger,
  }
}
