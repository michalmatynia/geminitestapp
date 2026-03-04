import { NextRequest } from 'next/server';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

const {
  listAiPathsSettingsMock,
  upsertAiPathsSettingMock,
  upsertAiPathsSettingsBulkMock,
  deleteAiPathsSettingsMock,
} = vi.hoisted(() => ({
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

import { GET_handler, POST_handler } from './handler';

const originalLegacyPathIndexCompatEnv = process.env['AI_PATHS_LEGACY_PATH_INDEX_COMPAT_ENABLED'];

describe('ai-paths settings handler', () => {
  beforeEach(() => {
    listAiPathsSettingsMock.mockReset();
    upsertAiPathsSettingMock.mockReset();
    upsertAiPathsSettingsBulkMock.mockReset();
    deleteAiPathsSettingsMock.mockReset();
    if (originalLegacyPathIndexCompatEnv === undefined) {
      delete process.env['AI_PATHS_LEGACY_PATH_INDEX_COMPAT_ENABLED'];
    } else {
      process.env['AI_PATHS_LEGACY_PATH_INDEX_COMPAT_ENABLED'] = originalLegacyPathIndexCompatEnv;
    }
  });

  afterAll(() => {
    if (originalLegacyPathIndexCompatEnv === undefined) {
      delete process.env['AI_PATHS_LEGACY_PATH_INDEX_COMPAT_ENABLED'];
    } else {
      process.env['AI_PATHS_LEGACY_PATH_INDEX_COMPAT_ENABLED'] = originalLegacyPathIndexCompatEnv;
    }
  });

  it('returns full settings list when no keys are requested', async () => {
    listAiPathsSettingsMock.mockResolvedValue([{ key: 'ai_paths_index', value: '[]' }]);
    const response = await GET_handler(
      new NextRequest('http://localhost/api/ai-paths/settings') as Parameters<
        typeof GET_handler
      >[0],
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
    expect(listAiPathsSettingsMock).toHaveBeenCalledWith(['ai_paths_index', 'ai_paths_ui_state']);
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

  it('rejects legacy index key requests when compatibility is disabled', async () => {
    process.env['AI_PATHS_LEGACY_PATH_INDEX_COMPAT_ENABLED'] = 'false';

    await expect(
      GET_handler(
        new NextRequest('http://localhost/api/ai-paths/settings?keys=ai_paths_index_v1') as Parameters<
          typeof GET_handler
        >[0],
        {} as Parameters<typeof GET_handler>[1]
      )
    ).rejects.toThrow('Legacy AI Paths key "ai_paths_index_v1" is disabled. Use "ai_paths_index".');

    expect(listAiPathsSettingsMock).not.toHaveBeenCalled();
  });

  it('filters legacy index records from full list when compatibility is disabled', async () => {
    process.env['AI_PATHS_LEGACY_PATH_INDEX_COMPAT_ENABLED'] = 'false';
    listAiPathsSettingsMock.mockResolvedValue([
      { key: 'ai_paths_index_v1', value: '[{"id":"legacy"}]' },
      { key: 'ai_paths_index', value: '[{"id":"canonical"}]' },
      { key: 'ai_paths_ui_state', value: '{"value":{}}' },
    ]);

    const response = await GET_handler(
      new NextRequest('http://localhost/api/ai-paths/settings') as Parameters<typeof GET_handler>[0],
      {} as Parameters<typeof GET_handler>[1]
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual([
      { key: 'ai_paths_index', value: '[{"id":"canonical"}]' },
      { key: 'ai_paths_ui_state', value: '{"value":{}}' },
    ]);
  });

  it('rejects legacy index writes when compatibility is disabled', async () => {
    process.env['AI_PATHS_LEGACY_PATH_INDEX_COMPAT_ENABLED'] = 'false';

    await expect(
      POST_handler(
        new NextRequest('http://localhost/api/ai-paths/settings', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({
            key: 'ai_paths_index_v1',
            value: '[]',
          }),
        }) as Parameters<typeof POST_handler>[0],
        {} as Parameters<typeof POST_handler>[1]
      )
    ).rejects.toThrow('Legacy AI Paths key "ai_paths_index_v1" is disabled. Use "ai_paths_index".');

    expect(upsertAiPathsSettingMock).not.toHaveBeenCalled();
    expect(upsertAiPathsSettingsBulkMock).not.toHaveBeenCalled();
  });
});
