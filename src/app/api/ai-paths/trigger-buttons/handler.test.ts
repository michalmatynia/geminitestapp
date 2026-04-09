import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createDefaultPathConfig } from '@/shared/lib/ai-paths/core/utils/factory';
import { authError } from '@/shared/errors/app-error';
import {
  PLAYWRIGHT_AI_PATHS_TRIGGER_BUTTONS_COOKIE_NAME,
  PLAYWRIGHT_AI_PATHS_TRIGGER_BUTTONS_QUERY_PARAM,
} from '@/shared/lib/ai-paths/playwright-fixture-scope';

const {
  getAllAiPathsSettingsMock,
  getAiPathsSettingMock,
  requireAiPathsAccessMock,
  requireAiPathsRunAccessMock,
  ensureStarterWorkflowDefaultsMock,
  upsertAiPathsSettingsMock,
  upsertAiPathsSettingMock,
} = vi.hoisted(() => ({
  getAllAiPathsSettingsMock: vi.fn(),
  getAiPathsSettingMock: vi.fn(),
  requireAiPathsAccessMock: vi.fn(),
  requireAiPathsRunAccessMock: vi.fn(),
  ensureStarterWorkflowDefaultsMock: vi.fn(),
  upsertAiPathsSettingsMock: vi.fn(),
  upsertAiPathsSettingMock: vi.fn(),
}));

vi.mock('@/features/ai/ai-paths/server', () => ({
  getAiPathsSetting: getAiPathsSettingMock,
  requireAiPathsAccess: requireAiPathsAccessMock,
  requireAiPathsRunAccess: requireAiPathsRunAccessMock,
  upsertAiPathsSetting: upsertAiPathsSettingMock,
}));

vi.mock('@/features/ai/ai-paths/server/settings-store', () => ({
  getAllAiPathsSettings: getAllAiPathsSettingsMock,
  upsertAiPathsSettings: upsertAiPathsSettingsMock,
}));

vi.mock('@/features/ai/ai-paths/server/starter-workflows-settings', () => ({
  ensureStarterWorkflowDefaults: ensureStarterWorkflowDefaultsMock,
}));

import { GET_handler, POST_handler } from './handler';

const createRequestContext = (query?: Record<string, unknown>) =>
  ({
    query,
  }) as Parameters<typeof GET_handler>[1];

const createSettingsSnapshot = (args?: {
  triggerButtons?: string | Array<Record<string, unknown>>;
  pathMetas?: string | Array<Record<string, unknown>>;
  configs?: Record<string, string | Record<string, unknown>>;
}): Array<{ key: string; value: string }> => {
  const records: Array<{ key: string; value: string }> = [];
  const pathMetas = args?.pathMetas ?? [];
  const triggerButtons = args?.triggerButtons ?? [];

  records.push({
    key: 'ai_paths_index',
    value: typeof pathMetas === 'string' ? pathMetas : JSON.stringify(pathMetas),
  });
  records.push({
    key: 'ai_paths_trigger_buttons',
    value: typeof triggerButtons === 'string' ? triggerButtons : JSON.stringify(triggerButtons),
  });

  Object.entries(args?.configs ?? {}).forEach(([pathId, raw]) => {
    records.push({
      key: `ai_paths_config_${pathId}`,
      value: typeof raw === 'string' ? raw : JSON.stringify(raw),
    });
  });

  return records;
};

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
    getAllAiPathsSettingsMock.mockResolvedValue(createSettingsSnapshot());
    ensureStarterWorkflowDefaultsMock.mockImplementation((records) => ({
      nextRecords: records,
      affectedCount: 0,
    }));
  });

  it('returns buttons when stored payload uses canonical persisted shape', async () => {
    getAllAiPathsSettingsMock.mockResolvedValue(
      createSettingsSnapshot({
        triggerButtons: [
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
        ],
      })
    );

    const response = await GET_handler(
      new NextRequest('http://localhost/api/ai-paths/trigger-buttons'),
      createRequestContext()
    );

    expect(response.status).toBe(200);
    expect(getAllAiPathsSettingsMock).toHaveBeenCalledTimes(1);
    expect(upsertAiPathsSettingsMock).not.toHaveBeenCalled();
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
    getAllAiPathsSettingsMock.mockResolvedValue(
      createSettingsSnapshot({
        triggerButtons: [
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
        ],
        pathMetas: [
          {
            id: 'path_live',
            name: 'Live Path',
            createdAt: '2026-03-03T00:00:00.000Z',
            updatedAt: '2026-03-03T00:00:00.000Z',
          },
        ],
        configs: {
          path_live: { id: 'path_live', name: 'Live Path', nodes: [], edges: [] },
        },
      })
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
    getAllAiPathsSettingsMock.mockResolvedValue(
      createSettingsSnapshot({
        triggerButtons: [
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
        ],
        pathMetas: [
          {
            id: 'path_pw_products_abc123',
            name: 'Fixture Path',
            createdAt: '2026-03-03T00:00:00.000Z',
            updatedAt: '2026-03-03T00:00:00.000Z',
          },
        ],
        configs: {
          path_pw_products_abc123: {
            id: 'path_pw_products_abc123',
            name: 'Fixture Path',
            nodes: [],
            edges: [],
          },
        },
      })
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

  it('hides buttons bound to missing AI Paths', async () => {
    getAllAiPathsSettingsMock.mockResolvedValue(
      createSettingsSnapshot({
        triggerButtons: [
          {
            id: 'btn-live',
            name: 'Live Path',
            iconId: null,
            pathId: 'path-live',
            enabled: true,
            locations: ['product_row'],
            mode: 'click',
            display: 'icon_label',
            createdAt: '2026-03-03T00:00:00.000Z',
            updatedAt: '2026-03-03T00:00:00.000Z',
            sortIndex: 0,
          },
          {
            id: 'btn-missing',
            name: 'Missing Path',
            iconId: null,
            pathId: 'path-missing',
            enabled: true,
            locations: ['product_row'],
            mode: 'click',
            display: 'icon_label',
            createdAt: '2026-03-03T00:00:00.000Z',
            updatedAt: '2026-03-03T00:00:00.000Z',
            sortIndex: 1,
          },
        ],
        pathMetas: [
          {
            id: 'path-live',
            name: 'Live Path',
            createdAt: '2026-03-03T00:00:00.000Z',
            updatedAt: '2026-03-03T00:00:00.000Z',
          },
        ],
        configs: {
          'path-live': { id: 'path-live', name: 'Live Path', nodes: [], edges: [] },
        },
      })
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

  it('hides buttons whose bound AI Path config payload is missing', async () => {
    getAllAiPathsSettingsMock.mockResolvedValue(
      createSettingsSnapshot({
        triggerButtons: [
          {
            id: 'btn-live',
            name: 'Live Path',
            iconId: null,
            pathId: 'path-live',
            enabled: true,
            locations: ['product_row'],
            mode: 'click',
            display: 'icon_label',
            createdAt: '2026-03-03T00:00:00.000Z',
            updatedAt: '2026-03-03T00:00:00.000Z',
            sortIndex: 0,
          },
          {
            id: 'btn-missing-config',
            name: 'Missing Config',
            iconId: null,
            pathId: 'path-missing-config',
            enabled: true,
            locations: ['product_row'],
            mode: 'click',
            display: 'icon_label',
            createdAt: '2026-03-03T00:00:00.000Z',
            updatedAt: '2026-03-03T00:00:00.000Z',
            sortIndex: 1,
          },
        ],
        pathMetas: [
          {
            id: 'path-live',
            name: 'Live Path',
            createdAt: '2026-03-03T00:00:00.000Z',
            updatedAt: '2026-03-03T00:00:00.000Z',
          },
          {
            id: 'path-missing-config',
            name: 'Missing Config Path',
            createdAt: '2026-03-03T00:00:00.000Z',
            updatedAt: '2026-03-03T00:00:00.000Z',
          },
        ],
        configs: {
          'path-live': { id: 'path-live', name: 'Live Path', nodes: [], edges: [] },
        },
      })
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

  it('hides buttons whose bound AI Path config fails trigger preflight validation', async () => {
    const brokenPathId = 'path-broken-trigger';
    const brokenConfig = {
      ...createDefaultPathConfig(brokenPathId),
      name: 'Broken Trigger Path',
      nodes: [
        {
          id: 'node-broken-trigger',
          type: 'trigger',
        },
      ],
      edges: [],
    };

    getAllAiPathsSettingsMock.mockResolvedValue(
      createSettingsSnapshot({
        triggerButtons: [
          {
            id: 'btn-live',
            name: 'Live Path',
            iconId: null,
            pathId: 'path-live',
            enabled: true,
            locations: ['product_row'],
            mode: 'click',
            display: 'icon_label',
            createdAt: '2026-03-03T00:00:00.000Z',
            updatedAt: '2026-03-03T00:00:00.000Z',
            sortIndex: 0,
          },
          {
            id: 'btn-broken',
            name: 'Broken Path',
            iconId: null,
            pathId: brokenPathId,
            enabled: true,
            locations: ['product_row'],
            mode: 'click',
            display: 'icon_label',
            createdAt: '2026-03-03T00:00:00.000Z',
            updatedAt: '2026-03-03T00:00:00.000Z',
            sortIndex: 1,
          },
        ],
        pathMetas: [
          {
            id: 'path-live',
            name: 'Live Path',
            createdAt: '2026-03-03T00:00:00.000Z',
            updatedAt: '2026-03-03T00:00:00.000Z',
          },
          {
            id: brokenPathId,
            name: 'Broken Trigger Path',
            createdAt: '2026-03-03T00:00:00.000Z',
            updatedAt: '2026-03-03T00:00:00.000Z',
          },
        ],
        configs: {
          'path-live': { id: 'path-live', name: 'Live Path', nodes: [], edges: [] },
          [brokenPathId]: brokenConfig,
        },
      })
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

  it('repairs and keeps BLWo starter buttons when the seeded default config is stale', async () => {
    const brokenPathId = 'path_base_export_blwo_v1';
    const brokenConfig = {
      ...createDefaultPathConfig(brokenPathId),
      name: 'Base Export Workflow (BLWo)',
      nodes: [
        {
          id: 'node-broken-trigger',
          type: 'trigger',
        },
      ],
      edges: [],
    };

    getAllAiPathsSettingsMock.mockResolvedValue(
      createSettingsSnapshot({
        triggerButtons: [
          {
            id: 'btn-blwo',
            name: 'BLWo',
            iconId: null,
            pathId: brokenPathId,
            enabled: true,
            locations: ['product_row'],
            mode: 'click',
            display: 'icon_label',
            createdAt: '2026-03-03T00:00:00.000Z',
            updatedAt: '2026-03-03T00:00:00.000Z',
            sortIndex: 0,
          },
        ],
        pathMetas: [
          {
            id: brokenPathId,
            name: 'Base Export Workflow (BLWo)',
            createdAt: '2026-03-03T00:00:00.000Z',
            updatedAt: '2026-03-03T00:00:00.000Z',
          },
        ],
        configs: {
          [brokenPathId]: brokenConfig,
        },
      })
    );

    const response = await GET_handler(
      new NextRequest('http://localhost/api/ai-paths/trigger-buttons'),
      createRequestContext()
    );

    await expect(response.json()).resolves.toEqual([
      expect.objectContaining({
        id: 'btn-blwo',
        pathId: brokenPathId,
      }),
    ]);
    expect(upsertAiPathsSettingMock).toHaveBeenCalledWith(
      `ai_paths_config_${brokenPathId}`,
      expect.any(String)
    );
  });

  it('fails open when the AI Paths index payload is malformed', async () => {
    getAllAiPathsSettingsMock.mockResolvedValue(
      createSettingsSnapshot({
        triggerButtons: [
          {
            id: 'btn-blwo',
            name: 'BLWo',
            iconId: null,
            pathId: 'path_base_export_blwo_v1',
            enabled: true,
            locations: ['product_row'],
            mode: 'click',
            display: 'icon_label',
            createdAt: '2026-03-03T00:00:00.000Z',
            updatedAt: '2026-03-03T00:00:00.000Z',
            sortIndex: 0,
          },
        ],
        pathMetas: 'not-json',
      })
    );

    const response = await GET_handler(
      new NextRequest('http://localhost/api/ai-paths/trigger-buttons'),
      createRequestContext()
    );

    await expect(response.json()).resolves.toEqual([
      expect.objectContaining({
        id: 'btn-blwo',
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
    expect(getAllAiPathsSettingsMock).not.toHaveBeenCalled();
    expect(getAiPathsSettingMock).not.toHaveBeenCalled();
    expect(upsertAiPathsSettingsMock).not.toHaveBeenCalled();
    expect(upsertAiPathsSettingMock).not.toHaveBeenCalled();
  });

  it('returns an empty list when stored trigger-button settings are malformed', async () => {
    getAllAiPathsSettingsMock.mockResolvedValue(
      createSettingsSnapshot({
        triggerButtons: '{"not":"an-array"}',
      })
    );

    const response = await GET_handler(
      new NextRequest('http://localhost/api/ai-paths/trigger-buttons'),
      createRequestContext()
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual([]);
    expect(getAllAiPathsSettingsMock).toHaveBeenCalledTimes(1);
    expect(upsertAiPathsSettingsMock).not.toHaveBeenCalled();
    expect(upsertAiPathsSettingMock).not.toHaveBeenCalled();
  });

  it('returns an empty list when stored trigger-button records are non-canonical', async () => {
    getAllAiPathsSettingsMock.mockResolvedValue(
      createSettingsSnapshot({
        triggerButtons: [
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
        ],
      })
    );

    const response = await GET_handler(
      new NextRequest('http://localhost/api/ai-paths/trigger-buttons'),
      createRequestContext()
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual([]);
    expect(getAllAiPathsSettingsMock).toHaveBeenCalledTimes(1);
    expect(upsertAiPathsSettingsMock).not.toHaveBeenCalled();
    expect(upsertAiPathsSettingMock).not.toHaveBeenCalled();
  });

  it('upgrades a legacy normalize button to the seeded starter workflow when read-time repairs apply', async () => {
    const repairedSnapshot = createSettingsSnapshot({
      triggerButtons: [
        {
          id: '7d58d6a0-44c7-4d69-a2e4-8d8d1f3f5a27',
          name: 'Normalize',
          iconId: null,
          pathId: 'path_name_normalize_v1',
          enabled: true,
          locations: ['product_modal'],
          mode: 'execute_path',
          display: 'icon_label',
          createdAt: '2026-04-09T00:00:00.000Z',
          updatedAt: '2026-04-09T00:00:00.000Z',
          sortIndex: 3,
        },
      ],
      pathMetas: [
        {
          id: 'path_name_normalize_v1',
          name: 'Normalize Product Name',
          createdAt: '2026-04-09T00:00:00.000Z',
          updatedAt: '2026-04-09T00:00:00.000Z',
        },
      ],
      configs: {
        path_name_normalize_v1: {
          id: 'path_name_normalize_v1',
          name: 'Normalize Product Name',
          nodes: [],
          edges: [],
        },
      },
    });

    getAllAiPathsSettingsMock.mockResolvedValue(
      createSettingsSnapshot({
        triggerButtons: [
          {
            id: 'cf9974ae-1fb3-4e61-8a30-8df8af63744f',
            name: 'Normalize',
            iconId: null,
            pathId: null,
            enabled: true,
            locations: ['product_modal'],
            mode: 'execute_path',
            display: 'icon_label',
            createdAt: '2026-04-08T23:00:00.000Z',
            updatedAt: '2026-04-08T23:00:00.000Z',
            sortIndex: 3,
          },
        ],
      })
    );
    ensureStarterWorkflowDefaultsMock.mockReturnValue({
      nextRecords: repairedSnapshot,
      affectedCount: 1,
    });

    const response = await GET_handler(
      new NextRequest('http://localhost/api/ai-paths/trigger-buttons'),
      createRequestContext()
    );

    const body = await response.json();
    expect(response.status).toBe(200);
    expect(upsertAiPathsSettingsMock).toHaveBeenCalledWith(repairedSnapshot);
    expect(body).toEqual([
      expect.objectContaining({
        id: '7d58d6a0-44c7-4d69-a2e4-8d8d1f3f5a27',
        name: 'Normalize',
        pathId: 'path_name_normalize_v1',
      }),
    ]);
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
