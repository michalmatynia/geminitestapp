import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  deleteAiPathsSettingsMock,
  getAiPathsSettingMock,
  requireAiPathsAccessMock,
  upsertAiPathsSettingMock,
} = vi.hoisted(() => ({
  deleteAiPathsSettingsMock: vi.fn(),
  getAiPathsSettingMock: vi.fn(),
  requireAiPathsAccessMock: vi.fn(),
  upsertAiPathsSettingMock: vi.fn(),
}));

vi.mock('@/features/ai/ai-paths/server', () => ({
  deleteAiPathsSettings: deleteAiPathsSettingsMock,
  getAiPathsSetting: getAiPathsSettingMock,
  requireAiPathsAccess: requireAiPathsAccessMock,
  upsertAiPathsSetting: upsertAiPathsSettingMock,
}));

import { POST_handler } from './handler';

describe('ai-paths trigger-buttons cleanup-fixtures handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAiPathsAccessMock.mockResolvedValue({
      userId: 'user-1',
      permissions: ['ai_paths.manage'],
      isElevated: false,
    });
  });

  it('removes leaked playwright fixture buttons and matching path configs', async () => {
    getAiPathsSettingMock.mockImplementation(async (key: string) => {
      if (key === 'ai_paths_trigger_buttons') {
        return JSON.stringify([
          {
            id: 'btn-live',
            name: 'Live Button',
            iconId: null,
            pathId: 'path_live',
            enabled: true,
            locations: ['product_row'],
            mode: 'click',
            display: 'icon_label',
            createdAt: '2026-03-09T00:00:00.000Z',
            updatedAt: '2026-03-09T00:00:00.000Z',
            sortIndex: 0,
          },
          {
            id: 'btn-fixture',
            name: 'Fixture Button',
            iconId: null,
            pathId: 'path_pw_products_fixture',
            enabled: true,
            locations: ['product_row'],
            mode: 'click',
            display: 'icon_label',
            createdAt: '2026-03-09T00:00:00.000Z',
            updatedAt: '2026-03-09T00:00:00.000Z',
            sortIndex: 1,
          },
        ]);
      }
      if (key === 'ai_paths_index') {
        return JSON.stringify([
          {
            id: 'path_live',
            name: 'Live Path',
            createdAt: '2026-03-09T00:00:00.000Z',
            updatedAt: '2026-03-09T00:00:00.000Z',
          },
          {
            id: 'path_pw_products_fixture',
            name: 'Fixture Path',
            createdAt: '2026-03-09T00:00:00.000Z',
            updatedAt: '2026-03-09T00:00:00.000Z',
          },
        ]);
      }
      return null;
    });

    const response = await POST_handler(
      new NextRequest('http://localhost/api/ai-paths/trigger-buttons/cleanup-fixtures', {
        method: 'POST',
      }),
      {} as Parameters<typeof POST_handler>[1]
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      removedTriggerButtons: 1,
      removedPathIndexEntries: 1,
      removedPathConfigs: 1,
    });
    expect(upsertAiPathsSettingMock).toHaveBeenCalledWith(
      'ai_paths_trigger_buttons',
      JSON.stringify([
        {
          id: 'btn-live',
          name: 'Live Button',
          iconId: null,
          pathId: 'path_live',
          enabled: true,
          locations: ['product_row'],
          mode: 'click',
          display: 'icon_label',
          createdAt: '2026-03-09T00:00:00.000Z',
          updatedAt: '2026-03-09T00:00:00.000Z',
          sortIndex: 0,
        },
      ])
    );
    expect(upsertAiPathsSettingMock).toHaveBeenCalledWith(
      'ai_paths_index',
      JSON.stringify([
        {
          id: 'path_live',
          name: 'Live Path',
          createdAt: '2026-03-09T00:00:00.000Z',
          updatedAt: '2026-03-09T00:00:00.000Z',
        },
      ])
    );
    expect(deleteAiPathsSettingsMock).toHaveBeenCalledWith([
      'ai_paths_config_path_pw_products_fixture',
    ]);
  });

  it('returns zero counts without mutating settings when no fixtures exist', async () => {
    getAiPathsSettingMock.mockImplementation(async (key: string) => {
      if (key === 'ai_paths_trigger_buttons') {
        return JSON.stringify([
          {
            id: 'btn-live',
            name: 'Live Button',
            iconId: null,
            pathId: 'path_live',
            enabled: true,
            locations: ['product_row'],
            mode: 'click',
            display: 'icon_label',
            createdAt: '2026-03-09T00:00:00.000Z',
            updatedAt: '2026-03-09T00:00:00.000Z',
            sortIndex: 0,
          },
        ]);
      }
      if (key === 'ai_paths_index') {
        return JSON.stringify([
          {
            id: 'path_live',
            name: 'Live Path',
            createdAt: '2026-03-09T00:00:00.000Z',
            updatedAt: '2026-03-09T00:00:00.000Z',
          },
        ]);
      }
      return null;
    });

    const response = await POST_handler(
      new NextRequest('http://localhost/api/ai-paths/trigger-buttons/cleanup-fixtures', {
        method: 'POST',
      }),
      {} as Parameters<typeof POST_handler>[1]
    );

    await expect(response.json()).resolves.toEqual({
      removedTriggerButtons: 0,
      removedPathIndexEntries: 0,
      removedPathConfigs: 0,
    });
    expect(upsertAiPathsSettingMock).not.toHaveBeenCalled();
    expect(deleteAiPathsSettingsMock).not.toHaveBeenCalled();
  });
});
