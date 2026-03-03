import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { authError } from '@/shared/errors/app-error';

const {
  getAiPathsSettingMock,
  requireAiPathsAccessMock,
  requireAiPathsRunAccessMock,
  upsertAiPathsSettingMock,
} = vi.hoisted(() => ({
  getAiPathsSettingMock: vi.fn(),
  requireAiPathsAccessMock: vi.fn(),
  requireAiPathsRunAccessMock: vi.fn(),
  upsertAiPathsSettingMock: vi.fn(),
}));

vi.mock('@/features/ai/ai-paths/server', () => ({
  getAiPathsSetting: getAiPathsSettingMock,
  requireAiPathsAccess: requireAiPathsAccessMock,
  requireAiPathsRunAccess: requireAiPathsRunAccessMock,
  upsertAiPathsSetting: upsertAiPathsSettingMock,
}));

import { GET_handler } from './handler';

describe('ai-paths trigger-buttons GET handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAiPathsRunAccessMock.mockResolvedValue({
      userId: 'user-1',
      permissions: ['products.manage'],
      isElevated: false,
    });
  });

  it('returns buttons when stored payload uses canonical persisted shape', async () => {
    getAiPathsSettingMock.mockResolvedValue(
      JSON.stringify([
        {
          id: 'btn-1',
          name: 'Run Path',
          iconId: null,
          pathId: null,
          enabled: true,
          locations: ['product_modal'],
          mode: 'click',
          display: 'icon',
          createdAt: '2026-03-03T00:00:00.000Z',
          updatedAt: '2026-03-03T00:00:00.000Z',
          sortIndex: 0,
        },
      ])
    );

    const response = await GET_handler(
      new NextRequest('http://localhost/api/ai-paths/trigger-buttons') as Parameters<
        typeof GET_handler
      >[0],
      {} as Parameters<typeof GET_handler>[1]
    );

    expect(response.status).toBe(200);
    expect(getAiPathsSettingMock).toHaveBeenCalledWith('ai_paths_trigger_buttons');

    await expect(response.json()).resolves.toEqual([
      expect.objectContaining({
        id: 'btn-1',
        name: 'Run Path',
        display: {
          label: 'Run Path',
          showLabel: false,
        },
      }),
    ]);
  });

  it('returns an empty list for unauthorized access instead of throwing', async () => {
    requireAiPathsRunAccessMock.mockRejectedValue(authError('Unauthorized.'));

    const response = await GET_handler(
      new NextRequest('http://localhost/api/ai-paths/trigger-buttons') as Parameters<
        typeof GET_handler
      >[0],
      {} as Parameters<typeof GET_handler>[1]
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual([]);
    expect(getAiPathsSettingMock).not.toHaveBeenCalled();
  });

  it('throws when stored payload is invalid', async () => {
    getAiPathsSettingMock.mockResolvedValue('{"not":"an-array"}');

    await expect(
      GET_handler(
        new NextRequest('http://localhost/api/ai-paths/trigger-buttons') as Parameters<
          typeof GET_handler
        >[0],
        {} as Parameters<typeof GET_handler>[1]
      )
    ).rejects.toThrow('Invalid trigger button settings payload');

    expect(getAiPathsSettingMock).toHaveBeenCalledWith('ai_paths_trigger_buttons');
  });
});
