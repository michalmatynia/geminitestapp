import { NextRequest } from 'next/server';
import sharp from 'sharp';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { IMAGE_STUDIO_UPSCALE_ERROR_CODES } from '@/features/ai/image-studio/contracts/upscale';

const {
  mkdirMock,
  writeFileMock,
  readFileMock,
  buildUpscaleFingerprintMock,
  buildUpscaleFingerprintRelationTypeMock,
  buildUpscaleRequestRelationTypeMock,
  deriveUpscaleScaleFromOutputDimensionsMock,
  resolveUpscaleStrategyFromRequestMock,
  upscaleImageWithSharpMock,
  validateUpscaleOutputDimensionsMock,
  validateUpscaleSourceDimensionsMock,
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
  buildUpscaleFingerprintMock: vi.fn(),
  buildUpscaleFingerprintRelationTypeMock: vi.fn(),
  buildUpscaleRequestRelationTypeMock: vi.fn(),
  deriveUpscaleScaleFromOutputDimensionsMock: vi.fn(),
  resolveUpscaleStrategyFromRequestMock: vi.fn(),
  upscaleImageWithSharpMock: vi.fn(),
  validateUpscaleOutputDimensionsMock: vi.fn(),
  validateUpscaleSourceDimensionsMock: vi.fn(),
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

vi.mock('@/features/ai/image-studio/server/upscale-utils', () => ({
  buildUpscaleFingerprint: buildUpscaleFingerprintMock,
  buildUpscaleFingerprintRelationType: buildUpscaleFingerprintRelationTypeMock,
  buildUpscaleRequestRelationType: buildUpscaleRequestRelationTypeMock,
  deriveUpscaleScaleFromOutputDimensions: deriveUpscaleScaleFromOutputDimensionsMock,
  resolveUpscaleStrategyFromRequest: resolveUpscaleStrategyFromRequestMock,
  upscaleImageWithSharp: upscaleImageWithSharpMock,
  validateUpscaleOutputDimensions: validateUpscaleOutputDimensionsMock,
  validateUpscaleSourceDimensions: validateUpscaleSourceDimensionsMock,
}));

vi.mock('@/features/ai/image-studio/server', () => ({
  getImageStudioSlotLinkBySourceAndRelation: getImageStudioSlotLinkBySourceAndRelationMock,
  upsertImageStudioSlotLink: upsertImageStudioSlotLinkMock,
}));

vi.mock('@/features/ai/image-studio/server', () => ({
  createImageStudioSlots: createImageStudioSlotsMock,
  getImageStudioSlotById: getImageStudioSlotByIdMock,
}));

vi.mock('@/features/files/server', () => ({
  getImageFileRepository: getImageFileRepositoryMock,
  getDiskPathFromPublicPath: getDiskPathFromPublicPathMock,
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
  createdAt: new Date('2026-02-20T19:15:00.000Z').toISOString(),
  updatedAt: new Date('2026-02-20T19:15:00.000Z').toISOString(),
  ...overrides,
});

const buildRequest = (
  body: Record<string, unknown>,
  headers?: Record<string, string>
): NextRequest =>
  new NextRequest('http://localhost/api/image-studio/slots/source-slot/upscale', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      ...(headers ?? {}),
    },
    body: JSON.stringify(body),
  });

const buildApiContext = () =>
  ({
    requestId: 'req-upscale-test-1',
    startTime: Date.now(),
    userId: null,
    getElapsedMs: () => 0,
  }) as const;

const loadHandler = async () => {
  const mod = await import('./handler');
  return mod.postUpscaleSlotHandler;
};

describe('image-studio upscale handler', () => {
  let sourceBuffer: Buffer;
  let sourceDataUrl: string;
  let outputBuffer: Buffer;

  beforeEach(async () => {
    vi.resetModules();

    delete process.env['IMAGE_STUDIO_UPSCALE_SERVER_AUTHORITATIVE'];
    delete process.env['IMAGE_STUDIO_UPSCALE_PIPELINE_VERSION'];

    sourceBuffer = await createPngBuffer(20, 20);
    sourceDataUrl = toDataUrl(sourceBuffer);
    outputBuffer = await createPngBuffer(40, 40);

    mkdirMock.mockReset();
    writeFileMock.mockReset();
    readFileMock.mockReset();
    buildUpscaleFingerprintMock.mockReset();
    buildUpscaleFingerprintRelationTypeMock.mockReset();
    buildUpscaleRequestRelationTypeMock.mockReset();
    deriveUpscaleScaleFromOutputDimensionsMock.mockReset();
    resolveUpscaleStrategyFromRequestMock.mockReset();
    upscaleImageWithSharpMock.mockReset();
    validateUpscaleOutputDimensionsMock.mockReset();
    validateUpscaleSourceDimensionsMock.mockReset();
    getImageStudioSlotLinkBySourceAndRelationMock.mockReset();
    upsertImageStudioSlotLinkMock.mockReset();
    createImageStudioSlotsMock.mockReset();
    getImageStudioSlotByIdMock.mockReset();
    getImageFileRepositoryMock.mockReset();
    getDiskPathFromPublicPathMock.mockReset();
    createImageFileMock.mockReset();
    logSystemEventMock.mockReset();

    buildUpscaleFingerprintMock.mockReturnValue('fingerprint-upscale-fixed');
    buildUpscaleFingerprintRelationTypeMock.mockImplementation(
      (fingerprint: string) => `upscale:output:${fingerprint}`
    );
    buildUpscaleRequestRelationTypeMock.mockImplementation(
      (requestId: string) => `upscale:request:${requestId.trim()}`
    );
    resolveUpscaleStrategyFromRequestMock.mockReturnValue('scale');
    validateUpscaleSourceDimensionsMock.mockReturnValue({ ok: true });
    validateUpscaleOutputDimensionsMock.mockReturnValue(true);
    deriveUpscaleScaleFromOutputDimensionsMock.mockReturnValue(2);
    upscaleImageWithSharpMock.mockResolvedValue({
      outputBuffer,
      outputMime: 'image/png',
      outputWidth: 40,
      outputHeight: 40,
      scale: 2,
      strategy: 'scale',
      kernel: 'lanczos3',
    });

    readFileMock.mockResolvedValue(sourceBuffer);
    getDiskPathFromPublicPathMock.mockReturnValue('/tmp/source.png');

    createImageFileMock.mockResolvedValue({
      id: 'image-file-upscale-1',
      filename: 'upscale-server_sharp-2x.png',
      filepath: '/uploads/studio/upscale/project-1/source-slot/upscale-server_sharp-2x.png',
      mimetype: 'image/png',
      size: outputBuffer.length,
      width: 40,
      height: 40,
    });
    getImageFileRepositoryMock.mockResolvedValue({
      createImageFile: createImageFileMock,
    });

    createImageStudioSlotsMock.mockResolvedValue([
      buildSlot({
        id: 'slot-upscale-created-1',
        projectId: 'project-1',
        name: 'Source • Upscale 2x',
        imageFileId: 'image-file-upscale-1',
        imageUrl: '/uploads/studio/upscale/project-1/source-slot/upscale-server_sharp-2x.png',
      }),
    ]);
    upsertImageStudioSlotLinkMock.mockResolvedValue({ id: 'link-upscale-1' });
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

  it('returns request-id deduplicated upscale slot when request link exists', async () => {
    const existingSlot = buildSlot({
      id: 'slot-upscale-existing-1',
      projectId: 'project-1',
      name: 'Source • Upscale 2x',
      imageFileId: 'existing-file',
      imageUrl: '/uploads/studio/upscale-existing.png',
      metadata: {
        upscale: {
          effectiveMode: 'server_sharp',
          strategy: 'scale',
          scale: 2,
          targetWidth: null,
          targetHeight: null,
          smoothingQuality: null,
        },
      },
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
      if (slotId === 'slot-upscale-existing-1') {
        return existingSlot;
      }
      return null;
    });
    getImageStudioSlotLinkBySourceAndRelationMock.mockImplementation(
      async (_projectId: string, _sourceSlotId: string, relationType: string) => {
        if (relationType === 'upscale:request:req_upscale_dedupe_1234') {
          return {
            id: 'link-upscale-existing-1',
            sourceSlotId: 'source-slot',
            targetSlotId: 'slot-upscale-existing-1',
            relationType,
          };
        }
        return null;
      }
    );

    const postUpscaleSlotHandler = await loadHandler();
    const response = await postUpscaleSlotHandler(
      buildRequest({
        mode: 'server_sharp',
        strategy: 'scale',
        scale: 2,
        requestId: 'req_upscale_dedupe_1234',
      }),
      buildApiContext(),
      { slotId: 'source-slot' }
    );

    const payload = (await response.json()) as Record<string, unknown>;
    expect(response.status).toBe(200);
    expect(payload['deduplicated']).toBe(true);
    expect(payload['dedupeReason']).toBe('request');
    expect(payload['sourceSlotId']).toBe('source-slot');
    expect(payload['effectiveMode']).toBe('server_sharp');
    expect(payload['strategy']).toBe('scale');
    expect(payload['scale']).toBe(2);
    expect((payload['slot'] as Record<string, unknown>)['id']).toBe('slot-upscale-existing-1');

    expect(upscaleImageWithSharpMock).not.toHaveBeenCalled();
    expect(createImageStudioSlotsMock).not.toHaveBeenCalled();
    expect(upsertImageStudioSlotLinkMock).not.toHaveBeenCalled();
  });

  it('persists upscaled output and writes request/fingerprint links', async () => {
    const postUpscaleSlotHandler = await loadHandler();
    const response = await postUpscaleSlotHandler(
      buildRequest(
        {
          mode: 'server_sharp',
          strategy: 'scale',
          scale: 2,
          requestId: 'req_upscale_persist_1234',
        },
        {
          'x-idempotency-key': 'req_upscale_persist_1234',
        }
      ),
      buildApiContext(),
      { slotId: 'source-slot' }
    );

    const payload = (await response.json()) as Record<string, unknown>;
    expect(response.status).toBe(201);
    expect(payload['deduplicated']).toBe(false);
    expect(payload['sourceSlotId']).toBe('source-slot');
    expect(payload['effectiveMode']).toBe('server_sharp');
    expect(payload['strategy']).toBe('scale');
    expect(payload['scale']).toBe(2);
    expect((payload['slot'] as Record<string, unknown>)['id']).toBe('slot-upscale-created-1');

    expect(upscaleImageWithSharpMock).toHaveBeenCalledTimes(1);
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
    expect(metadata?.['relationType']).toBe('upscale:output');
    const upscaleMetadata =
      metadata && typeof metadata['upscale'] === 'object' && !Array.isArray(metadata['upscale'])
        ? (metadata['upscale'] as Record<string, unknown>)
        : null;
    expect(upscaleMetadata).not.toBeNull();
    expect(upscaleMetadata?.['mode']).toBe('server_sharp');
    expect(upscaleMetadata?.['effectiveMode']).toBe('server_sharp');
    expect(upscaleMetadata?.['strategy']).toBe('scale');
    expect(upscaleMetadata?.['scale']).toBe(2);
    expect(upscaleMetadata?.['authoritativeSource']).toBe('source_slot');
  });

  it('supports fingerprint dedupe when output fingerprint link exists', async () => {
    const existingSlot = buildSlot({
      id: 'slot-upscale-fingerprint-existing',
      projectId: 'project-1',
      name: 'Source • Upscale 2x',
      imageFileId: 'existing-file',
      imageUrl: '/uploads/studio/upscale-existing-fingerprint.png',
      metadata: {
        upscale: {
          effectiveMode: 'server_sharp',
          strategy: 'scale',
          scale: 2,
          targetWidth: null,
          targetHeight: null,
          smoothingQuality: null,
        },
      },
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
      if (slotId === 'slot-upscale-fingerprint-existing') {
        return existingSlot;
      }
      return null;
    });
    getImageStudioSlotLinkBySourceAndRelationMock.mockImplementation(
      async (_projectId: string, _sourceSlotId: string, relationType: string) => {
        if (relationType === 'upscale:output:fingerprint-upscale-fixed') {
          return {
            id: 'link-upscale-fingerprint-existing',
            sourceSlotId: 'source-slot',
            targetSlotId: 'slot-upscale-fingerprint-existing',
            relationType,
          };
        }
        return null;
      }
    );

    const postUpscaleSlotHandler = await loadHandler();
    const response = await postUpscaleSlotHandler(
      buildRequest({
        mode: 'server_sharp',
        strategy: 'scale',
        scale: 2,
      }),
      buildApiContext(),
      { slotId: 'source-slot' }
    );

    const payload = (await response.json()) as Record<string, unknown>;
    expect(response.status).toBe(200);
    expect(payload['deduplicated']).toBe(true);
    expect(payload['dedupeReason']).toBe('fingerprint');
    expect((payload['slot'] as Record<string, unknown>)['id']).toBe(
      'slot-upscale-fingerprint-existing'
    );
    expect(upscaleImageWithSharpMock).not.toHaveBeenCalled();
    expect(createImageStudioSlotsMock).not.toHaveBeenCalled();
  });

  it('throws bad request app error for invalid upscale payload', async () => {
    const postUpscaleSlotHandler = await loadHandler();
    let thrown: unknown = null;
    try {
      await postUpscaleSlotHandler(
        buildRequest({
          mode: 'invalid_upscale_mode',
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
    expect((thrown as { meta?: Record<string, unknown> }).meta?.['upscaleErrorCode']).toBe(
      IMAGE_STUDIO_UPSCALE_ERROR_CODES.INVALID_PAYLOAD
    );
    expect(getImageStudioSlotByIdMock).not.toHaveBeenCalled();
  });
});
