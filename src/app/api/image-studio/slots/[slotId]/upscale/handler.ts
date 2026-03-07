/* eslint-disable @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any */
import fs from 'fs/promises';
import path from 'path';

import { NextRequest, NextResponse } from 'next/server';

import {
  IMAGE_STUDIO_UPSCALE_ERROR_CODES,
  imageStudioUpscaleRequestSchema,
  imageStudioUpscaleResponseSchema,
  type ImageStudioUpscaleRequest,
} from '@/features/ai/image-studio/contracts/upscale';
import {
  getImageStudioSlotLinkBySourceAndRelation,
  upsertImageStudioSlotLink,
} from '@/features/ai/image-studio/server';
import {
  createImageStudioSlots,
  getImageStudioSlotById,
} from '@/features/ai/image-studio/server';
import {
  buildUpscaleFingerprint,
  buildUpscaleFingerprintRelationType,
  buildUpscaleRequestRelationType,
} from '@/features/ai/image-studio/server/upscale-utils';
import { getImageFileRepository } from '@/features/files/server';
import { logSystemEvent } from '@/shared/lib/observability/system-logger';
import type { ApiHandlerContext } from '@/shared/contracts/ui';
import { isAppError, notFoundError } from '@/shared/errors/app-error';

import {
  upscaleBadRequest,
  parseUpscaleRequestPayload,
  resolveUpscaleRequest,
} from '@/features/ai/image-studio/server/upscale/upscale-request-parser';
import {
  readIdempotencyKey,
  readUpscaleMetadataFromSlot,
  buildClientPayloadSignature,
} from '@/features/ai/image-studio/server/upscale/upscale-idempotency';
import { processUpscalePayload } from '@/features/ai/image-studio/server/upscale/upscale-processor';
import {
  formatScaleLabel,
  guessExtension,
  sanitizeFilename,
  sanitizeSegment,
} from '@/features/ai/image-studio/server/upscale/upscale-utils';

const uploadsRoot = path.join(process.cwd(), 'public', 'uploads', 'studio', 'upscale');
const UPSCALE_PIPELINE_VERSION =
  process.env['IMAGE_STUDIO_UPSCALE_PIPELINE_VERSION']?.trim() || 'v2';
const STRICT_SERVER_UPSCALE_ENABLED =
  process.env['IMAGE_STUDIO_UPSCALE_SERVER_AUTHORITATIVE'] !== 'false';

export async function postUpscaleSlotHandler(
  req: NextRequest,
  ctx: ApiHandlerContext,
  params: { slotId: string }
): Promise<Response> {
  const slotId = params.slotId?.trim() ?? '';
  if (!slotId) {
    throw upscaleBadRequest(
      IMAGE_STUDIO_UPSCALE_ERROR_CODES.INVALID_PAYLOAD,
      'Slot id is required.'
    );
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
    targetWidth:
      resolvedRequest.strategy === 'target_resolution' ? resolvedRequest.targetWidth : null,
    targetHeight:
      resolvedRequest.strategy === 'target_resolution' ? resolvedRequest.targetHeight : null,
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
  const requestRelationType = idempotencyKey
    ? buildUpscaleRequestRelationType(idempotencyKey)
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
        const existingUpscale = readUpscaleMetadataFromSlot(existingSlot);
        const responseBody = imageStudioUpscaleResponseSchema.parse({
          sourceSlotId: sourceSlot.id,
          mode: payload.mode,
          effectiveMode: existingUpscale.effectiveMode ?? payload.mode,
          strategy: existingUpscale.strategy ?? resolvedRequest.strategy,
          scale:
            existingUpscale.scale ??
            (resolvedRequest.strategy === 'scale' ? resolvedRequest.scale : null),
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
      const existingUpscale = readUpscaleMetadataFromSlot(existingSlot);
      const responseBody = imageStudioUpscaleResponseSchema.parse({
        sourceSlotId: sourceSlot.id,
        mode: payload.mode,
        effectiveMode: existingUpscale.effectiveMode ?? payload.mode,
        strategy: existingUpscale.strategy ?? resolvedRequest.strategy,
        scale:
          existingUpscale.scale ??
          (resolvedRequest.strategy === 'scale' ? resolvedRequest.scale : null),
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
      });
      return NextResponse.json(responseBody, { status: 200 });
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
        message:
          'Upscale fell back to client-provided payload because source image was unavailable.',
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
      sanitizeFilename(payload.name ?? '') || `upscale-${payload.mode}-${upscaleLabel}-${now}`;
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
      width: processed.outputWidth ?? undefined,
      height: processed.outputHeight ?? undefined,
    });

    const sourceLabel = sourceSlot.name?.trim() || sourceSlot.id;
    const createdSlots = await createImageStudioSlots(sourceSlot.projectId, [
      {
        name: `${sourceLabel} • Upscale ${upscaleLabel}`,
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

    const responseBody = imageStudioUpscaleResponseSchema.parse({
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
    });

    return NextResponse.json(responseBody, { status: 201 });
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
        upscaleErrorCode: isAppError(error) ? (error.meta as any)?.['upscaleErrorCode'] : undefined,
        durationMs: Date.now() - startedAt,
      },
    });
    throw error;
  }
}
