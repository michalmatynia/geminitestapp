import { NextRequest } from 'next/server';
import sharp from 'sharp';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { IMAGE_STUDIO_CENTER_ERROR_CODES } from '@/features/ai/image-studio/contracts/center';

const {
  mkdirMock,
  writeFileMock,
  buildCenterFingerprintMock,
  buildCenterFingerprintRelationTypeMock,
  buildCenterLayoutSignatureMock,
  buildCenterRequestRelationTypeMock,
  centerAndScaleObjectByLayoutMock,
  centerObjectByAlphaMock,
  normalizeCenterLayoutConfigMock,
  validateCenterOutputDimensionsMock,
  validateCenterSourceDimensionsMock,
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
  buildCenterFingerprintMock: vi.fn(),
  buildCenterFingerprintRelationTypeMock: vi.fn(),
  buildCenterLayoutSignatureMock: vi.fn(),
  buildCenterRequestRelationTypeMock: vi.fn(),
  centerAndScaleObjectByLayoutMock: vi.fn(),
  centerObjectByAlphaMock: vi.fn(),
  normalizeCenterLayoutConfigMock: vi.fn(),
  validateCenterOutputDimensionsMock: vi.fn(),
  validateCenterSourceDimensionsMock: vi.fn(),
  getImageStudioSlotLinkBySourceAndRelationMock: vi.fn(),
  upsertImageStudioSlotLinkMock: vi.fn(),
  createImageStudioSlotsMock:
    vi.fn<
      (
        projectId: string,
        slots: Array<Record<string, unknown>>
      ) => Promise<Array<Record<string, unknown>>>
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

vi.mock('@/features/ai/image-studio/server/center-utils', () => ({
  buildCenterFingerprint: buildCenterFingerprintMock,
  buildCenterFingerprintRelationType: buildCenterFingerprintRelationTypeMock,
  buildCenterLayoutSignature: buildCenterLayoutSignatureMock,
  buildCenterRequestRelationType: buildCenterRequestRelationTypeMock,
  centerAndScaleObjectByLayout: centerAndScaleObjectByLayoutMock,
  centerObjectByAlpha: centerObjectByAlphaMock,
  normalizeCenterLayoutConfig: normalizeCenterLayoutConfigMock,
  validateCenterOutputDimensions: validateCenterOutputDimensionsMock,
  validateCenterSourceDimensions: validateCenterSourceDimensionsMock,
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
  createdAt: new Date('2026-02-20T18:00:00.000Z').toISOString(),
  updatedAt: new Date('2026-02-20T18:00:00.000Z').toISOString(),
  ...overrides,
});

const buildRequest = (
  body: Record<string, unknown>,
  headers?: Record<string, string>
): NextRequest =>
  new NextRequest('http://localhost/api/image-studio/slots/source-slot/center', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(headers ?? {}),
    },
    body: JSON.stringify(body),
  });

const buildApiContext = () =>
  ({
    requestId: 'req-center-test-1',
    startTime: Date.now(),
    userId: null,
    getElapsedMs: () => 0,
  }) as const;

const loadHandler = async () => {
  const mod = await import('./handler');
  return mod.postCenterSlotHandler;
};

describe('image-studio center handler', () => {
  let sourceBuffer: Buffer;
  let outputBuffer: Buffer;

  beforeEach(async () => {
    vi.resetModules();

    delete process.env['IMAGE_STUDIO_CENTER_DEDUPE_BY_FINGERPRINT'];
    delete process.env['IMAGE_STUDIO_CENTER_SERVER_AUTHORITATIVE'];
    delete process.env['IMAGE_STUDIO_CENTER_PIPELINE_VERSION'];

    sourceBuffer = await createPngBuffer(20, 20);
    outputBuffer = await createPngBuffer(40, 30);

    mkdirMock.mockReset();
    writeFileMock.mockReset();
    buildCenterFingerprintMock.mockReset();
    buildCenterFingerprintRelationTypeMock.mockReset();
    buildCenterLayoutSignatureMock.mockReset();
    buildCenterRequestRelationTypeMock.mockReset();
    centerAndScaleObjectByLayoutMock.mockReset();
    centerObjectByAlphaMock.mockReset();
    normalizeCenterLayoutConfigMock.mockReset();
    validateCenterOutputDimensionsMock.mockReset();
    validateCenterSourceDimensionsMock.mockReset();
    getImageStudioSlotLinkBySourceAndRelationMock.mockReset();
    upsertImageStudioSlotLinkMock.mockReset();
    createImageStudioSlotsMock.mockReset();
    getImageStudioSlotByIdMock.mockReset();
    loadSourceBufferFromSlotMock.mockReset();
    parseImageDataUrlMock.mockReset();
    getImageFileRepositoryMock.mockReset();
    createImageFileMock.mockReset();
    logSystemEventMock.mockReset();

    buildCenterFingerprintMock.mockReturnValue('fingerprint-center-fixed');
    buildCenterFingerprintRelationTypeMock.mockImplementation(
      (fingerprint: string) => `center:output:${fingerprint}`
    );
    buildCenterLayoutSignatureMock.mockReturnValue('layout-signature-center-fixed');
    buildCenterRequestRelationTypeMock.mockImplementation(
      (requestId: string) => `center:request:${requestId.trim()}`
    );

    normalizeCenterLayoutConfigMock.mockImplementation((layout?: Record<string, unknown>) => ({
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
    validateCenterSourceDimensionsMock.mockReturnValue({ ok: true });
    validateCenterOutputDimensionsMock.mockReturnValue(true);

    loadSourceBufferFromSlotMock.mockResolvedValue({
      buffer: sourceBuffer,
      mimeHint: 'image/png',
    });
    parseImageDataUrlMock.mockReturnValue(null);

    centerAndScaleObjectByLayoutMock.mockResolvedValue({
      outputBuffer,
      width: 40,
      height: 30,
      sourceObjectBounds: { left: 1, top: 1, width: 6, height: 6 },
      targetObjectBounds: { left: 8, top: 6, width: 24, height: 18 },
      scale: 3.5,
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
    });

    centerObjectByAlphaMock.mockResolvedValue({
      outputBuffer: sourceBuffer,
      width: 20,
      height: 20,
      sourceObjectBounds: { left: 1, top: 1, width: 6, height: 6 },
      targetObjectBounds: { left: 7, top: 7, width: 6, height: 6 },
    });

    createImageFileMock.mockResolvedValue({
      id: 'image-file-center-1',
      filename: 'center-server_object_layout_v1.png',
      filepath: '/uploads/studio/center/project-1/source-slot/center-server_object_layout_v1.png',
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
        id: 'slot-centered-created-1',
        projectId: 'project-1',
        name: 'Source • Centered',
        imageFileId: 'image-file-center-1',
        imageUrl: '/uploads/studio/center/project-1/source-slot/center-server_object_layout_v1.png',
      }),
    ]);
    upsertImageStudioSlotLinkMock.mockResolvedValue({ id: 'link-center-1' });
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

  it('returns request-id deduplicated centered slot when request link exists', async () => {
    const existingSlot = buildSlot({
      id: 'slot-center-existing-1',
      projectId: 'project-1',
      name: 'Source • Centered',
      imageFileId: 'existing-file',
      imageUrl: '/uploads/studio/center-existing.png',
      metadata: {
        center: {
          mode: 'server_object_layout_v1',
          effectiveMode: 'server_object_layout_v1',
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
            detectionUsed: 'white_bg_first_colored_pixel',
            scale: 3.5,
          },
          detectionUsed: 'white_bg_first_colored_pixel',
          confidenceBefore: 0.91,
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
      if (slotId === 'slot-center-existing-1') {
        return existingSlot;
      }
      return null;
    });
    getImageStudioSlotLinkBySourceAndRelationMock.mockImplementation(
      async (_projectId: string, _sourceSlotId: string, relationType: string) => {
        if (relationType === 'center:request:req_center_dedupe_1234') {
          return {
            id: 'link-center-existing-1',
            sourceSlotId: 'source-slot',
            targetSlotId: 'slot-center-existing-1',
            relationType,
          };
        }
        return null;
      }
    );

    const postCenterSlotHandler = await loadHandler();
    const response = await postCenterSlotHandler(
      buildRequest({
        mode: 'server_object_layout_v1',
        requestId: 'req_center_dedupe_1234',
      }),
      buildApiContext(),
      { slotId: 'source-slot' }
    );

    const payload = (await response.json()) as Record<string, unknown>;
    expect(response.status).toBe(200);
    expect(payload['deduplicated']).toBe(true);
    expect(payload['dedupeReason']).toBe('request');
    expect(payload['sourceSlotId']).toBe('source-slot');
    expect(payload['effectiveMode']).toBe('server_object_layout_v1');
    expect(payload['detectionUsed']).toBe('white_bg_first_colored_pixel');
    expect(payload['confidenceBefore']).toBe(0.91);
    expect(payload['scale']).toBe(3.5);
    expect((payload['slot'] as Record<string, unknown>)['id']).toBe('slot-center-existing-1');

    expect(centerAndScaleObjectByLayoutMock).not.toHaveBeenCalled();
    expect(centerObjectByAlphaMock).not.toHaveBeenCalled();
    expect(createImageStudioSlotsMock).not.toHaveBeenCalled();
    expect(upsertImageStudioSlotLinkMock).not.toHaveBeenCalled();
  });

  it('persists centered output and writes request/fingerprint links for object-layout mode', async () => {
    const postCenterSlotHandler = await loadHandler();
    const response = await postCenterSlotHandler(
      buildRequest(
        {
          mode: 'server_object_layout_v1',
          requestId: 'req_center_persist_1234',
          layout: {
            paddingPercent: 8,
            fillMissingCanvasWhite: true,
            targetCanvasWidth: 40,
            targetCanvasHeight: 30,
          },
        },
        {
          'x-idempotency-key': 'req_center_persist_1234',
        }
      ),
      buildApiContext(),
      { slotId: 'source-slot' }
    );

    const payload = (await response.json()) as Record<string, unknown>;
    expect(response.status).toBe(201);
    expect(payload['deduplicated']).toBe(false);
    expect(payload['sourceSlotId']).toBe('source-slot');
    expect(payload['effectiveMode']).toBe('server_object_layout_v1');
    expect(payload['detectionUsed']).toBe('white_bg_first_colored_pixel');
    expect(payload['confidenceBefore']).toBe(0.93);
    expect(payload['scale']).toBe(3.5);
    expect((payload['slot'] as Record<string, unknown>)['id']).toBe('slot-centered-created-1');

    expect(centerAndScaleObjectByLayoutMock).toHaveBeenCalledTimes(1);
    expect(centerObjectByAlphaMock).not.toHaveBeenCalled();
    expect(createImageStudioSlotsMock).toHaveBeenCalledTimes(1);
    expect(upsertImageStudioSlotLinkMock).toHaveBeenCalledTimes(2);
    expect(writeFileMock).toHaveBeenCalledTimes(1);
    expect(createImageFileMock).toHaveBeenCalledTimes(1);

    const firstCreateCall = createImageStudioSlotsMock.mock.calls[0];
    expect(firstCreateCall).toBeDefined();
    const [calledProjectId, createdBatch] = firstCreateCall as [
      string,
      Array<Record<string, unknown>>,
    ];
    expect(calledProjectId).toBe('project-1');
    const createdPayload = createdBatch[0];
    expect(createdPayload).toBeDefined();
    const metadata =
      createdPayload &&
      typeof createdPayload['metadata'] === 'object' &&
      !Array.isArray(createdPayload['metadata'])
        ? (createdPayload['metadata'] as Record<string, unknown>)
        : null;
    expect(metadata).not.toBeNull();
    expect(metadata?.['relationType']).toBe('center:output');
    const centerMetadata =
      metadata && typeof metadata['center'] === 'object' && !Array.isArray(metadata['center'])
        ? (metadata['center'] as Record<string, unknown>)
        : null;
    expect(centerMetadata).not.toBeNull();
    expect(centerMetadata?.['mode']).toBe('server_object_layout_v1');
    expect(centerMetadata?.['effectiveMode']).toBe('server_object_layout_v1');
    expect(centerMetadata?.['detectionUsed']).toBe('white_bg_first_colored_pixel');
    expect(centerMetadata?.['confidenceBefore']).toBe(0.93);
    expect(centerMetadata?.['scale']).toBe(3.5);
  });

  it('propagates analysis-derived layout settings into object layout processing and metadata', async () => {
    const analysisDerivedLayout = {
      paddingPercent: 12,
      paddingXPercent: 10,
      paddingYPercent: 14,
      fillMissingCanvasWhite: true,
      targetCanvasWidth: 44,
      targetCanvasHeight: 32,
      whiteThreshold: 18,
      chromaThreshold: 9,
      shadowPolicy: 'include_shadow',
      detection: 'white_bg_first_colored_pixel',
    } as const;

    const postCenterSlotHandler = await loadHandler();
    const response = await postCenterSlotHandler(
      buildRequest(
        {
          mode: 'server_object_layout_v1',
          requestId: 'req_center_phase_k_chain_1',
          layout: analysisDerivedLayout,
        },
        {
          'x-idempotency-key': 'req_center_phase_k_chain_1',
        }
      ),
      buildApiContext(),
      { slotId: 'source-slot' }
    );

    const payload = (await response.json()) as Record<string, unknown>;
    const responseLayout = payload['layout'] as Record<string, unknown>;
    expect(response.status).toBe(201);
    expect(centerAndScaleObjectByLayoutMock).toHaveBeenCalledTimes(1);
    expect(centerAndScaleObjectByLayoutMock).toHaveBeenCalledWith(
      sourceBuffer,
      analysisDerivedLayout
    );
    expect(responseLayout['whiteThreshold']).toBe(18);
    expect(responseLayout['chromaThreshold']).toBe(9);
    expect(responseLayout['shadowPolicy']).toBe('include_shadow');
    expect(responseLayout['paddingPercent']).toBe(12);
    expect(responseLayout['paddingXPercent']).toBe(10);
    expect(responseLayout['paddingYPercent']).toBe(14);
    expect(responseLayout['targetCanvasWidth']).toBe(44);
    expect(responseLayout['targetCanvasHeight']).toBe(32);

    const createSlotPayload = createImageStudioSlotsMock.mock.calls[0]?.[1]?.[0];
    const metadata =
      createSlotPayload &&
      typeof createSlotPayload['metadata'] === 'object' &&
      !Array.isArray(createSlotPayload['metadata'])
        ? (createSlotPayload['metadata'] as Record<string, unknown>)
        : null;
    const centerMetadata =
      metadata && typeof metadata['center'] === 'object' && !Array.isArray(metadata['center'])
        ? (metadata['center'] as Record<string, unknown>)
        : null;
    const centerLayout =
      centerMetadata &&
      typeof centerMetadata['layout'] === 'object' &&
      !Array.isArray(centerMetadata['layout'])
        ? (centerMetadata['layout'] as Record<string, unknown>)
        : null;

    expect(centerLayout).not.toBeNull();
    expect(centerLayout?.['whiteThreshold']).toBe(18);
    expect(centerLayout?.['chromaThreshold']).toBe(9);
    expect(centerLayout?.['shadowPolicy']).toBe('include_shadow');
    expect(centerLayout?.['paddingPercent']).toBe(12);
    expect(centerLayout?.['paddingXPercent']).toBe(10);
    expect(centerLayout?.['paddingYPercent']).toBe(14);
    expect(centerLayout?.['targetCanvasWidth']).toBe(44);
    expect(centerLayout?.['targetCanvasHeight']).toBe(32);
  });

  it('persists low-confidence fallback policy metadata for object-layout responses', async () => {
    centerAndScaleObjectByLayoutMock.mockResolvedValueOnce({
      outputBuffer,
      width: 40,
      height: 30,
      sourceObjectBounds: { left: 1, top: 1, width: 7, height: 7 },
      targetObjectBounds: { left: 8, top: 6, width: 24, height: 18 },
      scale: 3.2,
      detectionUsed: 'alpha_bbox',
      confidenceBefore: 0.41,
      layoutPolicyVersion: 'v2',
      detectionPolicyDecision: 'auto_white_low_confidence_fallback_alpha',
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
          alpha_bbox: { confidence: 0.41, area: 49 },
          white_bg_first_colored_pixel: { confidence: 0.2, area: 31 },
        },
      },
    });

    const postCenterSlotHandler = await loadHandler();
    const response = await postCenterSlotHandler(
      buildRequest(
        {
          mode: 'server_object_layout_v1',
          requestId: 'req_center_phase_k_policy_1',
        },
        {
          'x-idempotency-key': 'req_center_phase_k_policy_1',
        }
      ),
      buildApiContext(),
      { slotId: 'source-slot' }
    );

    const payload = (await response.json()) as Record<string, unknown>;
    const responseLayout = payload['layout'] as Record<string, unknown>;
    const responseDetectionDetails = payload['detectionDetails'] as Record<string, unknown>;
    const responseCandidates = responseDetectionDetails['candidateDetections'] as Record<
      string,
      unknown
    >;

    expect(response.status).toBe(201);
    expect(payload['detectionUsed']).toBe('alpha_bbox');
    expect(payload['confidenceBefore']).toBe(0.41);
    expect(responseLayout['layoutPolicyVersion']).toBe('v2');
    expect(responseLayout['detectionPolicyDecision']).toBe(
      'auto_white_low_confidence_fallback_alpha'
    );
    expect(responseDetectionDetails['policyVersion']).toBe('v2');
    expect(responseDetectionDetails['policyReason']).toBe(
      'auto_white_low_confidence_fallback_alpha'
    );
    expect(responseDetectionDetails['fallbackApplied']).toBe(true);
    expect(responseCandidates['alpha_bbox']).toEqual({ confidence: 0.41, area: 49 });
    expect(responseCandidates['white_bg_first_colored_pixel']).toEqual({
      confidence: 0.2,
      area: 31,
    });

    const createSlotPayload = createImageStudioSlotsMock.mock.calls[0]?.[1]?.[0];
    const metadata =
      createSlotPayload &&
      typeof createSlotPayload['metadata'] === 'object' &&
      !Array.isArray(createSlotPayload['metadata'])
        ? (createSlotPayload['metadata'] as Record<string, unknown>)
        : null;
    const centerMetadata =
      metadata && typeof metadata['center'] === 'object' && !Array.isArray(metadata['center'])
        ? (metadata['center'] as Record<string, unknown>)
        : null;
    const centerLayout =
      centerMetadata &&
      typeof centerMetadata['layout'] === 'object' &&
      !Array.isArray(centerMetadata['layout'])
        ? (centerMetadata['layout'] as Record<string, unknown>)
        : null;
    const centerDetectionDetails =
      centerMetadata &&
      typeof centerMetadata['detectionDetails'] === 'object' &&
      !Array.isArray(centerMetadata['detectionDetails'])
        ? (centerMetadata['detectionDetails'] as Record<string, unknown>)
        : null;
    const centerCandidates =
      centerDetectionDetails &&
      typeof centerDetectionDetails['candidateDetections'] === 'object' &&
      !Array.isArray(centerDetectionDetails['candidateDetections'])
        ? (centerDetectionDetails['candidateDetections'] as Record<string, unknown>)
        : null;

    expect(centerLayout?.['layoutPolicyVersion']).toBe('v2');
    expect(centerLayout?.['detectionPolicyDecision']).toBe(
      'auto_white_low_confidence_fallback_alpha'
    );
    expect(centerDetectionDetails?.['policyVersion']).toBe('v2');
    expect(centerDetectionDetails?.['policyReason']).toBe(
      'auto_white_low_confidence_fallback_alpha'
    );
    expect(centerDetectionDetails?.['fallbackApplied']).toBe(true);
    expect(centerCandidates?.['alpha_bbox']).toEqual({ confidence: 0.41, area: 49 });
    expect(centerCandidates?.['white_bg_first_colored_pixel']).toEqual({
      confidence: 0.2,
      area: 31,
    });
  });

  it('supports fingerprint dedupe mode when enabled via env flag', async () => {
    process.env['IMAGE_STUDIO_CENTER_DEDUPE_BY_FINGERPRINT'] = 'true';

    const existingSlot = buildSlot({
      id: 'slot-center-fingerprint-existing',
      projectId: 'project-1',
      name: 'Source • Centered',
      imageFileId: 'existing-file',
      imageUrl: '/uploads/studio/center-existing-fingerprint.png',
      metadata: {
        center: {
          effectiveMode: 'server_object_layout_v1',
          sourceObjectBounds: { left: 2, top: 2, width: 6, height: 6 },
          targetObjectBounds: { left: 8, top: 6, width: 24, height: 18 },
          detectionUsed: 'white_bg_first_colored_pixel',
          confidenceBefore: 0.92,
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
          },
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
      if (slotId === 'slot-center-fingerprint-existing') {
        return existingSlot;
      }
      return null;
    });
    getImageStudioSlotLinkBySourceAndRelationMock.mockImplementation(
      async (_projectId: string, _sourceSlotId: string, relationType: string) => {
        if (relationType === 'center:output:fingerprint-center-fixed') {
          return {
            id: 'link-center-fingerprint-existing',
            sourceSlotId: 'source-slot',
            targetSlotId: 'slot-center-fingerprint-existing',
            relationType,
          };
        }
        return null;
      }
    );

    const postCenterSlotHandler = await loadHandler();
    const response = await postCenterSlotHandler(
      buildRequest({
        mode: 'server_object_layout_v1',
      }),
      buildApiContext(),
      { slotId: 'source-slot' }
    );

    const payload = (await response.json()) as Record<string, unknown>;
    expect(response.status).toBe(200);
    expect(payload['deduplicated']).toBe(true);
    expect(payload['dedupeReason']).toBe('fingerprint');
    expect((payload['slot'] as Record<string, unknown>)['id']).toBe(
      'slot-center-fingerprint-existing'
    );
    expect(centerAndScaleObjectByLayoutMock).not.toHaveBeenCalled();
    expect(createImageStudioSlotsMock).not.toHaveBeenCalled();
  });

  it('normalizes nested center payload and string layout values before validation', async () => {
    const postCenterSlotHandler = await loadHandler();
    const response = await postCenterSlotHandler(
      buildRequest({
        center: {
          mode: ' server_object_layout_v1 ',
          requestId: ' req_center_normalized_1234 ',
          layout: {
            paddingPercent: '8.5',
            paddingXPercent: '9',
            paddingYPercent: '7',
            fillMissingCanvasWhite: 'true',
            targetCanvasWidth: '40',
            targetCanvasHeight: '30',
            whiteThreshold: '18',
            chromaThreshold: '9',
            shadowPolicy: ' include_shadow ',
            detection: ' white_bg_first_colored_pixel ',
          },
        },
      }),
      buildApiContext(),
      { slotId: 'source-slot' }
    );

    const payload = (await response.json()) as Record<string, unknown>;
    expect(response.status).toBe(201);
    expect(payload['effectiveMode']).toBe('server_object_layout_v1');
    expect(centerAndScaleObjectByLayoutMock).toHaveBeenCalledTimes(1);
    expect(centerAndScaleObjectByLayoutMock).toHaveBeenCalledWith(sourceBuffer, {
      paddingPercent: 8.5,
      paddingXPercent: 9,
      paddingYPercent: 7,
      fillMissingCanvasWhite: true,
      targetCanvasWidth: 40,
      targetCanvasHeight: 30,
      whiteThreshold: 18,
      chromaThreshold: 9,
      shadowPolicy: 'include_shadow',
      detection: 'white_bg_first_colored_pixel',
    });
  });

  it('maps center response-schema validation failures to OUTPUT_INVALID errors', async () => {
    createImageStudioSlotsMock.mockResolvedValueOnce([
      buildSlot({
        id: 42 as unknown as string,
        projectId: 'project-1',
        name: 'Source • Centered',
        imageFileId: 'image-file-center-1',
        imageUrl: '/uploads/studio/center/project-1/source-slot/center-server_object_layout_v1.png',
      }),
    ]);

    const postCenterSlotHandler = await loadHandler();
    let thrown: unknown = null;
    try {
      await postCenterSlotHandler(
        buildRequest({
          mode: 'server_object_layout_v1',
          requestId: 'req_output_invalid_center_1',
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
    expect((thrown as { meta?: Record<string, unknown> }).meta?.['centerErrorCode']).toBe(
      IMAGE_STUDIO_CENTER_ERROR_CODES.OUTPUT_INVALID
    );
    expect((thrown as { meta?: Record<string, unknown> }).meta?.['responseStage']).toBe('created');
  });

  it('throws bad request app error for invalid center payload', async () => {
    const postCenterSlotHandler = await loadHandler();
    let thrown: unknown = null;
    try {
      await postCenterSlotHandler(
        buildRequest({
          mode: 'invalid_center_mode',
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
    expect((thrown as { meta?: Record<string, unknown> }).meta?.['centerErrorCode']).toBe(
      IMAGE_STUDIO_CENTER_ERROR_CODES.INVALID_PAYLOAD
    );
    expect(getImageStudioSlotByIdMock).not.toHaveBeenCalled();
  });
});
