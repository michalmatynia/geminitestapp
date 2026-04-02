import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApiHandlerContext } from '@/shared/contracts/ui';

const {
  deleteImageStudioSlotCascadeMock,
  listImageStudioSlotsMock,
  captureExceptionMock,
} = vi.hoisted(() => ({
  deleteImageStudioSlotCascadeMock: vi.fn(),
  listImageStudioSlotsMock: vi.fn(),
  captureExceptionMock: vi.fn(),
}));

vi.mock('@/features/ai/server', () => ({
  deleteImageStudioSlotCascade: (...args: unknown[]) => deleteImageStudioSlotCascadeMock(...args),
  listImageStudioSlots: (...args: unknown[]) => listImageStudioSlotsMock(...args),
}));

vi.mock('@/shared/utils/observability/error-system', () => ({
  ErrorSystem: {
    captureException: (...args: unknown[]) => captureExceptionMock(...args),
  },
}));

import { DELETE_handler, POST_handler, deleteQuerySchema } from './handler';

describe('image-studio project folders handler module', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exports the supported handlers and query schema', () => {
    expect(typeof POST_handler).toBe('function');
    expect(typeof DELETE_handler).toBe('function');
    expect(typeof deleteQuerySchema.safeParse).toBe('function');
  });

  it('deletes only matching folder roots and skips nested duplicates deleted by cascade', async () => {
    listImageStudioSlotsMock.mockResolvedValue([
      { id: 'slot-a', folderPath: 'cards/folder-a' },
      { id: 'slot-b', folderPath: 'cards/folder-a/nested' },
      { id: 'slot-c', folderPath: 'cards/other-folder' },
    ]);
    deleteImageStudioSlotCascadeMock.mockResolvedValue({
      deletedSlotIds: ['slot-a', 'slot-b', 'slot-a-child'],
    });

    const response = await DELETE_handler(
      new NextRequest('http://localhost/api/image-studio/projects/project-1/folders?folder=cards/folder-a'),
      {
        query: { folder: 'cards/folder-a' },
      } as ApiHandlerContext,
      { projectId: 'project-1' }
    );

    expect(listImageStudioSlotsMock).toHaveBeenCalledWith('project-1');
    expect(deleteImageStudioSlotCascadeMock).toHaveBeenCalledTimes(1);
    expect(deleteImageStudioSlotCascadeMock).toHaveBeenCalledWith('slot-a');
    await expect(response.json()).resolves.toEqual({
      ok: true,
      folder: 'cards/folder-a',
      targetSlotCount: 2,
      deletedSlotIds: ['slot-a', 'slot-b', 'slot-a-child'],
      failedRootSlotIds: [],
      warnings: [],
    });
  });

  it('reports failed roots and warnings when folder deletes throw or return no deletions', async () => {
    const deleteError = new Error('delete failed');
    listImageStudioSlotsMock.mockResolvedValue([
      { id: 'slot-a', folderPath: 'cards/folder-a' },
      { id: 'slot-b', folderPath: 'cards/folder-a/nested' },
    ]);
    deleteImageStudioSlotCascadeMock
      .mockRejectedValueOnce(deleteError)
      .mockResolvedValueOnce({ deletedSlotIds: [] });

    const response = await DELETE_handler(
      new NextRequest('http://localhost/api/image-studio/projects/project-1/folders?folder=cards/folder-a'),
      {
        query: { folder: 'cards/folder-a' },
      } as ApiHandlerContext,
      { projectId: 'project-1' }
    );

    expect(captureExceptionMock).toHaveBeenCalledWith(deleteError);
    await expect(response.json()).resolves.toEqual({
      ok: true,
      folder: 'cards/folder-a',
      targetSlotCount: 2,
      deletedSlotIds: [],
      failedRootSlotIds: ['slot-a', 'slot-b'],
      warnings: ['Some cards in folder "cards/folder-a" could not be deleted.'],
    });
  });
});
