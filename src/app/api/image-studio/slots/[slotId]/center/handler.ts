import { createHash } from 'crypto';
import fs from 'fs/promises';
import path from 'path';

import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';

import type { ImageStudioDetectionDetails } from '@/features/ai/image-studio/analysis/shared';
import {
  IMAGE_STUDIO_CENTER_ERROR_CODES,
  imageStudioCenterRequestSchema,
  imageStudioCenterResponseSchema,
  type ImageStudioCenterErrorCode,
  type ImageStudioCenterDetectionMode,
  type ImageStudioCenterMode,
  type ImageStudioCenterObjectBounds,
  type ImageStudioCenterRequest,
  type ImageStudioCenterShadowPolicy,
} from '@/features/ai/image-studio/contracts/center';
import {
  buildCenterFingerprint,
  buildCenterFingerprintRelationType,
  buildCenterLayoutSignature,
  buildCenterRequestRelationType,
  centerAndScaleObjectByLayout,
  centerObjectByAlpha,
  normalizeCenterLayoutConfig,
  validateCenterOutputDimensions,
  validateCenterSourceDimensions,
} from '@/features/ai/image-studio/server/center-utils';
import {
  getImageStudioSlotLinkBySourceAndRelation,
  upsertImageStudioSlotLink,
} from '@/features/ai/image-studio/server/slot-link-repository';
import {
  createImageStudioSlots,
  getImageStudioSlotById,
} from '@/features/ai/image-studio/server/slot-repository';
import {
  loadSourceBufferFromSlot,
  parseImageDataUrl,
} from '@/features/ai/image-studio/server/source-image-utils';
import { getImageFileRepository } from '@/features/files/server';
import { logSystemEvent } from '@/features/observability/server';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError, isAppError, notFoundError } from '@/shared/errors/app-error';

const uploadsRoot = path.join(process.cwd(), 'public', 'uploads', 'studio', 'center');
const SOURCE_FETCH_TIMEOUT_MS = 15_000;
const CENTER_PIPELINE_VERSION = process.env['IMAGE_STUDIO_CENTER_PIPELINE_VERSION']?.trim() || 'v2';
const STRICT_SERVER_CENTER_ENABLED = process.env['IMAGE_STUDIO_CENTER_SERVER_AUTHORITATIVE'] !== 'false';
const CENTER_FINGERPRINT_DEDUPE_ENABLED = process.env['IMAGE_STUDIO_CENTER_DEDUPE_BY_FINGERPRINT'] === 'true';

type StudioSlotRecord = NonNullable<Awaited<ReturnType<typeof getImageStudioSlotById>>>;
type UploadedClientCenterImage = {
  buffer: Buffer;
  mime: string;
};

type CenterProcessingResult = {
  outputBuffer: Buffer;
  outputMime: string;
  outputWidth: number | null;
  outputHeight: number | null;
  sourceObjectBounds: ImageStudioCenterObjectBounds | null;
  targetObjectBounds: ImageStudioCenterObjectBounds | null;
  effectiveMode: ImageStudioCenterMode;
  authoritativeSource: 'source_slot' | 'client_upload_fallback';
  detectionUsed: ImageStudioCenterDetectionMode | null;
  confidenceBefore: number | null;
  detectionDetails: ImageStudioDetectionDetails | null;
  scale: number | null;
  layout: {
    paddingPercent: number;
    paddingXPercent: number;
    paddingYPercent: number;
    fillMissingCanvasWhite: boolean;
    targetCanvasWidth: number | null;
    targetCanvasHeight: number | null;
    whiteThreshold: number;
    chromaThreshold: number;
    shadowPolicy: ImageStudioCenterShadowPolicy;
    detectionUsed: ImageStudioCenterDetectionMode | null;
    scale: number | null;
  } | null;
};

const isFileLike = (value: FormDataEntryValue | null): value is File => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<File>;
  return typeof candidate.size === 'number' && typeof candidate.arrayBuffer === 'function';
};

const centerBadRequest = (
  centerErrorCode: ImageStudioCenterErrorCode,
  message: string,
  meta?: Record<string, unknown>
) => badRequestError(message, { centerErrorCode, ...(meta ?? {}) });

const sanitizeSegment = (value: string): string =>
  value.trim().replace(/[^a-zA-Z0-9-_]/g, '_');

const sanitizeFilename = (value: string): string =>
  value.replace(/[^a-zA-Z0-9._-]/g, '_');

const isClientCenterMode = (mode: ImageStudioCenterMode): boolean =>
  mode === 'client_alpha_bbox' || mode === 'client_object_layout_v1';

const isServerCenterMode = (mode: ImageStudioCenterMode): boolean =>
  mode === 'server_alpha_bbox' || mode === 'server_object_layout_v1';

const isObjectLayoutMode = (mode: ImageStudioCenterMode): boolean =>
  mode === 'client_object_layout_v1' || mode === 'server_object_layout_v1';

const readIdempotencyKey = (req: NextRequest): string | null => {
  const headerValue = req.headers.get('x-idempotency-key') ?? req.headers.get('x-center-request-id');
  const normalized = headerValue?.trim() ?? '';
  return normalized.length >= 8 ? normalized : null;
};

const parseJsonFormValue = <T,>(value: FormDataEntryValue | null): T | undefined => {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim();
  if (!normalized) return undefined;
  try {
    return JSON.parse(normalized) as T;
  } catch {
    return undefined;
  }
};

async function parseCenterRequestPayload(
  req: NextRequest
): Promise<{ body: unknown; uploadedClientImage: UploadedClientCenterImage | null }> {
  const contentType = req.headers.get('content-type')?.toLowerCase() ?? '';
  if (!contentType.includes('multipart/form-data')) {
    const jsonBody = (await req.json().catch(() => null)) as unknown;
    if (jsonBody !== null) {
      return { body: jsonBody, uploadedClientImage: null };
    }
    // Some browser/runtime combinations can send an empty JSON body for POST retries.
    // Keep the shape object-like so payload recovery can default to server mode.
    return { body: {}, uploadedClientImage: null };
  }

  const form = await req.formData().catch(() => null);
  if (!form) {
    return { body: null, uploadedClientImage: null };
  }

  const mode = form.get('mode');
  const dataUrl = form.get('dataUrl');
  const name = form.get('name');
  const requestId = form.get('requestId');
  const image = form.get('image');
  const layout = parseJsonFormValue<Record<string, unknown>>(form.get('layout'));

  let uploadedClientImage: UploadedClientCenterImage | null = null;
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
      ...(typeof dataUrl === 'string' ? { dataUrl } : {}),
      ...(typeof name === 'string' ? { name } : {}),
      ...(typeof requestId === 'string' ? { requestId } : {}),
      ...(layout ? { layout } : {}),
      ...(parseJsonFormValue<Record<string, unknown>>(form.get('center')) ?? {}),
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

const buildClientPayloadSignature = (
  payload: ImageStudioCenterRequest,
  uploadedClientImage: UploadedClientCenterImage | null
): string | null => {
  if (uploadedClientImage?.buffer) {
    return `upload:${createHash('sha1').update(uploadedClientImage.buffer).digest('hex').slice(0, 20)}`;
  }
  if (typeof payload.dataUrl === 'string' && payload.dataUrl.trim().length > 0) {
    return `dataurl:${createHash('sha1').update(payload.dataUrl.trim()).digest('hex').slice(0, 20)}`;
  }
  return null;
};

const readCenterMetadataFromSlot = (
  slot: StudioSlotRecord
): {
  effectiveMode: ImageStudioCenterMode | null;
  sourceObjectBounds: ImageStudioCenterObjectBounds | null;
  targetObjectBounds: ImageStudioCenterObjectBounds | null;
  detectionUsed: ImageStudioCenterDetectionMode | null;
  confidenceBefore: number | null;
  detectionDetails: ImageStudioDetectionDetails | null;
  scale: number | null;
  layout: CenterProcessingResult['layout'];
} => {
  const metadata =
    slot.metadata && typeof slot.metadata === 'object' && !Array.isArray(slot.metadata)
      ? slot.metadata
      : null;
  const center =
    metadata?.['center'] && typeof metadata['center'] === 'object' && !Array.isArray(metadata['center'])
      ? (metadata['center'] as Record<string, unknown>)
      : null;
  const effectiveModeRaw = typeof center?.['effectiveMode'] === 'string' ? center['effectiveMode'] : null;
  const effectiveMode =
    effectiveModeRaw === 'client_alpha_bbox' ||
    effectiveModeRaw === 'server_alpha_bbox' ||
    effectiveModeRaw === 'client_object_layout_v1' ||
    effectiveModeRaw === 'server_object_layout_v1'
      ? effectiveModeRaw
      : null;

  const parseBounds = (value: unknown): ImageStudioCenterObjectBounds | null => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const bounds = value as Record<string, unknown>;
    const left = typeof bounds['left'] === 'number' ? Math.floor(bounds['left']) : NaN;
    const top = typeof bounds['top'] === 'number' ? Math.floor(bounds['top']) : NaN;
    const width = typeof bounds['width'] === 'number' ? Math.floor(bounds['width']) : NaN;
    const height = typeof bounds['height'] === 'number' ? Math.floor(bounds['height']) : NaN;
    if (!(left >= 0 && top >= 0 && width > 0 && height > 0)) return null;
    return { left, top, width, height };
  };

  const parseShadowPolicy = (value: unknown): ImageStudioCenterShadowPolicy | null =>
    value === 'auto' || value === 'include_shadow' || value === 'exclude_shadow'
      ? value
      : null;

  const parseDetectionMode = (value: unknown): ImageStudioCenterDetectionMode | null =>
    value === 'alpha_bbox' || value === 'white_bg_first_colored_pixel'
      ? value
      : null;

  const parseDetectionDetails = (value: unknown): ImageStudioDetectionDetails | null => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const details = value as Record<string, unknown>;
    const shadowPolicyRequested = parseShadowPolicy(details['shadowPolicyRequested']);
    const shadowPolicyApplied = parseShadowPolicy(details['shadowPolicyApplied']);
    const componentCountRaw = details['componentCount'];
    const coreComponentCountRaw = details['coreComponentCount'];
    const selectedComponentPixelsRaw = details['selectedComponentPixels'];
    const selectedComponentCoverageRaw = details['selectedComponentCoverage'];
    const foregroundPixelsRaw = details['foregroundPixels'];
    const corePixelsRaw = details['corePixels'];
    const touchesBorder = details['touchesBorder'] === true;
    const maskSourceRaw = details['maskSource'];
    const maskSource = maskSourceRaw === 'foreground' || maskSourceRaw === 'core' ? maskSourceRaw : null;

    const componentCount =
      typeof componentCountRaw === 'number' && Number.isFinite(componentCountRaw)
        ? Math.max(0, Math.floor(componentCountRaw))
        : NaN;
    const coreComponentCount =
      typeof coreComponentCountRaw === 'number' && Number.isFinite(coreComponentCountRaw)
        ? Math.max(0, Math.floor(coreComponentCountRaw))
        : NaN;
    const selectedComponentPixels =
      typeof selectedComponentPixelsRaw === 'number' && Number.isFinite(selectedComponentPixelsRaw)
        ? Math.max(0, Math.floor(selectedComponentPixelsRaw))
        : NaN;
    const selectedComponentCoverage =
      typeof selectedComponentCoverageRaw === 'number' && Number.isFinite(selectedComponentCoverageRaw)
        ? Math.max(0, Math.min(1, selectedComponentCoverageRaw))
        : NaN;
    const foregroundPixels =
      typeof foregroundPixelsRaw === 'number' && Number.isFinite(foregroundPixelsRaw)
        ? Math.max(0, Math.floor(foregroundPixelsRaw))
        : NaN;
    const corePixels =
      typeof corePixelsRaw === 'number' && Number.isFinite(corePixelsRaw)
        ? Math.max(0, Math.floor(corePixelsRaw))
        : NaN;

    if (
      !shadowPolicyRequested ||
      !shadowPolicyApplied ||
      !maskSource ||
      !Number.isFinite(componentCount) ||
      !Number.isFinite(coreComponentCount) ||
      !Number.isFinite(selectedComponentPixels) ||
      !Number.isFinite(selectedComponentCoverage) ||
      !Number.isFinite(foregroundPixels) ||
      !Number.isFinite(corePixels)
    ) {
      return null;
    }

    return {
      shadowPolicyRequested,
      shadowPolicyApplied,
      componentCount,
      coreComponentCount,
      selectedComponentPixels,
      selectedComponentCoverage: Number(selectedComponentCoverage.toFixed(4)),
      foregroundPixels,
      corePixels,
      touchesBorder,
      maskSource,
    };
  };

  const parsedLayout = (() => {
    if (!center || typeof center !== 'object') return null;
    const layoutRaw =
        center['layout'] && typeof center['layout'] === 'object' && !Array.isArray(center['layout'])
          ? (center['layout'] as Record<string, unknown>)
          : null;
    if (!layoutRaw) return null;
    const paddingPercentRaw = layoutRaw['paddingPercent'];
    const paddingXPercentRaw = layoutRaw['paddingXPercent'];
    const paddingYPercentRaw = layoutRaw['paddingYPercent'];
    const fillMissingCanvasWhiteRaw = layoutRaw['fillMissingCanvasWhite'];
    const targetCanvasWidthRaw = layoutRaw['targetCanvasWidth'];
    const targetCanvasHeightRaw = layoutRaw['targetCanvasHeight'];
    const whiteThresholdRaw = layoutRaw['whiteThreshold'];
    const chromaThresholdRaw = layoutRaw['chromaThreshold'];
    const shadowPolicyRaw = layoutRaw['shadowPolicy'];
    const detectionUsedRaw = layoutRaw['detectionUsed'];
    const scaleRaw = layoutRaw['scale'];
    const paddingXFromRaw = typeof paddingXPercentRaw === 'number' ? paddingXPercentRaw : NaN;
    const paddingYFromRaw = typeof paddingYPercentRaw === 'number' ? paddingYPercentRaw : NaN;
    const paddingPercent = (() => {
      if (typeof paddingPercentRaw === 'number') return paddingPercentRaw;
      if (Number.isFinite(paddingXFromRaw) && Number.isFinite(paddingYFromRaw)) {
        return (paddingXFromRaw + paddingYFromRaw) / 2;
      }
      if (Number.isFinite(paddingXFromRaw)) return paddingXFromRaw;
      if (Number.isFinite(paddingYFromRaw)) return paddingYFromRaw;
      return NaN;
    })();
    const paddingXPercent = Number.isFinite(paddingXFromRaw) ? paddingXFromRaw : paddingPercent;
    const paddingYPercent = Number.isFinite(paddingYFromRaw) ? paddingYFromRaw : paddingPercent;
    const fillMissingCanvasWhite = fillMissingCanvasWhiteRaw === true;
    const targetCanvasWidth =
        typeof targetCanvasWidthRaw === 'number' && Number.isFinite(targetCanvasWidthRaw)
          ? Math.floor(targetCanvasWidthRaw)
          : null;
    const targetCanvasHeight =
        typeof targetCanvasHeightRaw === 'number' && Number.isFinite(targetCanvasHeightRaw)
          ? Math.floor(targetCanvasHeightRaw)
          : null;
    const whiteThreshold = typeof whiteThresholdRaw === 'number' ? whiteThresholdRaw : NaN;
    const chromaThreshold = typeof chromaThresholdRaw === 'number' ? chromaThresholdRaw : NaN;
    const shadowPolicy: ImageStudioCenterShadowPolicy =
      shadowPolicyRaw === 'auto' ||
      shadowPolicyRaw === 'include_shadow' ||
      shadowPolicyRaw === 'exclude_shadow'
        ? shadowPolicyRaw
        : 'auto';
    const detectionUsed: ImageStudioCenterDetectionMode | null =
      detectionUsedRaw === 'auto' ||
      detectionUsedRaw === 'alpha_bbox' ||
      detectionUsedRaw === 'white_bg_first_colored_pixel'
        ? detectionUsedRaw
        : null;
    const scale = typeof scaleRaw === 'number' && Number.isFinite(scaleRaw) ? scaleRaw : null;
    if (
      !Number.isFinite(paddingPercent) ||
        !Number.isFinite(paddingXPercent) ||
        !Number.isFinite(paddingYPercent) ||
        !Number.isFinite(whiteThreshold) ||
        !Number.isFinite(chromaThreshold)
    ) {
      return null;
    }
    return {
      paddingPercent,
      paddingXPercent,
      paddingYPercent,
      fillMissingCanvasWhite,
      targetCanvasWidth,
      targetCanvasHeight,
      whiteThreshold,
      chromaThreshold,
      shadowPolicy,
      detectionUsed,
      scale,
    };
  })();

  const detectionUsedRaw = center?.['detectionUsed'];
  const detectionUsed =
    parseDetectionMode(detectionUsedRaw) ??
    parseDetectionMode(parsedLayout?.detectionUsed) ??
    null;
  const confidenceBeforeRaw = center?.['confidenceBefore'];
  const confidenceBefore =
    typeof confidenceBeforeRaw === 'number' && Number.isFinite(confidenceBeforeRaw)
      ? Math.max(0, Math.min(1, confidenceBeforeRaw))
      : null;
  const detectionDetails = parseDetectionDetails(center?.['detectionDetails']);
  const scaleRaw = center?.['scale'];
  const scaleFromCenter =
    typeof scaleRaw === 'number' && Number.isFinite(scaleRaw)
      ? scaleRaw
      : null;

  return {
    effectiveMode,
    sourceObjectBounds: parseBounds(center?.['sourceObjectBounds']),
    targetObjectBounds: parseBounds(center?.['targetObjectBounds']),
    detectionUsed,
    confidenceBefore,
    detectionDetails,
    scale: scaleFromCenter ?? parsedLayout?.scale ?? null,
    layout: parsedLayout,
  };
};

async function processCenterPayload(input: {
  payload: ImageStudioCenterRequest;
  sourceSlot: StudioSlotRecord;
  uploadedClientImage: UploadedClientCenterImage | null;
}): Promise<CenterProcessingResult> {
  const { payload, sourceSlot, uploadedClientImage } = input;
  const preferAuthoritativeSource =
    STRICT_SERVER_CENTER_ENABLED || isServerCenterMode(payload.mode);
  const normalizedLayout = normalizeCenterLayoutConfig(payload.layout);

  let sourceBuffer: Buffer | null = null;
  let sourceWidth = 0;
  let sourceHeight = 0;
  let sourceLoadError: unknown = null;

  if (preferAuthoritativeSource || isClientCenterMode(payload.mode)) {
    try {
      const source = await loadSourceBufferFromSlot({
        slot: sourceSlot,
        sourceFetchTimeoutMs: SOURCE_FETCH_TIMEOUT_MS,
        onMissingSource: () =>
          centerBadRequest(
            IMAGE_STUDIO_CENTER_ERROR_CODES.SOURCE_IMAGE_MISSING,
            'Slot has no source image to center.'
          ),
        onInvalidSource: () =>
          centerBadRequest(
            IMAGE_STUDIO_CENTER_ERROR_CODES.SOURCE_IMAGE_INVALID,
            'Slot source image path is invalid.'
          ),
        onRemoteFetchFailed: (status) =>
          centerBadRequest(
            IMAGE_STUDIO_CENTER_ERROR_CODES.SOURCE_IMAGE_INVALID,
            `Failed to fetch source image (${status}).`,
            { status }
          ),
      });
      const metadata = await sharp(source.buffer).metadata();
      sourceWidth = metadata.width ?? sourceSlot.imageFile?.width ?? 0;
      sourceHeight = metadata.height ?? sourceSlot.imageFile?.height ?? 0;
      if (!(sourceWidth > 0 && sourceHeight > 0)) {
        throw centerBadRequest(
          IMAGE_STUDIO_CENTER_ERROR_CODES.SOURCE_DIMENSIONS_INVALID,
          'Source image dimensions are invalid.'
        );
      }
      const sourceValidation = validateCenterSourceDimensions(sourceWidth, sourceHeight);
      if (!sourceValidation.ok) {
        throw centerBadRequest(
          IMAGE_STUDIO_CENTER_ERROR_CODES.SOURCE_IMAGE_TOO_LARGE,
          'Source image exceeds center processing limits.',
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
    if (isObjectLayoutMode(payload.mode)) {
      let centered: Awaited<ReturnType<typeof centerAndScaleObjectByLayout>>;
      try {
        centered = await centerAndScaleObjectByLayout(sourceBuffer, payload.layout);
      } catch (error) {
        if (error instanceof Error && /No visible object pixels were detected to center/i.test(error.message)) {
          throw centerBadRequest(
            IMAGE_STUDIO_CENTER_ERROR_CODES.SOURCE_OBJECT_NOT_FOUND,
            'No visible object pixels were detected to layout.'
          );
        }
        if (error instanceof Error && /dimensions are invalid/i.test(error.message)) {
          throw centerBadRequest(
            IMAGE_STUDIO_CENTER_ERROR_CODES.SOURCE_DIMENSIONS_INVALID,
            'Source image dimensions are invalid.'
          );
        }
        throw centerBadRequest(
          IMAGE_STUDIO_CENTER_ERROR_CODES.OUTPUT_INVALID,
          error instanceof Error ? error.message : 'Failed to process layout output.'
        );
      }

      if (!validateCenterOutputDimensions(centered.width, centered.height)) {
        throw centerBadRequest(
          IMAGE_STUDIO_CENTER_ERROR_CODES.OUTPUT_INVALID,
          'Layout output exceeds center limits.',
          { width: centered.width, height: centered.height }
        );
      }

      return {
        outputBuffer: centered.outputBuffer,
        outputMime: 'image/png',
        outputWidth: centered.width,
        outputHeight: centered.height,
        sourceObjectBounds: centered.sourceObjectBounds,
        targetObjectBounds: centered.targetObjectBounds,
        effectiveMode: 'server_object_layout_v1',
        authoritativeSource: 'source_slot',
        detectionUsed: centered.detectionUsed,
        confidenceBefore: centered.confidenceBefore,
        detectionDetails: centered.detectionDetails,
        scale: centered.scale,
        layout: {
          paddingPercent: normalizedLayout.paddingPercent,
          paddingXPercent: normalizedLayout.paddingXPercent,
          paddingYPercent: normalizedLayout.paddingYPercent,
          fillMissingCanvasWhite: normalizedLayout.fillMissingCanvasWhite,
          targetCanvasWidth: normalizedLayout.targetCanvasWidth,
          targetCanvasHeight: normalizedLayout.targetCanvasHeight,
          whiteThreshold: normalizedLayout.whiteThreshold,
          chromaThreshold: normalizedLayout.chromaThreshold,
          shadowPolicy: normalizedLayout.shadowPolicy,
          detectionUsed: centered.detectionUsed,
          scale: centered.scale,
        },
      };
    }

    let centered: Awaited<ReturnType<typeof centerObjectByAlpha>>;
    try {
      centered = await centerObjectByAlpha(sourceBuffer);
    } catch (error) {
      if (error instanceof Error && /No visible object pixels were detected to center/i.test(error.message)) {
        throw centerBadRequest(
          IMAGE_STUDIO_CENTER_ERROR_CODES.SOURCE_OBJECT_NOT_FOUND,
          'No visible object pixels were detected to center.'
        );
      }
      if (error instanceof Error && /dimensions are invalid/i.test(error.message)) {
        throw centerBadRequest(
          IMAGE_STUDIO_CENTER_ERROR_CODES.SOURCE_DIMENSIONS_INVALID,
          'Source image dimensions are invalid.'
        );
      }
      throw centerBadRequest(
        IMAGE_STUDIO_CENTER_ERROR_CODES.OUTPUT_INVALID,
        error instanceof Error ? error.message : 'Failed to process centered output.'
      );
    }

    if (!validateCenterOutputDimensions(centered.width, centered.height)) {
      throw centerBadRequest(
        IMAGE_STUDIO_CENTER_ERROR_CODES.OUTPUT_INVALID,
        'Centered output exceeds center limits.',
        { width: centered.width, height: centered.height }
      );
    }

    return {
      outputBuffer: centered.outputBuffer,
      outputMime: 'image/png',
      outputWidth: centered.width,
      outputHeight: centered.height,
      sourceObjectBounds: centered.sourceObjectBounds,
      targetObjectBounds: centered.targetObjectBounds,
      effectiveMode: 'server_alpha_bbox',
      authoritativeSource: 'source_slot',
      detectionUsed: null,
      confidenceBefore: null,
      detectionDetails: null,
      scale: null,
      layout: null,
    };
  }

  if (!isClientCenterMode(payload.mode)) {
    throw sourceLoadError instanceof Error
      ? sourceLoadError
      : centerBadRequest(
        IMAGE_STUDIO_CENTER_ERROR_CODES.SOURCE_IMAGE_MISSING,
        'Server centering requires a resolvable source image.'
      );
  }

  if (uploadedClientImage) {
    const metadata = await sharp(uploadedClientImage.buffer).metadata().catch(() => null);
    const outputWidth = metadata?.width ?? null;
    const outputHeight = metadata?.height ?? null;
    if (outputWidth && outputHeight && !validateCenterOutputDimensions(outputWidth, outputHeight)) {
      throw centerBadRequest(
        IMAGE_STUDIO_CENTER_ERROR_CODES.OUTPUT_INVALID,
        'Uploaded center output exceeds center limits.',
        { width: outputWidth, height: outputHeight }
      );
    }

    return {
      outputBuffer: uploadedClientImage.buffer,
      outputMime: uploadedClientImage.mime,
      outputWidth,
      outputHeight,
      sourceObjectBounds: null,
      targetObjectBounds: null,
      effectiveMode: payload.mode === 'client_object_layout_v1' ? 'client_object_layout_v1' : 'client_alpha_bbox',
      authoritativeSource: 'client_upload_fallback',
      detectionUsed: null,
      confidenceBefore: null,
      detectionDetails: null,
      scale: null,
      layout: isObjectLayoutMode(payload.mode)
        ? {
          paddingPercent: normalizedLayout.paddingPercent,
          paddingXPercent: normalizedLayout.paddingXPercent,
          paddingYPercent: normalizedLayout.paddingYPercent,
          fillMissingCanvasWhite: normalizedLayout.fillMissingCanvasWhite,
          targetCanvasWidth: normalizedLayout.targetCanvasWidth,
          targetCanvasHeight: normalizedLayout.targetCanvasHeight,
          whiteThreshold: normalizedLayout.whiteThreshold,
          chromaThreshold: normalizedLayout.chromaThreshold,
          shadowPolicy: normalizedLayout.shadowPolicy,
          detectionUsed: null,
          scale: null,
        }
        : null,
    };
  }

  const parsedData = parseImageDataUrl(payload.dataUrl ?? '');
  if (!parsedData) {
    throw centerBadRequest(
      IMAGE_STUDIO_CENTER_ERROR_CODES.CLIENT_DATA_URL_INVALID,
      'Invalid centering image data URL.'
    );
  }

  const metadata = await sharp(parsedData.buffer).metadata().catch(() => null);
  const outputWidth = metadata?.width ?? null;
  const outputHeight = metadata?.height ?? null;
  if (outputWidth && outputHeight && !validateCenterOutputDimensions(outputWidth, outputHeight)) {
    throw centerBadRequest(
      IMAGE_STUDIO_CENTER_ERROR_CODES.OUTPUT_INVALID,
      'Data URL center output exceeds center limits.',
      { width: outputWidth, height: outputHeight }
    );
  }

  return {
    outputBuffer: parsedData.buffer,
    outputMime: parsedData.mime,
    outputWidth,
    outputHeight,
    sourceObjectBounds: null,
    targetObjectBounds: null,
    effectiveMode: payload.mode === 'client_object_layout_v1' ? 'client_object_layout_v1' : 'client_alpha_bbox',
    authoritativeSource: 'client_upload_fallback',
    detectionUsed: null,
    confidenceBefore: null,
    detectionDetails: null,
    scale: null,
    layout: isObjectLayoutMode(payload.mode)
      ? {
        paddingPercent: normalizedLayout.paddingPercent,
        paddingXPercent: normalizedLayout.paddingXPercent,
        paddingYPercent: normalizedLayout.paddingYPercent,
        fillMissingCanvasWhite: normalizedLayout.fillMissingCanvasWhite,
        targetCanvasWidth: normalizedLayout.targetCanvasWidth,
        targetCanvasHeight: normalizedLayout.targetCanvasHeight,
        whiteThreshold: normalizedLayout.whiteThreshold,
        chromaThreshold: normalizedLayout.chromaThreshold,
        shadowPolicy: normalizedLayout.shadowPolicy,
        detectionUsed: null,
        scale: null,
      }
      : null,
  };
}

export async function postCenterSlotHandler(
  req: NextRequest,
  ctx: ApiHandlerContext,
  params: { slotId: string }
): Promise<Response> {
  const slotId = params.slotId?.trim() ?? '';
  if (!slotId) {
    throw centerBadRequest(IMAGE_STUDIO_CENTER_ERROR_CODES.INVALID_PAYLOAD, 'Slot id is required.');
  }

  const startedAt = Date.now();
  const { body, uploadedClientImage } = await parseCenterRequestPayload(req);
  const normalizedBody =
    body && typeof body === 'object' && !Array.isArray(body)
      ? { ...(body as Record<string, unknown>) }
      : {};
  const normalizedMode = typeof normalizedBody['mode'] === 'string' ? normalizedBody['mode'].trim() : '';
  if (!normalizedMode) {
    normalizedBody['mode'] = 'server_alpha_bbox';
  }
  const parsed = imageStudioCenterRequestSchema.safeParse(normalizedBody);
  if (!parsed.success) {
    throw centerBadRequest(
      IMAGE_STUDIO_CENTER_ERROR_CODES.INVALID_PAYLOAD,
      'Invalid center payload.',
      { errors: parsed.error.format() }
    );
  }

  const sourceSlot = await getImageStudioSlotById(slotId);
  if (!sourceSlot) {
    throw notFoundError('Source slot not found.', {
      centerErrorCode: IMAGE_STUDIO_CENTER_ERROR_CODES.SOURCE_SLOT_MISSING,
      slotId,
    });
  }

  const idempotencyKey = parsed.data.requestId?.trim() || readIdempotencyKey(req);
  const payload: ImageStudioCenterRequest = {
    ...parsed.data,
    ...(idempotencyKey ? { requestId: idempotencyKey } : {}),
  };

  if (
    isClientCenterMode(payload.mode) &&
    !payload.dataUrl &&
    !uploadedClientImage &&
    STRICT_SERVER_CENTER_ENABLED === false
  ) {
    throw centerBadRequest(
      IMAGE_STUDIO_CENTER_ERROR_CODES.CLIENT_IMAGE_REQUIRED,
      'Client centering/layouting requires uploaded image or dataUrl when authoritative server mode is disabled.'
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
  const layoutSignature = isObjectLayoutMode(payload.mode) ? buildCenterLayoutSignature(payload.layout) : null;
  const fingerprint = buildCenterFingerprint({
    sourceSignature,
    mode: payload.mode,
    clientPayloadSignature:
      isClientCenterMode(payload.mode) && !STRICT_SERVER_CENTER_ENABLED
        ? clientPayloadSignature
        : null,
    layoutSignature,
  });
  const fingerprintRelationType = buildCenterFingerprintRelationType(fingerprint);
  const requestRelationType = idempotencyKey ? buildCenterRequestRelationType(idempotencyKey) : null;

  if (requestRelationType) {
    const existingByRequest = await getImageStudioSlotLinkBySourceAndRelation(
      sourceSlot.projectId,
      sourceSlot.id,
      requestRelationType
    );
    if (existingByRequest) {
      const existingSlot = await getImageStudioSlotById(existingByRequest.targetSlotId);
      if (existingSlot) {
        const existingCenter = readCenterMetadataFromSlot(existingSlot);
        const responseBody = imageStudioCenterResponseSchema.parse({
          sourceSlotId: sourceSlot.id,
          slot: existingSlot,
          mode: payload.mode,
          effectiveMode: existingCenter.effectiveMode ?? payload.mode,
          sourceObjectBounds: existingCenter.sourceObjectBounds,
          targetObjectBounds: existingCenter.targetObjectBounds,
          layout: existingCenter.layout,
          detectionUsed: existingCenter.detectionUsed,
          confidenceBefore: existingCenter.confidenceBefore,
          detectionDetails: existingCenter.detectionDetails,
          scale: existingCenter.scale,
          requestId: idempotencyKey,
          fingerprint,
          deduplicated: true,
          dedupeReason: 'request',
          lifecycle: { state: 'persisted', durationMs: Date.now() - startedAt },
          pipelineVersion: CENTER_PIPELINE_VERSION,
        });
        return NextResponse.json(responseBody, { status: 200 });
      }
    }
  }

  if (CENTER_FINGERPRINT_DEDUPE_ENABLED) {
    const existingFingerprintLink = await getImageStudioSlotLinkBySourceAndRelation(
      sourceSlot.projectId,
      sourceSlot.id,
      fingerprintRelationType
    );
    if (existingFingerprintLink) {
      const existingSlot = await getImageStudioSlotById(existingFingerprintLink.targetSlotId);
      if (existingSlot) {
        const existingCenter = readCenterMetadataFromSlot(existingSlot);
        const responseBody = imageStudioCenterResponseSchema.parse({
          sourceSlotId: sourceSlot.id,
          slot: existingSlot,
          mode: payload.mode,
          effectiveMode: existingCenter.effectiveMode ?? payload.mode,
          sourceObjectBounds: existingCenter.sourceObjectBounds,
          targetObjectBounds: existingCenter.targetObjectBounds,
          layout: existingCenter.layout,
          detectionUsed: existingCenter.detectionUsed,
          confidenceBefore: existingCenter.confidenceBefore,
          detectionDetails: existingCenter.detectionDetails,
          scale: existingCenter.scale,
          requestId: idempotencyKey,
          fingerprint,
          deduplicated: true,
          dedupeReason: 'fingerprint',
          lifecycle: { state: 'persisted', durationMs: Date.now() - startedAt },
          pipelineVersion: CENTER_PIPELINE_VERSION,
        });
        return NextResponse.json(responseBody, { status: 200 });
      }
    }
  }

  try {
    const processed = await processCenterPayload({
      payload,
      sourceSlot,
      uploadedClientImage,
    });

    if (processed.authoritativeSource === 'client_upload_fallback') {
      void logSystemEvent({
        level: 'warn',
        source: 'image-studio.center',
        message: 'Centering fell back to client-provided payload because source image was unavailable.',
        request: req,
        requestId: ctx.requestId,
        context: {
          projectId: sourceSlot.projectId,
          sourceSlotId: sourceSlot.id,
          mode: payload.mode,
          requestId: idempotencyKey,
          fingerprint,
        },
      });
    }

    const ext = guessExtension(processed.outputMime);
    const now = Date.now();
    const safeProjectId = sanitizeSegment(sourceSlot.projectId);
    const safeSourceSlotId = sanitizeSegment(sourceSlot.id);
    const baseName = sanitizeFilename(payload.name ?? '') || `center-${payload.mode}-${now}`;
    const fileName = baseName.endsWith(ext) ? baseName : `${baseName}${ext}`;

    const diskDir = path.join(uploadsRoot, safeProjectId, safeSourceSlotId);
    const diskPath = path.join(diskDir, fileName);
    const publicPath = `/uploads/studio/center/${safeProjectId}/${safeSourceSlotId}/${fileName}`;

    await fs.mkdir(diskDir, { recursive: true });
    await fs.writeFile(diskPath, processed.outputBuffer);

    const imageFileRepository = await getImageFileRepository();
    const imageFile = await imageFileRepository.createImageFile({
      name: fileName,
      filename: fileName,
      filepath: publicPath,
      mimetype: processed.outputMime,
      size: processed.outputBuffer.length,
      width: processed.outputWidth ?? undefined,
      height: processed.outputHeight ?? undefined,
    });

    const sourceLabel = sourceSlot.name?.trim() || sourceSlot.id;
    const createdSlots = await createImageStudioSlots(sourceSlot.projectId, [
      {
        name: `${sourceLabel} • Centered`,
        folderPath: sourceSlot.folderPath ?? null,
        imageFileId: imageFile.id,
        imageUrl: imageFile.filepath,
        imageBase64: null,
        metadata: {
          role: 'generation',
          sourceSlotId: sourceSlot.id,
          sourceSlotIds: [sourceSlot.id],
          relationType: 'center:output',
          center: {
            mode: payload.mode,
            effectiveMode: processed.effectiveMode,
            authoritativeSource: processed.authoritativeSource,
            sourceObjectBounds: processed.sourceObjectBounds,
            targetObjectBounds: processed.targetObjectBounds,
            layout: processed.layout,
            detectionUsed: processed.detectionUsed,
            confidenceBefore: processed.confidenceBefore,
            detectionDetails: processed.detectionDetails,
            scale: processed.scale,
            requestId: idempotencyKey,
            fingerprint,
            pipelineVersion: CENTER_PIPELINE_VERSION,
            timestamp: new Date(now).toISOString(),
          },
        },
      },
    ]);

    const createdSlot = createdSlots[0];
    if (!createdSlot) {
      throw centerBadRequest(
        IMAGE_STUDIO_CENTER_ERROR_CODES.OUTPUT_PERSIST_FAILED,
        'Failed to create centered slot.'
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
        sourceObjectBounds: processed.sourceObjectBounds,
        targetObjectBounds: processed.targetObjectBounds,
        layout: processed.layout,
        detectionUsed: processed.detectionUsed,
        confidenceBefore: processed.confidenceBefore,
        detectionDetails: processed.detectionDetails,
        scale: processed.scale,
        fingerprint,
        requestId: idempotencyKey,
        pipelineVersion: CENTER_PIPELINE_VERSION,
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
          sourceObjectBounds: processed.sourceObjectBounds,
          targetObjectBounds: processed.targetObjectBounds,
          layout: processed.layout,
          detectionUsed: processed.detectionUsed,
          confidenceBefore: processed.confidenceBefore,
          detectionDetails: processed.detectionDetails,
          scale: processed.scale,
          fingerprint,
          requestId: idempotencyKey,
          pipelineVersion: CENTER_PIPELINE_VERSION,
        },
      });
    }

    const durationMs = Date.now() - startedAt;
    void logSystemEvent({
      level: 'info',
      source: 'image-studio.center',
      message: 'Image Studio center persisted.',
      request: req,
      requestId: ctx.requestId,
      context: {
        projectId: sourceSlot.projectId,
        sourceSlotId: sourceSlot.id,
        createdSlotId: createdSlot.id,
        mode: payload.mode,
        effectiveMode: processed.effectiveMode,
        authoritativeSource: processed.authoritativeSource,
        outputWidth: processed.outputWidth,
        outputHeight: processed.outputHeight,
        outputBytes: processed.outputBuffer.length,
        sourceObjectBounds: processed.sourceObjectBounds,
        targetObjectBounds: processed.targetObjectBounds,
        layout: processed.layout,
        detectionUsed: processed.detectionUsed,
        confidenceBefore: processed.confidenceBefore,
        detectionDetails: processed.detectionDetails,
        scale: processed.scale,
        durationMs,
        requestId: idempotencyKey,
        fingerprint,
        pipelineVersion: CENTER_PIPELINE_VERSION,
      },
    });

    const responseBody = imageStudioCenterResponseSchema.parse({
      sourceSlotId: sourceSlot.id,
      mode: payload.mode,
      effectiveMode: processed.effectiveMode,
      slot: createdSlot,
      output: imageFile,
      sourceObjectBounds: processed.sourceObjectBounds,
      targetObjectBounds: processed.targetObjectBounds,
      layout: processed.layout,
      detectionUsed: processed.detectionUsed,
      confidenceBefore: processed.confidenceBefore,
      detectionDetails: processed.detectionDetails,
      scale: processed.scale,
      requestId: idempotencyKey,
      fingerprint,
      deduplicated: false,
      lifecycle: {
        state: 'persisted',
        durationMs,
      },
      pipelineVersion: CENTER_PIPELINE_VERSION,
    });

    return NextResponse.json(responseBody, { status: 201 });
  } catch (error) {
    void logSystemEvent({
      level: 'warn',
      source: 'image-studio.center',
      message: 'Image Studio center failed.',
      request: req,
      requestId: ctx.requestId,
      error,
      context: {
        projectId: sourceSlot.projectId,
        sourceSlotId: sourceSlot.id,
        mode: payload.mode,
        requestId: idempotencyKey,
        fingerprint,
        centerErrorCode: isAppError(error) ? error.meta?.['centerErrorCode'] : undefined,
        durationMs: Date.now() - startedAt,
      },
    });
    throw error;
  }
}
