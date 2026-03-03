import { createHash } from 'crypto';
import { NextRequest } from 'next/server';
import {
  type ImageStudioUpscaleMode,
  type ImageStudioUpscaleStrategy,
  type ImageStudioUpscaleSmoothingQuality,
  type ImageStudioUpscaleRequest,
} from '@/features/ai/image-studio/contracts/upscale';
import {
  getImageStudioSlotLinkBySourceAndRelation,
} from '@/features/ai/image-studio/server/slot-link-repository';
import {
  buildUpscaleFingerprint,
  buildUpscaleFingerprintRelationType,
} from '@/features/ai/image-studio/server/upscale-utils';
import { StudioSlotRecord, UploadedClientUpscaleImage } from './types';

export const buildClientPayloadSignature = (
  payload: ImageStudioUpscaleRequest,
  uploadedClientImage: UploadedClientUpscaleImage | null
): string | null => {
  if (uploadedClientImage?.buffer) {
    return `upload:${createHash('sha1').update(uploadedClientImage.buffer).digest('hex').slice(0, 20)}`;
  }
  if (typeof payload.dataUrl === 'string' && payload.dataUrl.trim().length > 0) {
    return `dataurl:${createHash('sha1').update(payload.dataUrl.trim()).digest('hex').slice(0, 20)}`;
  }
  return null;
};

export const readIdempotencyKey = (req: NextRequest): string | null => {
  const headerValue =
    req.headers.get('x-idempotency-key') ?? req.headers.get('x-upscale-request-id');
  const normalized = headerValue?.trim() ?? '';
  return normalized.length >= 8 ? normalized : null;
};

export const readUpscaleMetadataFromSlot = (
  slot: StudioSlotRecord
): {
  effectiveMode: ImageStudioUpscaleMode | null;
  strategy: ImageStudioUpscaleStrategy | null;
  scale: number | null;
  targetWidth: number | null;
  targetHeight: number | null;
  smoothingQuality: ImageStudioUpscaleSmoothingQuality | null;
} => {
  const metadata =
    slot.metadata && typeof slot.metadata === 'object' && !Array.isArray(slot.metadata)
      ? (slot.metadata as Record<string, unknown>)
      : null;
  const upscale =
    metadata?.['upscale'] &&
    typeof metadata['upscale'] === 'object' &&
    !Array.isArray(metadata['upscale'])
      ? (metadata['upscale'] as Record<string, unknown>)
      : null;

  const effectiveModeRaw =
    typeof upscale?.['effectiveMode'] === 'string'
      ? upscale['effectiveMode']
      : typeof upscale?.['mode'] === 'string'
        ? upscale['mode']
        : null;
  const effectiveMode =
    effectiveModeRaw === 'client_data_url' || effectiveModeRaw === 'server_sharp'
      ? effectiveModeRaw
      : null;

  const scaleCandidate =
    typeof upscale?.['scale'] === 'number' ? upscale['scale'] : Number(upscale?.['scale']);
  const scale =
    Number.isFinite(scaleCandidate) && scaleCandidate > 0 ? Number(scaleCandidate) : null;

  const strategyRaw = typeof upscale?.['strategy'] === 'string' ? upscale['strategy'] : null;
  const strategy =
    strategyRaw === 'scale' || strategyRaw === 'target_resolution' ? strategyRaw : null;

  const targetWidthCandidate =
    typeof upscale?.['targetWidth'] === 'number'
      ? upscale['targetWidth']
      : Number(upscale?.['targetWidth']);
  const targetWidth =
    Number.isFinite(targetWidthCandidate) && targetWidthCandidate > 0
      ? Math.floor(Number(targetWidthCandidate))
      : null;

  const targetHeightCandidate =
    typeof upscale?.['targetHeight'] === 'number'
      ? upscale['targetHeight']
      : Number(upscale?.['targetHeight']);
  const targetHeight =
    Number.isFinite(targetHeightCandidate) && targetHeightCandidate > 0
      ? Math.floor(Number(targetHeightCandidate))
      : null;

  const smoothingQualityRaw =
    typeof upscale?.['smoothingQuality'] === 'string' ? upscale['smoothingQuality'] : null;
  const smoothingQuality =
    smoothingQualityRaw === 'low' ||
    smoothingQualityRaw === 'medium' ||
    smoothingQualityRaw === 'high'
      ? smoothingQualityRaw
      : null;

  return {
    effectiveMode,
    strategy,
    scale,
    targetWidth,
    targetHeight,
    smoothingQuality,
  };
};

export async function resolveIdempotentUpscaleSlot(args: {
  sourceSlotId: string;
  payload: ImageStudioUpscaleRequest;
  uploadedClientImage: UploadedClientUpscaleImage | null;
}): Promise<string | null> {
  const { sourceSlotId, payload, uploadedClientImage } = args;
  const clientPayloadSignature = buildClientPayloadSignature(payload, uploadedClientImage);
  const relationType = buildUpscaleFingerprintRelationType();
  const fingerprint = buildUpscaleFingerprint({
    payload,
    clientPayloadSignature,
  });

  const existingLink = await getImageStudioSlotLinkBySourceAndRelation({
    sourceSlotId,
    relationType,
    fingerprint,
  });

  return existingLink?.targetSlotId ?? null;
}
