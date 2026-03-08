import fs from 'fs/promises';
import path from 'path';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  IMAGE_STUDIO_CENTER_ERROR_CODES,
  imageStudioCenterRequestSchema,
  normalizeImageStudioCenterMode,
  type ImageStudioCenterRequest,
  type ImageStudioCenterObjectBounds,
  type ImageStudioCenterLayoutMetadata,
  type ImageStudioObjectDetectionUsed,
  type ImageStudioDetectionDetails,
} from '@/features/ai/image-studio/contracts/center';
import {
  buildCenterFingerprint,
  buildCenterFingerprintRelationType,
  buildCenterLayoutSignature,
  buildCenterRequestRelationType,
} from '@/features/ai/image-studio/server/center-utils';
import {
  getImageStudioSlotLinkBySourceAndRelation,
  upsertImageStudioSlotLink,
} from '@/features/ai/server';
import { createImageStudioSlots, getImageStudioSlotById } from '@/features/ai/server';
import { getImageFileRepository } from '@/features/files/server';
import { logSystemEvent } from '@/shared/lib/observability/system-logger';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { notFoundError } from '@/shared/errors/app-error';

import {
  centerBadRequest,
  guessExtension,
  isClientCenterMode,
  readIdempotencyKey,
  sanitizeFilename,
  sanitizeSegment,
} from '@/features/ai/image-studio/server/image-handler-utils';
import { processCenterPayload } from '@/features/ai/image-studio/server/center-service';
import {
  parseCenterRequestPayload,
  normalizeCenterRequestBody,
  buildClientPayloadSignature,
  readCenterMetadataFromSlot,
  parseCenterResponsePayload,
} from './helpers';

const uploadsRoot = path.join(process.cwd(), 'public', 'uploads', 'studio', 'center');
const CENTER_PIPELINE_VERSION = process.env['IMAGE_STUDIO_CENTER_PIPELINE_VERSION']?.trim() || 'v2';
const STRICT_SERVER_CENTER_ENABLED =
  process.env['IMAGE_STUDIO_CENTER_SERVER_AUTHORITATIVE'] !== 'false';
const CENTER_FINGERPRINT_DEDUPE_ENABLED =
  process.env['IMAGE_STUDIO_CENTER_DEDUPE_BY_FINGERPRINT'] === 'true';

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
      'Invalid centering payload.',
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

  const idempotencyKey = parsed.data.requestId?.trim() || readIdempotencyKey(req) || undefined;
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
      'Client centering requires uploaded image or dataUrl when authoritative server mode is disabled.'
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
  const layoutSignature = buildCenterLayoutSignature(payload.layout);
  const fingerprint = buildCenterFingerprint({
    sourceSignature,
    mode: payload.mode,
    layoutSignature,
    clientPayloadSignature:
      isClientCenterMode(payload.mode) && !STRICT_SERVER_CENTER_ENABLED
        ? clientPayloadSignature
        : null,
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
            effectiveMode:
              normalizeImageStudioCenterMode(
                typeof existingCenter.effectiveMode === 'string'
                  ? existingCenter.effectiveMode
                  : null
              ) ?? payload.mode,
            sourceObjectBounds: existingCenter.sourceObjectBounds as ImageStudioCenterObjectBounds,
            targetObjectBounds: existingCenter.targetObjectBounds as ImageStudioCenterObjectBounds,
            layout: existingCenter.layout as ImageStudioCenterLayoutMetadata,
            detectionUsed: existingCenter.detectionUsed as ImageStudioObjectDetectionUsed,
            confidenceBefore: existingCenter.confidenceBefore as number,
            detectionDetails: existingCenter.detectionDetails as ImageStudioDetectionDetails,
            scale: existingCenter.scale as number,
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
            effectiveMode:
              normalizeImageStudioCenterMode(
                typeof existingCenter.effectiveMode === 'string'
                  ? existingCenter.effectiveMode
                  : null
              ) ?? payload.mode,
            sourceObjectBounds: existingCenter.sourceObjectBounds as ImageStudioCenterObjectBounds,
            targetObjectBounds: existingCenter.targetObjectBounds as ImageStudioCenterObjectBounds,
            layout: existingCenter.layout as ImageStudioCenterLayoutMetadata,
            detectionUsed: existingCenter.detectionUsed as ImageStudioObjectDetectionUsed,
            confidenceBefore: existingCenter.confidenceBefore as number,
            detectionDetails: existingCenter.detectionDetails as ImageStudioDetectionDetails,
            scale: existingCenter.scale as number,
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
          'Center scaler fell back to client-provided payload because source image was unavailable.',
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
      message: 'Image Studio center scaler persisted.',
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
          'Center scaler schema validation failed.',
          { responseErrors: error.format() }
        )
        : error;

    void logSystemEvent({
      level: 'warn',
      source: 'image-studio.center',
      message: 'Image Studio center scaler failed.',
      request: req,
      requestId: ctx.requestId,
      error: normalizedError,
      context: {
        projectId: sourceSlot.projectId,
        sourceSlotId: sourceSlot.id,
        mode: payload.mode,
        requestId: idempotencyKey,
        fingerprint,
        pipelineVersion: CENTER_PIPELINE_VERSION,
      },
    });
    throw normalizedError;
  }
}
