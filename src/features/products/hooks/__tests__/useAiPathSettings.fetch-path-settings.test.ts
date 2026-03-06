import { describe, expect, it, vi, beforeEach } from 'vitest';
import { QueryClient } from '@tanstack/react-query';

import { QUERY_KEYS } from '@/shared/lib/query-keys';
import {
  PATH_CONFIG_PREFIX,
  PATH_INDEX_KEY,
  buildPortablePathPackage,
  createDefaultPathConfig,
} from '@/shared/lib/ai-paths';
import { serializePathConfigToSemanticCanvas } from '@/shared/lib/ai-paths/core/semantic-grammar';
import { fetchPathSettings } from '@/features/products/hooks/useAiPathSettings';
import {
  fetchAiPathsSettingsByKeysCached,
  fetchAiPathsSettingsCached,
} from '@/shared/lib/ai-paths/settings-store-client';

vi.mock('@/shared/lib/query-factories-v2', () => ({
  fetchQueryV2: (_queryClient: unknown, options: { queryFn: () => Promise<unknown> }) =>
    options.queryFn,
}));

vi.mock('@/shared/lib/ai-paths/settings-store-client', () => ({
  fetchAiPathsSettingsByKeysCached: vi.fn(),
  fetchAiPathsSettingsCached: vi.fn(),
}));

const mockedFetchAiPathsSettingsByKeysCached = vi.mocked(fetchAiPathsSettingsByKeysCached);
const mockedFetchAiPathsSettingsCached = vi.mocked(fetchAiPathsSettingsCached);

describe('fetchPathSettings portable payload support', () => {
  beforeEach(() => {
    mockedFetchAiPathsSettingsByKeysCached.mockReset();
    mockedFetchAiPathsSettingsCached.mockReset();
  });

  it('loads a portable package payload from settings', async () => {
    const queryClient = new QueryClient();
    const pathConfig = createDefaultPathConfig('path_portable_settings');
    const portablePayload = JSON.stringify(
      buildPortablePathPackage(pathConfig, {
        createdAt: '2026-03-05T00:00:00.000Z',
      })
    );

    queryClient.setQueryData(QUERY_KEYS.userPreferences.all, {
      aiPathsActivePathId: pathConfig.id,
    });

    mockedFetchAiPathsSettingsByKeysCached.mockResolvedValue([
      {
        key: PATH_INDEX_KEY,
        value: JSON.stringify([
          {
            id: pathConfig.id,
            name: pathConfig.name,
            createdAt: pathConfig.updatedAt,
            updatedAt: pathConfig.updatedAt,
          },
        ]),
      },
      {
        key: `${PATH_CONFIG_PREFIX}${pathConfig.id}`,
        value: portablePayload,
      },
    ]);

    const result = await fetchPathSettings(queryClient);
    expect(result.settingsLoadMode).toBe('selective');
    expect(result.orderedConfigs).toHaveLength(1);
    expect(result.orderedConfigs[0]?.id).toBe(pathConfig.id);
    expect(result.orderedConfigs[0]?.nodes.length).toBe(pathConfig.nodes.length);
  });

  it('loads semantic canvas payload from settings', async () => {
    const queryClient = new QueryClient();
    const pathConfig = createDefaultPathConfig('path_semantic_settings');
    const semanticPayload = JSON.stringify(serializePathConfigToSemanticCanvas(pathConfig));

    queryClient.setQueryData(QUERY_KEYS.userPreferences.all, {
      aiPathsActivePathId: pathConfig.id,
    });

    mockedFetchAiPathsSettingsByKeysCached.mockResolvedValue([
      {
        key: PATH_INDEX_KEY,
        value: JSON.stringify([
          {
            id: pathConfig.id,
            name: pathConfig.name,
            createdAt: pathConfig.updatedAt,
            updatedAt: pathConfig.updatedAt,
          },
        ]),
      },
      {
        key: `${PATH_CONFIG_PREFIX}${pathConfig.id}`,
        value: semanticPayload,
      },
    ]);

    const result = await fetchPathSettings(queryClient);
    expect(result.settingsLoadMode).toBe('selective');
    expect(result.orderedConfigs).toHaveLength(1);
    expect(result.orderedConfigs[0]?.id).toBe(pathConfig.id);
    expect(result.orderedConfigs[0]?.nodes.length).toBe(pathConfig.nodes.length);
  });
});
