/**
 * VBridger Lip-Sync - Interpolation Functions
 *
 * Ported from: Handcrafted Persona Engine
 * Source: PersonaEngine.Lib/Live2D/Behaviour/LipSync/VBridgerLipSyncService.cs
 */

import type { PhonemePose } from './types'

/**
 * Ease-in-out quadratic interpolation.
 * Provides smooth acceleration and deceleration.
 *
 * Ported from C# (line 519-524):
 * ```csharp
 * private static float EaseInOutQuad(float t) {
 *   t = Math.Clamp(t, 0.0f, 1.0f);
 *   return t < 0.5f ? 2.0f * t * t : 1.0f - (float)Math.Pow(-2.0 * t + 2.0, 2.0) / 2.0f;
 * }
 * ```
 *
 * @param t Input value (0-1)
 * @returns Eased value (0-1)
 */
export function easeInOutQuad(t: number): number {
  t = Math.max(0, Math.min(1, t)) // Clamp to [0, 1]
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
}

/**
 * Linear interpolation between two values.
 *
 * Ported from C# (line 526-531):
 * ```csharp
 * private static float Lerp(float a, float b, float t) {
 *   t = Math.Clamp(t, 0.0f, 1.0f);
 *   return a + (b - a) * t;
 * }
 * ```
 *
 * @param a Start value
 * @param b End value
 * @param t Interpolation factor (0-1, clamped)
 * @returns Interpolated value
 */
export function lerp(a: number, b: number, t: number): number {
  t = Math.max(0, Math.min(1, t)) // Clamp to [0, 1]
  return a + (b - a) * t
}

/**
 * Linear interpolation between two phoneme poses.
 * Interpolates all 9 VBridger parameters.
 *
 * Ported from C# (line 572-587):
 * ```csharp
 * public static PhonemePose Lerp(PhonemePose a, PhonemePose b, float t) {
 *   t = Math.Clamp(t, 0.0f, 1.0f);
 *   return new PhonemePose(...);
 * }
 * ```
 *
 * @param a Start pose
 * @param b End pose
 * @param t Interpolation factor (0-1, clamped)
 * @returns Interpolated pose
 */
export function lerpPose(a: PhonemePose, b: PhonemePose, t: number): PhonemePose {
  t = Math.max(0, Math.min(1, t)) // Clamp to [0, 1]

  return {
    mouthOpenY: lerp(a.mouthOpenY, b.mouthOpenY, t),
    jawOpen: lerp(a.jawOpen, b.jawOpen, t),
    mouthForm: lerp(a.mouthForm, b.mouthForm, t),
    mouthShrug: lerp(a.mouthShrug, b.mouthShrug, t),
    mouthFunnel: lerp(a.mouthFunnel, b.mouthFunnel, t),
    mouthPuckerWiden: lerp(a.mouthPuckerWiden, b.mouthPuckerWiden, t),
    mouthPressLipOpen: lerp(a.mouthPressLipOpen, b.mouthPressLipOpen, t),
    mouthX: lerp(a.mouthX, b.mouthX, t),
    cheekPuffC: lerp(a.cheekPuffC, b.cheekPuffC, t),
  }
}

/**
 * Check if two poses are approximately equal (within tolerance).
 *
 * Ported from C# (line 589-602):
 * ```csharp
 * public bool Equals(PhonemePose other) {
 *   const float tolerance = 0.001f;
 *   return Math.Abs(MouthOpenY - other.MouthOpenY) < tolerance && ...;
 * }
 * ```
 *
 * @param a First pose
 * @param b Second pose
 * @param tolerance Maximum difference (default: 0.001)
 * @returns true if poses are approximately equal
 */
export function posesEqual(a: PhonemePose, b: PhonemePose, tolerance = 0.001): boolean {
  return (
    Math.abs(a.mouthOpenY - b.mouthOpenY) < tolerance &&
    Math.abs(a.jawOpen - b.jawOpen) < tolerance &&
    Math.abs(a.mouthForm - b.mouthForm) < tolerance &&
    Math.abs(a.mouthShrug - b.mouthShrug) < tolerance &&
    Math.abs(a.mouthFunnel - b.mouthFunnel) < tolerance &&
    Math.abs(a.mouthPuckerWiden - b.mouthPuckerWiden) < tolerance &&
    Math.abs(a.mouthPressLipOpen - b.mouthPressLipOpen) < tolerance &&
    Math.abs(a.mouthX - b.mouthX) < tolerance &&
    Math.abs(a.cheekPuffC - b.cheekPuffC) < tolerance
  )
}

/**
 * Smooth a parameter value towards a target using exponential smoothing.
 *
 * Used in C# methods:
 * - SmoothParametersToTarget (line 296-318)
 * - SmoothParametersToNeutral (line 320-338)
 *
 * @param current Current value
 * @param target Target value
 * @param smoothFactor Smoothing speed (higher = faster)
 * @param deltaTime Time since last frame (seconds)
 * @returns Smoothed value
 */
export function smoothToTarget(
  current: number,
  target: number,
  smoothFactor: number,
  deltaTime: number,
): number {
  return lerp(current, target, smoothFactor * deltaTime)
}

/**
 * Smooth all parameters in a pose towards a target pose.
 *
 * Ported from C# SmoothParametersToTarget (line 296-318).
 *
 * @param current Current pose
 * @param target Target pose
 * @param smoothFactor Smoothing speed (higher = faster)
 * @param deltaTime Time since last frame (seconds)
 * @param cheekPuffDecayFactor Decay speed for cheek puff (optional, defaults to smoothFactor)
 * @param neutralThreshold Threshold for detecting near-zero values
 * @returns Smoothed pose
 */
export function smoothPoseToTarget(
  current: PhonemePose,
  target: PhonemePose,
  smoothFactor: number,
  deltaTime: number,
  cheekPuffDecayFactor?: number,
  neutralThreshold = 0.02,
): PhonemePose {
  const factor = smoothFactor * deltaTime

  // CheekPuff has special decay logic
  let newCheekPuff: number
  if (target.cheekPuffC > neutralThreshold) {
    // Target has cheek puff, smoothly approach it
    newCheekPuff = lerp(current.cheekPuffC, target.cheekPuffC, factor)
  }
  else {
    // Target has no cheek puff, decay faster
    const decayFactor = (cheekPuffDecayFactor ?? smoothFactor) * deltaTime
    newCheekPuff = lerp(current.cheekPuffC, 0, decayFactor)
  }

  return {
    mouthOpenY: lerp(current.mouthOpenY, target.mouthOpenY, factor),
    jawOpen: lerp(current.jawOpen, target.jawOpen, factor),
    mouthForm: lerp(current.mouthForm, target.mouthForm, factor),
    mouthShrug: lerp(current.mouthShrug, target.mouthShrug, factor),
    mouthFunnel: lerp(current.mouthFunnel, target.mouthFunnel, factor),
    mouthPuckerWiden: lerp(current.mouthPuckerWiden, target.mouthPuckerWiden, factor),
    mouthPressLipOpen: lerp(current.mouthPressLipOpen, target.mouthPressLipOpen, factor),
    mouthX: lerp(current.mouthX, target.mouthX, factor),
    cheekPuffC: newCheekPuff,
  }
}
