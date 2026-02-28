import { createHash } from 'crypto';
import fs from 'fs/promises';
import path from 'path';

import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { z } from 'zod';

import type {
  ImageStudioDetectionDetails,
  ImageStudioObjectWhitespaceMetrics,
} from '@/features/ai/image-studio/analysis/shared';
import {
  IMAGE_STUDIO_AUTOSCALER_ERROR_CODES,
  imageStudioAutoScalerRequestSchema,
  imageStudioAutoScalerResponseSchema,
  type ImageStudioAutoScalerErrorCode,
  type ImageStudioAutoScalerMode,
  type ImageStudioAutoScalerRequest,
} from '@/features/ai/image-studio/contracts/autoscaler';
import type {
  ImageStudioCenterDetectionMode,
  ImageStudioCenterObjectBounds,
  ImageStudioCenterShadowPolicy,
} from '@/features/ai/image-studio/contracts/center';
import {
  autoScaleObjectByAnalysis,
  buildAutoScalerFingerprint,
  buildAutoScalerFingerprintRelationType,
  buildAutoScalerLayoutSignature,
  buildAutoScalerRequestRelationType,
  normalizeAutoScalerLayoutConfig,
  validateAutoScalerOutputDimensions,
  validateAutoScalerSourceDimensions,
} from '@/shared/lib/ai/image-studio/server/auto-scaler-utils';
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

const uploadsRoot = path.join(process.cwd(), 'public', 'uploads', 'studio', 'autoscale');
const SOURCE_FETCH_TIMEOUT_MS = 15_000;
const AUTOSCALE_PIPELINE_VERSION =
  process.env['IMAGE_STUDIO_AUTOSCALER_PIPELINE_VERSION']?.trim() || 'v1';
const STRICT_SERVER_AUTOSCALER_ENABLED =
  process.env['IMAGE_STUDIO_AUTOSCALER_SERVER_AUTHORITATIVE'] !== 'false';
const AUTOSCALER_FINGERPRINT_DEDUPE_ENABLED =
  process.env['IMAGE_STUDIO_AUTOSCALER_DEDUPE_BY_FINGERPRINT'] === 'true';

type StudioSlotRecord = NonNullable<Awaited<ReturnType<typeof getImageStudioSlotById>>>;
type UploadedClientAutoScaleImage = {
  buffer: Buffer;
  mime: string;
};
type AutoScaleLayoutMetadata = {
  paddingPercent: number;
  paddingXPercent: number;
  paddingYPercent: number;
  fillMissingCanvasWhite: boolean;
  targetCanvasWidth: number | null;
  targetCanvasHeight: number | null;
  whiteThreshold: number;
  chromaThreshold: number;
  shadowPolicy?: ImageStudioCenterShadowPolicy;
  layoutPolicyVersion?: string | null;
  detectionPolicyDecision?: string | null;
};
type AutoScaleProcessingResult = {
  outputBuffer: Buffer;
  outputMime: string;
  outputWidth: number | null;
  outputHeight: number | null;
  sourceObjectBounds: ImageStudioCenterObjectBounds | null;
  targetObjectBounds: ImageStudioCenterObjectBounds | null;
  effectiveMode: ImageStudioAutoScalerMode;
  authoritativeSource: 'source_slot' | 'client_upload_fallback';
  layout: AutoScaleLayoutMetadata;
  detectionUsed: ImageStudioCenterDetectionMode | null;
  confidenceBefore: number | null;
  detectionDetails: ImageStudioDetectionDetails | null;
  scale: number | null;
  whitespaceBefore: ImageStudioObjectWhitespaceMetrics | null;
  whitespaceAfter: ImageStudioObjectWhitespaceMetrics | null;
  objectAreaPercentBefore: number | null;
  objectAreaPercentAfter: number | null;
};

const isFileLike = (value: FormDataEntryValue | null): value is File => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<File>;
  return typeof candidate.size === 'number' && typeof candidate.arrayBuffer === 'function';
};

const autoScaleBadRequest = (
  autoScaleErrorCode: ImageStudioAutoScalerErrorCode,
  message: string,
  meta?: Record<string, unknown>
) => badRequestError(message, { autoScaleErrorCode, ...(meta ?? {}) });

const sanitizeSegment = (value: string): string => value.trim().replace(/[^a-zA-Z0-9-_]/g, '_');

const sanitizeFilename = (value: string): string => value.replace(/[^a-zA-Z0-9._-]/g, '_');

const isClientAutoScaleMode = (mode: ImageStudioAutoScalerMode): boolean =>
  mode === 'client_auto_scaler_v1';

const isServerAutoScaleMode = (mode: ImageStudioAutoScalerMode): boolean =>
  mode === 'server_auto_scaler_v1';

const readIdempotencyKey = (req: NextRequest): string | null => {
  const headerValue =
    req.headers.get('x-idempotency-key') ?? req.headers.get('x-autoscale-request-id');
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

const normalizeAutoScaleLayoutPayload = (value: unknown): Record<string, unknown> | undefined => {
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

const normalizeAutoScaleRequestBody = (body: unknown): Record<string, unknown> => {
  const normalized =
    body && typeof body === 'object' && !Array.isArray(body)
      ? { ...(body as Record<string, unknown>) }
      : {};

  const nestedAutoScale = normalized['autoscale'];
  if (nestedAutoScale && typeof nestedAutoScale === 'object' && !Array.isArray(nestedAutoScale)) {
    Object.assign(normalized, nestedAutoScale as Record<string, unknown>);
  }

  const normalizedMode = typeof normalized['mode'] === 'string' ? normalized['mode'].trim() : '';
  normalized['mode'] = normalizedMode || 'server_auto_scaler_v1';

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

  const normalizedLayout = normalizeAutoScaleLayoutPayload(normalized['layout']);
  if (normalizedLayout) {
    normalized['layout'] = normalizedLayout;
  } else {
    delete normalized['layout'];
  }

  return normalized;
};

const parseAutoScaleResponsePayload = (payload: unknown, meta?: Record<string, unknown>) => {
  const parsed = imageStudioAutoScalerResponseSchema.safeParse(payload);
  if (parsed.success) return parsed.data;
  throw autoScaleBadRequest(
    IMAGE_STUDIO_AUTOSCALER_ERROR_CODES.OUTPUT_INVALID,
    'Invalid auto scaler response payload.',
    {
      responseErrors: parsed.error.format(),
      ...(meta ?? {}),
    }
  );
};

async function parseAutoScalerRequestPayload(
  req: NextRequest
): Promise<{ body: unknown; uploadedClientImage: UploadedClientAutoScaleImage | null }> {
  const contentType = req.headers.get('content-type')?.toLowerCase() ?? '';
  if (!contentType.includes('multipart/form-data')) {
    const jsonBody = (await req.json().catch(() => null)) as unknown;
    if (jsonBody !== null) {
      return { body: jsonBody, uploadedClientImage: null };
    }
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
  const layout = parseJsonFormValue<Record<string, unknown>>(form.get('layout'));
  const image = form.get('image');

  let uploadedClientImage: UploadedClientAutoScaleImage | null = null;
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
      ...(parseJsonFormValue<Record<string, unknown>>(form.get('autoscale')) ?? {}),
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
  payload: ImageStudioAutoScalerRequest,
  uploadedClientImage: UploadedClientAutoScaleImage | null
): string | null => {
  if (uploadedClientImage?.buffer) {
    return `upload:${createHash('sha1').update(uploadedClientImage.buffer).digest('hex').slice(0, 20)}`;
  }
  if (typeof payload.dataUrl === 'string' && payload.dataUrl.trim().length > 0) {
    return `dataurl:${createHash('sha1').update(payload.dataUrl.trim()).digest('hex').slice(0, 20)}`;
  }
  return null;
};

const readAutoScaleMetadataFromSlot = (
  slot: StudioSlotRecord
): {
  effectiveMode: ImageStudioAutoScalerMode | null;
  sourceObjectBounds: ImageStudioCenterObjectBounds | null;
  targetObjectBounds: ImageStudioCenterObjectBounds | null;
  layout: AutoScaleLayoutMetadata | null;
  detectionUsed: ImageStudioCenterDetectionMode | null;
  confidenceBefore: number | null;
  detectionDetails: ImageStudioDetectionDetails | null;
  scale: number | null;
  whitespaceBefore: ImageStudioObjectWhitespaceMetrics | null;
  whitespaceAfter: ImageStudioObjectWhitespaceMetrics | null;
  objectAreaPercentBefore: number | null;
  objectAreaPercentAfter: number | null;
} => {
  const metadata =
    slot.metadata && typeof slot.metadata === 'object' && !Array.isArray(slot.metadata)
      ? slot.metadata
      : null;
  const autoscale =
    metadata?.['autoscale'] &&
    typeof metadata['autoscale'] === 'object' &&
    !Array.isArray(metadata['autoscale'])
      ? (metadata['autoscale'] as Record<string, unknown>)
      : null;
  const effectiveModeRaw =
    typeof autoscale?.['effectiveMode'] === 'string' ? autoscale['effectiveMode'] : null;
  const effectiveMode =
    effectiveModeRaw === 'client_auto_scaler_v1' || effectiveModeRaw === 'server_auto_scaler_v1'
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

  const parseWhitespace = (value: unknown): ImageStudioObjectWhitespaceMetrics | null => {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
    const whitespace = value as Record<string, unknown>;
    const px = whitespace['px'];
    const percent = whitespace['percent'];
    if (!px || typeof px !== 'object' || Array.isArray(px)) return null;
    if (!percent || typeof percent !== 'object' || Array.isArray(percent)) return null;
    const pxRecord = px as Record<string, unknown>;
    const percentRecord = percent as Record<string, unknown>;
    const leftPx = typeof pxRecord['left'] === 'number' ? Math.floor(pxRecord['left']) : NaN;
    const topPx = typeof pxRecord['top'] === 'number' ? Math.floor(pxRecord['top']) : NaN;
    const rightPx = typeof pxRecord['right'] === 'number' ? Math.floor(pxRecord['right']) : NaN;
    const bottomPx = typeof pxRecord['bottom'] === 'number' ? Math.floor(pxRecord['bottom']) : NaN;
    const leftPercent = typeof percentRecord['left'] === 'number' ? percentRecord['left'] : NaN;
    const topPercent = typeof percentRecord['top'] === 'number' ? percentRecord['top'] : NaN;
    const rightPercent = typeof percentRecord['right'] === 'number' ? percentRecord['right'] : NaN;
    const bottomPercent =
      typeof percentRecord['bottom'] === 'number' ? percentRecord['bottom'] : NaN;
    if (
      !Number.isFinite(leftPx) ||
      !Number.isFinite(topPx) ||
      !Number.isFinite(rightPx) ||
      !Number.isFinite(bottomPx) ||
      !Number.isFinite(leftPercent) ||
      !Number.isFinite(topPercent) ||
      !Number.isFinite(rightPercent) ||
      !Number.isFinite(bottomPercent)
    ) {
      return null;
    }
    return {
      px: {
        left: leftPx,
        top: topPx,
        right: rightPx,
        bottom: bottomPx,
      },
      percent: {
        left: leftPercent,
        top: topPercent,
        right: rightPercent,
        bottom: bottomPercent,
      },
    };
  };

  const parseShadowPolicy = (value: unknown): ImageStudioCenterShadowPolicy | null =>
    value === 'auto' || value === 'include_shadow' || value === 'exclude_shadow' ? value : null;

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

  const parseLayout = (): AutoScaleLayoutMetadata | null => {
    if (!autoscale || typeof autoscale !== 'object') return null;
    const layoutRaw =
      autoscale['layout'] &&
      typeof autoscale['layout'] === 'object' &&
      !Array.isArray(autoscale['layout'])
        ? (autoscale['layout'] as Record<string, unknown>)
        : null;
    if (!layoutRaw) return null;
    const paddingPercent =
      typeof layoutRaw['paddingPercent'] === 'number' ? layoutRaw['paddingPercent'] : NaN;
    const paddingXPercent =
      typeof layoutRaw['paddingXPercent'] === 'number' ? layoutRaw['paddingXPercent'] : NaN;
    const paddingYPercent =
      typeof layoutRaw['paddingYPercent'] === 'number' ? layoutRaw['paddingYPercent'] : NaN;
    const fillMissingCanvasWhite = layoutRaw['fillMissingCanvasWhite'] === true;
    const targetCanvasWidth =
      typeof layoutRaw['targetCanvasWidth'] === 'number' &&
      Number.isFinite(layoutRaw['targetCanvasWidth'])
        ? Math.floor(layoutRaw['targetCanvasWidth'])
        : null;
    const targetCanvasHeight =
      typeof layoutRaw['targetCanvasHeight'] === 'number' &&
      Number.isFinite(layoutRaw['targetCanvasHeight'])
        ? Math.floor(layoutRaw['targetCanvasHeight'])
        : null;
    const whiteThreshold =
      typeof layoutRaw['whiteThreshold'] === 'number' ? layoutRaw['whiteThreshold'] : NaN;
    const chromaThreshold =
      typeof layoutRaw['chromaThreshold'] === 'number' ? layoutRaw['chromaThreshold'] : NaN;
    const shadowPolicy = parseShadowPolicy(layoutRaw['shadowPolicy']);
    const layoutPolicyVersionRaw = layoutRaw['layoutPolicyVersion'];
    const detectionPolicyDecisionRaw = layoutRaw['detectionPolicyDecision'];
    const layoutPolicyVersion =
      typeof layoutPolicyVersionRaw === 'string' && layoutPolicyVersionRaw.trim().length > 0
        ? layoutPolicyVersionRaw.trim()
        : null;
    const detectionPolicyDecision =
      typeof detectionPolicyDecisionRaw === 'string' && detectionPolicyDecisionRaw.trim().length > 0
        ? detectionPolicyDecisionRaw.trim()
        : null;
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
      ...(layoutPolicyVersion ? { layoutPolicyVersion } : {}),
      ...(detectionPolicyDecision ? { detectionPolicyDecision } : {}),
      ...(shadowPolicy ? { shadowPolicy } : {}),
    };
  };

  const detectionUsedRaw = autoscale?.['detectionUsed'];
  const detectionUsed =
    detectionUsedRaw === 'alpha_bbox' || detectionUsedRaw === 'white_bg_first_colored_pixel'
      ? detectionUsedRaw
      : null;
  const confidenceBeforeRaw = autoscale?.['confidenceBefore'];
  const confidenceBefore =
    typeof confidenceBeforeRaw === 'number' && Number.isFinite(confidenceBeforeRaw)
      ? Math.max(0, Math.min(1, confidenceBeforeRaw))
      : null;
  const detectionDetails = parseDetectionDetails(autoscale?.['detectionDetails']);
  const scaleRaw = autoscale?.['scale'];
  const scale = typeof scaleRaw === 'number' && Number.isFinite(scaleRaw) ? scaleRaw : null;
  const objectAreaPercentBeforeRaw = autoscale?.['objectAreaPercentBefore'];
  const objectAreaPercentAfterRaw = autoscale?.['objectAreaPercentAfter'];

  return {
    effectiveMode,
    sourceObjectBounds: parseBounds(autoscale?.['sourceObjectBounds']),
    targetObjectBounds: parseBounds(autoscale?.['targetObjectBounds']),
    layout: parseLayout(),
    detectionUsed,
    confidenceBefore,
    detectionDetails,
    scale,
    whitespaceBefore: parseWhitespace(autoscale?.['whitespaceBefore']),
    whitespaceAfter: parseWhitespace(autoscale?.['whitespaceAfter']),
    objectAreaPercentBefore:
      typeof objectAreaPercentBeforeRaw === 'number' && Number.isFinite(objectAreaPercentBeforeRaw)
        ? objectAreaPercentBeforeRaw
        : null,
    objectAreaPercentAfter:
      typeof objectAreaPercentAfterRaw === 'number' && Number.isFinite(objectAreaPercentAfterRaw)
        ? objectAreaPercentAfterRaw
        : null,
  };
};

async function processAutoScalerPayload(input: {
  payload: ImageStudioAutoScalerRequest;
  sourceSlot: StudioSlotRecord;
  uploadedClientImage: UploadedClientAutoScaleImage | null;
}): Promise<AutoScaleProcessingResult> {
  const { payload, sourceSlot, uploadedClientImage } = input;
  const normalizedLayout = normalizeAutoScalerLayoutConfig(payload.layout);
  const preferAuthoritativeSource =
    STRICT_SERVER_AUTOSCALER_ENABLED || isServerAutoScaleMode(payload.mode);

  let sourceBuffer: Buffer | null = null;
  let sourceWidth = 0;
  let sourceHeight = 0;
  let sourceLoadError: unknown = null;

  if (preferAuthoritativeSource || isClientAutoScaleMode(payload.mode)) {
    try {
      const source = await loadSourceBufferFromSlot({
        slot: sourceSlot,
        sourceFetchTimeoutMs: SOURCE_FETCH_TIMEOUT_MS,
        onMissingSource: () =>
          autoScaleBadRequest(
            IMAGE_STUDIO_AUTOSCALER_ERROR_CODES.SOURCE_IMAGE_MISSING,
            'Slot has no source image to auto scale.'
          ),
        onInvalidSource: () =>
          autoScaleBadRequest(
            IMAGE_STUDIO_AUTOSCALER_ERROR_CODES.SOURCE_IMAGE_INVALID,
            'Slot source image path is invalid.'
          ),
        onRemoteFetchFailed: (status) =>
          autoScaleBadRequest(
            IMAGE_STUDIO_AUTOSCALER_ERROR_CODES.SOURCE_IMAGE_INVALID,
            `Failed to fetch source image (${status}).`,
            { status }
          ),
      });
      const metadata = await sharp(source.buffer).metadata();
      sourceWidth = metadata.width ?? sourceSlot.imageFile?.width ?? 0;
      sourceHeight = metadata.height ?? sourceSlot.imageFile?.height ?? 0;
      if (!(sourceWidth > 0 && sourceHeight > 0)) {
        throw autoScaleBadRequest(
          IMAGE_STUDIO_AUTOSCALER_ERROR_CODES.SOURCE_DIMENSIONS_INVALID,
          'Source image dimensions are invalid.'
        );
      }
      const sourceValidation = validateAutoScalerSourceDimensions(sourceWidth, sourceHeight);
      if (!sourceValidation.ok) {
        throw autoScaleBadRequest(
          IMAGE_STUDIO_AUTOSCALER_ERROR_CODES.SOURCE_IMAGE_TOO_LARGE,
          'Source image exceeds auto scaler processing limits.',
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
    let scaled: Awaited<ReturnType<typeof autoScaleObjectByAnalysis>>;
    try {
      scaled = await autoScaleObjectByAnalysis(sourceBuffer, payload.layout, {
        preferTargetCanvas: true,
      });
    } catch (error) {
      if (error instanceof Error && /No visible object pixels were detected/i.test(error.message)) {
        throw autoScaleBadRequest(
          IMAGE_STUDIO_AUTOSCALER_ERROR_CODES.SOURCE_OBJECT_NOT_FOUND,
          'No visible object pixels were detected to auto scale.'
        );
      }
      if (error instanceof Error && /dimensions are invalid/i.test(error.message)) {
        throw autoScaleBadRequest(
          IMAGE_STUDIO_AUTOSCALER_ERROR_CODES.SOURCE_DIMENSIONS_INVALID,
          'Source image dimensions are invalid.'
        );
      }
      throw autoScaleBadRequest(
        IMAGE_STUDIO_AUTOSCALER_ERROR_CODES.OUTPUT_INVALID,
        error instanceof Error ? error.message : 'Failed to process auto scale output.'
      );
    }

    if (!validateAutoScalerOutputDimensions(scaled.width, scaled.height)) {
      throw autoScaleBadRequest(
        IMAGE_STUDIO_AUTOSCALER_ERROR_CODES.OUTPUT_INVALID,
        'Auto scale output exceeds limits.',
        { width: scaled.width, height: scaled.height }
      );
    }

    return {
      outputBuffer: scaled.outputBuffer,
      outputMime: 'image/png',
      outputWidth: scaled.width,
      outputHeight: scaled.height,
      sourceObjectBounds: scaled.sourceObjectBounds,
      targetObjectBounds: scaled.targetObjectBounds,
      effectiveMode: 'server_auto_scaler_v1',
      authoritativeSource: 'source_slot',
      layout: {
        paddingPercent: scaled.layout.paddingPercent,
        paddingXPercent: scaled.layout.paddingXPercent,
        paddingYPercent: scaled.layout.paddingYPercent,
        fillMissingCanvasWhite: scaled.layout.fillMissingCanvasWhite,
        targetCanvasWidth: scaled.layout.targetCanvasWidth,
        targetCanvasHeight: scaled.layout.targetCanvasHeight,
        whiteThreshold: scaled.layout.whiteThreshold,
        chromaThreshold: scaled.layout.chromaThreshold,
        shadowPolicy: scaled.layout.shadowPolicy,
        layoutPolicyVersion: scaled.policyVersion,
        detectionPolicyDecision: scaled.policyReason,
      },
      detectionUsed: scaled.detectionUsed,
      confidenceBefore: scaled.confidenceBefore,
      detectionDetails: scaled.detectionDetails,
      scale: scaled.scale,
      whitespaceBefore: scaled.whitespaceBefore,
      whitespaceAfter: scaled.whitespaceAfter,
      objectAreaPercentBefore: scaled.objectAreaPercentBefore,
      objectAreaPercentAfter: scaled.objectAreaPercentAfter,
    };
  }

  if (!isClientAutoScaleMode(payload.mode)) {
    throw sourceLoadError instanceof Error
      ? sourceLoadError
      : autoScaleBadRequest(
          IMAGE_STUDIO_AUTOSCALER_ERROR_CODES.SOURCE_IMAGE_MISSING,
          'Server auto scaler requires a resolvable source image.'
        );
  }

  if (uploadedClientImage) {
    const metadata = await sharp(uploadedClientImage.buffer)
      .metadata()
      .catch(() => null);
    const outputWidth = metadata?.width ?? null;
    const outputHeight = metadata?.height ?? null;
    if (
      outputWidth &&
      outputHeight &&
      !validateAutoScalerOutputDimensions(outputWidth, outputHeight)
    ) {
      throw autoScaleBadRequest(
        IMAGE_STUDIO_AUTOSCALER_ERROR_CODES.OUTPUT_INVALID,
        'Uploaded auto scale output exceeds limits.',
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
      effectiveMode: 'client_auto_scaler_v1',
      authoritativeSource: 'client_upload_fallback',
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
        layoutPolicyVersion: null,
        detectionPolicyDecision: null,
      },
      detectionUsed: null,
      confidenceBefore: null,
      detectionDetails: null,
      scale: null,
      whitespaceBefore: null,
      whitespaceAfter: null,
      objectAreaPercentBefore: null,
      objectAreaPercentAfter: null,
    };
  }

  const parsedData = parseImageDataUrl(payload.dataUrl ?? '');
  if (!parsedData) {
    throw autoScaleBadRequest(
      IMAGE_STUDIO_AUTOSCALER_ERROR_CODES.CLIENT_DATA_URL_INVALID,
      'Invalid auto scaler image data URL.'
    );
  }

  const metadata = await sharp(parsedData.buffer)
    .metadata()
    .catch(() => null);
  const outputWidth = metadata?.width ?? null;
  const outputHeight = metadata?.height ?? null;
  if (
    outputWidth &&
    outputHeight &&
    !validateAutoScalerOutputDimensions(outputWidth, outputHeight)
  ) {
    throw autoScaleBadRequest(
      IMAGE_STUDIO_AUTOSCALER_ERROR_CODES.OUTPUT_INVALID,
      'Data URL auto scale output exceeds limits.',
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
    effectiveMode: 'client_auto_scaler_v1',
    authoritativeSource: 'client_upload_fallback',
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
      layoutPolicyVersion: null,
      detectionPolicyDecision: null,
    },
    detectionUsed: null,
    confidenceBefore: null,
    detectionDetails: null,
    scale: null,
    whitespaceBefore: null,
    whitespaceAfter: null,
    objectAreaPercentBefore: null,
    objectAreaPercentAfter: null,
  };
}

export async function postAutoScaleSlotHandler(
  req: NextRequest,
  ctx: ApiHandlerContext,
  params: { slotId: string }
): Promise<Response> {
  const slotId = params.slotId?.trim() ?? '';
  if (!slotId) {
    throw autoScaleBadRequest(
      IMAGE_STUDIO_AUTOSCALER_ERROR_CODES.INVALID_PAYLOAD,
      'Slot id is required.'
    );
  }

  const startedAt = Date.now();
  const { body, uploadedClientImage } = await parseAutoScalerRequestPayload(req);
  const normalizedBody = normalizeAutoScaleRequestBody(body);
  const parsed = imageStudioAutoScalerRequestSchema.safeParse(normalizedBody);
  if (!parsed.success) {
    throw autoScaleBadRequest(
      IMAGE_STUDIO_AUTOSCALER_ERROR_CODES.INVALID_PAYLOAD,
      'Invalid auto scaler payload.',
      { errors: parsed.error.format() }
    );
  }

  const sourceSlot = await getImageStudioSlotById(slotId);
  if (!sourceSlot) {
    throw notFoundError('Source slot not found.', {
      autoScaleErrorCode: IMAGE_STUDIO_AUTOSCALER_ERROR_CODES.SOURCE_SLOT_MISSING,
      slotId,
    });
  }

  const idempotencyKey = parsed.data.requestId?.trim() || readIdempotencyKey(req);
  const payload: ImageStudioAutoScalerRequest = {
    ...parsed.data,
    ...(idempotencyKey ? { requestId: idempotencyKey } : {}),
  };

  if (
    isClientAutoScaleMode(payload.mode) &&
    !payload.dataUrl &&
    !uploadedClientImage &&
    STRICT_SERVER_AUTOSCALER_ENABLED === false
  ) {
    throw autoScaleBadRequest(
      IMAGE_STUDIO_AUTOSCALER_ERROR_CODES.CLIENT_IMAGE_REQUIRED,
      'Client auto scaling requires uploaded image or dataUrl when authoritative server mode is disabled.'
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
  const layoutSignature = buildAutoScalerLayoutSignature(payload.layout);
  const fingerprint = buildAutoScalerFingerprint({
    sourceSignature,
    mode: payload.mode,
    layoutSignature,
    clientPayloadSignature:
      isClientAutoScaleMode(payload.mode) && !STRICT_SERVER_AUTOSCALER_ENABLED
        ? clientPayloadSignature
        : null,
  });
  const fingerprintRelationType = buildAutoScalerFingerprintRelationType(fingerprint);
  const requestRelationType = idempotencyKey
    ? buildAutoScalerRequestRelationType(idempotencyKey)
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
        const existingAutoScale = readAutoScaleMetadataFromSlot(existingSlot);
        const responseBody = parseAutoScaleResponsePayload(
          {
            sourceSlotId: sourceSlot.id,
            slot: existingSlot,
            mode: payload.mode,
            effectiveMode: existingAutoScale.effectiveMode ?? payload.mode,
            sourceObjectBounds: existingAutoScale.sourceObjectBounds,
            targetObjectBounds: existingAutoScale.targetObjectBounds,
            layout: existingAutoScale.layout,
            detectionUsed: existingAutoScale.detectionUsed,
            confidenceBefore: existingAutoScale.confidenceBefore,
            detectionDetails: existingAutoScale.detectionDetails,
            scale: existingAutoScale.scale,
            whitespaceBefore: existingAutoScale.whitespaceBefore,
            whitespaceAfter: existingAutoScale.whitespaceAfter,
            objectAreaPercentBefore: existingAutoScale.objectAreaPercentBefore,
            objectAreaPercentAfter: existingAutoScale.objectAreaPercentAfter,
            requestId: idempotencyKey,
            fingerprint,
            deduplicated: true,
            dedupeReason: 'request',
            lifecycle: { state: 'persisted', durationMs: Date.now() - startedAt },
            pipelineVersion: AUTOSCALE_PIPELINE_VERSION,
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

  if (AUTOSCALER_FINGERPRINT_DEDUPE_ENABLED) {
    const existingFingerprintLink = await getImageStudioSlotLinkBySourceAndRelation(
      sourceSlot.projectId,
      sourceSlot.id,
      fingerprintRelationType
    );
    if (existingFingerprintLink) {
      const existingSlot = await getImageStudioSlotById(existingFingerprintLink.targetSlotId);
      if (existingSlot) {
        const existingAutoScale = readAutoScaleMetadataFromSlot(existingSlot);
        const responseBody = parseAutoScaleResponsePayload(
          {
            sourceSlotId: sourceSlot.id,
            slot: existingSlot,
            mode: payload.mode,
            effectiveMode: existingAutoScale.effectiveMode ?? payload.mode,
            sourceObjectBounds: existingAutoScale.sourceObjectBounds,
            targetObjectBounds: existingAutoScale.targetObjectBounds,
            layout: existingAutoScale.layout,
            detectionUsed: existingAutoScale.detectionUsed,
            confidenceBefore: existingAutoScale.confidenceBefore,
            detectionDetails: existingAutoScale.detectionDetails,
            scale: existingAutoScale.scale,
            whitespaceBefore: existingAutoScale.whitespaceBefore,
            whitespaceAfter: existingAutoScale.whitespaceAfter,
            objectAreaPercentBefore: existingAutoScale.objectAreaPercentBefore,
            objectAreaPercentAfter: existingAutoScale.objectAreaPercentAfter,
            requestId: idempotencyKey,
            fingerprint,
            deduplicated: true,
            dedupeReason: 'fingerprint',
            lifecycle: { state: 'persisted', durationMs: Date.now() - startedAt },
            pipelineVersion: AUTOSCALE_PIPELINE_VERSION,
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
    const processed = await processAutoScalerPayload({
      payload,
      sourceSlot,
      uploadedClientImage,
    });

    if (processed.authoritativeSource === 'client_upload_fallback') {
      void logSystemEvent({
        level: 'warn',
        source: 'image-studio.autoscale',
        message:
          'Auto scaler fell back to client-provided payload because source image was unavailable.',
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
    const baseName = sanitizeFilename(payload.name ?? '') || `autoscale-${payload.mode}-${now}`;
    const fileName = baseName.endsWith(ext) ? baseName : `${baseName}${ext}`;

    const diskDir = path.join(uploadsRoot, safeProjectId, safeSourceSlotId);
    const diskPath = path.join(diskDir, fileName);
    const publicPath = `/uploads/studio/autoscale/${safeProjectId}/${safeSourceSlotId}/${fileName}`;

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
        name: `${sourceLabel} • Auto Scaled`,
        folderPath: sourceSlot.folderPath ?? null,
        imageFileId: imageFile.id,
        imageUrl: imageFile.filepath,
        imageBase64: null,
        metadata: {
          role: 'generation',
          sourceSlotId: sourceSlot.id,
          sourceSlotIds: [sourceSlot.id],
          relationType: 'autoscale:output',
          autoscale: {
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
            whitespaceBefore: processed.whitespaceBefore,
            whitespaceAfter: processed.whitespaceAfter,
            objectAreaPercentBefore: processed.objectAreaPercentBefore,
            objectAreaPercentAfter: processed.objectAreaPercentAfter,
            requestId: idempotencyKey,
            fingerprint,
            pipelineVersion: AUTOSCALE_PIPELINE_VERSION,
            timestamp: new Date(now).toISOString(),
          },
        },
      },
    ]);

    const createdSlot = createdSlots[0];
    if (!createdSlot) {
      throw autoScaleBadRequest(
        IMAGE_STUDIO_AUTOSCALER_ERROR_CODES.OUTPUT_PERSIST_FAILED,
        'Failed to create auto scaled slot.'
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
        whitespaceBefore: processed.whitespaceBefore,
        whitespaceAfter: processed.whitespaceAfter,
        objectAreaPercentBefore: processed.objectAreaPercentBefore,
        objectAreaPercentAfter: processed.objectAreaPercentAfter,
        fingerprint,
        requestId: idempotencyKey,
        pipelineVersion: AUTOSCALE_PIPELINE_VERSION,
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
          whitespaceBefore: processed.whitespaceBefore,
          whitespaceAfter: processed.whitespaceAfter,
          objectAreaPercentBefore: processed.objectAreaPercentBefore,
          objectAreaPercentAfter: processed.objectAreaPercentAfter,
          fingerprint,
          requestId: idempotencyKey,
          pipelineVersion: AUTOSCALE_PIPELINE_VERSION,
        },
      });
    }

    const durationMs = Date.now() - startedAt;
    void logSystemEvent({
      level: 'info',
      source: 'image-studio.autoscale',
      message: 'Image Studio auto scaler persisted.',
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
        whitespaceBefore: processed.whitespaceBefore,
        whitespaceAfter: processed.whitespaceAfter,
        objectAreaPercentBefore: processed.objectAreaPercentBefore,
        objectAreaPercentAfter: processed.objectAreaPercentAfter,
        durationMs,
        requestId: idempotencyKey,
        fingerprint,
        pipelineVersion: AUTOSCALE_PIPELINE_VERSION,
      },
    });

    const responseBody = parseAutoScaleResponsePayload(
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
        whitespaceBefore: processed.whitespaceBefore,
        whitespaceAfter: processed.whitespaceAfter,
        objectAreaPercentBefore: processed.objectAreaPercentBefore,
        objectAreaPercentAfter: processed.objectAreaPercentAfter,
        requestId: idempotencyKey,
        fingerprint,
        deduplicated: false,
        lifecycle: {
          state: 'persisted',
          durationMs,
        },
        pipelineVersion: AUTOSCALE_PIPELINE_VERSION,
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
        ? autoScaleBadRequest(
            IMAGE_STUDIO_AUTOSCALER_ERROR_CODES.OUTPUT_INVALID,
            'Auto scaler schema validation failed.',
            { responseErrors: error.format() }
          )
        : error;

    void logSystemEvent({
      level: 'warn',
      source: 'image-studio.autoscale',
      message: 'Image Studio auto scaler failed.',
      request: req,
      requestId: ctx.requestId,
      error: normalizedError,
      context: {
        projectId: sourceSlot.projectId,
        sourceSlotId: sourceSlot.id,
        mode: payload.mode,
        requestId: idempotencyKey,
        fingerprint,
        autoScaleErrorCode: isAppError(normalizedError)
          ? normalizedError.meta?.['autoScaleErrorCode']
          : undefined,
        durationMs: Date.now() - startedAt,
      },
    });
    throw normalizedError;
  }
}
