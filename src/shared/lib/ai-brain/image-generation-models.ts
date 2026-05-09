import type { BrainModelDescriptor } from '@/shared/contracts/ai-brain';

export const OPENAI_IMAGE_GENERATION_MODEL_IDS = [
  'gpt-image-2',
  'gpt-image-1.5',
  'gpt-image-1',
  'gpt-image-1-mini',
  'dall-e-3',
  'dall-e-2',
] as const;

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
