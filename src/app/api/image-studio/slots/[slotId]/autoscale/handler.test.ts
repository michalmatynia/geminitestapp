import { NextRequest } from 'next/server';
import sharp from 'sharp';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  IMAGE_STUDIO_AUTOSCALER_ERROR_CODES,
} from '@/features/ai/image-studio/contracts/autoscaler';

const {
  mkdirMock,
  writeFileMock,
  autoScaleObjectByAnalysisMock,
  buildAutoScalerFingerprintMock,
  buildAutoScalerFingerprintRelationTypeMock,
  buildAutoScalerLayoutSignatureMock,
  buildAutoScalerRequestRelationTypeMock,
  normalizeAutoScalerLayoutConfigMock,
  validateAutoScalerOutputDimensionsMock,
  validateAutoScalerSourceDimensionsMock,
  getImageStudioSlotLinkBySourceAndRelationMock,
  upsertImageStudioSlotLinkMock,
  createImageStudioSlotsMock,
  getImageStudioSlotByIdMock,
  loadSourceBufferFromSlotMock,
  parseImageDataUrlMock,
  getImageFileRepositoryMock,
  createImageFileMock,
  logSystemEventMock,
} = vi.hoisted(() => ({
  mkdirMock: vi.fn(),
  writeFileMock: vi.fn(),
  autoScaleObjectByAnalysisMock: vi.fn(),
  buildAutoScalerFingerprintMock: vi.fn(),
  buildAutoScalerFingerprintRelationTypeMock: vi.fn(),
  buildAutoScalerLayoutSignatureMock: vi.fn(),
  buildAutoScalerRequestRelationTypeMock: vi.fn(),
  normalizeAutoScalerLayoutConfigMock: vi.fn(),
  validateAutoScalerOutputDimensionsMock: vi.fn(),
  validateAutoScalerSourceDimensionsMock: vi.fn(),
  getImageStudioSlotLinkBySourceAndRelationMock: vi.fn(),
  upsertImageStudioSlotLinkMock: vi.fn(),
  createImageStudioSlotsMock: vi.fn<
    (projectId: string, slots: Array<Record<string, unknown>>) => Promise<Array<Record<string, unknown>>>
  >(),
  getImageStudioSlotByIdMock: vi.fn(),
  loadSourceBufferFromSlotMock: vi.fn(),
  parseImageDataUrlMock: vi.fn(),
  getImageFileRepositoryMock: vi.fn(),
  createImageFileMock: vi.fn(),
  logSystemEventMock: vi.fn(),
}));

vi.mock('fs/promises', () => ({
  default: {
    mkdir: mkdirMock,
    writeFile: writeFileMock,
  },
  mkdir: mkdirMock,
  writeFile: writeFileMock,
}));

vi.mock('@/features/ai/image-studio/server/auto-scaler-utils', () => ({
  autoScaleObjectByAnalysis: autoScaleObjectByAnalysisMock,
  buildAutoScalerFingerprint: buildAutoScalerFingerprintMock,
  buildAutoScalerFingerprintRelationType: buildAutoScalerFingerprintRelationTypeMock,
  buildAutoScalerLayoutSignature: buildAutoScalerLayoutSignatureMock,
  buildAutoScalerRequestRelationType: buildAutoScalerRequestRelationTypeMock,
  normalizeAutoScalerLayoutConfig: normalizeAutoScalerLayoutConfigMock,
  validateAutoScalerOutputDimensions: validateAutoScalerOutputDimensionsMock,
  validateAutoScalerSourceDimensions: validateAutoScalerSourceDimensionsMock,
}));

vi.mock('@/features/ai/image-studio/server/slot-link-repository', () => ({
  getImageStudioSlotLinkBySourceAndRelation: getImageStudioSlotLinkBySourceAndRelationMock,
  upsertImageStudioSlotLink: upsertImageStudioSlotLinkMock,
}));

vi.mock('@/features/ai/image-studio/server/slot-repository', () => ({
  createImageStudioSlots: createImageStudioSlotsMock,
  getImageStudioSlotById: getImageStudioSlotByIdMock,
}));

vi.mock('@/features/ai/image-studio/server/source-image-utils', () => ({
  loadSourceBufferFromSlot: loadSourceBufferFromSlotMock,
  parseImageDataUrl: parseImageDataUrlMock,
}));

vi.mock('@/features/files/server', () => ({
  getImageFileRepository: getImageFileRepositoryMock,
}));

vi.mock('@/features/observability/server', () => ({
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
  id: 'slot-default',
  projectId: 'project-1',
  name: 'Slot',
  folderPath: null,
  imageFileId: 'file-default',
  imageUrl: '/uploads/studio/source.png',
  imageBase64: null,
  asset3dId: null,
  screenshotFileId: null,
  metadata: null,
  createdAt: new Date('2026-02-20T17:00:00.000Z').toISOString(),
  updatedAt: new Date('2026-02-20T17:00:00.000Z').toISOString(),
  ...overrides,
});

const buildRequest = (body: Record<string, unknown>, headers?: Record<string, string>): NextRequest =>
  new NextRequest('http://localhost/api/image-studio/slots/source-slot/autoscale', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(headers ?? {}),
    },
    body: JSON.stringify(body),
  });

const buildApiContext = () =>
  ({
    requestId: 'req-test-1',
    startTime: Date.now(),
    userId: null,
    getElapsedMs: () => 0,
  }) as const;

const loadHandler = async () => {
  const mod = await import('./handler');
  return mod.postAutoScaleSlotHandler;
};

describe('image-studio autoscale handler', () => {
  let sourceBuffer: Buffer;
  let outputBuffer: Buffer;

  beforeEach(async () => {
    vi.resetModules();

    delete process.env['IMAGE_STUDIO_AUTOSCALER_DEDUPE_BY_FINGERPRINT'];
    delete process.env['IMAGE_STUDIO_AUTOSCALER_SERVER_AUTHORITATIVE'];
    delete process.env['IMAGE_STUDIO_AUTOSCALER_PIPELINE_VERSION'];

    sourceBuffer = await createPngBuffer(20, 20);
    outputBuffer = await createPngBuffer(40, 30);

    mkdirMock.mockReset();
    writeFileMock.mockReset();
    autoScaleObjectByAnalysisMock.mockReset();
    buildAutoScalerFingerprintMock.mockReset();
    buildAutoScalerFingerprintRelationTypeMock.mockReset();
    buildAutoScalerLayoutSignatureMock.mockReset();
    buildAutoScalerRequestRelationTypeMock.mockReset();
    normalizeAutoScalerLayoutConfigMock.mockReset();
    validateAutoScalerOutputDimensionsMock.mockReset();
    validateAutoScalerSourceDimensionsMock.mockReset();
    getImageStudioSlotLinkBySourceAndRelationMock.mockReset();
    upsertImageStudioSlotLinkMock.mockReset();
    createImageStudioSlotsMock.mockReset();
    getImageStudioSlotByIdMock.mockReset();
    loadSourceBufferFromSlotMock.mockReset();
    parseImageDataUrlMock.mockReset();
    getImageFileRepositoryMock.mockReset();
    createImageFileMock.mockReset();
    logSystemEventMock.mockReset();

    buildAutoScalerFingerprintMock.mockReturnValue('fingerprint-fixed');
    buildAutoScalerFingerprintRelationTypeMock.mockImplementation(
      (fingerprint: string) => `autoscale:output:${fingerprint}`
    );
    buildAutoScalerLayoutSignatureMock.mockReturnValue('layout-signature-fixed');
    buildAutoScalerRequestRelationTypeMock.mockImplementation(
      (requestId: string) => `autoscale:request:${requestId.trim()}`
    );
    normalizeAutoScalerLayoutConfigMock.mockImplementation((layout?: Record<string, unknown>) => ({
      paddingPercent: 8,
      paddingXPercent: 8,
      paddingYPercent: 8,
      fillMissingCanvasWhite: false,
      targetCanvasWidth: null,
      targetCanvasHeight: null,
      whiteThreshold: 16,
      chromaThreshold: 10,
      shadowPolicy: 'auto',
      detection: 'auto',
      ...(layout ?? {}),
    }));
    validateAutoScalerSourceDimensionsMock.mockReturnValue({ ok: true });
    validateAutoScalerOutputDimensionsMock.mockReturnValue(true);

    loadSourceBufferFromSlotMock.mockResolvedValue({
      buffer: sourceBuffer,
      mimeHint: 'image/png',
    });
    parseImageDataUrlMock.mockReturnValue(null);
    autoScaleObjectByAnalysisMock.mockResolvedValue({
      outputBuffer,
      width: 40,
      height: 30,
      sourceWidth: 20,
      sourceHeight: 20,
      sourceObjectBounds: { left: 1, top: 1, width: 6, height: 6 },
      targetObjectBounds: { left: 8, top: 6, width: 24, height: 18 },
      detectionUsed: 'white_bg_first_colored_pixel',
      confidenceBefore: 0.93,
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
      },
      scale: 3.5,
      layout: {
        paddingPercent: 8,
        paddingXPercent: 8,
        paddingYPercent: 8,
        fillMissingCanvasWhite: true,
        targetCanvasWidth: 40,
        targetCanvasHeight: 30,
        whiteThreshold: 16,
        chromaThreshold: 10,
        shadowPolicy: 'auto',
        detection: 'auto',
      },
      whitespaceBefore: {
        px: { left: 1, top: 1, right: 13, bottom: 13 },
        percent: { left: 5, top: 5, right: 65, bottom: 65 },
      },
      whitespaceAfter: {
        px: { left: 8, top: 6, right: 8, bottom: 6 },
        percent: { left: 20, top: 20, right: 20, bottom: 20 },
      },
      objectAreaPercentBefore: 9,
      objectAreaPercentAfter: 36,
    });

    createImageFileMock.mockResolvedValue({
      id: 'image-file-output-1',
      filename: 'autoscale-server_auto_scaler_v1.png',
      filepath: '/uploads/studio/autoscale/project-1/source-slot/autoscale-server_auto_scaler_v1.png',
      mimetype: 'image/png',
      size: outputBuffer.length,
      width: 40,
      height: 30,
    });
    getImageFileRepositoryMock.mockResolvedValue({
      createImageFile: createImageFileMock,
    });

    createImageStudioSlotsMock.mockResolvedValue([
      buildSlot({
        id: 'slot-created-1',
        projectId: 'project-1',
        name: 'Source • Auto Scaled',
        imageFileId: 'image-file-output-1',
        imageUrl: '/uploads/studio/autoscale/project-1/source-slot/autoscale-server_auto_scaler_v1.png',
      }),
    ]);
    upsertImageStudioSlotLinkMock.mockResolvedValue({
      id: 'link-1',
    });
    getImageStudioSlotLinkBySourceAndRelationMock.mockResolvedValue(null);
    getImageStudioSlotByIdMock.mockImplementation(async (slotId: string) => {
      if (slotId === 'source-slot') {
        return buildSlot({
          id: 'source-slot',
          projectId: 'project-1',
          name: 'Source',
          imageFileId: 'source-file-1',
          imageUrl: '/uploads/studio/source.png',
          imageFile: {
            width: 20,
            height: 20,
            filepath: '/uploads/studio/source.png',
          },
        });
      }
      return null;
    });
  });

  it('returns request-id deduplicated autoscale slot when request link exists', async () => {
    const existingSlot = buildSlot({
      id: 'slot-existing-1',
      projectId: 'project-1',
      name: 'Source • Auto Scaled',
      imageFileId: 'existing-file',
      imageUrl: '/uploads/studio/existing.png',
      metadata: {
        role: 'generation',
        sourceSlotId: 'source-slot',
        relationType: 'autoscale:output',
        autoscale: {
          mode: 'server_auto_scaler_v1',
          effectiveMode: 'server_auto_scaler_v1',
          sourceObjectBounds: { left: 2, top: 2, width: 6, height: 6 },
          targetObjectBounds: { left: 8, top: 6, width: 24, height: 18 },
          layout: {
            paddingPercent: 8,
            paddingXPercent: 8,
            paddingYPercent: 8,
            fillMissingCanvasWhite: true,
            targetCanvasWidth: 40,
            targetCanvasHeight: 30,
            whiteThreshold: 16,
            chromaThreshold: 10,
            shadowPolicy: 'auto',
          },
          detectionUsed: 'white_bg_first_colored_pixel',
          confidenceBefore: 0.92,
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
          },
          scale: 3.5,
          whitespaceBefore: {
            px: { left: 2, top: 2, right: 12, bottom: 12 },
            percent: { left: 10, top: 10, right: 60, bottom: 60 },
          },
          whitespaceAfter: {
            px: { left: 8, top: 6, right: 8, bottom: 6 },
            percent: { left: 20, top: 20, right: 20, bottom: 20 },
          },
          objectAreaPercentBefore: 9,
          objectAreaPercentAfter: 36,
        },
      },
    });

    getImageStudioSlotByIdMock.mockImplementation(async (slotId: string) => {
      if (slotId === 'source-slot') {
        return buildSlot({
          id: 'source-slot',
          projectId: 'project-1',
          name: 'Source',
          imageFileId: 'source-file-1',
          imageUrl: '/uploads/studio/source.png',
        });
      }
      if (slotId === 'slot-existing-1') {
        return existingSlot;
      }
      return null;
    });
    getImageStudioSlotLinkBySourceAndRelationMock.mockImplementation(
      async (_projectId: string, _sourceSlotId: string, relationType: string) => {
        if (relationType === 'autoscale:request:req_dedupe_1234') {
          return {
            id: 'link-existing-1',
            sourceSlotId: 'source-slot',
            targetSlotId: 'slot-existing-1',
            relationType,
          };
        }
        return null;
      }
    );

    const postAutoScaleSlotHandler = await loadHandler();
    const response = await postAutoScaleSlotHandler(
      buildRequest({
        mode: 'server_auto_scaler_v1',
        requestId: 'req_dedupe_1234',
      }),
      buildApiContext(),
      { slotId: 'source-slot' }
    );

    const payload = (await response.json()) as Record<string, unknown>;
    expect(response.status).toBe(200);
    expect(payload['deduplicated']).toBe(true);
    expect(payload['dedupeReason']).toBe('request');
    expect(payload['sourceSlotId']).toBe('source-slot');
    expect(payload['effectiveMode']).toBe('server_auto_scaler_v1');
    expect(payload['detectionUsed']).toBe('white_bg_first_colored_pixel');
    expect(payload['confidenceBefore']).toBe(0.92);
    expect(payload['scale']).toBe(3.5);
    expect((payload['slot'] as Record<string, unknown>)['id']).toBe('slot-existing-1');

    expect(autoScaleObjectByAnalysisMock).not.toHaveBeenCalled();
    expect(createImageStudioSlotsMock).not.toHaveBeenCalled();
    expect(upsertImageStudioSlotLinkMock).not.toHaveBeenCalled();
  });

  it('persists autoscaled output and writes request/fingerprint links for new requests', async () => {
    const postAutoScaleSlotHandler = await loadHandler();
    const response = await postAutoScaleSlotHandler(
      buildRequest(
        {
          mode: 'server_auto_scaler_v1',
          requestId: 'req_persist_1234',
          layout: {
            paddingPercent: 8,
            fillMissingCanvasWhite: true,
            targetCanvasWidth: 40,
            targetCanvasHeight: 30,
          },
        },
        {
          'x-idempotency-key': 'req_persist_1234',
        }
      ),
      buildApiContext(),
      { slotId: 'source-slot' }
    );

    const payload = (await response.json()) as Record<string, unknown>;
    expect(response.status).toBe(201);
    expect(payload['deduplicated']).toBe(false);
    expect(payload['sourceSlotId']).toBe('source-slot');
    expect(payload['effectiveMode']).toBe('server_auto_scaler_v1');
    expect(payload['detectionUsed']).toBe('white_bg_first_colored_pixel');
    expect(payload['confidenceBefore']).toBe(0.93);
    expect(payload['scale']).toBe(3.5);
    expect((payload['slot'] as Record<string, unknown>)['id']).toBe('slot-created-1');

    expect(autoScaleObjectByAnalysisMock).toHaveBeenCalledTimes(1);
    expect(createImageStudioSlotsMock).toHaveBeenCalledTimes(1);
    expect(upsertImageStudioSlotLinkMock).toHaveBeenCalledTimes(2);
    expect(writeFileMock).toHaveBeenCalledTimes(1);
    expect(createImageFileMock).toHaveBeenCalledTimes(1);

    const createSlotPayload = createImageStudioSlotsMock.mock.calls[0]?.[1]?.[0];
    expect(createSlotPayload).toMatchObject({
      imageBase64: null,
      metadata: {
        role: 'generation',
        sourceSlotId: 'source-slot',
        relationType: 'autoscale:output',
        autoscale: {
          mode: 'server_auto_scaler_v1',
          effectiveMode: 'server_auto_scaler_v1',
          detectionUsed: 'white_bg_first_colored_pixel',
          confidenceBefore: 0.93,
          scale: 3.5,
        },
      },
    });
  });

  it('supports fingerprint dedupe mode when enabled via env flag', async () => {
    process.env['IMAGE_STUDIO_AUTOSCALER_DEDUPE_BY_FINGERPRINT'] = 'true';

    const existingSlot = buildSlot({
      id: 'slot-existing-fingerprint',
      projectId: 'project-1',
      name: 'Source • Auto Scaled',
      imageFileId: 'existing-file',
      imageUrl: '/uploads/studio/existing-fingerprint.png',
      metadata: {
        autoscale: {
          effectiveMode: 'server_auto_scaler_v1',
          sourceObjectBounds: { left: 2, top: 2, width: 6, height: 6 },
          targetObjectBounds: { left: 8, top: 6, width: 24, height: 18 },
          layout: {
            paddingPercent: 8,
            paddingXPercent: 8,
            paddingYPercent: 8,
            fillMissingCanvasWhite: true,
            targetCanvasWidth: 40,
            targetCanvasHeight: 30,
            whiteThreshold: 16,
            chromaThreshold: 10,
            shadowPolicy: 'auto',
          },
          detectionUsed: 'white_bg_first_colored_pixel',
          confidenceBefore: 0.92,
          scale: 3.5,
        },
      },
    });
    getImageStudioSlotByIdMock.mockImplementation(async (slotId: string) => {
      if (slotId === 'source-slot') {
        return buildSlot({
          id: 'source-slot',
          projectId: 'project-1',
          name: 'Source',
          imageFileId: 'source-file-1',
          imageUrl: '/uploads/studio/source.png',
        });
      }
      if (slotId === 'slot-existing-fingerprint') {
        return existingSlot;
      }
      return null;
    });
    getImageStudioSlotLinkBySourceAndRelationMock.mockImplementation(
      async (_projectId: string, _sourceSlotId: string, relationType: string) => {
        if (relationType === 'autoscale:output:fingerprint-fixed') {
          return {
            id: 'link-existing-fingerprint',
            sourceSlotId: 'source-slot',
            targetSlotId: 'slot-existing-fingerprint',
            relationType,
          };
        }
        return null;
      }
    );

    const postAutoScaleSlotHandler = await loadHandler();
    const response = await postAutoScaleSlotHandler(
      buildRequest({
        mode: 'server_auto_scaler_v1',
      }),
      buildApiContext(),
      { slotId: 'source-slot' }
    );

    const payload = (await response.json()) as Record<string, unknown>;
    expect(response.status).toBe(200);
    expect(payload['deduplicated']).toBe(true);
    expect(payload['dedupeReason']).toBe('fingerprint');
    expect((payload['slot'] as Record<string, unknown>)['id']).toBe('slot-existing-fingerprint');
    expect(autoScaleObjectByAnalysisMock).not.toHaveBeenCalled();
    expect(createImageStudioSlotsMock).not.toHaveBeenCalled();
  });

  it('throws bad request app error for invalid payload', async () => {
    const postAutoScaleSlotHandler = await loadHandler();
    let thrown: unknown = null;
    try {
      await postAutoScaleSlotHandler(
        buildRequest({
          mode: 'invalid_mode',
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
    expect((thrown as { meta?: Record<string, unknown> }).meta?.['autoScaleErrorCode']).toBe(
      IMAGE_STUDIO_AUTOSCALER_ERROR_CODES.INVALID_PAYLOAD
    );
    expect(getImageStudioSlotByIdMock).not.toHaveBeenCalled();
  });
});
