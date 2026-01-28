/**
 * Vision system types for multi-source image input
 *
 * Enables VLM (Vision Language Model) interactions with images from
 * camera, screen capture, clipboard, or file upload.
 *
 * Reference: Open-LLM-VTuber input_types.py
 */

/**
 * Source of the captured image
 */
export enum ImageSource {
  /** Webcam/camera capture */
  Camera = 'camera',

  /** Screen/display capture */
  Screen = 'screen',

  /** Clipboard paste */
  Clipboard = 'clipboard',

  /** File upload */
  Upload = 'upload',
}

/**
 * Captured image data
 */
export interface ImageData {
  /** Where the image came from */
  source: ImageSource

  /** Base64-encoded image data (without data URL prefix) */
  data: string

  /** MIME type (e.g., 'image/jpeg', 'image/png') */
  mimeType: string

  /** Original filename if from upload */
  filename?: string

  /** Capture timestamp */
  capturedAt: number

  /** Image dimensions if known */
  width?: number
  height?: number
}

/**
 * Vision input for LLM request
 */
export interface VisionInput {
  /** Images to include in the request */
  images: ImageData[]

  /** Optional prompt override for vision */
  prompt?: string
}

/**
 * OpenAI vision message format
 * Used for GPT-4 Vision, compatible APIs
 */
export interface OpenAIImageContent {
  type: 'image_url'
  image_url: {
    url: string  // data:image/jpeg;base64,... or https://...
    detail?: 'auto' | 'low' | 'high'
  }
}

/**
 * Claude/Anthropic vision message format
 */
export interface ClaudeImageContent {
  type: 'image'
  source: {
    type: 'base64'
    media_type: string  // e.g., 'image/jpeg'
    data: string        // base64 data without prefix
  }
}

/**
 * Convert ImageData to OpenAI format
 */
export function toOpenAIFormat(image: ImageData, detail: 'auto' | 'low' | 'high' = 'auto'): OpenAIImageContent {
  return {
    type: 'image_url',
    image_url: {
      url: `data:${image.mimeType};base64,${image.data}`,
      detail,
    },
  }
}

/**
 * Convert ImageData to Claude format
 */
export function toClaudeFormat(image: ImageData): ClaudeImageContent {
  return {
    type: 'image',
    source: {
      type: 'base64',
      media_type: image.mimeType,
      data: image.data,
    },
  }
}

/**
 * Screen capture options
 */
export interface ScreenCaptureOptions {
  /** Capture entire screen or specific window */
  displaySurface?: 'monitor' | 'window' | 'browser'

  /** Preferred resolution */
  preferredResolution?: {
    width: number
    height: number
  }

  /** Include cursor in capture */
  cursor?: 'always' | 'motion' | 'never'
}

/**
 * Camera capture options
 */
export interface CameraCaptureOptions {
  /** Preferred camera device ID */
  deviceId?: string

  /** Facing mode for mobile */
  facingMode?: 'user' | 'environment'

  /** Preferred resolution */
  preferredResolution?: {
    width: number
    height: number
  }
}

/**
 * Supported image MIME types
 */
export const SUPPORTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
] as const

export type SupportedImageType = typeof SUPPORTED_IMAGE_TYPES[number]

/**
 * Check if a MIME type is supported for vision
 */
export function isSupportedImageType(mimeType: string): mimeType is SupportedImageType {
  return SUPPORTED_IMAGE_TYPES.includes(mimeType as SupportedImageType)
}

/**
 * Maximum image size (bytes) before compression
 * Most APIs limit to ~20MB, we compress above 4MB
 */
export const MAX_IMAGE_SIZE_BYTES = 4 * 1024 * 1024

/**
 * Default JPEG quality for compression
 */
export const DEFAULT_COMPRESSION_QUALITY = 0.85
