import {
  type ImageStudioUpscaleMode,
  type ImageStudioUpscaleStrategy,
  type ImageStudioUpscaleSmoothingQuality,
} from '@/features/ai/image-studio/contracts/upscale';
import type { UploadedImageBinaryDto as UploadedClientUpscaleImage } from '@/shared/contracts/image-studio/image-studio/base';
import type { StudioSlotRecord } from '../types';

export type { StudioSlotRecord, UploadedClientUpscaleImage };

export type UpscaleProcessingResult = {
  outputBuffer: Buffer;
  outputMime: string;
  outputWidth: number | null;
  outputHeight: number | null;
  scale: number | null;
  strategy: ImageStudioUpscaleStrategy;
  targetWidth: number | null;
  targetHeight: number | null;
  effectiveMode: ImageStudioUpscaleMode;
  authoritativeSource: 'source_slot' | 'client_upload_fallback';
  kernel: 'lanczos3' | null;
  smoothingQuality: ImageStudioUpscaleSmoothingQuality | null;
};

export type ResolvedUpscaleRequest = {
  strategy: ImageStudioUpscaleStrategy;
  scale: number;
  targetWidth: number | null;
  targetHeight: number | null;
};
