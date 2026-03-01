import fs from 'fs/promises';
import path from 'path';

import { NextRequest, NextResponse } from 'next/server';

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
  sanitizeSegment,
} from '@/features/ai/image-studio/server/image-handler-utils';
import { processAutoScalerPayload } from '@/features/ai/image-studio/server/autoscale-service';
import {
  parseAutoScalerRequestPayload,
  normalizeAutoScaleRequestBody,
  buildClientPayloadSignature,
  readAutoScaleMetadataFromSlot,
  parseAutoScaleResponsePayload,
  type ImageStudioAutoScaleMetadata,
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
  _ctx: ApiHandlerContext,
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
    STRICT_SERVER_AUTOSCALER_ENABLED
  ) {
    throw autoScaleBadRequest(
      IMAGE_STUDIO_AUTOSCALER_ERROR_CODES.CLIENT_IMAGE_REQUIRED,
      'Client dataUrl or image upload is required for client modes.'
    );
  }

  const layoutSignature = buildAutoScalerLayoutSignature(payload.layout);
  const clientSignature = buildClientPayloadSignature(payload, uploadedClientImage);
  const fingerprint = buildAutoScalerFingerprint({
    sourceSignature: sourceSlot.id,
    mode: payload.mode,
    layoutSignature,
    clientPayloadSignature: clientSignature,
  });

  const requestRelationType = idempotencyKey
    ? buildAutoScalerRequestRelationType(idempotencyKey)
    : null;
  const fingerprintRelationType = buildAutoScalerFingerprintRelationType(fingerprint);
  if (requestRelationType) {
    const existingByRequest = await getImageStudioSlotLinkBySourceAndRelation(
      sourceSlot.projectId,
      sourceSlot.id,
      requestRelationType
    );
    if (existingByRequest) {
      const existingSlot = await getImageStudioSlotById(existingByRequest.targetSlotId);
      if (existingSlot) {
        const existingAutoScale: ImageStudioAutoScaleMetadata =
          readAutoScaleMetadataFromSlot(existingSlot);
        const responseBody = parseAutoScaleResponsePayload(
          {
            sourceSlotId: sourceSlot.id,
            slot: existingSlot,
            mode: payload.mode,
            effectiveMode: (existingAutoScale.effectiveMode as unknown) ?? payload.mode,
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
        const existingAutoScale: ImageStudioAutoScaleMetadata =
          readAutoScaleMetadataFromSlot(existingSlot);
        const responseBody = parseAutoScaleResponsePayload(
          {
            sourceSlotId: sourceSlot.id,
            slot: existingSlot,
            mode: payload.mode,
            effectiveMode: (existingAutoScale.effectiveMode as unknown) ?? payload.mode,
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
      await logSystemEvent({
        level: 'info',
        message: 'Autoscale fallback to client upload',
        context: {
          slotId: sourceSlot.id,
          mode: payload.mode,
        },
      });
    }

    const filename = sanitizeFilename(
      (payload.name || `${sourceSlot.name || 'slot'}_autoscale`) +
        guessExtension(processed.outputMime)
    );

    const segment = sanitizeSegment(payload.mode);
    const subDir = path.join(sourceSlot.projectId, segment);
    const diskDir = path.join(uploadsRoot, subDir);
    await fs.mkdir(diskDir, { recursive: true });

    const diskPath = path.join(diskDir, `${Date.now()}_${filename}`);
    await fs.writeFile(diskPath, processed.outputBuffer);

    const repo = await getImageFileRepository();
    const imageFile = await repo.createImageFile({
      filename,
      filepath: path.relative(path.join(process.cwd(), 'public'), diskPath),
      mimetype: processed.outputMime,
      size: processed.outputBuffer.length,
      width: processed.outputWidth,
      height: processed.outputHeight,
      tags: ['autoscale', segment],
    });

    const targetSlots = await createImageStudioSlots(sourceSlot.projectId, [
      {
        name: filename,
        imageFileId: imageFile.id,
        metadata: {
          role: 'generation',
          sourceSlotId: sourceSlot.id,
          relationType: 'autoscale:output',
          autoscale: {
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
            requestId: idempotencyKey,
            fingerprint,
            pipelineVersion: AUTOSCALE_PIPELINE_VERSION,
          },
        },
      },
    ]);

    const targetSlot = targetSlots[0];
    if (!targetSlot) {
      throw autoScaleBadRequest(
        IMAGE_STUDIO_AUTOSCALER_ERROR_CODES.OUTPUT_PERSIST_FAILED,
        'Failed to persist autoscale slot.'
      );
    }

    if (requestRelationType) {
      await upsertImageStudioSlotLink({
        projectId: sourceSlot.projectId,
        sourceSlotId: sourceSlot.id,
        targetSlotId: targetSlot.id,
        relationType: requestRelationType,
        metadata: { fingerprint, pipelineVersion: AUTOSCALE_PIPELINE_VERSION },
      });
    }

    await upsertImageStudioSlotLink({
      projectId: sourceSlot.projectId,
      sourceSlotId: sourceSlot.id,
      targetSlotId: targetSlot.id,
      relationType: fingerprintRelationType,
      metadata: { fingerprint, pipelineVersion: AUTOSCALE_PIPELINE_VERSION },
    });

    const responseBody = parseAutoScaleResponsePayload(
      {
        sourceSlotId: sourceSlot.id,
        slot: targetSlot,
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
        requestId: idempotencyKey,
        fingerprint,
        deduplicated: false,
        lifecycle: { state: 'persisted', durationMs: Date.now() - startedAt },
        pipelineVersion: AUTOSCALE_PIPELINE_VERSION,
      },
      {
        responseStage: 'processed',
        sourceSlotId: sourceSlot.id,
        targetSlotId: targetSlot.id,
        requestId: idempotencyKey,
      }
    );

    return NextResponse.json(responseBody, { status: 201 });
  } catch (error) {
    const err = error as Record<string, unknown>;
    if (err?.['autoScaleErrorCode']) {
      throw error;
    }
    const message = error instanceof Error ? error.message : String(error);
    throw autoScaleBadRequest(IMAGE_STUDIO_AUTOSCALER_ERROR_CODES.OUTPUT_INVALID, message, {
      originalError: error,
    });
  }
}
