import { type NextRequest, NextResponse } from 'next/server';

import {
  IMAGE_STUDIO_ANALYSIS_ERROR_CODES,
  imageStudioAnalysisResponseSchema,
  imageStudioAnalysisRequestSchema,
  type ImageStudioAnalysisErrorCode,
  type ImageStudioAnalysisMode,
  type ImageStudioAnalysisRequest,
} from '@/features/ai/image-studio/contracts/analysis';
import { analyzeImageByAutoScalerLayout } from '@/features/ai/image-studio/server/auto-scaler-utils';
import {
  loadSourceBufferFromSlot,
  parseImageDataUrl,
} from '@/features/ai/image-studio/server/source-image-utils';
import { getImageStudioSlotById, type StudioSlotRecord } from '@/features/ai/server';
import type { UploadedClientAnalysisImage } from '@/shared/contracts/image-studio';
import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import { badRequestError, isAppError, notFoundError } from '@/shared/errors/app-error';
import { parseObjectJsonBody } from '@/shared/lib/api/parse-json';
import { logSystemEvent } from '@/shared/lib/observability/system-logger';
import { ErrorSystem } from '@/shared/utils/observability/error-system';


const SOURCE_FETCH_TIMEOUT_MS = 15_000;
const ANALYSIS_PIPELINE_VERSION =
  process.env['IMAGE_STUDIO_ANALYSIS_PIPELINE_VERSION']?.trim() || 'v1';
const STRICT_SERVER_ANALYSIS_ENABLED =
  process.env['IMAGE_STUDIO_ANALYSIS_SERVER_AUTHORITATIVE'] !== 'false';
type AnalysisSource = {
  buffer: Buffer;
  sourceKind: 'source_slot' | 'client_upload';
  mimeHint: string | null;
};

const isFileLike = (value: FormDataEntryValue | null): value is File => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<File>;
  return typeof candidate.size === 'number' && typeof candidate.arrayBuffer === 'function';
};

const analysisBadRequest = (
  analysisErrorCode: ImageStudioAnalysisErrorCode,
  message: string,
  meta?: Record<string, unknown>
) => badRequestError(message, { analysisErrorCode, ...(meta ?? {}) });

const isClientAnalysisMode = (mode: ImageStudioAnalysisMode): boolean => mode === 'client_analysis';

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

async function parseAnalysisRequestPayload(
  req: NextRequest
): Promise<{ body: unknown; uploadedClientImage: UploadedClientAnalysisImage | null }> {
  const contentType = req.headers.get('content-type')?.toLowerCase() ?? '';
  if (!contentType.includes('multipart/form-data')) {
    const parsed = await parseObjectJsonBody(req, {
      allowEmpty: true,
      logPrefix: 'image-studio.slots.analysis',
    });
    return { body: parsed.ok ? parsed.data : {}, uploadedClientImage: null };
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

  let uploadedClientImage: UploadedClientAnalysisImage | null = null;
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
      ...(parseJsonFormValue<Record<string, unknown>>(form.get('analysis')) ?? {}),
    },
    uploadedClientImage,
  };
}

async function resolveAnalysisSource(input: {
  payload: ImageStudioAnalysisRequest;
  sourceSlot: StudioSlotRecord;
  uploadedClientImage: UploadedClientAnalysisImage | null;
}): Promise<AnalysisSource> {
  const { payload, sourceSlot, uploadedClientImage } = input;
  const preferAuthoritativeSource =
    STRICT_SERVER_ANALYSIS_ENABLED || payload.mode === 'server_analysis';

  let sourceBuffer: Buffer | null = null;
  let sourceMimeHint: string | null = null;
  let sourceLoadError: unknown = null;

  if (preferAuthoritativeSource || isClientAnalysisMode(payload.mode)) {
    try {
      const loaded = await loadSourceBufferFromSlot({
        slot: sourceSlot,
        sourceFetchTimeoutMs: SOURCE_FETCH_TIMEOUT_MS,
        onMissingSource: () =>
          analysisBadRequest(
            IMAGE_STUDIO_ANALYSIS_ERROR_CODES.SOURCE_IMAGE_MISSING,
            'Slot has no source image to analyze.'
          ),
        onInvalidSource: () =>
          analysisBadRequest(
            IMAGE_STUDIO_ANALYSIS_ERROR_CODES.SOURCE_IMAGE_INVALID,
            'Slot source image path is invalid.'
          ),
        onRemoteFetchFailed: (status) =>
          analysisBadRequest(
            IMAGE_STUDIO_ANALYSIS_ERROR_CODES.SOURCE_IMAGE_INVALID,
            `Failed to fetch source image (${status}).`,
            { status }
          ),
      });
      sourceBuffer = loaded.buffer;
      sourceMimeHint = loaded.mimeHint;
    } catch (error) {
      void ErrorSystem.captureException(error);
      sourceLoadError = error;
    }
  }

  if (sourceBuffer) {
    return {
      buffer: sourceBuffer,
      sourceKind: 'source_slot',
      mimeHint: sourceMimeHint,
    };
  }

  if (!isClientAnalysisMode(payload.mode)) {
    throw sourceLoadError instanceof Error
      ? sourceLoadError
      : analysisBadRequest(
        IMAGE_STUDIO_ANALYSIS_ERROR_CODES.SOURCE_IMAGE_MISSING,
        'Server analysis requires a resolvable source image.'
      );
  }

  if (uploadedClientImage) {
    return {
      buffer: uploadedClientImage.buffer,
      sourceKind: 'client_upload',
      mimeHint: uploadedClientImage.mime,
    };
  }

  const parsedData = parseImageDataUrl(payload.dataUrl ?? '');
  if (!parsedData) {
    throw analysisBadRequest(
      IMAGE_STUDIO_ANALYSIS_ERROR_CODES.INVALID_PAYLOAD,
      'Client analysis requires a valid image data URL or uploaded image.'
    );
  }

  return {
    buffer: parsedData.buffer,
    sourceKind: 'client_upload',
    mimeHint: parsedData.mime,
  };
}

export async function postAnalyzeSlotHandler(
  req: NextRequest,
  ctx: ApiHandlerContext,
  params: { slotId: string }
): Promise<Response> {
  const slotId = params.slotId?.trim() ?? '';
  if (!slotId) {
    throw analysisBadRequest(
      IMAGE_STUDIO_ANALYSIS_ERROR_CODES.INVALID_PAYLOAD,
      'Slot id is required.'
    );
  }

  const startedAt = Date.now();
  const { body, uploadedClientImage } = await parseAnalysisRequestPayload(req);
  const normalizedBody =
    body && typeof body === 'object' && !Array.isArray(body)
      ? { ...(body as Record<string, unknown>) }
      : {};
  const normalizedMode =
    typeof normalizedBody['mode'] === 'string' ? normalizedBody['mode'].trim() : '';
  if (!normalizedMode) {
    normalizedBody['mode'] = 'server_analysis';
  }
  const parsed = imageStudioAnalysisRequestSchema.safeParse(normalizedBody);
  if (!parsed.success) {
    throw analysisBadRequest(
      IMAGE_STUDIO_ANALYSIS_ERROR_CODES.INVALID_PAYLOAD,
      'Invalid analysis payload.',
      { errors: parsed.error.format() }
    );
  }

  const sourceSlot = await getImageStudioSlotById(slotId);
  if (!sourceSlot) {
    throw notFoundError('Source slot not found.', {
      analysisErrorCode: IMAGE_STUDIO_ANALYSIS_ERROR_CODES.SOURCE_SLOT_MISSING,
      slotId,
    });
  }

  const payload: ImageStudioAnalysisRequest = parsed.data;
  const source = await resolveAnalysisSource({
    payload,
    sourceSlot,
    uploadedClientImage,
  });

  try {
    const analysis = await analyzeImageByAutoScalerLayout(source.buffer, payload.layout, {
      preferTargetCanvas: true,
    });
    const durationMs = Date.now() - startedAt;
    const effectiveMode =
      source.sourceKind === 'source_slot' ? 'server_analysis' : 'client_analysis';

    void logSystemEvent({
      level: 'info',
      source: 'image-studio.analysis',
      message: 'Image Studio analysis completed.',
      request: req,
      requestId: ctx.requestId,
      context: {
        projectId: sourceSlot.projectId,
        sourceSlotId: sourceSlot.id,
        requestedMode: payload.mode,
        effectiveMode,
        authoritativeSource: source.sourceKind,
        sourceMimeHint: source.mimeHint,
        sourceObjectBounds: analysis.sourceObjectBounds,
        whitespace: analysis.whitespace,
        detectionUsed: analysis.detectionUsed,
        confidence: analysis.confidence,
        detectionDetails: analysis.detectionDetails,
        policyVersion: analysis.policyVersion,
        policyReason: analysis.policyReason,
        fallbackApplied: analysis.fallbackApplied,
        candidateDetections: analysis.candidateDetections,
        objectAreaPercent: analysis.objectAreaPercent,
        suggestedPlan: analysis.suggestedPlan,
        durationMs,
        pipelineVersion: ANALYSIS_PIPELINE_VERSION,
      },
    });

    const responseBody = imageStudioAnalysisResponseSchema.parse({
      sourceSlotId: sourceSlot.id,
      mode: payload.mode,
      effectiveMode,
      authoritativeSource: source.sourceKind,
      sourceMimeHint: source.mimeHint,
      analysis,
      lifecycle: {
        state: 'analyzed',
        durationMs,
      },
      pipelineVersion: ANALYSIS_PIPELINE_VERSION,
    });

    return NextResponse.json(responseBody, { status: 200 });
  } catch (error) {
    void ErrorSystem.captureException(error);
    void logSystemEvent({
      level: 'warn',
      source: 'image-studio.analysis',
      message: 'Image Studio analysis failed.',
      request: req,
      requestId: ctx.requestId,
      error,
      context: {
        projectId: sourceSlot.projectId,
        sourceSlotId: sourceSlot.id,
        mode: payload.mode,
        durationMs: Date.now() - startedAt,
        analysisErrorCode: isAppError(error) ? error.meta?.['analysisErrorCode'] : undefined,
      },
    });

    if (isAppError(error)) throw error;
    if (error instanceof Error && /No visible object pixels were detected/i.test(error.message)) {
      throw analysisBadRequest(
        IMAGE_STUDIO_ANALYSIS_ERROR_CODES.SOURCE_OBJECT_NOT_FOUND,
        'No visible object pixels were detected to analyze.'
      );
    }
    if (error instanceof Error && /dimensions are invalid/i.test(error.message)) {
      throw analysisBadRequest(
        IMAGE_STUDIO_ANALYSIS_ERROR_CODES.SOURCE_DIMENSIONS_INVALID,
        'Source image dimensions are invalid.'
      );
    }
    throw analysisBadRequest(
      IMAGE_STUDIO_ANALYSIS_ERROR_CODES.OUTPUT_INVALID,
      error instanceof Error ? error.message : 'Failed to analyze source image.'
    );
  }
}
