/**
 * Motion priority system for animation layering
 *
 * Prevents animation conflicts by ensuring higher-priority motions
 * can override lower-priority ones (e.g., emotions override idle).
 *
 * Reference: Live2D Cubism SDK motion priority system
 */

/**
 * Motion priority levels
 *
 * Higher values override lower values:
 * - Force (3): Emotions, reactions - always plays
 * - Normal (2): Talking, user-triggered
 * - Idle (1): Breathing, subtle movements
 * - None (0): No motion playing
 */
export enum MotionPriority {
  /** No motion playing */
  PriorityNone = 0,

  /** Idle animations (breathing, subtle movements) */
  PriorityIdle = 1,

  /** Normal animations (talking, gestures) */
  PriorityNormal = 2,

  /** Force animations (emotions, reactions) - overrides everything */
  PriorityForce = 3,
}

/**
 * Current motion state for priority management
 */
export interface MotionState {
  /** Current priority level */
  priority: MotionPriority

  /** Motion group name (e.g., 'Idle', 'Happy') */
  motionGroup: string | null

  /** Motion index within group */
  motionIndex: number

  /** Start timestamp */
  startTime: number

  /** Expected duration (if known) */
  duration?: number
}

/**
 * Request to play a motion with priority
 */
export interface MotionRequest {
  /** Motion group name */
  motionGroup: string

  /** Motion index within group (-1 for random) */
  motionIndex?: number

  /** Requested priority */
  priority: MotionPriority

  /** Override even if same priority is playing */
  forceOverride?: boolean
}

/**
 * Check if a requested motion can override the current motion
 */
export function canOverrideMotion(
  requested: MotionPriority,
  current: MotionPriority,
  currentFinished: boolean = false
): boolean {
  // Always allow if nothing is playing
  if (current === MotionPriority.PriorityNone) {
    return true
  }

  // Always allow if current motion has finished
  if (currentFinished) {
    return true
  }

  // Higher or equal priority can override
  return requested >= current
}

/**
 * Motion queue entry for deferred playback
 */
export interface QueuedMotion {
  /** The motion request */
  request: MotionRequest

  /** When this was queued */
  queuedAt: number

  /** Maximum time to wait in queue (ms) before discarding */
  maxWaitTime?: number
}

/**
 * Default maximum queue wait time (5 seconds)
 */
export const DEFAULT_QUEUE_WAIT_TIME = 5000
