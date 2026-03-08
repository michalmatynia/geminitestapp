import { beforeEach, describe, expect, it, vi } from 'vitest';

const { uploadFileMock } = vi.hoisted(() => ({
  uploadFileMock: vi.fn(),
}));

vi.mock('@/features/files/server', () => ({
  uploadFile: uploadFileMock,
}));

import { POST_handler } from './handler';

describe('agentcreator persona avatar upload handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    uploadFileMock.mockResolvedValue({
      id: 'file-1',
      filename: 'avatar.svg',
      filepath: '/uploads/agentcreator/personas/persona_1____bad/encouraging_/avatar.svg',
      mimetype: 'image/svg+xml',
      size: 123,
    });
  });

  it('uploads avatar files into a sanitized agentcreator personas folder', async () => {
    const file = {
      name: 'avatar.svg',
      type: 'image/svg+xml',
      size: 7,
      arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(7)),
    };
    const formData = {
      getAll: (key: string) => {
        if (key === 'file') return [file];
        return [];
      },
      get: (key: string) => {
        if (key === 'personaId') return 'persona 1/../bad';
        if (key === 'moodId') return 'encouraging!';
        return null;
      },
    };

    const response = await POST_handler(
      {
        formData: vi.fn().mockResolvedValue(formData),
      } as unknown as Parameters<typeof POST_handler>[0],
      {} as Parameters<typeof POST_handler>[1]
    );

    const uploadedFile = uploadFileMock.mock.calls[0]?.[0] as
      | { name?: string; type?: string }
      | undefined;
    expect(uploadedFile?.name).toBe('avatar.svg');
    expect(uploadedFile?.type).toBe('image/svg+xml');
    expect(uploadFileMock.mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({
        category: 'agentcreator',
        folder: 'personas/persona_1____bad/encouraging_',
        allowOrphanRecord: true,
      })
    );
    expect(response.status).toBe(201);
    await expect(response.json()).resolves.toMatchObject({
      id: 'file-1',
      filename: 'avatar.svg',
      filepath: '/uploads/agentcreator/personas/persona_1____bad/encouraging_/avatar.svg',
      originalName: 'avatar.svg',
      folder: 'personas/persona_1____bad/encouraging_',
    });
  });

  it('rejects requests that do not include a file', async () => {
    await expect(
      POST_handler(
        {
          formData: vi.fn().mockResolvedValue({
            getAll: () => [],
            get: () => null,
          }),
        } as unknown as Parameters<typeof POST_handler>[0],
        {} as Parameters<typeof POST_handler>[1]
      )
    ).rejects.toThrow(/no file provided/i);

    expect(uploadFileMock).not.toHaveBeenCalled();
  });
});
