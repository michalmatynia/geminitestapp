/**
 * AI Brain Image Generation Models
 * 
 * Definitions and descriptors for image generation models supported by AI Brain.
 * This file centralizes known image generation model IDs and their capabilities.
 */

import type { BrainModelDescriptor } from '@/shared/contracts/ai-brain';

/**
 * List of known OpenAI image generation model IDs.
 */
export const OPENAI_IMAGE_GENERATION_MODEL_IDS = [
  'gpt-image-2',
  'gpt-image-1.5',
  'gpt-image-1',
  'gpt-image-1-mini',
  'dall-e-3',
  'dall-e-2',
] as const;

/**
 * A record mapping OpenAI image generation model IDs to their descriptors.
 * These descriptors define the family, modality, and capabilities of each model.
 */
export const OPENAI_IMAGE_GENERATION_MODEL_DESCRIPTORS: Record<string, BrainModelDescriptor> =
  Object.fromEntries(
    OPENAI_IMAGE_GENERATION_MODEL_IDS.map((id) => [
      id,
      {
        id,
        family: 'image_generation',
        modality: 'image',
        vendor: 'openai',
        supportsStreaming: false,
        supportsJsonMode: false,
      },
    ])
  );
