/**
 * AIRI Motion Manager Plugin for Emotion Visual System
 * 
 * Applies Live2D expressions and motions based on detected emotions.
 * Integrates with AIRI's motion manager for seamless animation.
 * 
 * Uses ML-based detection (RoBERTa) to analyze TTS text.
 */

import type { Ref } from 'vue'
import { watch } from 'vue'
import type { EmotionEmoji, EmotionTiming } from '@airi-mods/animation-core'
import { EmotionStore } from './emotion-store'
import { getEmotionMapping, NEUTRAL_EXPRESSION_ID, NEUTRAL_MOTION_GROUP } from './emotion-map'
import { EmotionMLDetector } from './emotion-ml-detector'

/**
 * Motion manager plugin context (from AIRI).
 * Uses duck typing to accept any context with required properties.
 */
export interface MotionManagerPluginContext {
  model: {
    setParameterValueById: (id: string, value: number) => void
    getParameterValueById: (id: string) => number
  }
  internalModel?: any // Accept any internal model type (duck typing)
  motionManager?: any // Accept any motion manager type (duck typing)
  now: number
  timeDelta: number
  handled: boolean
  markHandled: () => void
  isIdleMotion: boolean
  [key: string]: any // Allow additional properties from AIRI
}

/**
 * Motion manager plugin function type (from AIRI).
 */
export type MotionManagerPlugin = (ctx: MotionManagerPluginContext) => void

/**
 * Emotion visual plugin configuration
 */
export interface UseMotionUpdatePluginEmotionVisualOptions {
  /**
   * Reactive emotion state (synchronized with TTS).
   * Set by TTS system when emotions are detected.
   */
  currentEmotion?: Ref<EmotionEmoji | null>

  /**
   * TTS text to analyze for emotions.
   * Plugin will run ML detection on this text.
   */
  ttsText?: Ref<string>

  /**
   * Timed emotions from TTS (optional).
   * For more advanced timeline-based emotion switching.
   */
  emotionTimings?: Ref<EmotionTiming[]>

  /**
   * Enable/disable emotion expressions.
   * Default: true
   */
  enabled?: Ref<boolean>

  /**
   * Expression hold duration (seconds).
   * How long to hold an expression before reverting to neutral.
   * Default: 3.0
   */
  holdDuration?: number

  /**
   * Motion priority for emotion-driven motions.
   * Higher = overrides other motions.
   * Default: 3 (PRIORITY_FORCE from pixi-live2d-display)
   */
  motionPriority?: number

  /**
   * Apply expressions during speech.
   * If false, only apply during idle.
   * Default: true
   */
  applyDuringSpeech?: boolean
}

/**
 * Create emotion visual plugin for AIRI motion manager.
 * 
 * Applies Live2D expressions and motions based on detected emotions.
 * Runs ML detection on TTS text asynchronously.
 * 
 * @example
 * ```typescript
 * import { useMotionUpdatePluginEmotionVisual } from '@airi-mods/emotion-visual'
 * import { ref } from 'vue'
 * 
 * // Create reactive state
 * const ttsText = ref('')
 * 
 * // Create plugin
 * const emotionPlugin = useMotionUpdatePluginEmotionVisual({
 *   ttsText
 * })
 * 
 * // Register with motion manager
 * motionManager.register(emotionPlugin, 'post')
 * 
 * // When TTS starts
 * ttsText.value = "I'm so excited!"  // Triggers ML detection -> '🤩'
 * ```
 */
export function useMotionUpdatePluginEmotionVisual(
  options: UseMotionUpdatePluginEmotionVisualOptions = {}
): MotionManagerPlugin {
  const {
    currentEmotion,
    ttsText,
    emotionTimings,
    enabled = { value: true } as Ref<boolean>,
    holdDuration = 3.0,
    motionPriority = 3, // PRIORITY_FORCE
    applyDuringSpeech = true,
  } = options

  // Create emotion store for state management
  const emotionStore = new EmotionStore({ holdDuration })
  
  // Get ML detector instance
  const emotionDetector = EmotionMLDetector.getInstance()

  // Initialize model in background (don't await)
  emotionDetector.init().catch(err => {
    console.warn('[EmotionVisual] Failed to initialize ML model:', err)
  })

  // Buffer for accumulating text before detection
  let textBuffer = ''
  let debounceTimer: ReturnType<typeof setTimeout> | null = null
  const DEBOUNCE_MS = 300  // Wait 300ms after text stops changing
  const MIN_TEXT_LENGTH = 15  // Minimum characters to analyze

  /**
   * Preprocess text for emotion detection
   * Remove markdown, code blocks, and normalize text
   */
  function preprocessText(text: string): string {
    return text
      // Remove markdown formatting
      .replace(/\*\*/g, '')  // Remove **bold**
      .replace(/\*/g, '')    // Remove *italic* and *actions*
      .replace(/__/g, '')    // Remove __underline__
      .replace(/_/g, '')     // Remove _italic_
      .replace(/`/g, '')     // Remove `code`
      // Remove code blocks
      .replace(/```[\s\S]*?```/g, '')  // Remove ```code blocks```
      // Remove common markdown headers
      .replace(/#{1,6}\s+/g, '')  // Remove ### headers
      // Remove URLs
      .replace(/https?:\/\/\S+/g, '')
      // Remove excessive punctuation
      .replace(/[!?]{2,}/g, '!')
      // Normalize whitespace
      .replace(/\s+/g, ' ')
      .trim()
  }
  
  // Watch for TTS text changes to trigger ML detection
  if (ttsText) {
    console.log('[EmotionVisual] Setting up TTS text watcher with buffering')
    
    watch(ttsText, async (newText) => {
      if (!newText || !enabled.value) {
        console.log('[EmotionVisual] Skipping detection - no text or disabled')
        return
      }
      
      // Accumulate text in buffer
      textBuffer = newText
      
      // Skip if text is too short (fragments like "*", "m", etc.)
      if (textBuffer.length < MIN_TEXT_LENGTH) {
        console.log(`[EmotionVisual] Text too short (${textBuffer.length} chars), buffering...`)
        return
      }
      
      // Clear existing timer
      if (debounceTimer) {
        clearTimeout(debounceTimer)
      }
      
      // Set new timer to run detection after debounce period
      debounceTimer = setTimeout(async () => {
        const rawText = textBuffer.trim()
        const textToAnalyze = preprocessText(rawText)
        
        if (textToAnalyze.length < MIN_TEXT_LENGTH) {
          console.log(`[EmotionVisual] Buffer still too short (${textToAnalyze.length} chars), skipping`)
          return
        }
        
        console.log(`[EmotionVisual] Raw text (${rawText.length} chars): "${rawText.substring(0, 50)}..."`)
        console.log(`[EmotionVisual] Preprocessed (${textToAnalyze.length} chars): "${textToAnalyze.substring(0, 50)}..."`)
        
        try {
          const result = await emotionDetector.detect(textToAnalyze)
          console.log(`[EmotionVisual] Detection complete: ${result.rawLabel} (${result.confidence.toFixed(2)}) → ${result.emotion}`)
          
          // Update emotion store
          const currentTime = performance.now() / 1000
          emotionStore.setEmotion(result.emotion, currentTime, holdDuration)
          console.log(`[EmotionVisual] Emotion store updated: ${result.emotion} (hold: ${holdDuration}s)`)
          
          // Update reactive ref if provided
          if (currentEmotion) {
            currentEmotion.value = result.emotion
          }
          
        } catch (error) {
          console.error('[EmotionVisual] Detection failed:', error)
        }
      }, DEBOUNCE_MS)
      
    }, { immediate: true })
  } else {
    console.warn('[EmotionVisual] No ttsText provided - ML detection disabled')
  }

  // Track last applied emotion to avoid redundant updates
  let lastAppliedEmotion: EmotionEmoji | null = null
  let lastAppliedExpression: string | null = null

  /**
   * The plugin function called every frame by AIRI.
   */
  return (ctx: MotionManagerPluginContext) => {
    // Skip if disabled or already handled
    if (!enabled.value || ctx.handled) {
      return
    }

    // Skip during non-idle motions unless applyDuringSpeech is true
    if (!ctx.isIdleMotion && !applyDuringSpeech) {
      return
    }

    // Convert now to seconds (AIRI uses milliseconds or seconds depending on implementation)
    // NOTE: In Phase 2 debugging we found ctx.now is ALREADY in seconds!
    const currentTime = ctx.now

    // Update emotion store from reactive state (manual override)
    if (currentEmotion?.value && currentEmotion.value !== lastAppliedEmotion) {
      emotionStore.setEmotion(currentEmotion.value, currentTime, holdDuration)
      lastAppliedEmotion = currentEmotion.value
    }

    // Or update from timed emotions
    if (emotionTimings?.value && emotionTimings.value.length > 0) {
      emotionStore.setEmotionTimings(emotionTimings.value)
    }

    // Get current emotion state (auto-reverts to neutral if expired)
    const state = emotionStore.getState(currentTime)

    // Get Live2D mapping for current emotion
    const mapping = getEmotionMapping(state.currentEmotion)

    if (!mapping) {
      // No mapping for this emotion, skip
      return
    }

    // Apply expression if available
    if (mapping.expressionId && ctx.internalModel?.expressionManager) {
      const expressionId = mapping.expressionId

      // Only apply if different from last applied
      if (expressionId !== lastAppliedExpression) {
        if (expressionId === NEUTRAL_EXPRESSION_ID) {
          ctx.internalModel.expressionManager.resetExpression()
        } else {
          ctx.internalModel.expressionManager.setExpression(expressionId)
        }
        lastAppliedExpression = expressionId
      }
    }

    // Apply motion if available and not neutral
    if (mapping.motionGroup && !state.isNeutral && ctx.motionManager) {
      // Only trigger motion at emotion start (not every frame)
      const justStarted = currentTime - state.startTime < 0.1 // Within 100ms of start

      if (justStarted) {
        ctx.motionManager.startMotion(mapping.motionGroup, 0, motionPriority)
      }
    }

    // If neutral and speaking, use talking motion
    if (state.isNeutral && !ctx.isIdleMotion && ctx.motionManager) {
      // This would be handled by other plugins, but we can ensure it here
      // ctx.motionManager.startMotion(NEUTRAL_MOTION_GROUP, 0, 2) // PRIORITY_NORMAL
    }

    // Don't mark as handled - allow other plugins (like blink) to run
  }
}

/**
 * Create a standalone emotion controller for manual integration.
 * 
 * Use this if you need direct control over emotion state
 * without using the plugin system.
 * 
 * @example
 * ```typescript
 * const controller = useEmotionController()
 * 
 * // Set emotion
 * controller.setEmotion('😊', currentTime)
 * 
 * // In animation loop
 * const state = controller.getState(currentTime)
 * applyExpression(state.currentEmotion)
 * ```
 */
export function useEmotionController(holdDuration: number = 3.0) {
  const emotionStore = new EmotionStore({ holdDuration })

  return {
    /**
     * Set current emotion.
     */
    setEmotion: (emotion: EmotionEmoji, currentTime: number, customHoldDuration?: number) =>
      emotionStore.setEmotion(emotion, currentTime, customHoldDuration),

    /**
     * Set emotions from timing data.
     */
    setEmotionTimings: (emotions: EmotionTiming[]) =>
      emotionStore.setEmotionTimings(emotions),

    /**
     * Get current emotion state.
     */
    getState: (currentTime: number) =>
      emotionStore.getState(currentTime),

    /**
     * Get current emotion without state update.
     */
    getCurrentEmotion: () =>
      emotionStore.getCurrentEmotion(),

    /**
     * Check if neutral.
     */
    isNeutral: () =>
      emotionStore.isNeutral(),

    /**
     * Reset to neutral.
     */
    resetToNeutral: (currentTime: number) =>
      emotionStore.resetToNeutral(currentTime),

    /**
     * Extend hold duration.
     */
    extendHold: (additionalSeconds: number) =>
      emotionStore.extendHold(additionalSeconds),

    /**
     * Get Live2D mapping for current emotion.
     */
    getCurrentMapping: () =>
      getEmotionMapping(emotionStore.getCurrentEmotion()),
  }
}
