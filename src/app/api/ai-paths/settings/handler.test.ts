import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { listAiPathsSettingsMock, upsertAiPathsSettingMock, upsertAiPathsSettingsBulkMock, deleteAiPathsSettingsMock } =
  vi.hoisted(() => ({
    listAiPathsSettingsMock: vi.fn(),
    upsertAiPathsSettingMock: vi.fn(),
    upsertAiPathsSettingsBulkMock: vi.fn(),
    deleteAiPathsSettingsMock: vi.fn(),
  }));

vi.mock('@/features/ai/ai-paths/server', () => ({
  listAiPathsSettings: listAiPathsSettingsMock,
  upsertAiPathsSetting: upsertAiPathsSettingMock,
  upsertAiPathsSettingsBulk: upsertAiPathsSettingsBulkMock,
  deleteAiPathsSettings: deleteAiPathsSettingsMock,
}));

import { GET_handler } from './handler';

describe('ai-paths settings handler', () => {
  beforeEach(() => {
    listAiPathsSettingsMock.mockReset();
    upsertAiPathsSettingMock.mockReset();
    upsertAiPathsSettingsBulkMock.mockReset();
    deleteAiPathsSettingsMock.mockReset();
  });

  it('returns full settings list when no keys are requested', async () => {
    listAiPathsSettingsMock.mockResolvedValue([{ key: 'ai_paths_index', value: '[]' }]);
    const response = await GET_handler(
      new NextRequest('http://localhost/api/ai-paths/settings') as Parameters<typeof GET_handler>[0],
      {} as Parameters<typeof GET_handler>[1]
    );

    expect(response.status).toBe(200);
    expect(listAiPathsSettingsMock).toHaveBeenCalledWith();
    await expect(response.json()).resolves.toEqual([{ key: 'ai_paths_index', value: '[]' }]);
  });

  it('filters settings by requested keys', async () => {
    listAiPathsSettingsMock.mockResolvedValue([{ key: 'ai_paths_index', value: '[]' }]);
    const response = await GET_handler(
      new NextRequest(
        'http://localhost/api/ai-paths/settings?keys=ai_paths_index,ai_paths_ui_state&keys=ai_paths_index'
      ) as Parameters<typeof GET_handler>[0],
      {} as Parameters<typeof GET_handler>[1]
    );

    expect(response.status).toBe(200);
    expect(listAiPathsSettingsMock).toHaveBeenCalledWith([
      'ai_paths_index',
      'ai_paths_ui_state',
    ]);
    await expect(response.json()).resolves.toEqual([{ key: 'ai_paths_index', value: '[]' }]);
  });

  it('rejects invalid key prefixes', async () => {
    await expect(
      GET_handler(
        new NextRequest(
          'http://localhost/api/ai-paths/settings?keys=ai_paths_index&keys=invalid_key'
        ) as Parameters<typeof GET_handler>[0],
        {} as Parameters<typeof GET_handler>[1]
      )
    ).rejects.toThrow('Invalid AI Paths key "invalid_key".');
  });
});
