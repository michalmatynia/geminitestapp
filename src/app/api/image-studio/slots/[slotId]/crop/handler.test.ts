import { NextRequest } from 'next/server';
import sharp from 'sharp';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { IMAGE_STUDIO_CROP_ERROR_CODES } from '@/features/ai/image-studio/contracts/crop';

const {
  mkdirMock,
  writeFileMock,
  readFileMock,
  buildCropFingerprintMock,
  buildCropFingerprintRelationTypeMock,
  buildCropRequestRelationTypeMock,
  clampCropRectMock,
  validateCropOutputDimensionsMock,
  validateCropSourceDimensionsMock,
  getImageStudioSlotLinkBySourceAndRelationMock,
  upsertImageStudioSlotLinkMock,
  createImageStudioSlotsMock,
  getImageStudioSlotByIdMock,
  getImageFileRepositoryMock,
  getDiskPathFromPublicPathMock,
  createImageFileMock,
  logSystemEventMock,
} = vi.hoisted(() => ({
  mkdirMock: vi.fn(),
  writeFileMock: vi.fn(),
  readFileMock: vi.fn(),
  buildCropFingerprintMock: vi.fn(),
  buildCropFingerprintRelationTypeMock: vi.fn(),
  buildCropRequestRelationTypeMock: vi.fn(),
  clampCropRectMock: vi.fn(),
  validateCropOutputDimensionsMock: vi.fn(),
  validateCropSourceDimensionsMock: vi.fn(),
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
  getImageFileRepositoryMock: vi.fn(),
  getDiskPathFromPublicPathMock: vi.fn(),
  createImageFileMock: vi.fn(),
  logSystemEventMock: vi.fn(),
}));

vi.mock('fs/promises', () => ({
  default: {
    mkdir: mkdirMock,
    writeFile: writeFileMock,
    readFile: readFileMock,
  },
  mkdir: mkdirMock,
  writeFile: writeFileMock,
  readFile: readFileMock,
}));

vi.mock('@/shared/lib/ai/image-studio/server/crop-utils', () => ({
  buildCropFingerprint: buildCropFingerprintMock,
  buildCropFingerprintRelationType: buildCropFingerprintRelationTypeMock,
  buildCropRequestRelationType: buildCropRequestRelationTypeMock,
  clampCropRect: clampCropRectMock,
  validateCropOutputDimensions: validateCropOutputDimensionsMock,
  validateCropSourceDimensions: validateCropSourceDimensionsMock,
}));

vi.mock('@/shared/lib/ai/image-studio/server/slot-link-repository', () => ({
  getImageStudioSlotLinkBySourceAndRelation: getImageStudioSlotLinkBySourceAndRelationMock,
  upsertImageStudioSlotLink: upsertImageStudioSlotLinkMock,
}));

vi.mock('@/shared/lib/ai/image-studio/server/slot-repository', () => ({
  createImageStudioSlots: createImageStudioSlotsMock,
  getImageStudioSlotById: getImageStudioSlotByIdMock,
}));

vi.mock('@/features/files/server', () => ({
  getImageFileRepository: getImageFileRepositoryMock,
  getDiskPathFromPublicPath: getDiskPathFromPublicPathMock,
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

const toDataUrl = (buffer: Buffer): string => `data:image/png;base64,${buffer.toString('base64')}`;

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
  createdAt: new Date('2026-02-20T19:00:00.000Z').toISOString(),
  updatedAt: new Date('2026-02-20T19:00:00.000Z').toISOString(),
  ...overrides,
});

const buildRequest = (
  body: Record<string, unknown>,
  headers?: Record<string, string>
): NextRequest =>
  new NextRequest('http://localhost/api/image-studio/slots/source-slot/crop', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(headers ?? {}),
    },
    body: JSON.stringify(body),
  });

const buildApiContext = () =>
  ({
    requestId: 'req-crop-test-1',
    startTime: Date.now(),
    userId: null,
    getElapsedMs: () => 0,
  }) as const;

const loadHandler = async () => {
  const mod = await import('./handler');
  return mod.postCropSlotHandler;
};

describe('image-studio crop handler', () => {
  let sourceBuffer: Buffer;
  let sourceDataUrl: string;

  beforeEach(async () => {
    vi.resetModules();

    delete process.env['IMAGE_STUDIO_CROP_SERVER_AUTHORITATIVE'];
    delete process.env['IMAGE_STUDIO_CROP_PIPELINE_VERSION'];

    sourceBuffer = await createPngBuffer(20, 20);
    sourceDataUrl = toDataUrl(sourceBuffer);

    mkdirMock.mockReset();
    writeFileMock.mockReset();
    readFileMock.mockReset();
    buildCropFingerprintMock.mockReset();
    buildCropFingerprintRelationTypeMock.mockReset();
    buildCropRequestRelationTypeMock.mockReset();
    clampCropRectMock.mockReset();
    validateCropOutputDimensionsMock.mockReset();
    validateCropSourceDimensionsMock.mockReset();
    getImageStudioSlotLinkBySourceAndRelationMock.mockReset();
    upsertImageStudioSlotLinkMock.mockReset();
    createImageStudioSlotsMock.mockReset();
    getImageStudioSlotByIdMock.mockReset();
    getImageFileRepositoryMock.mockReset();
    getDiskPathFromPublicPathMock.mockReset();
    createImageFileMock.mockReset();
    logSystemEventMock.mockReset();

    buildCropFingerprintMock.mockReturnValue('fingerprint-crop-fixed');
    buildCropFingerprintRelationTypeMock.mockImplementation(
      (fingerprint: string) => `crop:output:${fingerprint}`
    );
    buildCropRequestRelationTypeMock.mockImplementation(
      (requestId: string) => `crop:request:${requestId.trim()}`
    );
    clampCropRectMock.mockReturnValue({ left: 1, top: 1, width: 6, height: 6 });
    validateCropSourceDimensionsMock.mockReturnValue({ ok: true });
    validateCropOutputDimensionsMock.mockReturnValue(true);
    readFileMock.mockResolvedValue(sourceBuffer);
    getDiskPathFromPublicPathMock.mockReturnValue('/tmp/source.png');

    createImageFileMock.mockResolvedValue({
      id: 'image-file-crop-1',
      filename: 'crop-server_bbox.png',
      filepath: '/uploads/studio/crops/project-1/source-slot/crop-server_bbox.png',
      mimetype: 'image/png',
      size: 1024,
      width: 6,
      height: 6,
    });
    getImageFileRepositoryMock.mockResolvedValue({
      createImageFile: createImageFileMock,
    });

    createImageStudioSlotsMock.mockResolvedValue([
      buildSlot({
        id: 'slot-crop-created-1',
        projectId: 'project-1',
        name: 'Source • Crop',
        imageFileId: 'image-file-crop-1',
        imageUrl: '/uploads/studio/crops/project-1/source-slot/crop-server_bbox.png',
      }),
    ]);
    upsertImageStudioSlotLinkMock.mockResolvedValue({ id: 'link-crop-1' });
    getImageStudioSlotLinkBySourceAndRelationMock.mockResolvedValue(null);
    getImageStudioSlotByIdMock.mockImplementation(async (slotId: string) => {
      if (slotId === 'source-slot') {
        return buildSlot({
          id: 'source-slot',
          projectId: 'project-1',
          name: 'Source',
          imageFileId: 'source-file-1',
          imageBase64: sourceDataUrl,
          imageFile: {
            width: 20,
            height: 20,
            filepath: '/uploads/studio/source.png',
            mimetype: 'image/png',
          },
        });
      }
      return null;
    });
  });

  it('returns request-id deduplicated crop slot when request link exists', async () => {
    const existingSlot = buildSlot({
      id: 'slot-crop-existing-1',
      projectId: 'project-1',
      name: 'Source • Crop',
      imageFileId: 'existing-file',
      imageUrl: '/uploads/studio/crop-existing.png',
    });
    getImageStudioSlotByIdMock.mockImplementation(async (slotId: string) => {
      if (slotId === 'source-slot') {
        return buildSlot({
          id: 'source-slot',
          projectId: 'project-1',
          name: 'Source',
          imageBase64: sourceDataUrl,
        });
      }
      if (slotId === 'slot-crop-existing-1') {
        return existingSlot;
      }
      return null;
    });
    getImageStudioSlotLinkBySourceAndRelationMock.mockImplementation(
      async (_projectId: string, _sourceSlotId: string, relationType: string) => {
        if (relationType === 'crop:request:req_crop_dedupe_1234') {
          return {
            id: 'link-crop-existing-1',
            sourceSlotId: 'source-slot',
            targetSlotId: 'slot-crop-existing-1',
            relationType,
          };
        }
        return null;
      }
    );

    const postCropSlotHandler = await loadHandler();
    const response = await postCropSlotHandler(
      buildRequest({
        mode: 'server_bbox',
        cropRect: { x: 0, y: 0, width: 10, height: 10 },
        requestId: 'req_crop_dedupe_1234',
      }),
      buildApiContext(),
      { slotId: 'source-slot' }
    );

    const payload = (await response.json()) as Record<string, unknown>;
    expect(response.status).toBe(200);
    expect(payload['deduplicated']).toBe(true);
    expect(payload['dedupeReason']).toBe('request');
    expect(payload['sourceSlotId']).toBe('source-slot');
    expect(payload['effectiveMode']).toBe('server_bbox');
    expect((payload['slot'] as Record<string, unknown>)['id']).toBe('slot-crop-existing-1');

    expect(clampCropRectMock).not.toHaveBeenCalled();
    expect(createImageStudioSlotsMock).not.toHaveBeenCalled();
    expect(upsertImageStudioSlotLinkMock).not.toHaveBeenCalled();
  });

  it('persists cropped output and writes request/fingerprint links', async () => {
    const postCropSlotHandler = await loadHandler();
    const response = await postCropSlotHandler(
      buildRequest(
        {
          mode: 'server_bbox',
          cropRect: { x: 0, y: 0, width: 12, height: 12 },
          requestId: 'req_crop_persist_1234',
        },
        {
          'x-idempotency-key': 'req_crop_persist_1234',
        }
      ),
      buildApiContext(),
      { slotId: 'source-slot' }
    );

    const payload = (await response.json()) as Record<string, unknown>;
    expect(response.status).toBe(201);
    expect(payload['deduplicated']).toBe(false);
    expect(payload['sourceSlotId']).toBe('source-slot');
    expect(payload['effectiveMode']).toBe('server_bbox');
    expect((payload['slot'] as Record<string, unknown>)['id']).toBe('slot-crop-created-1');

    expect(clampCropRectMock).toHaveBeenCalledTimes(1);
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
    expect(metadata?.['relationType']).toBe('crop:output');
    const cropMetadata =
      metadata && typeof metadata['crop'] === 'object' && !Array.isArray(metadata['crop'])
        ? (metadata['crop'] as Record<string, unknown>)
        : null;
    expect(cropMetadata).not.toBeNull();
    expect(cropMetadata?.['mode']).toBe('server_bbox');
    expect(cropMetadata?.['effectiveMode']).toBe('server_bbox');
    expect(cropMetadata?.['authoritativeSource']).toBe('source_slot');
  });

  it('supports fingerprint dedupe when output fingerprint link exists', async () => {
    const existingSlot = buildSlot({
      id: 'slot-crop-fingerprint-existing',
      projectId: 'project-1',
      name: 'Source • Crop',
      imageFileId: 'existing-file',
      imageUrl: '/uploads/studio/crop-existing-fingerprint.png',
    });
    getImageStudioSlotByIdMock.mockImplementation(async (slotId: string) => {
      if (slotId === 'source-slot') {
        return buildSlot({
          id: 'source-slot',
          projectId: 'project-1',
          name: 'Source',
          imageBase64: sourceDataUrl,
        });
      }
      if (slotId === 'slot-crop-fingerprint-existing') {
        return existingSlot;
      }
      return null;
    });
    getImageStudioSlotLinkBySourceAndRelationMock.mockImplementation(
      async (_projectId: string, _sourceSlotId: string, relationType: string) => {
        if (relationType === 'crop:output:fingerprint-crop-fixed') {
          return {
            id: 'link-crop-fingerprint-existing',
            sourceSlotId: 'source-slot',
            targetSlotId: 'slot-crop-fingerprint-existing',
            relationType,
          };
        }
        return null;
      }
    );

    const postCropSlotHandler = await loadHandler();
    const response = await postCropSlotHandler(
      buildRequest({
        mode: 'server_bbox',
        cropRect: { x: 0, y: 0, width: 10, height: 10 },
      }),
      buildApiContext(),
      { slotId: 'source-slot' }
    );

    const payload = (await response.json()) as Record<string, unknown>;
    expect(response.status).toBe(200);
    expect(payload['deduplicated']).toBe(true);
    expect(payload['dedupeReason']).toBe('fingerprint');
    expect((payload['slot'] as Record<string, unknown>)['id']).toBe(
      'slot-crop-fingerprint-existing'
    );
    expect(clampCropRectMock).not.toHaveBeenCalled();
    expect(createImageStudioSlotsMock).not.toHaveBeenCalled();
  });

  it('throws bad request app error for invalid crop payload', async () => {
    const postCropSlotHandler = await loadHandler();
    let thrown: unknown = null;
    try {
      await postCropSlotHandler(
        buildRequest({
          mode: 'invalid_crop_mode',
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
    expect((thrown as { meta?: Record<string, unknown> }).meta?.['cropErrorCode']).toBe(
      IMAGE_STUDIO_CROP_ERROR_CODES.INVALID_PAYLOAD
    );
    expect(getImageStudioSlotByIdMock).not.toHaveBeenCalled();
  });
});
