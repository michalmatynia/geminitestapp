import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApiHandlerContext } from '@/shared/contracts/ui/api';

const {
  uploadFileMock,
  buildAgentPersonaAvatarThumbnailMock,
  upsertAgentPersonaAvatarThumbnailMock,
  deleteAgentPersonaAvatarThumbnailByRefMock,
} = vi.hoisted(() => ({
  uploadFileMock: vi.fn(),
  buildAgentPersonaAvatarThumbnailMock: vi.fn(),
  upsertAgentPersonaAvatarThumbnailMock: vi.fn(),
  deleteAgentPersonaAvatarThumbnailByRefMock: vi.fn(),
}));

vi.mock('@/features/files/server', () => ({
  uploadFile: uploadFileMock,
}));

vi.mock('@/features/ai/agentcreator/server/persona-avatar-thumbnails', () => ({
  buildAgentPersonaAvatarThumbnail: buildAgentPersonaAvatarThumbnailMock,
  upsertAgentPersonaAvatarThumbnail: upsertAgentPersonaAvatarThumbnailMock,
  deleteAgentPersonaAvatarThumbnailByRef: deleteAgentPersonaAvatarThumbnailByRefMock,
}));

import { DELETE_handler, POST_handler } from './handler';

const createRequestContext = (overrides?: Partial<ApiHandlerContext>): ApiHandlerContext =>
  ({
    requestId: 'request-agent-avatar-1',
    traceId: 'trace-agent-avatar-1',
    correlationId: 'corr-agent-avatar-1',
    startTime: Date.now(),
    getElapsedMs: () => 1,
    ...overrides,
  }) as ApiHandlerContext;

const createUploadRequest = (input: {
  file: File;
  personaId?: string;
  moodId?: string;
}): NextRequest => {
  const formData = new FormData();
  formData.set('file', input.file);
  if (input.personaId) {
    formData.set('personaId', input.personaId);
  }
  if (input.moodId) {
    formData.set('moodId', input.moodId);
  }

  return new NextRequest('http://localhost/api/agentcreator/personas/avatar', {
    method: 'POST',
    body: formData,
  });
};

describe('agent persona avatar handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    uploadFileMock.mockResolvedValue({
      id: 'file-1',
      filename: 'avatar.png',
      filepath: '/uploads/personas/persona_1/neutral/avatar.png',
      mimeType: 'image/png',
      size: 128,
    });
    upsertAgentPersonaAvatarThumbnailMock.mockResolvedValue(true);
    deleteAgentPersonaAvatarThumbnailByRefMock.mockResolvedValue(true);
  });

  it('uploads raster avatars and persists the embedded thumbnail sidecar', async () => {
    buildAgentPersonaAvatarThumbnailMock.mockResolvedValue({
      ref: 'persona_1:neutral:thumb:abc123',
      personaId: 'persona_1',
      moodId: 'neutral',
      dataUrl: 'data:image/webp;base64,ZmFrZQ==',
      mimeType: 'image/webp',
      width: 96,
      height: 96,
      bytes: 2048,
      hash: 'hash-1',
      updatedAt: '2026-03-09T10:00:00.000Z',
    });

    const file = new File([new Uint8Array([1, 2, 3])], 'avatar.png', {
      type: 'image/png',
    });
    const response = await POST_handler(
      createUploadRequest({
        file,
        personaId: 'persona 1',
        moodId: 'neutral',
      }),
      createRequestContext(),
    );

    expect(response.status).toBe(201);
    expect(buildAgentPersonaAvatarThumbnailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        personaId: 'persona_1',
        moodId: 'neutral',
        buffer: expect.any(Buffer),
      }),
    );
    const [uploadedFile, uploadOptions] = uploadFileMock.mock.calls[0] ?? [];
    expect(uploadedFile?.type).toBe('image/png');
    expect(uploadedFile?.size).toBeGreaterThan(0);
    expect(uploadOptions).toEqual(
      expect.objectContaining({
        category: 'agentcreator',
        folder: 'personas/persona_1/neutral',
        allowOrphanRecord: true,
      }),
    );
    expect(upsertAgentPersonaAvatarThumbnailMock).toHaveBeenCalledWith(
      expect.objectContaining({
        ref: 'persona_1:neutral:thumb:abc123',
        dataUrl: 'data:image/webp;base64,ZmFrZQ==',
      }),
    );
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({
        id: 'file-1',
        folder: 'personas/persona_1/neutral',
        thumbnail: {
          ref: 'persona_1:neutral:thumb:abc123',
          dataUrl: 'data:image/webp;base64,ZmFrZQ==',
          mimeType: 'image/webp',
          bytes: 2048,
          width: 96,
          height: 96,
        },
      }),
    );
  });

  it('still uploads the avatar when thumbnail generation fails', async () => {
    buildAgentPersonaAvatarThumbnailMock.mockRejectedValue(
      new Error('pngload_buffer: libspng read error')
    );

    const file = new File([new Uint8Array([1, 2, 3])], 'avatar.png', {
      type: 'image/png',
    });

    const response = await POST_handler(
      createUploadRequest({
        file,
        personaId: 'persona-1',
        moodId: 'neutral',
      }),
      createRequestContext(),
    );

    expect(response.status).toBe(201);
    expect(uploadFileMock).toHaveBeenCalledTimes(1);
    expect(upsertAgentPersonaAvatarThumbnailMock).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({
        id: 'file-1',
        folder: 'personas/persona-1/neutral',
        thumbnail: null,
      }),
    );
  });

  it('still uploads the avatar when thumbnail persistence fails', async () => {
    buildAgentPersonaAvatarThumbnailMock.mockResolvedValue({
      ref: 'persona-1:neutral:thumb:def456',
      personaId: 'persona-1',
      moodId: 'neutral',
      dataUrl: 'data:image/webp;base64,ZmFrZQ==',
      mimeType: 'image/webp',
      width: 96,
      height: 96,
      bytes: 2048,
      hash: 'hash-2',
      updatedAt: '2026-03-09T10:00:00.000Z',
    });
    upsertAgentPersonaAvatarThumbnailMock.mockResolvedValue(false);

    const file = new File([new Uint8Array([1, 2, 3])], 'avatar.png', {
      type: 'image/png',
    });

    const response = await POST_handler(
      createUploadRequest({
        file,
        personaId: 'persona-1',
        moodId: 'neutral',
      }),
      createRequestContext(),
    );

    expect(response.status).toBe(201);
    expect(uploadFileMock).toHaveBeenCalledTimes(1);
    expect(upsertAgentPersonaAvatarThumbnailMock).toHaveBeenCalledTimes(1);
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({
        id: 'file-1',
        folder: 'personas/persona-1/neutral',
        thumbnail: null,
      }),
    );
  });

  it('skips embedded thumbnail generation for svg uploads', async () => {
    const file = new File(['<svg viewBox="0 0 10 10"></svg>'], 'avatar.svg', {
      type: 'image/svg+xml',
    });

    const response = await POST_handler(
      createUploadRequest({
        file,
        personaId: 'persona-1',
        moodId: 'neutral',
      }),
      createRequestContext(),
    );

    expect(response.status).toBe(201);
    expect(buildAgentPersonaAvatarThumbnailMock).not.toHaveBeenCalled();
    expect(upsertAgentPersonaAvatarThumbnailMock).not.toHaveBeenCalled();
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({
        thumbnail: null,
      }),
    );
  });

  it('deletes a persisted thumbnail sidecar by ref', async () => {
    const response = await DELETE_handler(
      new NextRequest(
        'http://localhost/api/agentcreator/personas/avatar?thumbnailRef=thumb-ref-1',
        {
          method: 'DELETE',
        },
      ),
      createRequestContext({
        query: {
          thumbnailRef: 'thumb-ref-1',
        },
      }),
    );

    expect(response.status).toBe(204);
    expect(deleteAgentPersonaAvatarThumbnailByRefMock).toHaveBeenCalledWith('thumb-ref-1');
  });
});
