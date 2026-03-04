import { beforeEach, describe, expect, it, vi } from 'vitest';

const fetchMongoAiPathsSettingsMock = vi.fn();
const upsertMongoAiPathsSettingsMock = vi.fn();
const deleteMongoAiPathsSettingsMock = vi.fn();
const ensureMongoIndexesMock = vi.fn();

vi.mock('@/features/ai/ai-paths/server/settings-store.helpers', () => ({
  assertMongoConfigured: vi.fn(),
  isAiPathsKey: (key: string) => key.startsWith('ai_paths_'),
  parseBooleanEnv: (_raw: string | undefined, defaultValue: boolean) => defaultValue,
  parsePositiveInt: (_raw: string | undefined, defaultValue: number) => defaultValue,
}));

vi.mock('@/features/ai/ai-paths/server/settings-store.repository', () => ({
  fetchMongoAiPathsSettings: fetchMongoAiPathsSettingsMock,
  upsertMongoAiPathsSettings: upsertMongoAiPathsSettingsMock,
  deleteMongoAiPathsSettings: deleteMongoAiPathsSettingsMock,
  ensureMongoIndexes: ensureMongoIndexesMock,
}));

vi.mock('@/features/ai/ai-paths/server/starter-workflows-settings', () => ({
  ensureStarterWorkflowDefaults: (records: unknown[]) => ({
    affectedCount: 0,
    nextRecords: records,
  }),
}));

const loadSettingsStore = async () =>
  import('@/features/ai/ai-paths/server/settings-store');

describe('settings-store keyset cache', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('reuses cached keyset reads within TTL', async () => {
    fetchMongoAiPathsSettingsMock.mockResolvedValue([
      { key: 'ai_paths_index', value: '[]' },
    ]);

    const { getAiPathsSettings } = await loadSettingsStore();

    const first = await getAiPathsSettings(['ai_paths_index']);
    const second = await getAiPathsSettings(['ai_paths_index']);

    expect(first).toEqual(second);
    expect(fetchMongoAiPathsSettingsMock).toHaveBeenCalledTimes(1);
  });

  it('invalidates keyset cache after upsert', async () => {
    fetchMongoAiPathsSettingsMock
      .mockResolvedValueOnce([{ key: 'ai_paths_index', value: '[]' }])
      .mockResolvedValueOnce([{ key: 'ai_paths_index', value: '[{\"id\":\"path_1\"}]' }]);

    const { getAiPathsSettings, upsertAiPathsSettings } = await loadSettingsStore();

    await getAiPathsSettings(['ai_paths_index']);
    await upsertAiPathsSettings([{ key: 'ai_paths_index', value: '[{\"id\":\"path_1\"}]' }]);
    await getAiPathsSettings(['ai_paths_index']);

    expect(fetchMongoAiPathsSettingsMock).toHaveBeenCalledTimes(2);
    expect(upsertMongoAiPathsSettingsMock).toHaveBeenCalledTimes(1);
  });

  it('deduplicates in-flight keyset fetch requests', async () => {
    let resolveFetch: ((value: Array<{ key: string; value: string }>) => void) | null = null;
    fetchMongoAiPathsSettingsMock.mockImplementation(
      async () =>
        await new Promise<Array<{ key: string; value: string }>>((resolve) => {
          resolveFetch = resolve;
        })
    );

    const { getAiPathsSettings } = await loadSettingsStore();

    const firstPromise = getAiPathsSettings(['ai_paths_index']);
    const secondPromise = getAiPathsSettings(['ai_paths_index']);

    resolveFetch?.([{ key: 'ai_paths_index', value: '[]' }]);

    const [first, second] = await Promise.all([firstPromise, secondPromise]);
    expect(first).toEqual(second);
    expect(fetchMongoAiPathsSettingsMock).toHaveBeenCalledTimes(1);
  });
});

