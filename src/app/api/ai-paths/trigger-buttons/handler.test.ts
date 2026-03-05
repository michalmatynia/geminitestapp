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
      new NextRequest('http://localhost/api/ai-paths/trigger-buttons'),
      {} as Parameters<typeof GET_handler>[1]
    );

    expect(response.status).toBe(200);
    expect(getAiPathsSettingMock).toHaveBeenCalledWith('ai_paths_trigger_buttons');
    expect(upsertAiPathsSettingMock).not.toHaveBeenCalled();

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
      new NextRequest('http://localhost/api/ai-paths/trigger-buttons'),
      {} as Parameters<typeof GET_handler>[1]
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual([]);
    expect(getAiPathsSettingMock).not.toHaveBeenCalled();
    expect(upsertAiPathsSettingMock).not.toHaveBeenCalled();
  });

  it('rejects malformed non-array stored payloads', async () => {
    getAiPathsSettingMock.mockResolvedValue('{"not":"an-array"}');

    await expect(
      GET_handler(
        new NextRequest('http://localhost/api/ai-paths/trigger-buttons'),
        {} as Parameters<typeof GET_handler>[1]
      )
    ).rejects.toThrow('Invalid AI trigger button settings payload.');

    expect(getAiPathsSettingMock).toHaveBeenCalledWith('ai_paths_trigger_buttons');
    expect(upsertAiPathsSettingMock).not.toHaveBeenCalled();
  });

  it('rejects stored payloads that include non-canonical trigger button records', async () => {
    getAiPathsSettingMock.mockResolvedValue(
      JSON.stringify([
        {
          id: 'btn-valid',
          name: 'Valid Button',
          iconId: null,
          pathId: null,
          enabled: true,
          locations: ['product_modal'],
          mode: 'click',
          display: 'icon_label',
          createdAt: '2026-03-03T00:00:00.000Z',
          updatedAt: '2026-03-03T00:00:00.000Z',
          sortIndex: 0,
        },
        {
          id: 'btn-invalid',
          name: 'Invalid Button',
          iconId: null,
          pathId: null,
          enabled: true,
          locations: ['product_modal'],
          mode: 'click',
          display: { label: 'Legacy', showLabel: true },
          createdAt: '2026-03-03T00:00:00.000Z',
          updatedAt: '2026-03-03T00:00:00.000Z',
          sortIndex: 1,
        },
      ])
    );

    await expect(
      GET_handler(
        new NextRequest('http://localhost/api/ai-paths/trigger-buttons'),
        {} as Parameters<typeof GET_handler>[1]
      )
    ).rejects.toThrow('Invalid AI trigger button record payload.');

    expect(getAiPathsSettingMock).toHaveBeenCalledWith('ai_paths_trigger_buttons');
    expect(upsertAiPathsSettingMock).not.toHaveBeenCalled();
  });
});
