import { createHash } from 'crypto';
import fs from 'fs/promises';
import path from 'path';

import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { z } from 'zod';

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
} from '@/shared/lib/ai/image-studio/server/center-utils';
import {
  getImageStudioSlotLinkBySourceAndRelation,
  upsertImageStudioSlotLink,
} from '@/shared/lib/ai/image-studio/server/slot-link-repository';
import {
  createImageStudioSlots,
  getImageStudioSlotById,
} from '@/shared/lib/ai/image-studio/server/slot-repository';
import {
  loadSourceBufferFromSlot,
  parseImageDataUrl,
} from '@/shared/lib/ai/image-studio/server/source-image-utils';
import { getImageFileRepository } from '@/features/files/server';
import { logSystemEvent } from '@/shared/lib/observability/system-logger';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { badRequestError, isAppError, notFoundError } from '@/shared/errors/app-error';

const uploadsRoot = path.join(process.cwd(), 'public', 'uploads', 'studio', 'center');
const SOURCE_FETCH_TIMEOUT_MS = 15_000;
const CENTER_PIPELINE_VERSION = process.env['IMAGE_STUDIO_CENTER_PIPELINE_VERSION']?.trim() || 'v2';
const STRICT_SERVER_CENTER_ENABLED =
  process.env['IMAGE_STUDIO_CENTER_SERVER_AUTHORITATIVE'] !== 'false';
const CENTER_FINGERPRINT_DEDUPE_ENABLED =
  process.env['IMAGE_STUDIO_CENTER_DEDUPE_BY_FINGERPRINT'] === 'true';

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
    layoutPolicyVersion: string | null;
    detectionPolicyDecision: string | null;
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

const sanitizeSegment = (value: string): string => value.trim().replace(/[^a-zA-Z0-9-_]/g, '_');

const sanitizeFilename = (value: string): string => value.replace(/[^a-zA-Z0-9._-]/g, '_');

const isClientCenterMode = (mode: ImageStudioCenterMode): boolean =>
  mode === 'client_alpha_bbox' || mode === 'client_object_layout_v1';

const isServerCenterMode = (mode: ImageStudioCenterMode): boolean =>
  mode === 'server_alpha_bbox' || mode === 'server_object_layout_v1';

const isObjectLayoutMode = (mode: ImageStudioCenterMode): boolean =>
  mode === 'client_object_layout_v1' || mode === 'server_object_layout_v1';

const readIdempotencyKey = (req: NextRequest): string | null => {
  const headerValue =
    req.headers.get('x-idempotency-key') ?? req.headers.get('x-center-request-id');
  const normalized = headerValue?.trim() ?? '';
  return normalized.length >= 8 ? normalized : null;
};

const parseJsonFormValue = <T>(value: FormDataEntryValue | null): T | undefined => {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim();
  if (!normalized) return undefined;
  try {
    return JSON.parse(normalized) as T;
  } catch {
    return undefined;
  }
};

const coerceFiniteNumber = (value: unknown): number | null => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) ? parsed : null;
};

const coerceBoolean = (value: unknown): boolean | null => {
  if (typeof value === 'boolean') return value;
  if (typeof value !== 'string') return null;
  const normalized = value.trim().toLowerCase();
  if (normalized === 'true' || normalized === '1') return true;
  if (normalized === 'false' || normalized === '0') return false;
  return null;
};

const normalizeCenterLayoutPayload = (value: unknown): Record<string, unknown> | undefined => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return undefined;
  const layout = value as Record<string, unknown>;
  const normalized: Record<string, unknown> = {};

  const paddingPercent = coerceFiniteNumber(layout['paddingPercent']);
  if (paddingPercent !== null) normalized['paddingPercent'] = paddingPercent;
  const paddingXPercent = coerceFiniteNumber(layout['paddingXPercent']);
  if (paddingXPercent !== null) normalized['paddingXPercent'] = paddingXPercent;
  const paddingYPercent = coerceFiniteNumber(layout['paddingYPercent']);
  if (paddingYPercent !== null) normalized['paddingYPercent'] = paddingYPercent;

  const fillMissingCanvasWhite = coerceBoolean(layout['fillMissingCanvasWhite']);
  if (fillMissingCanvasWhite !== null)
    normalized['fillMissingCanvasWhite'] = fillMissingCanvasWhite;

  const targetCanvasWidth = coerceFiniteNumber(layout['targetCanvasWidth']);
  if (targetCanvasWidth !== null) normalized['targetCanvasWidth'] = Math.round(targetCanvasWidth);
  const targetCanvasHeight = coerceFiniteNumber(layout['targetCanvasHeight']);
  if (targetCanvasHeight !== null)
    normalized['targetCanvasHeight'] = Math.round(targetCanvasHeight);
  const whiteThreshold = coerceFiniteNumber(layout['whiteThreshold']);
  if (whiteThreshold !== null) normalized['whiteThreshold'] = Math.round(whiteThreshold);
  const chromaThreshold = coerceFiniteNumber(layout['chromaThreshold']);
  if (chromaThreshold !== null) normalized['chromaThreshold'] = Math.round(chromaThreshold);

  const shadowPolicy =
    typeof layout['shadowPolicy'] === 'string' ? layout['shadowPolicy'].trim() : '';
  if (shadowPolicy) normalized['shadowPolicy'] = shadowPolicy;
  const detection = typeof layout['detection'] === 'string' ? layout['detection'].trim() : '';
  if (detection) normalized['detection'] = detection;

  return Object.keys(normalized).length > 0 ? normalized : undefined;
};

const normalizeCenterRequestBody = (body: unknown): Record<string, unknown> => {
  const normalized =
    body && typeof body === 'object' && !Array.isArray(body)
      ? { ...(body as Record<string, unknown>) }
      : {};

  const nestedCenter = normalized['center'];
  if (nestedCenter && typeof nestedCenter === 'object' && !Array.isArray(nestedCenter)) {
    Object.assign(normalized, nestedCenter as Record<string, unknown>);
  }

  const normalizedMode = typeof normalized['mode'] === 'string' ? normalized['mode'].trim() : '';
  normalized['mode'] = normalizedMode || 'server_alpha_bbox';

  const normalizedDataUrl =
    typeof normalized['dataUrl'] === 'string' ? normalized['dataUrl'].trim() : '';
  if (normalizedDataUrl) {
    normalized['dataUrl'] = normalizedDataUrl;
  } else {
    delete normalized['dataUrl'];
  }

  const normalizedName = typeof normalized['name'] === 'string' ? normalized['name'].trim() : '';
  if (normalizedName) {
    normalized['name'] = normalizedName;
  } else {
    delete normalized['name'];
  }

  const normalizedRequestId =
    typeof normalized['requestId'] === 'string' ? normalized['requestId'].trim() : '';
  if (normalizedRequestId) {
    normalized['requestId'] = normalizedRequestId;
  } else {
    delete normalized['requestId'];
  }

  const normalizedLayout = normalizeCenterLayoutPayload(normalized['layout']);
  if (normalizedLayout) {
    normalized['layout'] = normalizedLayout;
  } else {
    delete normalized['layout'];
  }

  return normalized;
};

const parseCenterResponsePayload = (payload: unknown, meta?: Record<string, unknown>) => {
  const parsed = imageStudioCenterResponseSchema.safeParse(payload);
  if (parsed.success) return parsed.data;
  throw centerBadRequest(
    IMAGE_STUDIO_CENTER_ERROR_CODES.OUTPUT_INVALID,
    'Invalid center response payload.',
    {
      responseErrors: parsed.error.format(),
      ...(meta ?? {}),
    }
  );
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
    metadata?.['center'] &&
    typeof metadata['center'] === 'object' &&
    !Array.isArray(metadata['center'])
      ? (metadata['center'] as Record<string, unknown>)
      : null;
  const effectiveModeRaw =
    typeof center?.['effectiveMode'] === 'string' ? center['effectiveMode'] : null;
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
    value === 'auto' || value === 'include_shadow' || value === 'exclude_shadow' ? value : null;

  const parseDetectionMode = (value: unknown): ImageStudioCenterDetectionMode | null =>
    value === 'alpha_bbox' || value === 'white_bg_first_colored_pixel' ? value : null;

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
    const maskSource =
      maskSourceRaw === 'foreground' || maskSourceRaw === 'core' ? maskSourceRaw : null;
    const policyVersionRaw = details['policyVersion'];
    const policyReasonRaw = details['policyReason'];
    const fallbackAppliedRaw = details['fallbackApplied'];
    const candidateDetectionsRaw =
      details['candidateDetections'] && typeof details['candidateDetections'] === 'object'
        ? (details['candidateDetections'] as Record<string, unknown>)
        : null;

    const parseCandidateSummary = (
      candidate: unknown
    ): { confidence: number; area: number } | null => {
      if (candidate === null) return null;
      if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) return null;
      const record = candidate as Record<string, unknown>;
      const confidenceRaw = record['confidence'];
      const areaRaw = record['area'];
      const confidence =
        typeof confidenceRaw === 'number' && Number.isFinite(confidenceRaw)
          ? Math.max(0, Math.min(1, confidenceRaw))
          : NaN;
      const area =
        typeof areaRaw === 'number' && Number.isFinite(areaRaw)
          ? Math.max(1, Math.floor(areaRaw))
          : NaN;
      if (!Number.isFinite(confidence) || !Number.isFinite(area)) return null;
      return {
        confidence: Number(confidence.toFixed(4)),
        area,
      };
    };

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
      typeof selectedComponentCoverageRaw === 'number' &&
      Number.isFinite(selectedComponentCoverageRaw)
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

    const policyVersion =
      typeof policyVersionRaw === 'string' && policyVersionRaw.trim().length > 0
        ? policyVersionRaw.trim()
        : undefined;
    const policyReason =
      typeof policyReasonRaw === 'string' && policyReasonRaw.trim().length > 0
        ? policyReasonRaw.trim()
        : undefined;
    const fallbackApplied =
      typeof fallbackAppliedRaw === 'boolean' ? fallbackAppliedRaw : undefined;
    const alphaCandidate = candidateDetectionsRaw
      ? parseCandidateSummary(candidateDetectionsRaw['alpha_bbox'])
      : null;
    const whiteCandidate = candidateDetectionsRaw
      ? parseCandidateSummary(candidateDetectionsRaw['white_bg_first_colored_pixel'])
      : null;
    const candidateDetections = candidateDetectionsRaw
      ? {
          alpha_bbox: alphaCandidate,
          white_bg_first_colored_pixel: whiteCandidate,
        }
      : undefined;

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
      ...(policyVersion ? { policyVersion } : {}),
      ...(policyReason ? { policyReason } : {}),
      ...(typeof fallbackApplied === 'boolean' ? { fallbackApplied } : {}),
      ...(candidateDetections ? { candidateDetections } : {}),
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
    const layoutPolicyVersionRaw = layoutRaw['layoutPolicyVersion'];
    const detectionPolicyDecisionRaw = layoutRaw['detectionPolicyDecision'];
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
    const layoutPolicyVersion =
      typeof layoutPolicyVersionRaw === 'string' && layoutPolicyVersionRaw.trim().length > 0
        ? layoutPolicyVersionRaw.trim()
        : null;
    const detectionPolicyDecision =
      typeof detectionPolicyDecisionRaw === 'string' && detectionPolicyDecisionRaw.trim().length > 0
        ? detectionPolicyDecisionRaw.trim()
        : null;
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
      layoutPolicyVersion,
      detectionPolicyDecision,
      detectionUsed,
      scale,
    };
  })();

  const detectionUsedRaw = center?.['detectionUsed'];
  const detectionUsed =
    parseDetectionMode(detectionUsedRaw) ?? parseDetectionMode(parsedLayout?.detectionUsed) ?? null;
  const confidenceBeforeRaw = center?.['confidenceBefore'];
  const confidenceBefore =
    typeof confidenceBeforeRaw === 'number' && Number.isFinite(confidenceBeforeRaw)
      ? Math.max(0, Math.min(1, confidenceBeforeRaw))
      : null;
  const detectionDetails = parseDetectionDetails(center?.['detectionDetails']);
  const scaleRaw = center?.['scale'];
  const scaleFromCenter =
    typeof scaleRaw === 'number' && Number.isFinite(scaleRaw) ? scaleRaw : null;

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
        if (
          error instanceof Error &&
          /No visible object pixels were detected to center/i.test(error.message)
        ) {
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
          layoutPolicyVersion: centered.layoutPolicyVersion,
          detectionPolicyDecision: centered.detectionPolicyDecision,
          detectionUsed: centered.detectionUsed,
          scale: centered.scale,
        },
      };
    }

    let centered: Awaited<ReturnType<typeof centerObjectByAlpha>>;
    try {
      centered = await centerObjectByAlpha(sourceBuffer);
    } catch (error) {
      if (
        error instanceof Error &&
        /No visible object pixels were detected to center/i.test(error.message)
      ) {
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
    const metadata = await sharp(uploadedClientImage.buffer)
      .metadata()
      .catch(() => null);
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
      effectiveMode:
        payload.mode === 'client_object_layout_v1'
          ? 'client_object_layout_v1'
          : 'client_alpha_bbox',
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
            layoutPolicyVersion: null,
            detectionPolicyDecision: null,
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

  const metadata = await sharp(parsedData.buffer)
    .metadata()
    .catch(() => null);
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
    effectiveMode:
      payload.mode === 'client_object_layout_v1' ? 'client_object_layout_v1' : 'client_alpha_bbox',
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
          layoutPolicyVersion: null,
          detectionPolicyDecision: null,
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
  const normalizedBody = normalizeCenterRequestBody(body);
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
  const layoutSignature = isObjectLayoutMode(payload.mode)
    ? buildCenterLayoutSignature(payload.layout)
    : null;
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
  const requestRelationType = idempotencyKey
    ? buildCenterRequestRelationType(idempotencyKey)
    : null;

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
        const responseBody = parseCenterResponsePayload(
          {
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
          },
          {
            responseStage: 'request_dedupe',
            sourceSlotId: sourceSlot.id,
            targetSlotId: existingSlot.id,
          }
        );
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
        const responseBody = parseCenterResponsePayload(
          {
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
          },
          {
            responseStage: 'fingerprint_dedupe',
            sourceSlotId: sourceSlot.id,
            targetSlotId: existingSlot.id,
          }
        );
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
        message:
          'Centering fell back to client-provided payload because source image was unavailable.',
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

    const responseBody = parseCenterResponsePayload(
      {
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
      },
      {
        responseStage: 'created',
        sourceSlotId: sourceSlot.id,
        targetSlotId: createdSlot.id,
        requestId: idempotencyKey,
      }
    );

    return NextResponse.json(responseBody, { status: 201 });
  } catch (error) {
    const normalizedError =
      error instanceof z.ZodError
        ? centerBadRequest(
            IMAGE_STUDIO_CENTER_ERROR_CODES.OUTPUT_INVALID,
            'Center schema validation failed.',
            { responseErrors: error.format() }
          )
        : error;

    void logSystemEvent({
      level: 'warn',
      source: 'image-studio.center',
      message: 'Image Studio center failed.',
      request: req,
      requestId: ctx.requestId,
      error: normalizedError,
      context: {
        projectId: sourceSlot.projectId,
        sourceSlotId: sourceSlot.id,
        mode: payload.mode,
        requestId: idempotencyKey,
        fingerprint,
        centerErrorCode: isAppError(normalizedError)
          ? normalizedError.meta?.['centerErrorCode']
          : undefined,
        durationMs: Date.now() - startedAt,
      },
    });
    throw normalizedError;
  }
}
