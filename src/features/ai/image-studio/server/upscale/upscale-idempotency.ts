import { createHash } from 'crypto';

import { NextRequest } from 'next/server';

import {
  type ImageStudioUpscaleMode,
  type ImageStudioUpscaleStrategy,
  type ImageStudioUpscaleSmoothingQuality,
  type ImageStudioUpscaleRequest,
} from '@/features/ai/image-studio/contracts/upscale';
import { getImageStudioSlotLinkBySourceAndRelation } from '@/features/ai/image-studio/server';
import {
  buildUpscaleFingerprint,
  buildUpscaleFingerprintRelationType,
  resolveUpscaleStrategyFromRequest,
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
  projectId: string;
  sourceSlotId: string;
  sourceSignature?: string | null;
  payload: ImageStudioUpscaleRequest;
  uploadedClientImage: UploadedClientUpscaleImage | null;
}): Promise<string | null> {
  const { projectId, sourceSlotId, sourceSignature, payload, uploadedClientImage } = args;
  const clientPayloadSignature = buildClientPayloadSignature(payload, uploadedClientImage);
  const strategy = resolveUpscaleStrategyFromRequest({
    strategy: payload.strategy,
    targetWidth: payload.targetWidth,
    targetHeight: payload.targetHeight,
  });
  const normalizedSourceSignature =
    typeof sourceSignature === 'string' && sourceSignature.trim().length > 0
      ? sourceSignature.trim()
      : `${sourceSlotId}|${projectId}`;
  const fingerprint = buildUpscaleFingerprint({
    sourceSignature: normalizedSourceSignature,
    mode: payload.mode,
    strategy,
    scale: strategy === 'scale' ? (typeof payload.scale === 'number' ? payload.scale : 2) : null,
    targetWidth: strategy === 'target_resolution' ? (payload.targetWidth ?? null) : null,
    targetHeight: strategy === 'target_resolution' ? (payload.targetHeight ?? null) : null,
    smoothingQuality:
      payload.mode === 'client_data_url' ? (payload.smoothingQuality ?? null) : null,
    clientPayloadSignature: payload.mode === 'client_data_url' ? clientPayloadSignature : null,
  });
  const relationType = buildUpscaleFingerprintRelationType(fingerprint);

  const existingLink = await getImageStudioSlotLinkBySourceAndRelation(
    projectId,
    sourceSlotId,
    relationType
  );

  return existingLink?.targetSlotId ?? null;
}
