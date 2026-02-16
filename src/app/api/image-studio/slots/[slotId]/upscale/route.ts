export const runtime = 'nodejs';

import { createHash } from 'crypto';
import fs from 'fs/promises';
import path from 'path';

import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';

import {
  IMAGE_STUDIO_UPSCALE_ERROR_CODES,
  IMAGE_STUDIO_UPSCALE_MAX_OUTPUT_SIDE_PX,
  IMAGE_STUDIO_UPSCALE_MAX_SCALE,
  imageStudioUpscaleRequestSchema,
  type ImageStudioUpscaleErrorCode,
  type ImageStudioUpscaleMode,
  type ImageStudioUpscaleRequest,
  type ImageStudioUpscaleStrategy,
  type ImageStudioUpscaleSmoothingQuality,
} from '@/features/ai/image-studio/contracts/upscale';
import {
  getImageStudioSlotLinkBySourceAndRelation,
  upsertImageStudioSlotLink,
} from '@/features/ai/image-studio/server/slot-link-repository';
import {
  createImageStudioSlots,
  getImageStudioSlotById,
} from '@/features/ai/image-studio/server/slot-repository';
import {
  buildUpscaleFingerprint,
  buildUpscaleFingerprintRelationType,
  buildUpscaleRequestRelationType,
  deriveUpscaleScaleFromOutputDimensions,
  resolveUpscaleStrategyFromRequest,
  upscaleImageWithSharp,
  validateUpscaleOutputDimensions,
  validateUpscaleSourceDimensions,
} from '@/features/ai/image-studio/server/upscale-utils';
import { getDiskPathFromPublicPath, getImageFileRepository } from '@/features/files/server';
import { logSystemEvent } from '@/features/observability/server';
import { badRequestError, isAppError, notFoundError } from '@/shared/errors/app-error';
import { apiHandlerWithParams } from '@/shared/lib/api/api-handler';
import type { ApiHandlerContext } from '@/shared/types/api/api';

const uploadsRoot = path.join(process.cwd(), 'public', 'uploads', 'studio', 'upscale');
const SOURCE_FETCH_TIMEOUT_MS = 15_000;
const UPSCALE_PIPELINE_VERSION = process.env['IMAGE_STUDIO_UPSCALE_PIPELINE_VERSION']?.trim() || 'v2';
const STRICT_SERVER_UPSCALE_ENABLED = process.env['IMAGE_STUDIO_UPSCALE_SERVER_AUTHORITATIVE'] !== 'false';

type StudioSlotRecord = NonNullable<Awaited<ReturnType<typeof getImageStudioSlotById>>>;
type UploadedClientUpscaleImage = {
  buffer: Buffer;
  mime: string;
};

type UpscaleProcessingResult = {
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

type ResolvedUpscaleRequest = {
  strategy: ImageStudioUpscaleStrategy;
  scale: number;
  targetWidth: number | null;
  targetHeight: number | null;
};

const isFileLike = (value: FormDataEntryValue | null): value is File => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<File>;
  return typeof candidate.size === 'number' && typeof candidate.arrayBuffer === 'function';
};

const upscaleBadRequest = (
  upscaleErrorCode: ImageStudioUpscaleErrorCode,
  message: string,
  meta?: Record<string, unknown>
) => badRequestError(message, { upscaleErrorCode, ...(meta ?? {}) });

const sanitizeSegment = (value: string): string =>
  value.trim().replace(/[^a-zA-Z0-9-_]/g, '_');

const sanitizeFilename = (value: string): string =>
  value.replace(/[^a-zA-Z0-9._-]/g, '_');

const parseNumericFormValue = (value: FormDataEntryValue | null): number | undefined => {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim();
  if (!normalized) return undefined;
  const parsed = Number(normalized);
  if (!Number.isFinite(parsed)) return Number.NaN;
  return parsed;
};

const readIdempotencyKey = (req: NextRequest): string | null => {
  const headerValue = req.headers.get('x-idempotency-key') ?? req.headers.get('x-upscale-request-id');
  const normalized = headerValue?.trim() ?? '';
  return normalized.length >= 8 ? normalized : null;
};

const toInteger = (value: number | undefined): number | null => {
  if (typeof value !== 'number' || !Number.isFinite(value)) return null;
  return Math.floor(value);
};

const resolveUpscaleRequest = (payload: ImageStudioUpscaleRequest): ResolvedUpscaleRequest => {
  const strategy = resolveUpscaleStrategyFromRequest({
    strategy: payload.strategy,
    targetWidth: payload.targetWidth,
    targetHeight: payload.targetHeight,
  });

  if (strategy === 'target_resolution') {
    const targetWidth = toInteger(payload.targetWidth);
    const targetHeight = toInteger(payload.targetHeight);
    if (!(targetWidth && targetWidth > 0 && targetHeight && targetHeight > 0)) {
      throw upscaleBadRequest(
        IMAGE_STUDIO_UPSCALE_ERROR_CODES.TARGET_RESOLUTION_INVALID,
        'Target resolution requires both targetWidth and targetHeight.'
      );
    }
    if (targetWidth > IMAGE_STUDIO_UPSCALE_MAX_OUTPUT_SIDE_PX || targetHeight > IMAGE_STUDIO_UPSCALE_MAX_OUTPUT_SIDE_PX) {
      throw upscaleBadRequest(
        IMAGE_STUDIO_UPSCALE_ERROR_CODES.TARGET_RESOLUTION_INVALID,
        'Target resolution exceeds upscale side limit.',
        { targetWidth, targetHeight }
      );
    }
    return {
      strategy,
      scale: Number.NaN,
      targetWidth,
      targetHeight,
    };
  }

  const scale = typeof payload.scale === 'number' ? payload.scale : 2;
  if (!(Number.isFinite(scale) && scale > 1 && scale <= IMAGE_STUDIO_UPSCALE_MAX_SCALE)) {
    throw upscaleBadRequest(
      IMAGE_STUDIO_UPSCALE_ERROR_CODES.SCALE_INVALID,
      'Upscale scale is invalid.'
    );
  }
  return {
    strategy,
    scale,
    targetWidth: null,
    targetHeight: null,
  };
};

function parseDataUrl(dataUrl: string): { buffer: Buffer; mime: string } | null {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/i);
  if (!match) return null;
  try {
    const buffer = Buffer.from(match[2] ?? '', 'base64');
    const mime = (match[1] ?? 'image/png').toLowerCase();
    return { buffer, mime };
  } catch {
    return null;
  }
}

async function parseUpscaleRequestPayload(
  req: NextRequest
): Promise<{ body: unknown; uploadedClientImage: UploadedClientUpscaleImage | null }> {
  const contentType = req.headers.get('content-type')?.toLowerCase() ?? '';
  if (!contentType.includes('multipart/form-data')) {
    const jsonBody = (await req.json().catch(() => null)) as unknown;
    return { body: jsonBody, uploadedClientImage: null };
  }

  const form = await req.formData().catch(() => null);
  if (!form) {
    return { body: null, uploadedClientImage: null };
  }

  const mode = form.get('mode');
  const strategy = form.get('strategy');
  const scale = parseNumericFormValue(form.get('scale'));
  const targetWidth = parseNumericFormValue(form.get('targetWidth'));
  const targetHeight = parseNumericFormValue(form.get('targetHeight'));
  const smoothingQuality = form.get('smoothingQuality');
  const dataUrl = form.get('dataUrl');
  const name = form.get('name');
  const requestId = form.get('requestId');
  const image = form.get('image');

  let uploadedClientImage: UploadedClientUpscaleImage | null = null;
  if (isFileLike(image) && image.size > 0) {
    const arrayBuffer = await image.arrayBuffer();
    uploadedClientImage = {
      buffer: Buffer.from(arrayBuffer),
      mime: (typeof image.type === 'string' ? image.type.trim().toLowerCase() : '') || 'image/png',
    };
  }

  return {
    body: {
      ...(typeof mode === 'string' ? { mode } : {}),
      ...(typeof strategy === 'string' ? { strategy } : {}),
      ...(scale !== undefined ? { scale } : {}),
      ...(targetWidth !== undefined ? { targetWidth } : {}),
      ...(targetHeight !== undefined ? { targetHeight } : {}),
      ...(typeof smoothingQuality === 'string' ? { smoothingQuality } : {}),
      ...(typeof dataUrl === 'string' ? { dataUrl } : {}),
      ...(typeof name === 'string' ? { name } : {}),
      ...(typeof requestId === 'string' ? { requestId } : {}),
    },
    uploadedClientImage,
  };
}

function guessExtension(mime: string): string {
  const clean = mime.toLowerCase();
  if (clean.includes('jpeg')) return '.jpg';
  if (clean.includes('webp')) return '.webp';
  if (clean.includes('avif')) return '.avif';
  return '.png';
}

function normalizePublicPath(filepath: string): string {
  let normalized = filepath.trim().replace(/\\/g, '/');
  if (!normalized) return '';
  if (/^https?:\/\//i.test(normalized)) return normalized;
  if (normalized.startsWith('public/')) {
    normalized = normalized.slice('public'.length);
  }
  if (!normalized.startsWith('/')) normalized = `/${normalized}`;
  return normalized;
}

async function loadSourceBuffer(slot: StudioSlotRecord): Promise<{ buffer: Buffer; mimeHint: string | null }> {
  const base64Candidate =
    typeof slot.imageBase64 === 'string' && slot.imageBase64.trim().startsWith('data:')
      ? slot.imageBase64.trim()
      : null;
  if (base64Candidate) {
    const parsed = parseDataUrl(base64Candidate);
    if (parsed) {
      return { buffer: parsed.buffer, mimeHint: parsed.mime };
    }
  }

  const sourcePath = slot.imageFile?.filepath ?? slot.imageUrl ?? null;
  if (!sourcePath) {
    throw upscaleBadRequest(
      IMAGE_STUDIO_UPSCALE_ERROR_CODES.SOURCE_IMAGE_MISSING,
      'Slot has no source image to upscale.'
    );
  }

  const normalizedPath = normalizePublicPath(sourcePath);
  if (!normalizedPath) {
    throw upscaleBadRequest(
      IMAGE_STUDIO_UPSCALE_ERROR_CODES.SOURCE_IMAGE_INVALID,
      'Slot source image path is invalid.'
    );
  }

  if (/^https?:\/\//i.test(normalizedPath)) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SOURCE_FETCH_TIMEOUT_MS);
    try {
      const response = await fetch(normalizedPath, { signal: controller.signal });
      if (!response.ok) {
        throw upscaleBadRequest(
          IMAGE_STUDIO_UPSCALE_ERROR_CODES.SOURCE_IMAGE_INVALID,
          `Failed to fetch source image (${response.status}).`,
          { status: response.status }
        );
      }
      const contentType = response.headers.get('content-type');
      const arrayBuffer = await response.arrayBuffer();
      return {
        buffer: Buffer.from(arrayBuffer),
        mimeHint: contentType ? contentType.toLowerCase() : null,
      };
    } finally {
      clearTimeout(timeoutId);
    }
  }

  const diskPath = getDiskPathFromPublicPath(normalizedPath);
  const buffer = await fs.readFile(diskPath);
  return {
    buffer,
    mimeHint: slot.imageFile?.mimetype?.toLowerCase() ?? null,
  };
}

const buildClientPayloadSignature = (
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

const formatScaleLabel = (scale: number): string => `${Number(scale.toFixed(2))}x`;

const readUpscaleMetadataFromSlot = (
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
      ? slot.metadata
      : null;
  const upscale =
    metadata?.['upscale'] && typeof metadata['upscale'] === 'object' && !Array.isArray(metadata['upscale'])
      ? (metadata['upscale'] as Record<string, unknown>)
      : null;

  const effectiveModeRaw = typeof upscale?.['effectiveMode'] === 'string'
    ? upscale['effectiveMode']
    : typeof upscale?.['mode'] === 'string'
      ? upscale['mode']
      : null;
  const effectiveMode =
    effectiveModeRaw === 'client_data_url' || effectiveModeRaw === 'server_sharp'
      ? effectiveModeRaw
      : null;

  const scaleCandidate = typeof upscale?.['scale'] === 'number'
    ? upscale['scale']
    : Number(upscale?.['scale']);
  const scale = Number.isFinite(scaleCandidate) && scaleCandidate > 0
    ? Number(scaleCandidate)
    : null;

  const strategyRaw = typeof upscale?.['strategy'] === 'string' ? upscale['strategy'] : null;
  const strategy =
    strategyRaw === 'scale' || strategyRaw === 'target_resolution'
      ? strategyRaw
      : null;

  const targetWidthCandidate = typeof upscale?.['targetWidth'] === 'number'
    ? upscale['targetWidth']
    : Number(upscale?.['targetWidth']);
  const targetWidth = Number.isFinite(targetWidthCandidate) && targetWidthCandidate > 0
    ? Math.floor(Number(targetWidthCandidate))
    : null;

  const targetHeightCandidate = typeof upscale?.['targetHeight'] === 'number'
    ? upscale['targetHeight']
    : Number(upscale?.['targetHeight']);
  const targetHeight = Number.isFinite(targetHeightCandidate) && targetHeightCandidate > 0
    ? Math.floor(Number(targetHeightCandidate))
    : null;

  const smoothingQualityRaw = typeof upscale?.['smoothingQuality'] === 'string'
    ? upscale['smoothingQuality']
    : null;
  const smoothingQuality =
    smoothingQualityRaw === 'low' || smoothingQualityRaw === 'medium' || smoothingQualityRaw === 'high'
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

async function processUpscalePayload(input: {
  payload: ImageStudioUpscaleRequest;
  resolvedRequest: ResolvedUpscaleRequest;
  sourceSlot: StudioSlotRecord;
  uploadedClientImage: UploadedClientUpscaleImage | null;
}): Promise<UpscaleProcessingResult> {
  const { payload, resolvedRequest, sourceSlot, uploadedClientImage } = input;
  const preferAuthoritativeSource =
    STRICT_SERVER_UPSCALE_ENABLED || payload.mode === 'server_sharp';

  let sourceBuffer: Buffer | null = null;
  let sourceWidth = 0;
  let sourceHeight = 0;
  let sourceLoadError: unknown = null;

  if (preferAuthoritativeSource || payload.mode === 'client_data_url') {
    try {
      const source = await loadSourceBuffer(sourceSlot);
      const metadata = await sharp(source.buffer).metadata();
      sourceWidth = metadata.width ?? sourceSlot.imageFile?.width ?? 0;
      sourceHeight = metadata.height ?? sourceSlot.imageFile?.height ?? 0;
      if (!(sourceWidth > 0 && sourceHeight > 0)) {
        throw upscaleBadRequest(
          IMAGE_STUDIO_UPSCALE_ERROR_CODES.SOURCE_DIMENSIONS_INVALID,
          'Source image dimensions are invalid.'
        );
      }
      const sourceValidation = validateUpscaleSourceDimensions(sourceWidth, sourceHeight);
      if (!sourceValidation.ok) {
        throw upscaleBadRequest(
          IMAGE_STUDIO_UPSCALE_ERROR_CODES.SOURCE_IMAGE_TOO_LARGE,
          'Source image exceeds upscale processing limits.',
          {
            reason: sourceValidation.reason,
            width: sourceWidth,
            height: sourceHeight,
          }
        );
      }
      sourceBuffer = source.buffer;
    } catch (error) {
      sourceLoadError = error;
    }
  }

  if (sourceBuffer && sourceWidth > 0 && sourceHeight > 0) {
    let serverUpscale: Awaited<ReturnType<typeof upscaleImageWithSharp>>;
    try {
      const sharedInput = {
        sourceBuffer,
        sourceWidth,
        sourceHeight,
        strategy: resolvedRequest.strategy,
      };
      if (resolvedRequest.strategy === 'scale') {
        serverUpscale = await upscaleImageWithSharp({
          ...sharedInput,
          scale: resolvedRequest.scale,
        });
      } else {
        const targetWidth = resolvedRequest.targetWidth;
        const targetHeight = resolvedRequest.targetHeight;
        if (!(targetWidth && targetHeight)) {
          throw upscaleBadRequest(
            IMAGE_STUDIO_UPSCALE_ERROR_CODES.TARGET_RESOLUTION_INVALID,
            'Target resolution requires both targetWidth and targetHeight.'
          );
        }
        serverUpscale = await upscaleImageWithSharp({
          ...sharedInput,
          targetWidth,
          targetHeight,
        });
      }
    } catch (error) {
      if (error instanceof Error && /scale is invalid/i.test(error.message)) {
        throw upscaleBadRequest(
          IMAGE_STUDIO_UPSCALE_ERROR_CODES.SCALE_INVALID,
          'Upscale scale is invalid.'
        );
      }
      if (error instanceof Error && /Target resolution/i.test(error.message)) {
        throw upscaleBadRequest(
          IMAGE_STUDIO_UPSCALE_ERROR_CODES.TARGET_RESOLUTION_INVALID,
          error.message
        );
      }
      if (error instanceof Error && /exceeds upscale processing limits/i.test(error.message)) {
        throw upscaleBadRequest(
          IMAGE_STUDIO_UPSCALE_ERROR_CODES.OUTPUT_INVALID,
          'Upscaled output exceeds upscale limits.'
        );
      }
      throw upscaleBadRequest(
        IMAGE_STUDIO_UPSCALE_ERROR_CODES.OUTPUT_INVALID,
        error instanceof Error ? error.message : 'Failed to process upscaled output.'
      );
    }

    return {
      outputBuffer: serverUpscale.outputBuffer,
      outputMime: serverUpscale.outputMime,
      outputWidth: serverUpscale.outputWidth,
      outputHeight: serverUpscale.outputHeight,
      scale: serverUpscale.scale,
      strategy: serverUpscale.strategy,
      targetWidth: serverUpscale.strategy === 'target_resolution' ? serverUpscale.outputWidth : null,
      targetHeight: serverUpscale.strategy === 'target_resolution' ? serverUpscale.outputHeight : null,
      effectiveMode: 'server_sharp',
      authoritativeSource: 'source_slot',
      kernel: serverUpscale.kernel,
      smoothingQuality: null,
    };
  }

  if (payload.mode !== 'client_data_url') {
    throw sourceLoadError instanceof Error
      ? sourceLoadError
      : upscaleBadRequest(
        IMAGE_STUDIO_UPSCALE_ERROR_CODES.SOURCE_IMAGE_MISSING,
        'Server upscale requires a resolvable source image.'
      );
  }

  if (uploadedClientImage) {
    const metadata = await sharp(uploadedClientImage.buffer).metadata().catch(() => null);
    const outputWidth = metadata?.width ?? null;
    const outputHeight = metadata?.height ?? null;
    if (outputWidth && outputHeight && !validateUpscaleOutputDimensions(outputWidth, outputHeight)) {
      throw upscaleBadRequest(
        IMAGE_STUDIO_UPSCALE_ERROR_CODES.OUTPUT_INVALID,
        'Uploaded upscale output exceeds upscale limits.',
        { width: outputWidth, height: outputHeight }
      );
    }
    if (
      resolvedRequest.strategy === 'target_resolution' &&
      outputWidth &&
      outputHeight &&
      (outputWidth !== resolvedRequest.targetWidth || outputHeight !== resolvedRequest.targetHeight)
    ) {
      throw upscaleBadRequest(
        IMAGE_STUDIO_UPSCALE_ERROR_CODES.TARGET_RESOLUTION_INVALID,
        'Client upscale output dimensions do not match requested target resolution.',
        {
          outputWidth,
          outputHeight,
          targetWidth: resolvedRequest.targetWidth,
          targetHeight: resolvedRequest.targetHeight,
        }
      );
    }

    return {
      outputBuffer: uploadedClientImage.buffer,
      outputMime: uploadedClientImage.mime,
      outputWidth,
      outputHeight,
      scale:
        outputWidth && outputHeight && sourceWidth > 0 && sourceHeight > 0
          ? deriveUpscaleScaleFromOutputDimensions({
            sourceWidth,
            sourceHeight,
            outputWidth,
            outputHeight,
          })
          : resolvedRequest.strategy === 'scale'
            ? resolvedRequest.scale
            : null,
      strategy: resolvedRequest.strategy,
      targetWidth: resolvedRequest.strategy === 'target_resolution'
        ? (resolvedRequest.targetWidth ?? outputWidth)
        : null,
      targetHeight: resolvedRequest.strategy === 'target_resolution'
        ? (resolvedRequest.targetHeight ?? outputHeight)
        : null,
      effectiveMode: 'client_data_url',
      authoritativeSource: 'client_upload_fallback',
      kernel: null,
      smoothingQuality: payload.smoothingQuality ?? 'high',
    };
  }

  const parsedData = parseDataUrl(payload.dataUrl ?? '');
  if (!parsedData) {
    throw upscaleBadRequest(
      IMAGE_STUDIO_UPSCALE_ERROR_CODES.CLIENT_DATA_URL_INVALID,
      'Invalid upscale image data URL.'
    );
  }

  const metadata = await sharp(parsedData.buffer).metadata().catch(() => null);
  const outputWidth = metadata?.width ?? null;
  const outputHeight = metadata?.height ?? null;
  if (outputWidth && outputHeight && !validateUpscaleOutputDimensions(outputWidth, outputHeight)) {
    throw upscaleBadRequest(
      IMAGE_STUDIO_UPSCALE_ERROR_CODES.OUTPUT_INVALID,
      'Data URL upscale output exceeds upscale limits.',
      { width: outputWidth, height: outputHeight }
    );
  }
  if (
    resolvedRequest.strategy === 'target_resolution' &&
    outputWidth &&
    outputHeight &&
    (outputWidth !== resolvedRequest.targetWidth || outputHeight !== resolvedRequest.targetHeight)
  ) {
    throw upscaleBadRequest(
      IMAGE_STUDIO_UPSCALE_ERROR_CODES.TARGET_RESOLUTION_INVALID,
      'Data URL upscale output dimensions do not match requested target resolution.',
      {
        outputWidth,
        outputHeight,
        targetWidth: resolvedRequest.targetWidth,
        targetHeight: resolvedRequest.targetHeight,
      }
    );
  }

  return {
    outputBuffer: parsedData.buffer,
    outputMime: parsedData.mime,
    outputWidth,
    outputHeight,
    scale:
      outputWidth && outputHeight && sourceWidth > 0 && sourceHeight > 0
        ? deriveUpscaleScaleFromOutputDimensions({
          sourceWidth,
          sourceHeight,
          outputWidth,
          outputHeight,
        })
        : resolvedRequest.strategy === 'scale'
          ? resolvedRequest.scale
          : null,
    strategy: resolvedRequest.strategy,
    targetWidth: resolvedRequest.strategy === 'target_resolution'
      ? (resolvedRequest.targetWidth ?? outputWidth)
      : null,
    targetHeight: resolvedRequest.strategy === 'target_resolution'
      ? (resolvedRequest.targetHeight ?? outputHeight)
      : null,
    effectiveMode: 'client_data_url',
    authoritativeSource: 'client_upload_fallback',
    kernel: null,
    smoothingQuality: payload.smoothingQuality ?? 'high',
  };
}

async function POST_handler(
  req: NextRequest,
  ctx: ApiHandlerContext,
  params: { slotId: string }
): Promise<Response> {
  const slotId = params.slotId?.trim() ?? '';
  if (!slotId) {
    throw upscaleBadRequest(IMAGE_STUDIO_UPSCALE_ERROR_CODES.INVALID_PAYLOAD, 'Slot id is required.');
  }

  const startedAt = Date.now();
  const { body, uploadedClientImage } = await parseUpscaleRequestPayload(req);
  const parsed = imageStudioUpscaleRequestSchema.safeParse(body);
  if (!parsed.success) {
    throw upscaleBadRequest(
      IMAGE_STUDIO_UPSCALE_ERROR_CODES.INVALID_PAYLOAD,
      'Invalid upscale payload.',
      { errors: parsed.error.format() }
    );
  }

  const sourceSlot = await getImageStudioSlotById(slotId);
  if (!sourceSlot) {
    throw notFoundError('Source slot not found.', {
      upscaleErrorCode: IMAGE_STUDIO_UPSCALE_ERROR_CODES.SOURCE_SLOT_MISSING,
      slotId,
    });
  }

  const idempotencyKey = parsed.data.requestId?.trim() || readIdempotencyKey(req);
  const payload: ImageStudioUpscaleRequest = {
    ...parsed.data,
    ...(idempotencyKey ? { requestId: idempotencyKey } : {}),
  };
  const resolvedRequest = resolveUpscaleRequest(payload);

  if (
    payload.mode === 'client_data_url' &&
    !payload.dataUrl &&
    !uploadedClientImage &&
    STRICT_SERVER_UPSCALE_ENABLED === false
  ) {
    throw upscaleBadRequest(
      IMAGE_STUDIO_UPSCALE_ERROR_CODES.CLIENT_IMAGE_REQUIRED,
      'Client upscale requires uploaded image or dataUrl when authoritative server mode is disabled.'
    );
  }

  const sourceSignature = [
    sourceSlot.id,
    sourceSlot.projectId,
    sourceSlot.imageFileId ?? '',
    sourceSlot.imageFile?.filepath ?? sourceSlot.imageUrl ?? '',
    sourceSlot.imageBase64 ? `b64:${sourceSlot.imageBase64.length}` : '',
  ].join('|');

  const clientPayloadSignature = buildClientPayloadSignature(payload, uploadedClientImage);
  const fingerprint = buildUpscaleFingerprint({
    sourceSignature,
    mode: payload.mode,
    strategy: resolvedRequest.strategy,
    scale: resolvedRequest.strategy === 'scale' ? resolvedRequest.scale : null,
    targetWidth: resolvedRequest.strategy === 'target_resolution' ? resolvedRequest.targetWidth : null,
    targetHeight: resolvedRequest.strategy === 'target_resolution' ? resolvedRequest.targetHeight : null,
    smoothingQuality:
      payload.mode === 'client_data_url' && !STRICT_SERVER_UPSCALE_ENABLED
        ? (payload.smoothingQuality ?? null)
        : null,
    clientPayloadSignature:
      payload.mode === 'client_data_url' && !STRICT_SERVER_UPSCALE_ENABLED
        ? clientPayloadSignature
        : null,
  });
  const fingerprintRelationType = buildUpscaleFingerprintRelationType(fingerprint);
  const requestRelationType = idempotencyKey ? buildUpscaleRequestRelationType(idempotencyKey) : null;

  if (requestRelationType) {
    const existingByRequest = await getImageStudioSlotLinkBySourceAndRelation(
      sourceSlot.projectId,
      sourceSlot.id,
      requestRelationType
    );
    if (existingByRequest) {
      const existingSlot = await getImageStudioSlotById(existingByRequest.targetSlotId);
      if (existingSlot) {
        const existingUpscale = readUpscaleMetadataFromSlot(existingSlot);
        return NextResponse.json(
          {
            sourceSlotId: sourceSlot.id,
            mode: payload.mode,
            effectiveMode: existingUpscale.effectiveMode ?? payload.mode,
            strategy: existingUpscale.strategy ?? resolvedRequest.strategy,
            scale: existingUpscale.scale ?? (resolvedRequest.strategy === 'scale' ? resolvedRequest.scale : null),
            targetWidth: existingUpscale.targetWidth ?? resolvedRequest.targetWidth,
            targetHeight: existingUpscale.targetHeight ?? resolvedRequest.targetHeight,
            smoothingQuality: existingUpscale.smoothingQuality,
            slot: existingSlot,
            requestId: idempotencyKey,
            fingerprint,
            deduplicated: true,
            dedupeReason: 'request',
            lifecycle: { state: 'persisted', durationMs: Date.now() - startedAt },
            pipelineVersion: UPSCALE_PIPELINE_VERSION,
          },
          { status: 200 }
        );
      }
    }
  }

  const existingFingerprintLink = await getImageStudioSlotLinkBySourceAndRelation(
    sourceSlot.projectId,
    sourceSlot.id,
    fingerprintRelationType
  );
  if (existingFingerprintLink) {
    const existingSlot = await getImageStudioSlotById(existingFingerprintLink.targetSlotId);
    if (existingSlot) {
      const existingUpscale = readUpscaleMetadataFromSlot(existingSlot);
      return NextResponse.json(
        {
          sourceSlotId: sourceSlot.id,
          mode: payload.mode,
          effectiveMode: existingUpscale.effectiveMode ?? payload.mode,
          strategy: existingUpscale.strategy ?? resolvedRequest.strategy,
          scale: existingUpscale.scale ?? (resolvedRequest.strategy === 'scale' ? resolvedRequest.scale : null),
          targetWidth: existingUpscale.targetWidth ?? resolvedRequest.targetWidth,
          targetHeight: existingUpscale.targetHeight ?? resolvedRequest.targetHeight,
          smoothingQuality: existingUpscale.smoothingQuality,
          slot: existingSlot,
          requestId: idempotencyKey,
          fingerprint,
          deduplicated: true,
          dedupeReason: 'fingerprint',
          lifecycle: { state: 'persisted', durationMs: Date.now() - startedAt },
          pipelineVersion: UPSCALE_PIPELINE_VERSION,
        },
        { status: 200 }
      );
    }
  }

  try {
    const processed = await processUpscalePayload({
      payload,
      resolvedRequest,
      sourceSlot,
      uploadedClientImage,
    });

    if (processed.authoritativeSource === 'client_upload_fallback') {
      void logSystemEvent({
        level: 'warn',
        source: 'image-studio.upscale',
        message: 'Upscale fell back to client-provided payload because source image was unavailable.',
        request: req,
        requestId: ctx.requestId,
        context: {
          projectId: sourceSlot.projectId,
          sourceSlotId: sourceSlot.id,
          mode: payload.mode,
          strategy: resolvedRequest.strategy,
          scale: resolvedRequest.strategy === 'scale' ? resolvedRequest.scale : null,
          targetWidth: resolvedRequest.targetWidth,
          targetHeight: resolvedRequest.targetHeight,
          requestId: idempotencyKey,
          fingerprint,
        },
      });
    }

    const ext = guessExtension(processed.outputMime);
    const now = Date.now();
    const safeProjectId = sanitizeSegment(sourceSlot.projectId);
    const safeSourceSlotId = sanitizeSegment(sourceSlot.id);
    const upscaleLabel =
      processed.strategy === 'target_resolution' && processed.targetWidth && processed.targetHeight
        ? `${processed.targetWidth}x${processed.targetHeight}`
        : formatScaleLabel(processed.scale ?? resolvedRequest.scale);
    const baseName =
      sanitizeFilename(payload.name ?? '') ||
      `upscale-${payload.mode}-${upscaleLabel}-${now}`;
    const fileName = baseName.endsWith(ext) ? baseName : `${baseName}${ext}`;

    const diskDir = path.join(uploadsRoot, safeProjectId, safeSourceSlotId);
    const diskPath = path.join(diskDir, fileName);
    const publicPath = `/uploads/studio/upscale/${safeProjectId}/${safeSourceSlotId}/${fileName}`;

    await fs.mkdir(diskDir, { recursive: true });
    await fs.writeFile(diskPath, processed.outputBuffer);

    const imageFileRepository = await getImageFileRepository();
    const imageFile = await imageFileRepository.createImageFile({
      filename: fileName,
      filepath: publicPath,
      mimetype: processed.outputMime,
      size: processed.outputBuffer.length,
      width: processed.outputWidth,
      height: processed.outputHeight,
    });

    const sourceLabel = sourceSlot.name?.trim() || sourceSlot.id;
    const scaleLabel =
      processed.strategy === 'target_resolution' && processed.targetWidth && processed.targetHeight
        ? `${processed.targetWidth}x${processed.targetHeight}`
        : formatScaleLabel(processed.scale ?? resolvedRequest.scale);
    const createdSlots = await createImageStudioSlots(sourceSlot.projectId, [
      {
        name: `${sourceLabel} • Upscale ${scaleLabel}`,
        folderPath: sourceSlot.folderPath ?? null,
        imageFileId: imageFile.id,
        imageUrl: imageFile.filepath,
        imageBase64: null,
        metadata: {
          role: 'generation',
          sourceSlotId: sourceSlot.id,
          sourceSlotIds: [sourceSlot.id],
          relationType: 'upscale:output',
          upscale: {
            mode: payload.mode,
            effectiveMode: processed.effectiveMode,
            authoritativeSource: processed.authoritativeSource,
            scale: processed.scale,
            strategy: processed.strategy,
            targetWidth: processed.targetWidth,
            targetHeight: processed.targetHeight,
            smoothingQuality: processed.smoothingQuality,
            kernel: processed.kernel,
            requestId: idempotencyKey,
            fingerprint,
            pipelineVersion: UPSCALE_PIPELINE_VERSION,
            timestamp: new Date(now).toISOString(),
          },
        },
      },
    ]);

    const createdSlot = createdSlots[0];
    if (!createdSlot) {
      throw upscaleBadRequest(
        IMAGE_STUDIO_UPSCALE_ERROR_CODES.OUTPUT_PERSIST_FAILED,
        'Failed to create upscaled slot.'
      );
    }

    await upsertImageStudioSlotLink({
      projectId: sourceSlot.projectId,
      sourceSlotId: sourceSlot.id,
      targetSlotId: createdSlot.id,
      relationType: fingerprintRelationType,
      metadata: {
        mode: payload.mode,
        effectiveMode: processed.effectiveMode,
        scale: processed.scale,
        strategy: processed.strategy,
        targetWidth: processed.targetWidth,
        targetHeight: processed.targetHeight,
        smoothingQuality: processed.smoothingQuality,
        kernel: processed.kernel,
        fingerprint,
        requestId: idempotencyKey,
        pipelineVersion: UPSCALE_PIPELINE_VERSION,
      },
    });

    if (requestRelationType) {
      await upsertImageStudioSlotLink({
        projectId: sourceSlot.projectId,
        sourceSlotId: sourceSlot.id,
        targetSlotId: createdSlot.id,
        relationType: requestRelationType,
        metadata: {
          mode: payload.mode,
          effectiveMode: processed.effectiveMode,
          scale: processed.scale,
          strategy: processed.strategy,
          targetWidth: processed.targetWidth,
          targetHeight: processed.targetHeight,
          smoothingQuality: processed.smoothingQuality,
          kernel: processed.kernel,
          fingerprint,
          requestId: idempotencyKey,
          pipelineVersion: UPSCALE_PIPELINE_VERSION,
        },
      });
    }

    const durationMs = Date.now() - startedAt;
    void logSystemEvent({
      level: 'info',
      source: 'image-studio.upscale',
      message: 'Image Studio upscale persisted.',
      request: req,
      requestId: ctx.requestId,
      context: {
        projectId: sourceSlot.projectId,
        sourceSlotId: sourceSlot.id,
        createdSlotId: createdSlot.id,
        mode: payload.mode,
        effectiveMode: processed.effectiveMode,
        authoritativeSource: processed.authoritativeSource,
        scale: processed.scale,
        strategy: processed.strategy,
        targetWidth: processed.targetWidth,
        targetHeight: processed.targetHeight,
        outputWidth: processed.outputWidth,
        outputHeight: processed.outputHeight,
        outputBytes: processed.outputBuffer.length,
        durationMs,
        requestId: idempotencyKey,
        fingerprint,
        pipelineVersion: UPSCALE_PIPELINE_VERSION,
      },
    });

    return NextResponse.json(
      {
        sourceSlotId: sourceSlot.id,
        mode: payload.mode,
        effectiveMode: processed.effectiveMode,
        strategy: processed.strategy,
        scale: processed.scale,
        targetWidth: processed.targetWidth,
        targetHeight: processed.targetHeight,
        smoothingQuality: processed.smoothingQuality,
        slot: createdSlot,
        output: imageFile,
        requestId: idempotencyKey,
        fingerprint,
        deduplicated: false,
        lifecycle: {
          state: 'persisted',
          durationMs,
        },
        pipelineVersion: UPSCALE_PIPELINE_VERSION,
      },
      { status: 201 }
    );
  } catch (error) {
    void logSystemEvent({
      level: 'warn',
      source: 'image-studio.upscale',
      message: 'Image Studio upscale failed.',
      request: req,
      requestId: ctx.requestId,
      error,
      context: {
        projectId: sourceSlot.projectId,
        sourceSlotId: sourceSlot.id,
        mode: payload.mode,
        strategy: resolvedRequest.strategy,
        scale: resolvedRequest.strategy === 'scale' ? resolvedRequest.scale : null,
        targetWidth: resolvedRequest.targetWidth,
        targetHeight: resolvedRequest.targetHeight,
        requestId: idempotencyKey,
        fingerprint,
        upscaleErrorCode: isAppError(error) ? error.meta?.['upscaleErrorCode'] : undefined,
        durationMs: Date.now() - startedAt,
      },
    });
    throw error;
  }
}

export const POST = apiHandlerWithParams<{ slotId: string }>(
  async (req: NextRequest, ctx: ApiHandlerContext, params: { slotId: string }): Promise<Response> =>
    POST_handler(req, ctx, params),
  { source: 'image-studio.slots.[slotId].upscale.POST' }
);
