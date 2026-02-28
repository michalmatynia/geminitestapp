import fs from 'fs/promises';
import path from 'path';

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  IMAGE_STUDIO_AUTOSCALER_ERROR_CODES,
  imageStudioAutoScalerRequestSchema,
  type ImageStudioAutoScalerRequest,
} from '@/features/ai/image-studio/contracts/autoscaler';
import {
  buildAutoScalerFingerprint,
  buildAutoScalerFingerprintRelationType,
  buildAutoScalerLayoutSignature,
  buildAutoScalerRequestRelationType,
} from '@/features/ai/image-studio/server/auto-scaler-utils';
import {
  getImageStudioSlotLinkBySourceAndRelation,
  upsertImageStudioSlotLink,
} from '@/features/ai/image-studio/server/slot-link-repository';
import {
  createImageStudioSlots,
  getImageStudioSlotById,
} from '@/features/ai/image-studio/server/slot-repository';
import { getImageFileRepository } from '@/features/files/server';
import { logSystemEvent } from '@/shared/lib/observability/system-logger';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { notFoundError } from '@/shared/errors/app-error';

import { 
  autoScaleBadRequest, 
  guessExtension, 
  isClientAutoScaleMode, 
  readIdempotencyKey, 
  sanitizeFilename, 
  sanitizeSegment 
} from '@/features/ai/image-studio/server/image-handler-utils';
import { 
  processAutoScalerPayload,
} from '@/features/ai/image-studio/server/autoscale-service';
import { 
  parseAutoScalerRequestPayload, 
  normalizeAutoScaleRequestBody,
  buildClientPayloadSignature,
  readAutoScaleMetadataFromSlot,
  parseAutoScaleResponsePayload
} from './helpers';

const uploadsRoot = path.join(process.cwd(), 'public', 'uploads', 'studio', 'autoscale');
const AUTOSCALE_PIPELINE_VERSION =
  process.env['IMAGE_STUDIO_AUTOSCALER_PIPELINE_VERSION']?.trim() || 'v1';
const STRICT_SERVER_AUTOSCALER_ENABLED =
  process.env['IMAGE_STUDIO_AUTOSCALER_SERVER_AUTHORITATIVE'] !== 'false';
const AUTOSCALER_FINGERPRINT_DEDUPE_ENABLED =
  process.env['IMAGE_STUDIO_AUTOSCALER_DEDUPE_BY_FINGERPRINT'] === 'true';

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

  const idempotencyKey = parsed.data.requestId?.trim() || readIdempotencyKey(req) || undefined;
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
        pipelineVersion: AUTOSCALE_PIPELINE_VERSION,
      },
    });
    throw normalizedError;
  }
}
