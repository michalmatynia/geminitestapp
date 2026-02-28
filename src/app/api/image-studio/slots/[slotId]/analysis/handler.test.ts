import { NextRequest } from 'next/server';
import sharp from 'sharp';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { IMAGE_STUDIO_ANALYSIS_ERROR_CODES } from '@/features/ai/image-studio/contracts/analysis';

const {
  analyzeImageByAutoScalerLayoutMock,
  getImageStudioSlotByIdMock,
  loadSourceBufferFromSlotMock,
  parseImageDataUrlMock,
  logSystemEventMock,
} = vi.hoisted(() => ({
  analyzeImageByAutoScalerLayoutMock: vi.fn(),
  getImageStudioSlotByIdMock: vi.fn(),
  loadSourceBufferFromSlotMock: vi.fn(),
  parseImageDataUrlMock: vi.fn(),
  logSystemEventMock: vi.fn(),
}));

vi.mock('@/features/ai/image-studio/server/auto-scaler-utils', () => ({
  analyzeImageByAutoScalerLayout: analyzeImageByAutoScalerLayoutMock,
}));

vi.mock('@/features/ai/image-studio/server/slot-repository', () => ({
  getImageStudioSlotById: getImageStudioSlotByIdMock,
}));

vi.mock('@/features/ai/image-studio/server/source-image-utils', () => ({
  loadSourceBufferFromSlot: loadSourceBufferFromSlotMock,
  parseImageDataUrl: parseImageDataUrlMock,
}));

vi.mock('@/shared/lib/observability/system-logger', () => ({
  logSystemEvent: logSystemEventMock,
}));

const createPngBuffer = async (width: number, height: number): Promise<Buffer> =>
  sharp({
    create: {
      width,
      height,
      channels: 4,
      background: { r: 255, g: 255, b: 255, alpha: 1 },
    },
  })
    .png()
    .toBuffer();

const buildSlot = (overrides: Record<string, unknown> = {}): Record<string, unknown> => ({
  id: 'source-slot',
  projectId: 'project-1',
  name: 'Source',
  folderPath: null,
  imageFileId: 'source-file-1',
  imageUrl: '/uploads/studio/source.png',
  imageBase64: null,
  asset3dId: null,
  screenshotFileId: null,
  metadata: null,
  createdAt: new Date('2026-02-20T18:30:00.000Z').toISOString(),
  updatedAt: new Date('2026-02-20T18:30:00.000Z').toISOString(),
  ...overrides,
});

const buildRequest = (body: Record<string, unknown>): NextRequest =>
  new NextRequest('http://localhost/api/image-studio/slots/source-slot/analysis', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
    },
    body: JSON.stringify(body),
  });

const buildApiContext = () =>
  ({
    requestId: 'req-analysis-test-1',
    startTime: Date.now(),
    userId: null,
    getElapsedMs: () => 0,
  }) as const;

const loadHandler = async () => {
  const mod = await import('./handler');
  return mod.postAnalyzeSlotHandler;
};

describe('image-studio analysis handler', () => {
  let sourceBuffer: Buffer;

  beforeEach(async () => {
    vi.resetModules();

    delete process.env['IMAGE_STUDIO_ANALYSIS_SERVER_AUTHORITATIVE'];
    delete process.env['IMAGE_STUDIO_ANALYSIS_PIPELINE_VERSION'];

    sourceBuffer = await createPngBuffer(20, 20);

    analyzeImageByAutoScalerLayoutMock.mockReset();
    getImageStudioSlotByIdMock.mockReset();
    loadSourceBufferFromSlotMock.mockReset();
    parseImageDataUrlMock.mockReset();
    logSystemEventMock.mockReset();

    getImageStudioSlotByIdMock.mockResolvedValue(buildSlot());
    loadSourceBufferFromSlotMock.mockResolvedValue({
      buffer: sourceBuffer,
      mimeHint: 'image/png',
    });
    parseImageDataUrlMock.mockReturnValue(null);

    analyzeImageByAutoScalerLayoutMock.mockResolvedValue({
      width: 20,
      height: 20,
      sourceObjectBounds: { left: 2, top: 3, width: 6, height: 6 },
      detectionUsed: 'white_bg_first_colored_pixel',
      confidence: 0.95,
      detectionDetails: {
        shadowPolicyRequested: 'auto',
        shadowPolicyApplied: 'exclude_shadow',
        componentCount: 2,
        coreComponentCount: 1,
        selectedComponentPixels: 36,
        selectedComponentCoverage: 0.9474,
        foregroundPixels: 37,
        corePixels: 36,
        touchesBorder: false,
        maskSource: 'core',
        policyVersion: 'v2',
        policyReason: 'auto_white_tighter_bounds',
        fallbackApplied: false,
        candidateDetections: {
          alpha_bbox: { confidence: 0.52, area: 400 },
          white_bg_first_colored_pixel: { confidence: 0.95, area: 36 },
        },
      },
      policyVersion: 'v2',
      policyReason: 'auto_white_tighter_bounds',
      fallbackApplied: false,
      candidateDetections: {
        alpha_bbox: { confidence: 0.52, area: 400 },
        white_bg_first_colored_pixel: { confidence: 0.95, area: 36 },
      },
      whitespace: {
        px: { left: 2, top: 3, right: 12, bottom: 11 },
        percent: { left: 10, top: 15, right: 60, bottom: 55 },
      },
      objectAreaPercent: 9,
      layout: {
        paddingPercent: 8,
        paddingXPercent: 8,
        paddingYPercent: 8,
        fillMissingCanvasWhite: true,
        targetCanvasWidth: 20,
        targetCanvasHeight: 20,
        whiteThreshold: 16,
        chromaThreshold: 10,
        shadowPolicy: 'auto',
        detection: 'auto',
      },
      suggestedPlan: {
        outputWidth: 20,
        outputHeight: 20,
        targetObjectBounds: { left: 6, top: 6, width: 8, height: 8 },
        scale: 1.333333,
        whitespace: {
          px: { left: 6, top: 6, right: 6, bottom: 6 },
          percent: { left: 30, top: 30, right: 30, bottom: 30 },
        },
      },
    });
  });

  it('returns server analysis response when source slot image is resolved', async () => {
    const postAnalyzeSlotHandler = await loadHandler();
    const response = await postAnalyzeSlotHandler(
      buildRequest({
        mode: 'server_analysis_v1',
      }),
      buildApiContext(),
      { slotId: 'source-slot' }
    );

    const payload = (await response.json()) as Record<string, unknown>;
    expect(response.status).toBe(200);
    expect(payload['sourceSlotId']).toBe('source-slot');
    expect(payload['mode']).toBe('server_analysis_v1');
    expect(payload['effectiveMode']).toBe('server_analysis_v1');
    expect(payload['authoritativeSource']).toBe('source_slot');
    expect(payload['sourceMimeHint']).toBe('image/png');
    expect((payload['analysis'] as Record<string, unknown>)['detectionUsed']).toBe(
      'white_bg_first_colored_pixel'
    );

    expect(loadSourceBufferFromSlotMock).toHaveBeenCalledTimes(1);
    expect(analyzeImageByAutoScalerLayoutMock).toHaveBeenCalledTimes(1);
    expect(parseImageDataUrlMock).not.toHaveBeenCalled();
  });

  it('propagates shared preset layout settings into analysis execution', async () => {
    const sharedPresetLayout = {
      paddingPercent: 12,
      paddingXPercent: 10,
      paddingYPercent: 14,
      fillMissingCanvasWhite: true,
      targetCanvasWidth: 40,
      targetCanvasHeight: 30,
      whiteThreshold: 18,
      chromaThreshold: 9,
      shadowPolicy: 'include_shadow',
      detection: 'white_bg_first_colored_pixel',
    } as const;

    const postAnalyzeSlotHandler = await loadHandler();
    const response = await postAnalyzeSlotHandler(
      buildRequest({
        mode: 'server_analysis_v1',
        layout: sharedPresetLayout,
      }),
      buildApiContext(),
      { slotId: 'source-slot' }
    );

    expect(response.status).toBe(200);
    expect(analyzeImageByAutoScalerLayoutMock).toHaveBeenCalledTimes(1);
    expect(analyzeImageByAutoScalerLayoutMock).toHaveBeenCalledWith(
      sourceBuffer,
      sharedPresetLayout,
      { preferTargetCanvas: true }
    );
  });

  it('returns low-confidence fallback policy metadata in analysis payload', async () => {
    analyzeImageByAutoScalerLayoutMock.mockResolvedValueOnce({
      width: 20,
      height: 20,
      sourceObjectBounds: { left: 1, top: 1, width: 7, height: 7 },
      detectionUsed: 'alpha_bbox',
      confidence: 0.44,
      detectionDetails: {
        shadowPolicyRequested: 'auto',
        shadowPolicyApplied: 'exclude_shadow',
        componentCount: 2,
        coreComponentCount: 1,
        selectedComponentPixels: 49,
        selectedComponentCoverage: 0.73,
        foregroundPixels: 67,
        corePixels: 49,
        touchesBorder: false,
        maskSource: 'core',
        policyVersion: 'v2',
        policyReason: 'auto_white_low_confidence_fallback_alpha',
        fallbackApplied: true,
        candidateDetections: {
          alpha_bbox: { confidence: 0.44, area: 49 },
          white_bg_first_colored_pixel: { confidence: 0.21, area: 30 },
        },
      },
      policyVersion: 'v2',
      policyReason: 'auto_white_low_confidence_fallback_alpha',
      fallbackApplied: true,
      candidateDetections: {
        alpha_bbox: { confidence: 0.44, area: 49 },
        white_bg_first_colored_pixel: { confidence: 0.21, area: 30 },
      },
      whitespace: {
        px: { left: 1, top: 1, right: 12, bottom: 12 },
        percent: { left: 5, top: 5, right: 60, bottom: 60 },
      },
      objectAreaPercent: 12.25,
      layout: {
        paddingPercent: 8,
        paddingXPercent: 8,
        paddingYPercent: 8,
        fillMissingCanvasWhite: true,
        targetCanvasWidth: 20,
        targetCanvasHeight: 20,
        whiteThreshold: 16,
        chromaThreshold: 10,
        shadowPolicy: 'auto',
        detection: 'auto',
      },
      suggestedPlan: {
        outputWidth: 20,
        outputHeight: 20,
        targetObjectBounds: { left: 5, top: 5, width: 10, height: 10 },
        scale: 1.428571,
        whitespace: {
          px: { left: 5, top: 5, right: 5, bottom: 5 },
          percent: { left: 25, top: 25, right: 25, bottom: 25 },
        },
      },
    });

    const postAnalyzeSlotHandler = await loadHandler();
    const response = await postAnalyzeSlotHandler(
      buildRequest({
        mode: 'server_analysis_v1',
      }),
      buildApiContext(),
      { slotId: 'source-slot' }
    );

    const payload = (await response.json()) as Record<string, unknown>;
    const analysis = payload['analysis'] as Record<string, unknown>;
    const detectionDetails = analysis['detectionDetails'] as Record<string, unknown>;
    const candidates = detectionDetails['candidateDetections'] as Record<string, unknown>;

    expect(response.status).toBe(200);
    expect(analysis['detectionUsed']).toBe('alpha_bbox');
    expect(analysis['confidence']).toBe(0.44);
    expect(analysis['policyVersion']).toBe('v2');
    expect(analysis['policyReason']).toBe('auto_white_low_confidence_fallback_alpha');
    expect(analysis['fallbackApplied']).toBe(true);
    expect(detectionDetails['fallbackApplied']).toBe(true);
    expect(detectionDetails['policyReason']).toBe('auto_white_low_confidence_fallback_alpha');
    expect(candidates['alpha_bbox']).toEqual({ confidence: 0.44, area: 49 });
    expect(candidates['white_bg_first_colored_pixel']).toEqual({ confidence: 0.21, area: 30 });
  });

  it('falls back to client data URL source in client mode when source slot image cannot be loaded', async () => {
    loadSourceBufferFromSlotMock.mockRejectedValueOnce(new Error('source unavailable'));
    const parsedDataBuffer = await createPngBuffer(24, 24);
    parseImageDataUrlMock.mockReturnValueOnce({
      buffer: parsedDataBuffer,
      mime: 'image/png',
    });

    const postAnalyzeSlotHandler = await loadHandler();
    const response = await postAnalyzeSlotHandler(
      buildRequest({
        mode: 'client_analysis_v1',
        dataUrl: 'data:image/png;base64,ZmFrZQ==',
      }),
      buildApiContext(),
      { slotId: 'source-slot' }
    );

    const payload = (await response.json()) as Record<string, unknown>;
    expect(response.status).toBe(200);
    expect(payload['mode']).toBe('client_analysis_v1');
    expect(payload['effectiveMode']).toBe('client_analysis_v1');
    expect(payload['authoritativeSource']).toBe('client_upload');
    expect(payload['sourceMimeHint']).toBe('image/png');
    expect(analyzeImageByAutoScalerLayoutMock).toHaveBeenCalledTimes(1);
    expect(analyzeImageByAutoScalerLayoutMock).toHaveBeenCalledWith(parsedDataBuffer, undefined, {
      preferTargetCanvas: true,
    });
  });

  it('throws not found error when source slot does not exist', async () => {
    getImageStudioSlotByIdMock.mockResolvedValueOnce(null);
    const postAnalyzeSlotHandler = await loadHandler();

    let thrown: unknown = null;
    try {
      await postAnalyzeSlotHandler(
        buildRequest({
          mode: 'server_analysis_v1',
        }),
        buildApiContext(),
        { slotId: 'missing-slot' }
      );
    } catch (error) {
      thrown = error;
    }

    expect(thrown).not.toBeNull();
    expect((thrown as { code?: string }).code).toBe('NOT_FOUND');
    expect((thrown as { httpStatus?: number }).httpStatus).toBe(404);
    expect((thrown as { meta?: Record<string, unknown> }).meta?.['analysisErrorCode']).toBe(
      IMAGE_STUDIO_ANALYSIS_ERROR_CODES.SOURCE_SLOT_MISSING
    );
    expect(loadSourceBufferFromSlotMock).not.toHaveBeenCalled();
    expect(analyzeImageByAutoScalerLayoutMock).not.toHaveBeenCalled();
  });

  it('throws bad request app error for invalid analysis payload', async () => {
    const postAnalyzeSlotHandler = await loadHandler();

    let thrown: unknown = null;
    try {
      await postAnalyzeSlotHandler(
        buildRequest({
          mode: 'invalid_analysis_mode',
        }),
        buildApiContext(),
        { slotId: 'source-slot' }
      );
    } catch (error) {
      thrown = error;
    }

    expect(thrown).not.toBeNull();
    expect((thrown as { code?: string }).code).toBe('BAD_REQUEST');
    expect((thrown as { httpStatus?: number }).httpStatus).toBe(400);
    expect((thrown as { meta?: Record<string, unknown> }).meta?.['analysisErrorCode']).toBe(
      IMAGE_STUDIO_ANALYSIS_ERROR_CODES.INVALID_PAYLOAD
    );
    expect(getImageStudioSlotByIdMock).not.toHaveBeenCalled();
  });
});
