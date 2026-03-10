import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { authError } from '@/shared/errors/app-error';
import {
  PLAYWRIGHT_AI_PATHS_TRIGGER_BUTTONS_COOKIE_NAME,
  PLAYWRIGHT_AI_PATHS_TRIGGER_BUTTONS_QUERY_PARAM,
} from '@/shared/lib/ai-paths/playwright-fixture-scope';

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

import { GET_handler, POST_handler } from './handler';

const createRequestContext = (query?: Record<string, unknown>) =>
  ({
    query,
  }) as Parameters<typeof GET_handler>[1];

describe('ai-paths trigger-buttons GET handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    requireAiPathsRunAccessMock.mockResolvedValue({
      userId: 'user-1',
      permissions: ['products.manage'],
      isElevated: false,
    });
    requireAiPathsAccessMock.mockResolvedValue({
      userId: 'user-1',
      permissions: ['ai_paths.manage'],
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
      createRequestContext()
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

  it('hides playwright fixture trigger buttons by default', async () => {
    getAiPathsSettingMock.mockResolvedValue(
      JSON.stringify([
        {
          id: 'btn-live',
          name: 'Run Path',
          iconId: null,
          pathId: 'path_live',
          enabled: true,
          locations: ['product_modal'],
          mode: 'click',
          display: 'icon',
          createdAt: '2026-03-03T00:00:00.000Z',
          updatedAt: '2026-03-03T00:00:00.000Z',
          sortIndex: 0,
        },
        {
          id: 'btn-fixture',
          name: 'Generate Polish Copy 123',
          iconId: null,
          pathId: 'path_pw_products_abc123',
          enabled: true,
          locations: ['product_row'],
          mode: 'click',
          display: 'icon_label',
          createdAt: '2026-03-03T00:00:00.000Z',
          updatedAt: '2026-03-03T00:00:00.000Z',
          sortIndex: 1,
        },
      ])
    );

    const response = await GET_handler(
      new NextRequest('http://localhost/api/ai-paths/trigger-buttons'),
      createRequestContext()
    );

    await expect(response.json()).resolves.toEqual([
      expect.objectContaining({
        id: 'btn-live',
      }),
    ]);
  });

  it('returns playwright fixture trigger buttons when explicitly requested', async () => {
    getAiPathsSettingMock.mockResolvedValue(
      JSON.stringify([
        {
          id: 'btn-fixture',
          name: 'Generate Polish Copy 123',
          iconId: null,
          pathId: 'path_pw_products_abc123',
          enabled: true,
          locations: ['product_row'],
          mode: 'click',
          display: 'icon_label',
          createdAt: '2026-03-03T00:00:00.000Z',
          updatedAt: '2026-03-03T00:00:00.000Z',
          sortIndex: 0,
        },
      ])
    );

    const cookieRequest = new NextRequest('http://localhost/api/ai-paths/trigger-buttons');
    Object.defineProperty(cookieRequest, 'cookies', {
      value: {
        get: (key: string) =>
          key === PLAYWRIGHT_AI_PATHS_TRIGGER_BUTTONS_COOKIE_NAME ? { value: '1' } : undefined,
      },
    });

    const responseFromCookie = await GET_handler(
      cookieRequest,
      createRequestContext()
    );

    await expect(responseFromCookie.json()).resolves.toEqual([
      expect.objectContaining({
        id: 'btn-fixture',
      }),
    ]);

    const responseFromQuery = await GET_handler(
      new NextRequest(
        `http://localhost/api/ai-paths/trigger-buttons?${PLAYWRIGHT_AI_PATHS_TRIGGER_BUTTONS_QUERY_PARAM}=1`
      ),
      createRequestContext({
        [PLAYWRIGHT_AI_PATHS_TRIGGER_BUTTONS_QUERY_PARAM]: true,
      })
    );

    await expect(responseFromQuery.json()).resolves.toEqual([
      expect.objectContaining({
        id: 'btn-fixture',
      }),
    ]);
  });

  it('returns an empty list for unauthorized access instead of throwing', async () => {
    requireAiPathsRunAccessMock.mockRejectedValue(authError('Unauthorized.'));

    const response = await GET_handler(
      new NextRequest('http://localhost/api/ai-paths/trigger-buttons'),
      createRequestContext()
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
        createRequestContext()
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
        createRequestContext()
      )
    ).rejects.toThrow('Invalid AI trigger button record payload.');

    expect(getAiPathsSettingMock).toHaveBeenCalledWith('ai_paths_trigger_buttons');
    expect(upsertAiPathsSettingMock).not.toHaveBeenCalled();
  });

  it('POST rejects missing bound AI Paths', async () => {
    getAiPathsSettingMock.mockImplementation(async (key: string) => {
      if (key === 'ai_paths_index') {
        return JSON.stringify([
          {
            id: 'path-live',
            name: 'Live Path',
            createdAt: '2026-03-03T00:00:00.000Z',
            updatedAt: '2026-03-03T00:00:00.000Z',
          },
        ]);
      }
      if (key === 'ai_paths_trigger_buttons') {
        return '[]';
      }
      return null;
    });

    const request = new NextRequest('http://localhost/api/ai-paths/trigger-buttons', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Run Path',
        pathId: 'path-missing',
        locations: ['product_modal'],
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    await expect(POST_handler(request, {} as Parameters<typeof POST_handler>[1])).rejects.toThrow(
      'AI Path "path-missing" does not exist.'
    );

    expect(upsertAiPathsSettingMock).not.toHaveBeenCalled();
  });

  it('POST rejects bound AI Paths whose config payload is missing', async () => {
    getAiPathsSettingMock.mockImplementation(async (key: string) => {
      if (key === 'ai_paths_index') {
        return JSON.stringify([
          {
            id: 'path-live',
            name: 'Live Path',
            createdAt: '2026-03-03T00:00:00.000Z',
            updatedAt: '2026-03-03T00:00:00.000Z',
          },
        ]);
      }
      if (key === 'ai_paths_trigger_buttons') {
        return '[]';
      }
      return null;
    });

    const request = new NextRequest('http://localhost/api/ai-paths/trigger-buttons', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Run Path',
        pathId: 'path-live',
        locations: ['product_modal'],
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    await expect(POST_handler(request, {} as Parameters<typeof POST_handler>[1])).rejects.toThrow(
      'AI Path "path-live" is missing its config payload.'
    );

    expect(upsertAiPathsSettingMock).not.toHaveBeenCalled();
  });

  it('POST accepts existing bound AI Paths', async () => {
    getAiPathsSettingMock.mockImplementation(async (key: string) => {
      if (key === 'ai_paths_index') {
        return JSON.stringify([
          {
            id: 'path-live',
            name: 'Live Path',
            createdAt: '2026-03-03T00:00:00.000Z',
            updatedAt: '2026-03-03T00:00:00.000Z',
          },
        ]);
      }
      if (key === 'ai_paths_config_path-live') {
        return JSON.stringify({
          id: 'path-live',
          name: 'Live Path',
          nodes: [],
          edges: [],
        });
      }
      if (key === 'ai_paths_trigger_buttons') {
        return '[]';
      }
      return null;
    });

    const request = new NextRequest('http://localhost/api/ai-paths/trigger-buttons', {
      method: 'POST',
      body: JSON.stringify({
        name: 'Run Path',
        pathId: 'path-live',
        locations: ['product_modal'],
      }),
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await POST_handler(request, {} as Parameters<typeof POST_handler>[1]);

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual(
      expect.objectContaining({
        name: 'Run Path',
        pathId: 'path-live',
      })
    );
    expect(upsertAiPathsSettingMock).toHaveBeenCalledTimes(1);
  });
});
