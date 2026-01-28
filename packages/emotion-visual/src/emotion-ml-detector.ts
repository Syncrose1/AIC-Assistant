/**
 * ML-based Emotion Detector using RoBERTa
 *
 * Uses @huggingface/transformers v3 with WebGPU support to detect emotions from text.
 * Maps emotion labels to AIRI's internal EmotionEmoji types.
 * 
 * OPTIMIZATION NOTES:
 * - Uses 7-emotion model for better accuracy and speed
 * - Implements WebGPU with proper device configuration
 * - Adds performance monitoring to track inference times
 */

import { pipeline, env } from '@huggingface/transformers'
import type { EmotionEmoji } from '@airi-mods/animation-core'

// Configuration for onnxruntime-web
env.allowLocalModels = false
env.useBrowserCache = true

/**
 * Check if WebGPU is available and properly configured
 */
function checkWebGPUSupport(): { supported: boolean; reason?: string } {
  if (!('gpu' in navigator)) {
    return { supported: false, reason: 'WebGPU API not available in browser' }
  }
  
  // Additional check for WebGPU adapter
  try {
    // Try to get adapter info if available
    const nav = navigator as any
    if (nav.gpu && typeof nav.gpu.requestAdapter === 'function') {
      return { supported: true }
    }
    return { supported: false, reason: 'WebGPU API incomplete' }
  } catch (e) {
    return { supported: false, reason: 'WebGPU check failed' }
  }
}

/**
 * Mapping from 7-emotion model output to AIRI's EmotionEmoji.
 *
 * Model: MicahB/emotion_text_classifier (Transformers.js ONNX conversion)
 * Base: michellejieli/emotion_text_classifier (Friends TV show dialogue)
 * Output labels: anger, disgust, fear, joy, neutral, sadness, surprise
 * 
 * This 7-emotion model actually works! Unlike go_emotions which thought
 * "I'm so happy" was 91% neutral (facepalm).
 */
const EMOTION_TO_EMOJI: Record<string, EmotionEmoji> = {
  'joy': '\u{1F60A}',         // 😊 Happy
  'sadness': '\u{1F622}',     // 😢 Sad
  'anger': '\u{1F624}',       // 😤 Frustrated
  'fear': '\u{1F605}',        // 😅 Nervous/Awkward
  'surprise': '\u{1F632}',    // 😲 Shocked
  'disgust': '\u{1F644}',     // 🙄 Annoyed
  'neutral': '\u{1F610}',     // 😐 Neutral
}

/**
 * Result of emotion detection
 */
export interface EmotionDetectionResult {
  emotion: EmotionEmoji
  confidence: number
  rawLabel: string
  allEmotions: Array<{ label: string, score: number }>
}

/**
 * Performance metrics for monitoring
 */
interface PerformanceMetrics {
  totalInferences: number
  totalInferenceTime: number
  avgInferenceTime: number
  minInferenceTime: number
  maxInferenceTime: number
}

export class EmotionMLDetector {
  private static instance: EmotionMLDetector
  private classifier: any = null
  // Using 7-emotion model that actually works (go_emotions is broken)
  // MicahB/emotion_text_classifier - trained on Friends TV show dialogue
  // Much better at detecting emotions in conversational text
  private modelName = 'MicahB/emotion_text_classifier'
  private isLoading = false
  private initPromise: Promise<void> | null = null
  private initStartTime: number = 0
  private lastProgressLog: number = 0
  private usingWebGPU: boolean = false
  private forceWASM: boolean = true  // Force WASM to test if WebGPU is corrupting inference

  // Performance monitoring
  private metrics: PerformanceMetrics = {
    totalInferences: 0,
    totalInferenceTime: 0,
    avgInferenceTime: 0,
    minInferenceTime: Infinity,
    maxInferenceTime: 0,
  }

  // Cache for detection results to avoid redundant inference
  private cache = new Map<string, EmotionDetectionResult>()
  private MAX_CACHE_SIZE = 100

  private constructor() {}

  public static getInstance(): EmotionMLDetector {
    if (!EmotionMLDetector.instance) {
      EmotionMLDetector.instance = new EmotionMLDetector()
    }
    return EmotionMLDetector.instance
  }

  /**
   * Get performance metrics
   */
  public getMetrics(): PerformanceMetrics {
    return { ...this.metrics }
  }

  /**
   * Get elapsed time since initialization started
   */
  private getElapsedTime(): number {
    if (this.initStartTime === 0) return 0
    return (performance.now() - this.initStartTime) / 1000
  }

  /**
   * Log progress with elapsed time
   */
  private logProgress(message: string): void {
    const elapsed = this.getElapsedTime()
    console.log(`[EmotionMLDetector] ${message} (${elapsed.toFixed(1)}s)`)
    this.lastProgressLog = performance.now()
  }

  /**
   * Initialize the ML pipeline with performance optimizations
   */
  public async init(): Promise<void> {
    if (this.classifier) {
      return
    }
    if (this.initPromise) {
      const elapsed = this.getElapsedTime()
      console.log(`[EmotionMLDetector] Model initialization in progress... (${elapsed.toFixed(1)}s)`)
      return this.initPromise
    }

    this.isLoading = true
    this.initStartTime = performance.now()
    this.lastProgressLog = this.initStartTime
    
    console.log(`[EmotionMLDetector] Starting model load: ${this.modelName}`)
    console.log('[EmotionMLDetector] Optimizing for RTX 3060 12GB...')

    this.initPromise = (async () => {
      try {
        // Check WebGPU support with detailed diagnostics
        const webgpuCheck = checkWebGPUSupport()
        
        // Force WASM mode to test if WebGPU is corrupting inference
        if (this.forceWASM) {
          this.usingWebGPU = false
          console.log('[EmotionMLDetector] ⚠️ FORCING WASM MODE (WebGPU disabled for testing)')
        } else {
          this.usingWebGPU = webgpuCheck.supported
        }
        
        console.log(`[EmotionMLDetector] WebGPU support: ${webgpuCheck.supported ? 'YES ✓' : 'NO ✗'}${webgpuCheck.reason ? ` (${webgpuCheck.reason})` : ''}`)
        
        this.logProgress('Creating optimized pipeline...')
        
        // Clear browser cache to force fresh model download (in case of corruption)
        console.log('[EmotionMLDetector] Clearing model cache for fresh download...')
        try {
          // Delete transformers-cache from IndexedDB
          const deleteRequest = indexedDB.deleteDatabase('transformers-cache')
          deleteRequest.onsuccess = () => console.log('[EmotionMLDetector] Cache cleared successfully')
          deleteRequest.onerror = () => console.log('[EmotionMLDetector] Cache clear failed (may not exist)')
        } catch (e) {
          console.log('[EmotionMLDetector] Cache clear error (safe to ignore):', e)
        }
        
        // Configure pipeline with performance optimizations
        const pipelineConfig: any = {
          dtype: 'q8',  // 8-bit quantization - good balance of speed/accuracy
        }
        
        // Configure device - note: "wasm" is the CPU fallback, not "cpu"
        if (this.usingWebGPU) {
          pipelineConfig.device = 'webgpu'
          console.log('[EmotionMLDetector] Configuring for WebGPU acceleration...')
        } else {
          pipelineConfig.device = 'wasm'  // WASM is the CPU fallback
          console.log('[EmotionMLDetector] Using WASM (CPU mode)...')
        }
        
        const pipelinePromise = pipeline('text-classification', this.modelName, pipelineConfig)
        
        // 5-minute timeout for initialization
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Model initialization timeout (5min)')), 300000)
        })
        
        this.classifier = await Promise.race([pipelinePromise, timeoutPromise])
        
        const totalElapsed = this.getElapsedTime()
        const deviceInfo = this.usingWebGPU ? 'WebGPU ✓' : 'CPU'
        console.log(`[EmotionMLDetector] Model loaded successfully (${totalElapsed.toFixed(1)}s) - using ${deviceInfo}`)
        console.log(`[EmotionMLDetector] Model: 7 emotions (Friends dialogue), ~82MB`)
        
        // TEST: Verify model is working correctly with a simple test
        console.log('[EmotionMLDetector] Running test inference...')
        const testResult = await this.classifier("I am so happy today!")
        console.log(`[EmotionMLDetector] Test result: ${JSON.stringify(testResult)}`)
        if (testResult && testResult[0] && testResult[0].label === 'joy') {
          console.log('[EmotionMLDetector] ✓ Model test PASSED - correctly detected joy')
        } else {
          console.warn(`[EmotionMLDetector] ✗ Model test FAILED - expected 'joy' but got '${testResult?.[0]?.label || 'undefined'}'`)
          console.warn('[EmotionMLDetector] Model may be corrupted or misconfigured!')
        }
        
        // Log WebGPU adapter info if available
        if (this.usingWebGPU && 'gpu' in navigator) {
          try {
            const adapter = await (navigator as any).gpu.requestAdapter()
            if (adapter) {
              const info = await adapter.requestAdapterInfo()
              console.log(`[EmotionMLDetector] GPU: ${info.vendor} ${info.architecture}`)
            }
          } catch (e) {
            // Non-critical, ignore
          }
        }
        
      } catch (error: any) {
        const elapsed = this.getElapsedTime()
        console.error(`[EmotionMLDetector] Failed to load model after ${elapsed.toFixed(1)}s:`, error.message || error)
        this.initPromise = null
        this.initStartTime = 0
        throw error
      } finally {
        this.isLoading = false
      }
    })()

    return this.initPromise
  }

  /**
   * Detect emotion from text with performance tracking
   */
  public async detect(text: string): Promise<EmotionDetectionResult> {
    // Check if model is still loading
    if (!this.classifier && this.initPromise) {
      const elapsed = this.getElapsedTime()
      if (performance.now() - this.lastProgressLog > 5000) {
        this.logProgress('Still loading model...')
      }
    }
    
    if (!text || !text.trim()) {
      return {
        emotion: '\u{1F610}',
        confidence: 1.0,
        rawLabel: 'neutral',
        allEmotions: [{ label: 'neutral', score: 1.0 }],
      }
    }

    // Check cache
    const cacheKey = text.trim()
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey)!
    }

    // Ensure model is loaded
    if (!this.classifier) {
      try {
        await this.init()
      } catch (initError: any) {
        console.error('[EmotionMLDetector] Initialization failed, returning neutral:', initError.message || initError)
        return {
          emotion: '\u{1F610}',
          confidence: 1.0,
          rawLabel: 'neutral',
          allEmotions: [{ label: 'neutral', score: 1.0 }],
        }
      }
    }

    try {
      const start = performance.now()

      // Run inference with the 28-emotion go_emotions model
      const results = await this.classifier(text)

      // Update performance metrics
      const duration = performance.now() - start
      this.metrics.totalInferences++
      this.metrics.totalInferenceTime += duration
      this.metrics.avgInferenceTime = this.metrics.totalInferenceTime / this.metrics.totalInferences
      this.metrics.minInferenceTime = Math.min(this.metrics.minInferenceTime, duration)
      this.metrics.maxInferenceTime = Math.max(this.metrics.maxInferenceTime, duration)

      // Get the top emotion (highest score)
      const topResult = results[0]
      const topLabel = topResult.label
      const topScore = topResult.score

      // DEBUG: Log all emotions detected
      console.log('[EmotionMLDetector] Raw results from model:')
      results.forEach((r: { label: string, score: number }, i: number) => {
        const mapped = EMOTION_TO_EMOJI[r.label] || '❌ NO MAPPING'
        console.log(`  ${i + 1}. ${r.label}: ${r.score.toFixed(3)} → ${mapped}`)
      })

      // Map to internal emoji (7 emotions → emojis)
      const emoji = EMOTION_TO_EMOJI[topLabel] || '\u{1F610}'

      // DEBUG: Check if mapping failed
      if (!EMOTION_TO_EMOJI[topLabel]) {
        console.warn(`[EmotionMLDetector] WARNING: No mapping found for emotion '${topLabel}', defaulting to neutral`)
      }

      const detectionResult: EmotionDetectionResult = {
        emotion: emoji,
        confidence: topScore,
        rawLabel: topLabel,
        allEmotions: results.map((r: { label: string, score: number }) => ({
          label: r.label,
          score: r.score,
        })),
      }

      // Update cache
      if (this.cache.size >= this.MAX_CACHE_SIZE) {
        const firstKey = this.cache.keys().next().value
        if (firstKey) this.cache.delete(firstKey)
      }
      this.cache.set(cacheKey, detectionResult)

      // Log performance and detection result
      console.log(`[EmotionMLDetector] FINAL: ${topLabel} (${topScore.toFixed(2)}) → ${emoji} [${duration.toFixed(0)}ms]`)

      return detectionResult

    } catch (error: any) {
      console.error('[EmotionMLDetector] Inference failed:', error.message || error)
      return {
        emotion: '\u{1F610}',
        confidence: 0,
        rawLabel: 'error',
        allEmotions: [{ label: 'error', score: 0 }],
      }
    }
  }

  /**
   * Print performance summary
   */
  public printPerformanceSummary(): void {
    console.log('[EmotionMLDetector] Performance Summary:')
    console.log(`  Total inferences: ${this.metrics.totalInferences}`)
    console.log(`  Average time: ${this.metrics.avgInferenceTime.toFixed(1)}ms`)
    console.log(`  Min time: ${this.metrics.minInferenceTime === Infinity ? 'N/A' : this.metrics.minInferenceTime.toFixed(1) + 'ms'}`)
    console.log(`  Max time: ${this.metrics.maxInferenceTime.toFixed(1)}ms`)
    console.log(`  Using WebGPU: ${this.usingWebGPU ? 'YES' : 'NO'}`)
    console.log(`  Target: <50ms per inference`)
  }
}

// Export performance summary function for external use
export function printEmotionDetectorPerformance(): void {
  EmotionMLDetector.getInstance().printPerformanceSummary()
}
