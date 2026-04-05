import fs from 'fs/promises';
import path from 'path';

import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';

import {
  IMAGE_STUDIO_CROP_ERROR_CODES,
  imageStudioCropRequestSchema,
  imageStudioCropResponseSchema,
  type ImageStudioCropErrorCode,
  type ImageStudioCropPoint,
  type ImageStudioCropRect,
  type ImageStudioCropRequest,
} from '@/features/ai/image-studio/contracts/crop';
import {
  buildCropFingerprint,
  buildCropFingerprintRelationType,
  buildCropRequestRelationType,
  clampCropRect,
  validateCropOutputDimensions,
  validateCropSourceDimensions,
} from '@/features/ai/image-studio/server/crop-utils';
import {
  getImageStudioSlotLinkBySourceAndRelation,
  upsertImageStudioSlotLink,
} from '@/features/ai/server';
import {
  createImageStudioSlots,
  getImageStudioSlotById,
  type StudioSlotRecord,
} from '@/features/ai/server';
import { getImageFileRepository, getDiskPathFromPublicPath } from '@/features/files/server';
import type { UploadedClientCropImage } from '@/shared/contracts/image-studio';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { badRequestError, isAppError, notFoundError } from '@/shared/errors/app-error';
import { parseObjectJsonBody } from '@/shared/lib/api/parse-json';
import { studioRoot } from '@/shared/lib/files/server-constants';
import { logSystemEvent } from '@/shared/lib/observability/system-logger';
import { ErrorSystem } from '@/shared/utils/observability/error-system';


const uploadsRoot = path.join(studioRoot, 'crops');
const SOURCE_FETCH_TIMEOUT_MS = 15_000;
const CROP_PIPELINE_VERSION = process.env['IMAGE_STUDIO_CROP_PIPELINE_VERSION']?.trim() || 'v2';
const STRICT_SERVER_CROP_ENABLED =
  process.env['IMAGE_STUDIO_CROP_SERVER_AUTHORITATIVE'] !== 'false';

type CropProcessingResult = {
  outputBuffer: Buffer;
  outputMime: string;
  cropRect: ImageStudioCropRect | null;
  outputWidth: number | null;
  outputHeight: number | null;
  effectiveMode: ImageStudioCropRequest['mode'];
  authoritativeSource: 'source_slot' | 'client_upload_fallback';
};

const isFileLike = (value: FormDataEntryValue | null): value is File => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<File>;
  return typeof candidate.size === 'number' && typeof candidate.arrayBuffer === 'function';
};

const cropBadRequest = (
  cropErrorCode: ImageStudioCropErrorCode,
  message: string,
  meta?: Record<string, unknown>
) => badRequestError(message, { cropErrorCode, ...(meta ?? {}) });

const parseJsonFormValue = <T>(value: FormDataEntryValue | null): T | undefined => {
  if (typeof value !== 'string') return undefined;
  const normalized = value.trim();
  if (!normalized) return undefined;
  try {
    return JSON.parse(normalized) as T;
  } catch (error) {
    void ErrorSystem.captureException(error);
    return undefined;
  }
};

const sanitizeSegment = (value: string): string => value.trim().replace(/[^a-zA-Z0-9-_]/g, '_');

const sanitizeFilename = (value: string): string => value.replace(/[^a-zA-Z0-9._-]/g, '_');

const readIdempotencyKey = (req: NextRequest): string | null => {
  const headerValue = req.headers.get('x-idempotency-key') ?? req.headers.get('x-crop-request-id');
  const normalized = headerValue?.trim() ?? '';
  return normalized.length >= 8 ? normalized : null;
};

function parseDataUrl(dataUrl: string): { buffer: Buffer; mime: string } | null {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/i);
  if (!match) return null;
  try {
    const buffer = Buffer.from(match[2] ?? '', 'base64');
    const mime = (match[1] ?? 'image/png').toLowerCase();
    return { buffer, mime };
  } catch (error) {
    void ErrorSystem.captureException(error);
    return null;
  }
}

async function parseCropRequestPayload(
  req: NextRequest
): Promise<{ body: unknown; uploadedClientImage: UploadedClientCropImage | null }> {
  const contentType = req.headers.get('content-type')?.toLowerCase() ?? '';
  if (!contentType.includes('multipart/form-data')) {
    const parsed = await parseObjectJsonBody(req, {
      allowEmpty: true,
      logPrefix: 'image-studio.slots.crop',
    });
    // Keep payload object-like so downstream normalization can infer mode from cropRect/polygon.
    return { body: parsed.ok ? parsed.data : {}, uploadedClientImage: null };
  }

  const form = await req.formData().catch(() => null);
  if (!form) {
    return { body: null, uploadedClientImage: null };
  }

  const mode = form.get('mode');
  const cropRect = parseJsonFormValue<ImageStudioCropRect>(form.get('cropRect'));
  const polygon = parseJsonFormValue<Array<ImageStudioCropPoint>>(form.get('polygon'));
  const canvasContext = parseJsonFormValue<NonNullable<ImageStudioCropRequest['canvasContext']>>(
    form.get('canvasContext')
  );
  const dataUrl = form.get('dataUrl');
  const name = form.get('name');
  const requestId = form.get('requestId');
  const diagnostics = parseJsonFormValue<Record<string, unknown>>(form.get('diagnostics'));
  const image = form.get('image');

  let uploadedClientImage: UploadedClientCropImage | null = null;
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
      ...(cropRect ? { cropRect } : {}),
      ...(polygon ? { polygon } : {}),
      ...(canvasContext ? { canvasContext } : {}),
      ...(typeof dataUrl === 'string' ? { dataUrl } : {}),
      ...(typeof name === 'string' ? { name } : {}),
      ...(typeof requestId === 'string' ? { requestId } : {}),
      ...(diagnostics ? { diagnostics } : {}),
    },
    uploadedClientImage,
  };
}

function guessExtension(mime: string): string {
  if (mime.includes('jpeg')) return '.jpg';
  if (mime.includes('webp')) return '.webp';
  if (mime.includes('avif')) return '.avif';
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

async function loadSourceBuffer(
  slot: StudioSlotRecord
): Promise<{ buffer: Buffer; mimeHint: string | null }> {
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
    throw cropBadRequest(
      IMAGE_STUDIO_CROP_ERROR_CODES.SOURCE_IMAGE_MISSING,
      'Slot has no source image to crop.'
    );
  }

  const normalizedPath = normalizePublicPath(sourcePath);
  if (!normalizedPath) {
    throw cropBadRequest(
      IMAGE_STUDIO_CROP_ERROR_CODES.SOURCE_IMAGE_INVALID,
      'Slot source image path is invalid.'
    );
  }

  if (/^https?:\/\//i.test(normalizedPath)) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SOURCE_FETCH_TIMEOUT_MS);
    try {
      const response = await fetch(normalizedPath, { signal: controller.signal });
      if (!response.ok) {
        throw cropBadRequest(
          IMAGE_STUDIO_CROP_ERROR_CODES.SOURCE_IMAGE_INVALID,
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

function polygonToPath(points: Array<{ x: number; y: number }>): string {
  return points
    .map((point) => `${Number(point.x.toFixed(2))},${Number(point.y.toFixed(2))}`)
    .join(' ');
}

async function cropByPolygonMask(
  sourceBuffer: Buffer,
  polygon: Array<{ x: number; y: number }>,
  width: number,
  height: number
): Promise<{ outputBuffer: Buffer; cropRect: ImageStudioCropRect }> {
  const pxPoints = polygon.map((point) => ({
    x: Math.max(0, Math.min(1, point.x)) * width,
    y: Math.max(0, Math.min(1, point.y)) * height,
  }));

  const xs = pxPoints.map((point) => point.x);
  const ys = pxPoints.map((point) => point.y);
  const minX = Math.max(0, Math.floor(Math.min(...xs)));
  const minY = Math.max(0, Math.floor(Math.min(...ys)));
  const maxX = Math.min(width, Math.ceil(Math.max(...xs)));
  const maxY = Math.min(height, Math.ceil(Math.max(...ys)));
  const regionWidth = Math.max(1, maxX - minX);
  const regionHeight = Math.max(1, maxY - minY);

  const extracted = await sharp(sourceBuffer)
    .extract({
      left: minX,
      top: minY,
      width: regionWidth,
      height: regionHeight,
    })
    .ensureAlpha()
    .png()
    .toBuffer();

  const relativePoints = pxPoints.map((point) => ({
    x: point.x - minX,
    y: point.y - minY,
  }));

  const maskSvg = Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${regionWidth}" height="${regionHeight}" viewBox="0 0 ${regionWidth} ${regionHeight}"><polygon points="${polygonToPath(
      relativePoints
    )}" fill="white" /></svg>`,
    'utf8'
  );

  const outputBuffer = await sharp(extracted)
    .composite([{ input: maskSvg, blend: 'dest-in' }])
    .png()
    .toBuffer();

  return {
    outputBuffer,
    cropRect: {
      x: minX,
      y: minY,
      width: regionWidth,
      height: regionHeight,
    },
  };
}

const normalizeCanvasCompositeFrame = (input: {
  canvasWidth: number;
  canvasHeight: number;
  imageFrame: { x: number; y: number; width: number; height: number };
}): { left: number; top: number; width: number; height: number } => {
  const left = Math.round(input.imageFrame.x * input.canvasWidth);
  const top = Math.round(input.imageFrame.y * input.canvasHeight);
  const width = Math.max(1, Math.round(input.imageFrame.width * input.canvasWidth));
  const height = Math.max(1, Math.round(input.imageFrame.height * input.canvasHeight));
  return { left, top, width, height };
};

async function composeSourceOnCanvas(input: {
  sourceBuffer: Buffer;
  canvasWidth: number;
  canvasHeight: number;
  imageFrame: { x: number; y: number; width: number; height: number };
}): Promise<Buffer> {
  const { sourceBuffer, canvasWidth, canvasHeight, imageFrame } = input;
  const baseCanvas = sharp({
    create: {
      width: canvasWidth,
      height: canvasHeight,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  });
  const frame = normalizeCanvasCompositeFrame({ canvasWidth, canvasHeight, imageFrame });

  let sourceToComposite = await sharp(sourceBuffer)
    .ensureAlpha()
    .resize(frame.width, frame.height, { fit: 'fill' })
    .png()
    .toBuffer();

  let compositeLeft = frame.left;
  let compositeTop = frame.top;
  let extractLeft = 0;
  let extractTop = 0;
  let extractWidth = frame.width;
  let extractHeight = frame.height;

  if (compositeLeft < 0) {
    extractLeft = Math.min(frame.width, Math.abs(compositeLeft));
    extractWidth = frame.width - extractLeft;
    compositeLeft = 0;
  }
  if (compositeTop < 0) {
    extractTop = Math.min(frame.height, Math.abs(compositeTop));
    extractHeight = frame.height - extractTop;
    compositeTop = 0;
  }
  if (compositeLeft + extractWidth > canvasWidth) {
    extractWidth = Math.max(0, canvasWidth - compositeLeft);
  }
  if (compositeTop + extractHeight > canvasHeight) {
    extractHeight = Math.max(0, canvasHeight - compositeTop);
  }

  if (!(extractWidth > 0 && extractHeight > 0)) {
    return baseCanvas.png().toBuffer();
  }

  if (
    extractLeft > 0 ||
    extractTop > 0 ||
    extractWidth !== frame.width ||
    extractHeight !== frame.height
  ) {
    sourceToComposite = await sharp(sourceToComposite)
      .extract({
        left: extractLeft,
        top: extractTop,
        width: extractWidth,
        height: extractHeight,
      })
      .png()
      .toBuffer();
  }

  return baseCanvas
    .composite([
      {
        input: sourceToComposite,
        left: compositeLeft,
        top: compositeTop,
      },
    ])
    .png()
    .toBuffer();
}

async function processCropPayload(input: {
  payload: ImageStudioCropRequest;
  sourceSlot: StudioSlotRecord;
  uploadedClientImage: UploadedClientCropImage | null;
}): Promise<CropProcessingResult> {
  const { payload, sourceSlot, uploadedClientImage } = input;
  const preferAuthoritativeSource =
    STRICT_SERVER_CROP_ENABLED ||
    payload.mode === 'server_bbox' ||
    payload.mode === 'server_polygon';

  let sourceBuffer: Buffer | null = null;
  let sourceWidth = 0;
  let sourceHeight = 0;
  let sourceLoadError: unknown = null;

  if (preferAuthoritativeSource || payload.mode === 'client_bbox') {
    try {
      const source = await loadSourceBuffer(sourceSlot);
      const metadata = await sharp(source.buffer).metadata();
      sourceWidth = metadata.width ?? sourceSlot.imageFile?.width ?? 0;
      sourceHeight = metadata.height ?? sourceSlot.imageFile?.height ?? 0;
      const sourceValidation = validateCropSourceDimensions(sourceWidth, sourceHeight);
      if (!sourceValidation.ok) {
        throw cropBadRequest(
          IMAGE_STUDIO_CROP_ERROR_CODES.SOURCE_IMAGE_TOO_LARGE,
          'Source image exceeds crop processing limits.',
          {
            reason: sourceValidation.reason,
            width: sourceWidth,
            height: sourceHeight,
          }
        );
      }
      sourceBuffer = source.buffer;
    } catch (error) {
      void ErrorSystem.captureException(error);
      sourceLoadError = error;
    }
  }

  if (payload.mode === 'server_polygon') {
    if (!sourceBuffer || !(sourceWidth > 0 && sourceHeight > 0)) {
      throw sourceLoadError instanceof Error
        ? sourceLoadError
        : cropBadRequest(
          IMAGE_STUDIO_CROP_ERROR_CODES.SOURCE_IMAGE_MISSING,
          'Server polygon crop requires a resolvable source image.'
        );
    }

    const polygonResult = await cropByPolygonMask(
      sourceBuffer,
      payload.polygon ?? [],
      sourceWidth,
      sourceHeight
    );

    const outputValid = validateCropOutputDimensions(
      polygonResult.cropRect.width,
      polygonResult.cropRect.height
    );
    if (!outputValid) {
      throw cropBadRequest(
        IMAGE_STUDIO_CROP_ERROR_CODES.OUTPUT_INVALID,
        'Cropped polygon output exceeds crop limits.',
        { width: polygonResult.cropRect.width, height: polygonResult.cropRect.height }
      );
    }

    return {
      outputBuffer: polygonResult.outputBuffer,
      outputMime: 'image/png',
      cropRect: polygonResult.cropRect,
      outputWidth: polygonResult.cropRect.width,
      outputHeight: polygonResult.cropRect.height,
      effectiveMode: 'server_polygon',
      authoritativeSource: 'source_slot',
    };
  }

  const requestedRect = payload.cropRect;
  if (!requestedRect) {
    throw cropBadRequest(
      IMAGE_STUDIO_CROP_ERROR_CODES.CROP_RECT_INVALID,
      'Bounding box crop requires cropRect.'
    );
  }

  if (sourceBuffer && sourceWidth > 0 && sourceHeight > 0) {
    let cropSourceBuffer = sourceBuffer;
    let cropSourceWidth = sourceWidth;
    let cropSourceHeight = sourceHeight;

    if (payload.canvasContext) {
      const canvasValidation = validateCropSourceDimensions(
        payload.canvasContext.canvasWidth,
        payload.canvasContext.canvasHeight
      );
      if (!canvasValidation.ok) {
        throw cropBadRequest(
          IMAGE_STUDIO_CROP_ERROR_CODES.SOURCE_IMAGE_TOO_LARGE,
          'Canvas context exceeds crop processing limits.',
          {
            reason: canvasValidation.reason,
            width: payload.canvasContext.canvasWidth,
            height: payload.canvasContext.canvasHeight,
          }
        );
      }
      cropSourceBuffer = await composeSourceOnCanvas({
        sourceBuffer,
        canvasWidth: payload.canvasContext.canvasWidth,
        canvasHeight: payload.canvasContext.canvasHeight,
        imageFrame: payload.canvasContext.imageFrame,
      });
      cropSourceWidth = payload.canvasContext.canvasWidth;
      cropSourceHeight = payload.canvasContext.canvasHeight;
    }

    const region = clampCropRect(requestedRect, cropSourceWidth, cropSourceHeight);
    const outputValid = validateCropOutputDimensions(region.width, region.height);
    if (!outputValid) {
      throw cropBadRequest(
        IMAGE_STUDIO_CROP_ERROR_CODES.OUTPUT_INVALID,
        'Cropped output exceeds crop limits.',
        { width: region.width, height: region.height }
      );
    }

    const outputBuffer = await sharp(cropSourceBuffer).extract(region).png().toBuffer();
    return {
      outputBuffer,
      outputMime: 'image/png',
      cropRect: {
        x: region.left,
        y: region.top,
        width: region.width,
        height: region.height,
      },
      outputWidth: region.width,
      outputHeight: region.height,
      effectiveMode: 'server_bbox',
      authoritativeSource: 'source_slot',
    };
  }

  if (payload.mode !== 'client_bbox') {
    throw sourceLoadError instanceof Error
      ? sourceLoadError
      : cropBadRequest(
        IMAGE_STUDIO_CROP_ERROR_CODES.SOURCE_IMAGE_MISSING,
        'Server crop requires a resolvable source image.'
      );
  }

  if (uploadedClientImage) {
    const metadata = await sharp(uploadedClientImage.buffer)
      .metadata()
      .catch(() => null);
    const outputWidth = metadata?.width ?? null;
    const outputHeight = metadata?.height ?? null;
    if (outputWidth && outputHeight && !validateCropOutputDimensions(outputWidth, outputHeight)) {
      throw cropBadRequest(
        IMAGE_STUDIO_CROP_ERROR_CODES.OUTPUT_INVALID,
        'Uploaded crop output exceeds crop limits.',
        { width: outputWidth, height: outputHeight }
      );
    }

    return {
      outputBuffer: uploadedClientImage.buffer,
      outputMime: uploadedClientImage.mime,
      cropRect: requestedRect,
      outputWidth,
      outputHeight,
      effectiveMode: 'client_bbox',
      authoritativeSource: 'client_upload_fallback',
    };
  }

  const parsedData = parseDataUrl(payload.dataUrl ?? '');
  if (!parsedData) {
    throw cropBadRequest(
      IMAGE_STUDIO_CROP_ERROR_CODES.CLIENT_DATA_URL_INVALID,
      'Invalid crop image data URL.'
    );
  }

  const metadata = await sharp(parsedData.buffer)
    .metadata()
    .catch(() => null);
  const outputWidth = metadata?.width ?? null;
  const outputHeight = metadata?.height ?? null;
  if (outputWidth && outputHeight && !validateCropOutputDimensions(outputWidth, outputHeight)) {
    throw cropBadRequest(
      IMAGE_STUDIO_CROP_ERROR_CODES.OUTPUT_INVALID,
      'Data URL crop output exceeds crop limits.',
      { width: outputWidth, height: outputHeight }
    );
  }

  return {
    outputBuffer: parsedData.buffer,
    outputMime: parsedData.mime,
    cropRect: requestedRect,
    outputWidth,
    outputHeight,
    effectiveMode: 'client_bbox',
    authoritativeSource: 'client_upload_fallback',
  };
}

export async function postCropSlotHandler(
  req: NextRequest,
  ctx: ApiHandlerContext,
  params: { slotId: string }
): Promise<Response> {
  const slotId = params.slotId?.trim() ?? '';
  if (!slotId) {
    throw cropBadRequest(IMAGE_STUDIO_CROP_ERROR_CODES.INVALID_PAYLOAD, 'Slot id is required.');
  }

  const startedAt = Date.now();
  const { body, uploadedClientImage } = await parseCropRequestPayload(req);
  const normalizedBody =
    body && typeof body === 'object' && !Array.isArray(body)
      ? { ...(body as Record<string, unknown>) }
      : {};
  const normalizedMode =
    typeof normalizedBody['mode'] === 'string' ? normalizedBody['mode'].trim() : '';
  if (normalizedMode) {
    normalizedBody['mode'] = normalizedMode;
  } else if (Array.isArray(normalizedBody['polygon'])) {
    normalizedBody['mode'] = 'server_polygon';
  } else if (normalizedBody['cropRect'] && typeof normalizedBody['cropRect'] === 'object') {
    normalizedBody['mode'] = 'server_bbox';
  }

  const parsed = imageStudioCropRequestSchema.safeParse(normalizedBody);
  if (!parsed.success) {
    throw cropBadRequest(IMAGE_STUDIO_CROP_ERROR_CODES.INVALID_PAYLOAD, 'Invalid crop payload.', {
      errors: parsed.error.format(),
    });
  }

  const sourceSlot = await getImageStudioSlotById(slotId);
  if (!sourceSlot) {
    throw notFoundError('Source slot not found.', {
      cropErrorCode: IMAGE_STUDIO_CROP_ERROR_CODES.SOURCE_SLOT_MISSING,
      slotId,
    });
  }

  const idempotencyKey = parsed.data.requestId?.trim() || readIdempotencyKey(req);
  const payload: ImageStudioCropRequest = {
    ...parsed.data,
    ...(idempotencyKey ? { requestId: idempotencyKey } : {}),
  };

  if (
    payload.mode === 'client_bbox' &&
    !payload.dataUrl &&
    !uploadedClientImage &&
    STRICT_SERVER_CROP_ENABLED === false
  ) {
    throw cropBadRequest(
      IMAGE_STUDIO_CROP_ERROR_CODES.CLIENT_IMAGE_REQUIRED,
      'Client crop requires uploaded image or dataUrl when authoritative server mode is disabled.'
    );
  }

  const sourceSignature = [
    sourceSlot.id,
    sourceSlot.projectId,
    sourceSlot.imageFileId ?? '',
    sourceSlot.imageFile?.filepath ?? sourceSlot.imageUrl ?? '',
    sourceSlot.imageBase64 ? `b64:${sourceSlot.imageBase64.length}` : '',
  ].join('|');

  const fingerprint = buildCropFingerprint({
    sourceSignature,
    mode: payload.mode,
    cropRect: payload.cropRect,
    polygon: payload.polygon,
    canvasContext: payload.canvasContext,
  });
  const fingerprintRelationType = buildCropFingerprintRelationType(fingerprint);
  const requestRelationType = idempotencyKey ? buildCropRequestRelationType(idempotencyKey) : null;

  if (requestRelationType) {
    const existingByRequest = await getImageStudioSlotLinkBySourceAndRelation(
      sourceSlot.projectId,
      sourceSlot.id,
      requestRelationType
    );
    if (existingByRequest) {
      const existingSlot = await getImageStudioSlotById(existingByRequest.targetSlotId);
      if (existingSlot) {
        const responseBody = imageStudioCropResponseSchema.parse({
          sourceSlotId: sourceSlot.id,
          slot: existingSlot,
          mode: payload.mode,
          effectiveMode: payload.mode,
          cropRect: payload.cropRect ?? null,
          canvasContext: payload.canvasContext ?? null,
          requestId: idempotencyKey,
          fingerprint,
          deduplicated: true,
          dedupeReason: 'request',
          lifecycle: { state: 'persisted', durationMs: Date.now() - startedAt },
          pipelineVersion: CROP_PIPELINE_VERSION,
        });
        return NextResponse.json(responseBody, { status: 200 });
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
      const responseBody = imageStudioCropResponseSchema.parse({
        sourceSlotId: sourceSlot.id,
        slot: existingSlot,
        mode: payload.mode,
        effectiveMode: payload.mode,
        cropRect: payload.cropRect ?? null,
        canvasContext: payload.canvasContext ?? null,
        requestId: idempotencyKey,
        fingerprint,
        deduplicated: true,
        dedupeReason: 'fingerprint',
        lifecycle: { state: 'persisted', durationMs: Date.now() - startedAt },
        pipelineVersion: CROP_PIPELINE_VERSION,
      });
      return NextResponse.json(responseBody, { status: 200 });
    }
  }

  try {
    const processed = await processCropPayload({
      payload,
      sourceSlot,
      uploadedClientImage,
    });

    if (processed.authoritativeSource === 'client_upload_fallback') {
      void logSystemEvent({
        level: 'warn',
        source: 'image-studio.crop',
        message: 'Crop fell back to client-provided payload because source image was unavailable.',
        request: req,
        requestId: ctx.requestId,
        context: {
          projectId: sourceSlot.projectId,
          sourceSlotId: sourceSlot.id,
          mode: payload.mode,
          canvasContext: payload.canvasContext ?? null,
          diagnostics: payload.diagnostics ?? null,
          requestId: idempotencyKey,
          fingerprint,
        },
      });
    }

    const ext = guessExtension(processed.outputMime);
    const now = Date.now();
    const safeProjectId = sanitizeSegment(sourceSlot.projectId);
    const safeSourceSlotId = sanitizeSegment(sourceSlot.id);
    const baseName = sanitizeFilename(payload.name ?? '') || `crop-${payload.mode}-${now}`;
    const fileName = baseName.endsWith(ext) ? baseName : `${baseName}${ext}`;

    const diskDir = path.join(uploadsRoot, safeProjectId, safeSourceSlotId);
    const diskPath = path.join(diskDir, fileName);
    const publicPath = `/uploads/studio/crops/${safeProjectId}/${safeSourceSlotId}/${fileName}`;

    await fs.mkdir(diskDir, { recursive: true });
    await fs.writeFile(diskPath, processed.outputBuffer);

    const imageFileRepository = await getImageFileRepository();
    const imageFile = await imageFileRepository.createImageFile({
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
        name: `${sourceLabel} • Crop`,
        folderPath: sourceSlot.folderPath ?? null,
        imageFileId: imageFile.id,
        imageUrl: imageFile.filepath,
        imageBase64: null,
        metadata: {
          role: 'generation',
          sourceSlotId: sourceSlot.id,
          sourceSlotIds: [sourceSlot.id],
          relationType: 'crop:output',
          crop: {
            mode: payload.mode,
            effectiveMode: processed.effectiveMode,
            authoritativeSource: processed.authoritativeSource,
            cropRect: processed.cropRect,
            canvasContext: payload.canvasContext ?? null,
            diagnostics: payload.diagnostics ?? null,
            polygon: payload.mode === 'server_polygon' ? payload.polygon : undefined,
            requestId: idempotencyKey,
            fingerprint,
            pipelineVersion: CROP_PIPELINE_VERSION,
            timestamp: new Date(now).toISOString(),
          },
        },
      },
    ]);

    const createdSlot = createdSlots[0];
    if (!createdSlot) {
      throw cropBadRequest(
        IMAGE_STUDIO_CROP_ERROR_CODES.OUTPUT_PERSIST_FAILED,
        'Failed to create cropped slot.'
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
        cropRect: processed.cropRect,
        canvasContext: payload.canvasContext ?? null,
        diagnostics: payload.diagnostics ?? null,
        fingerprint,
        requestId: idempotencyKey,
        pipelineVersion: CROP_PIPELINE_VERSION,
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
          cropRect: processed.cropRect,
          canvasContext: payload.canvasContext ?? null,
          diagnostics: payload.diagnostics ?? null,
          fingerprint,
          requestId: idempotencyKey,
          pipelineVersion: CROP_PIPELINE_VERSION,
        },
      });
    }

    const durationMs = Date.now() - startedAt;
    void logSystemEvent({
      level: 'info',
      source: 'image-studio.crop',
      message: 'Image Studio crop persisted.',
      request: req,
      requestId: ctx.requestId,
      context: {
        projectId: sourceSlot.projectId,
        sourceSlotId: sourceSlot.id,
        createdSlotId: createdSlot.id,
        mode: payload.mode,
        effectiveMode: processed.effectiveMode,
        authoritativeSource: processed.authoritativeSource,
        canvasContext: payload.canvasContext ?? null,
        diagnostics: payload.diagnostics ?? null,
        outputWidth: processed.outputWidth,
        outputHeight: processed.outputHeight,
        outputBytes: processed.outputBuffer.length,
        durationMs,
        requestId: idempotencyKey,
        fingerprint,
        pipelineVersion: CROP_PIPELINE_VERSION,
      },
    });

    const responseBody = imageStudioCropResponseSchema.parse({
      sourceSlotId: sourceSlot.id,
      slot: createdSlot,
      imageFile,
      mode: payload.mode,
      effectiveMode: processed.effectiveMode,
      cropRect: processed.cropRect,
      canvasContext: payload.canvasContext ?? null,
      requestId: idempotencyKey,
      fingerprint,
      deduplicated: false,
      lifecycle: {
        state: 'persisted',
        durationMs,
      },
      pipelineVersion: CROP_PIPELINE_VERSION,
    });

    return NextResponse.json(responseBody, { status: 201 });
  } catch (error) {
    void ErrorSystem.captureException(error);
    void logSystemEvent({
      level: 'warn',
      source: 'image-studio.crop',
      message: 'Image Studio crop failed.',
      request: req,
      requestId: ctx.requestId,
      error,
      context: {
        projectId: sourceSlot.projectId,
        sourceSlotId: sourceSlot.id,
        mode: payload.mode,
        canvasContext: payload.canvasContext ?? null,
        requestId: idempotencyKey,
        fingerprint,
        diagnostics: payload.diagnostics ?? null,
        cropErrorCode: isAppError(error) ? error.meta?.['cropErrorCode'] : undefined,
        durationMs: Date.now() - startedAt,
      },
    });
    throw error;
  }
}
