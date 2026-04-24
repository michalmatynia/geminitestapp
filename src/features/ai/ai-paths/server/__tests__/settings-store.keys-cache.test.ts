import { beforeEach, describe, expect, it, vi } from 'vitest';

const assertMongoConfiguredMock = vi.fn();
const fetchMongoAiPathsSettingsMock = vi.fn();
const upsertMongoAiPathsSettingsMock = vi.fn();
const deleteMongoAiPathsSettingsMock = vi.fn();
const ensureMongoIndexesMock = vi.fn();

vi.mock('@/features/ai/ai-paths/server/settings-store.helpers', () => ({
  assertMongoConfigured: assertMongoConfiguredMock,
  isAiPathsKey: (key: string) => key.startsWith('ai_paths_'),
  parseBooleanEnv: (raw: string | undefined, defaultValue: boolean) => {
    if (raw === undefined) return defaultValue;
    const normalized = raw.trim().toLowerCase();
    if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
    if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
    return defaultValue;
  },
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
  seedCanonicalStarterWorkflows: () => ({
    affectedCount: 5,
    nextRecords: [
      {
        key: 'ai_paths_index',
        value:
          '[{"id":"path_descv3lite"},{"id":"path_96708d"},{"id":"path_marketplace_copy_debrand_v1"}]',
      },
      { key: 'ai_paths_trigger_buttons', value: '[]' },
      { key: 'ai_paths_config_path_descv3lite', value: '{"id":"path_descv3lite"}' },
      { key: 'ai_paths_config_path_96708d', value: '{"id":"path_96708d"}' },
      {
        key: 'ai_paths_config_path_marketplace_copy_debrand_v1',
        value: '{"id":"path_marketplace_copy_debrand_v1"}',
      },
    ],
  }),
}));

const loadSettingsStore = async () => import('@/features/ai/ai-paths/server/settings-store');

describe('settings-store keyset cache', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    assertMongoConfiguredMock.mockImplementation(() => {});
  });

  it('reuses cached keyset reads within TTL', async () => {
    fetchMongoAiPathsSettingsMock.mockResolvedValue([{ key: 'ai_paths_index', value: '[]' }]);

    const { getAiPathsSettings } = await loadSettingsStore();

    const first = await getAiPathsSettings(['ai_paths_index']);
    const second = await getAiPathsSettings(['ai_paths_index']);

    expect(first).toEqual(second);
    expect(fetchMongoAiPathsSettingsMock).toHaveBeenCalledTimes(1);
  });

  it('invalidates keyset cache after upsert', async () => {
    fetchMongoAiPathsSettingsMock
      .mockResolvedValueOnce([{ key: 'ai_paths_index', value: '[]' }])
      .mockResolvedValueOnce([{ key: 'ai_paths_index', value: '[{"id":"path_1"}]' }]);

    const { getAiPathsSettings, upsertAiPathsSettings } = await loadSettingsStore();

    await getAiPathsSettings(['ai_paths_index']);
    await upsertAiPathsSettings([{ key: 'ai_paths_index', value: '[{"id":"path_1"}]' }]);
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

  it('does not synthesize starter workflow settings when keyset Mongo reads fail', async () => {
    fetchMongoAiPathsSettingsMock.mockRejectedValue(new Error('mongo unavailable'));

    const { getAiPathsSettings } = await loadSettingsStore();

    await expect(
      getAiPathsSettings([
        'ai_paths_index',
        'ai_paths_config_path_descv3lite',
        'ai_paths_trigger_buttons',
      ])
    ).rejects.toThrow('mongo unavailable');
  });

  it('does not synthesize starter workflow settings when an obsolete fallback env is enabled', async () => {
    process.env['AI_PATHS_STATIC_SETTINGS_FALLBACK_ENABLED'] = 'true';
    fetchMongoAiPathsSettingsMock.mockRejectedValue(new Error('mongo unavailable'));

    const { getAiPathsSettings } = await loadSettingsStore();

    await expect(
      getAiPathsSettings([
        'ai_paths_index',
        'ai_paths_config_path_descv3lite',
        'ai_paths_trigger_buttons',
      ])
    ).rejects.toThrow('mongo unavailable');
  });

  it('does not synthesize starter workflow settings when Mongo is not configured', async () => {
    process.env['AI_PATHS_STATIC_SETTINGS_FALLBACK_ENABLED'] = 'true';
    assertMongoConfiguredMock.mockImplementation(() => {
      throw new Error('AI Paths settings require MongoDB.');
    });

    const { getAllAiPathsSettings } = await loadSettingsStore();

    await expect(getAllAiPathsSettings()).rejects.toThrow('AI Paths settings require MongoDB.');
  });
});
