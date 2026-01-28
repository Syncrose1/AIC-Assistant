/**
 * VBridger Phoneme to Pose Mappings
 *
 * Ported from: Handcrafted Persona Engine
 * Source: PersonaEngine.Lib/Live2D/Behaviour/LipSync/VBridgerLipSyncService.cs
 * Function: InitializeMisakiPhonemeMap() (lines 622-702)
 *
 * Maps IPA phoneme symbols to VBridger mouth poses for realistic lip-sync animation.
 * Covers ~70+ phonemes including:
 * - Plosives (b, p, d, t, g, k)
 * - Fricatives (f, v, s, z, h, ʃ, ʒ, ð, θ)
 * - Nasals (m, n, ŋ)
 * - Liquids/Glides (l, ɹ, w, j)
 * - Vowels (i, u, ɑ, ɔ, ɛ, etc.)
 * - Diphthongs (A, I, W, Y)
 * - Regional variants (American vs British)
 */

import type { PhonemePose } from './types'
import { NEUTRAL_POSE } from './types'

/**
 * Complete phoneme-to-pose mapping dictionary.
 *
 * Each entry maps an IPA phoneme symbol (string) to a PhonemePose with 9 parameters.
 * Values are directly ported from the C# implementation.
 */
export const PHONEME_MAP: Record<string, PhonemePose> = {
  // --- Neutral ---
  'SIL': NEUTRAL_POSE, // Silence

  // --- Plosives (with cheek puff) ---
  'b': {
    mouthOpenY: 0,
    jawOpen: 0,
    mouthForm: 0,
    mouthShrug: 0,
    mouthFunnel: 0,
    mouthPuckerWiden: 0,
    mouthPressLipOpen: -1.0,
    mouthX: 0,
    cheekPuffC: 0.6,
  },
  'p': {
    mouthOpenY: 0,
    jawOpen: 0,
    mouthForm: 0,
    mouthShrug: 0,
    mouthFunnel: 0,
    mouthPuckerWiden: 0,
    mouthPressLipOpen: -1.0,
    mouthX: 0,
    cheekPuffC: 0.8,
  },
  'd': {
    mouthOpenY: 0.05,
    jawOpen: 0.05,
    mouthForm: 0,
    mouthShrug: 0,
    mouthFunnel: 0,
    mouthPuckerWiden: 0,
    mouthPressLipOpen: 0.0,
    mouthX: 0,
    cheekPuffC: 0.2,
  },
  't': {
    mouthOpenY: 0.05,
    jawOpen: 0.05,
    mouthForm: 0,
    mouthShrug: 0,
    mouthFunnel: 0,
    mouthPuckerWiden: 0,
    mouthPressLipOpen: 0.0,
    mouthX: 0,
    cheekPuffC: 0.3,
  },
  'ɡ': {
    mouthOpenY: 0.1,
    jawOpen: 0.15,
    mouthForm: 0,
    mouthShrug: 0,
    mouthFunnel: 0,
    mouthPuckerWiden: 0,
    mouthPressLipOpen: 0.2,
    mouthX: 0,
    cheekPuffC: 0.5,
  },
  'k': {
    mouthOpenY: 0.1,
    jawOpen: 0.15,
    mouthForm: 0,
    mouthShrug: 0,
    mouthFunnel: 0,
    mouthPuckerWiden: 0,
    mouthPressLipOpen: 0.2,
    mouthX: 0,
    cheekPuffC: 0.4,
  },

  // --- Fricatives ---
  'f': {
    mouthOpenY: 0.05,
    jawOpen: 0,
    mouthForm: -0.2,
    mouthShrug: 0,
    mouthFunnel: 0,
    mouthPuckerWiden: -0.1,
    mouthPressLipOpen: -0.2,
    mouthX: 0,
    cheekPuffC: 0,
  },
  'v': {
    mouthOpenY: 0.05,
    jawOpen: 0,
    mouthForm: -0.2,
    mouthShrug: 0,
    mouthFunnel: 0,
    mouthPuckerWiden: -0.1,
    mouthPressLipOpen: -0.1,
    mouthX: 0,
    cheekPuffC: 0,
  },
  's': {
    mouthOpenY: 0,
    jawOpen: 0.0,
    mouthForm: 0.3,
    mouthShrug: 0,
    mouthFunnel: 0,
    mouthPuckerWiden: -0.6,
    mouthPressLipOpen: 0.9,
    mouthX: 0,
    cheekPuffC: 0,
  },
  'z': {
    mouthOpenY: 0,
    jawOpen: 0.0,
    mouthForm: 0.2,
    mouthShrug: 0,
    mouthFunnel: 0,
    mouthPuckerWiden: -0.5,
    mouthPressLipOpen: 0.8,
    mouthX: 0,
    cheekPuffC: 0,
  },
  'h': {
    mouthOpenY: 0.2,
    jawOpen: 0.2,
    mouthForm: 0,
    mouthShrug: 0,
    mouthFunnel: 0,
    mouthPuckerWiden: 0,
    mouthPressLipOpen: 0.5,
    mouthX: 0,
    cheekPuffC: 0,
  },
  'ʃ': { // 'sh' sound
    mouthOpenY: 0.1,
    jawOpen: 0,
    mouthForm: 0,
    mouthShrug: 0,
    mouthFunnel: 0.9,
    mouthPuckerWiden: 0.6,
    mouthPressLipOpen: 0.2,
    mouthX: 0,
    cheekPuffC: 0,
  },
  'ʒ': { // 'zh' sound (measure)
    mouthOpenY: 0.1,
    jawOpen: 0,
    mouthForm: 0,
    mouthShrug: 0,
    mouthFunnel: 0.8,
    mouthPuckerWiden: 0.5,
    mouthPressLipOpen: 0.2,
    mouthX: 0,
    cheekPuffC: 0,
  },
  'ð': { // soft 'th' (this)
    mouthOpenY: 0.05,
    jawOpen: 0,
    mouthForm: 0,
    mouthShrug: 0,
    mouthFunnel: 0,
    mouthPuckerWiden: -0.2,
    mouthPressLipOpen: 0.1,
    mouthX: 0,
    cheekPuffC: 0,
  },
  'θ': { // hard 'th' (think)
    mouthOpenY: 0.05,
    jawOpen: 0,
    mouthForm: 0,
    mouthShrug: 0,
    mouthFunnel: 0,
    mouthPuckerWiden: -0.3,
    mouthPressLipOpen: 0.2,
    mouthX: 0,
    cheekPuffC: 0,
  },

  // --- Nasals ---
  'm': {
    mouthOpenY: 0,
    jawOpen: 0,
    mouthForm: 0,
    mouthShrug: 0,
    mouthFunnel: 0,
    mouthPuckerWiden: 0,
    mouthPressLipOpen: -1.0,
    mouthX: 0,
    cheekPuffC: 0,
  },
  'n': {
    mouthOpenY: 0.05,
    jawOpen: 0.05,
    mouthForm: 0,
    mouthShrug: 0,
    mouthFunnel: 0,
    mouthPuckerWiden: 0,
    mouthPressLipOpen: 0.0,
    mouthX: 0,
    cheekPuffC: 0,
  },
  'ŋ': { // 'ng' sound (sing)
    mouthOpenY: 0.15,
    jawOpen: 0.2,
    mouthForm: 0,
    mouthShrug: 0,
    mouthFunnel: 0,
    mouthPuckerWiden: 0,
    mouthPressLipOpen: 0.4,
    mouthX: 0,
    cheekPuffC: 0,
  },

  // --- Liquids/Glides ---
  'l': {
    mouthOpenY: 0.2,
    jawOpen: 0.2,
    mouthForm: 0,
    mouthShrug: 0,
    mouthFunnel: 0,
    mouthPuckerWiden: -0.3,
    mouthPressLipOpen: 0.6,
    mouthX: 0,
    cheekPuffC: 0,
  },
  'ɹ': { // 'r' sound (red)
    mouthOpenY: 0.15,
    jawOpen: 0.15,
    mouthForm: 0,
    mouthShrug: 0,
    mouthFunnel: 0.4,
    mouthPuckerWiden: 0.2,
    mouthPressLipOpen: 0.3,
    mouthX: 0,
    cheekPuffC: 0,
  },
  'w': {
    mouthOpenY: 0.1,
    jawOpen: 0.1,
    mouthForm: 0,
    mouthShrug: 0,
    mouthFunnel: 1.0,
    mouthPuckerWiden: 0.9,
    mouthPressLipOpen: -0.3,
    mouthX: 0,
    cheekPuffC: 0,
  },
  'j': { // 'y' sound (yes)
    mouthOpenY: 0.1,
    jawOpen: 0.1,
    mouthForm: 0.6,
    mouthShrug: 0.3,
    mouthFunnel: 0,
    mouthPuckerWiden: -0.8,
    mouthPressLipOpen: 0.8,
    mouthX: 0,
    cheekPuffC: 0,
  },

  // --- Consonant Clusters ---
  'ʤ': { // 'j'/'dg' sound (judge)
    mouthOpenY: 0.1,
    jawOpen: 0,
    mouthForm: 0,
    mouthShrug: 0,
    mouthFunnel: 0.8,
    mouthPuckerWiden: 0.5,
    mouthPressLipOpen: 0.2,
    mouthX: 0,
    cheekPuffC: 0.3,
  },
  'ʧ': { // 'ch' sound (church)
    mouthOpenY: 0.1,
    jawOpen: 0,
    mouthForm: 0,
    mouthShrug: 0,
    mouthFunnel: 0.9,
    mouthPuckerWiden: 0.6,
    mouthPressLipOpen: 0.2,
    mouthX: 0,
    cheekPuffC: 0.4,
  },

  // --- Vowels ---
  'ə': { // Schwa (about)
    mouthOpenY: 0.3,
    jawOpen: 0.3,
    mouthForm: 0,
    mouthShrug: 0,
    mouthFunnel: 0,
    mouthPuckerWiden: 0,
    mouthPressLipOpen: 0.5,
    mouthX: 0,
    cheekPuffC: 0,
  },
  'i': { // 'ee' (see)
    mouthOpenY: 0.1,
    jawOpen: 0.1,
    mouthForm: 0.7,
    mouthShrug: 0.4,
    mouthFunnel: 0,
    mouthPuckerWiden: -0.9,
    mouthPressLipOpen: 0.9,
    mouthX: 0,
    cheekPuffC: 0,
  },
  'u': { // 'oo' (food)
    mouthOpenY: 0.15,
    jawOpen: 0.15,
    mouthForm: 0,
    mouthShrug: 0,
    mouthFunnel: 1.0,
    mouthPuckerWiden: 1.0,
    mouthPressLipOpen: -0.2,
    mouthX: 0,
    cheekPuffC: 0,
  },
  'ɑ': { // 'aa' (father)
    mouthOpenY: 0.9,
    jawOpen: 1.0,
    mouthForm: 0,
    mouthShrug: 0,
    mouthFunnel: 0,
    mouthPuckerWiden: 0,
    mouthPressLipOpen: 0.8,
    mouthX: 0,
    cheekPuffC: 0,
  },
  'ɔ': { // 'aw' (thought)
    mouthOpenY: 0.6,
    jawOpen: 0.7,
    mouthForm: 0,
    mouthShrug: 0,
    mouthFunnel: 0.5,
    mouthPuckerWiden: 0.3,
    mouthPressLipOpen: 0.7,
    mouthX: 0,
    cheekPuffC: 0,
  },
  'ɛ': { // 'eh' (bed)
    mouthOpenY: 0.5,
    jawOpen: 0.5,
    mouthForm: 0,
    mouthShrug: 0,
    mouthFunnel: 0,
    mouthPuckerWiden: -0.5,
    mouthPressLipOpen: 0.7,
    mouthX: 0,
    cheekPuffC: 0,
  },
  'ɜ': { // 'er' (bird)
    mouthOpenY: 0.4,
    jawOpen: 0.4,
    mouthForm: 0,
    mouthShrug: 0,
    mouthFunnel: 0,
    mouthPuckerWiden: 0,
    mouthPressLipOpen: 0.6,
    mouthX: 0,
    cheekPuffC: 0,
  },
  'ɪ': { // 'ih' (bit)
    mouthOpenY: 0.2,
    jawOpen: 0.2,
    mouthForm: 0.2,
    mouthShrug: 0,
    mouthFunnel: 0,
    mouthPuckerWiden: -0.6,
    mouthPressLipOpen: 0.8,
    mouthX: 0,
    cheekPuffC: 0,
  },
  'ʊ': { // 'uu' (book)
    mouthOpenY: 0.2,
    jawOpen: 0.2,
    mouthForm: 0,
    mouthShrug: 0,
    mouthFunnel: 0.8,
    mouthPuckerWiden: 0.7,
    mouthPressLipOpen: 0.1,
    mouthX: 0,
    cheekPuffC: 0,
  },
  'ʌ': { // 'uh' (cut)
    mouthOpenY: 0.6,
    jawOpen: 0.6,
    mouthForm: 0,
    mouthShrug: 0,
    mouthFunnel: 0,
    mouthPuckerWiden: 0,
    mouthPressLipOpen: 0.7,
    mouthX: 0,
    cheekPuffC: 0,
  },

  // --- Diphthongs ---
  'A': { // 'ay' (day)
    mouthOpenY: 0.3,
    jawOpen: 0.3,
    mouthForm: 0.4,
    mouthShrug: 0,
    mouthFunnel: 0,
    mouthPuckerWiden: -0.7,
    mouthPressLipOpen: 0.8,
    mouthX: 0,
    cheekPuffC: 0,
  },
  'I': { // 'eye' (buy)
    mouthOpenY: 0.4,
    jawOpen: 0.4,
    mouthForm: 0.3,
    mouthShrug: 0,
    mouthFunnel: 0,
    mouthPuckerWiden: -0.6,
    mouthPressLipOpen: 0.8,
    mouthX: 0,
    cheekPuffC: 0,
  },
  'W': { // 'ow' (cow)
    mouthOpenY: 0.3,
    jawOpen: 0.3,
    mouthForm: 0,
    mouthShrug: 0,
    mouthFunnel: 0.9,
    mouthPuckerWiden: 0.8,
    mouthPressLipOpen: 0.0,
    mouthX: 0,
    cheekPuffC: 0,
  },
  'Y': { // 'oy' (boy)
    mouthOpenY: 0.3,
    jawOpen: 0.3,
    mouthForm: 0.2,
    mouthShrug: 0,
    mouthFunnel: 0,
    mouthPuckerWiden: -0.5,
    mouthPressLipOpen: 0.8,
    mouthX: 0,
    cheekPuffC: 0,
  },

  // --- IPA Diphthong Aliases ---
  // These are the actual IPA notations that map to single-letter shortcuts above
  'oʊ': { // IPA for 'oh' sound (same as 'O')
    mouthOpenY: 0.3,
    jawOpen: 0.3,
    mouthForm: 0,
    mouthShrug: 0,
    mouthFunnel: 0.8,
    mouthPuckerWiden: 0.6,
    mouthPressLipOpen: 0.1,
    mouthX: 0,
    cheekPuffC: 0,
  },
  'aɪ': { // IPA for 'eye' sound (same as 'I')
    mouthOpenY: 0.4,
    jawOpen: 0.4,
    mouthForm: 0.3,
    mouthShrug: 0,
    mouthFunnel: 0,
    mouthPuckerWiden: -0.6,
    mouthPressLipOpen: 0.8,
    mouthX: 0,
    cheekPuffC: 0,
  },
  'aʊ': { // IPA for 'ow' sound (same as 'W')
    mouthOpenY: 0.3,
    jawOpen: 0.3,
    mouthForm: 0,
    mouthShrug: 0,
    mouthFunnel: 0.9,
    mouthPuckerWiden: 0.8,
    mouthPressLipOpen: 0.0,
    mouthX: 0,
    cheekPuffC: 0,
  },
  'eɪ': { // IPA for 'ay' sound (same as 'A')
    mouthOpenY: 0.3,
    jawOpen: 0.3,
    mouthForm: 0.4,
    mouthShrug: 0,
    mouthFunnel: 0,
    mouthPuckerWiden: -0.7,
    mouthPressLipOpen: 0.8,
    mouthX: 0,
    cheekPuffC: 0,
  },
  'ɔɪ': { // IPA for 'oy' sound (same as 'Y')
    mouthOpenY: 0.3,
    jawOpen: 0.3,
    mouthForm: 0.2,
    mouthShrug: 0,
    mouthFunnel: 0,
    mouthPuckerWiden: -0.5,
    mouthPressLipOpen: 0.8,
    mouthX: 0,
    cheekPuffC: 0,
  },

  // --- Custom Vowel ---
  'ᵊ': { // Small schwa
    mouthOpenY: 0.1,
    jawOpen: 0.1,
    mouthForm: 0,
    mouthShrug: 0,
    mouthFunnel: 0,
    mouthPuckerWiden: 0,
    mouthPressLipOpen: 0.2,
    mouthX: 0,
    cheekPuffC: 0,
  },

  // --- American-only phonemes ---
  'æ': { // 'ae' (cat)
    mouthOpenY: 0.7,
    jawOpen: 0.7,
    mouthForm: 0.3,
    mouthShrug: 0,
    mouthFunnel: 0,
    mouthPuckerWiden: -0.8,
    mouthPressLipOpen: 0.9,
    mouthX: 0,
    cheekPuffC: 0,
  },
  'O': { // US 'oh' (go)
    mouthOpenY: 0.3,
    jawOpen: 0.3,
    mouthForm: 0,
    mouthShrug: 0,
    mouthFunnel: 0.8,
    mouthPuckerWiden: 0.6,
    mouthPressLipOpen: 0.1,
    mouthX: 0,
    cheekPuffC: 0,
  },
  'ᵻ': { // Between ə/ɪ
    mouthOpenY: 0.15,
    jawOpen: 0.15,
    mouthForm: 0,
    mouthShrug: 0,
    mouthFunnel: 0,
    mouthPuckerWiden: -0.2,
    mouthPressLipOpen: 0.6,
    mouthX: 0,
    cheekPuffC: 0,
  },
  'ɾ': { // Flap 't' (butter)
    mouthOpenY: 0.05,
    jawOpen: 0.05,
    mouthForm: 0,
    mouthShrug: 0,
    mouthFunnel: 0,
    mouthPuckerWiden: 0,
    mouthPressLipOpen: 0.3,
    mouthX: 0,
    cheekPuffC: 0,
  },

  // --- British-only phonemes ---
  'a': { // UK 'ash' (bath)
    mouthOpenY: 0.7,
    jawOpen: 0.7,
    mouthForm: 0,
    mouthShrug: 0,
    mouthFunnel: 0,
    mouthPuckerWiden: -0.4,
    mouthPressLipOpen: 0.8,
    mouthX: 0,
    cheekPuffC: 0,
  },
  'Q': { // UK 'oh' (go)
    mouthOpenY: 0.3,
    jawOpen: 0.3,
    mouthForm: 0,
    mouthShrug: 0,
    mouthFunnel: 0.7,
    mouthPuckerWiden: 0.5,
    mouthPressLipOpen: 0.1,
    mouthX: 0,
    cheekPuffC: 0,
  },
  'ɒ': { // 'on' (hot)
    mouthOpenY: 0.8,
    jawOpen: 0.9,
    mouthForm: 0,
    mouthShrug: 0,
    mouthFunnel: 0.2,
    mouthPuckerWiden: 0.1,
    mouthPressLipOpen: 0.8,
    mouthX: 0,
    cheekPuffC: 0,
  },
}

/**
 * Get the pose for a given phoneme symbol.
 * Returns NEUTRAL_POSE if phoneme is not found.
 *
 * @param phoneme IPA phoneme symbol
 * @returns PhonemePose for the phoneme
 */
export function getPoseForPhoneme(phoneme: string): PhonemePose {
  return PHONEME_MAP[phoneme] ?? NEUTRAL_POSE
}

/**
 * Check if a phoneme has a defined mapping.
 *
 * @param phoneme IPA phoneme symbol
 * @returns true if the phoneme has a mapping
 */
export function hasPhonemeMapping(phoneme: string): boolean {
  return phoneme in PHONEME_MAP
}

/**
 * Get all supported phoneme symbols.
 *
 * @returns Array of IPA phoneme symbols
 */
export function getSupportedPhonemes(): string[] {
  return Object.keys(PHONEME_MAP)
}
