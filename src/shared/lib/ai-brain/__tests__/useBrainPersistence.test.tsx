import { act, renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useBrainPersistence } from '@/shared/lib/ai-brain/context/useBrainPersistence';
import {
  AI_INSIGHTS_SETTINGS_KEYS,
  DEFAULT_ANALYTICS_INSIGHT_SYSTEM_PROMPT,
  DEFAULT_LOGS_INSIGHT_SYSTEM_PROMPT,
  DEFAULT_RUNTIME_ANALYTICS_INSIGHT_SYSTEM_PROMPT,
  DEFAULT_BRAIN_OVERRIDES_ENABLED,
  PLAYWRIGHT_PERSONA_SETTINGS_KEY,
} from '@/shared/lib/ai-brain/context/brain-runtime-shared';
import {
  AI_BRAIN_PROVIDER_CATALOG_KEY,
  AI_BRAIN_SETTINGS_KEY,
  defaultBrainAssignment,
  defaultBrainProviderCatalog,
  defaultBrainSettings,
  type AiBrainProviderCatalog,
  type AiBrainSettings,
} from '@/shared/lib/ai-brain/settings';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';

vi.mock('@/shared/utils/observability/client-error-logger', () => ({
  logClientCatch: vi.fn(),
}));

type BrainPersistenceParams = Parameters<typeof useBrainPersistence>[0];

const createParams = (
  overrides: Partial<BrainPersistenceParams> = {}
): BrainPersistenceParams & {
  updateSettingMutateAsync: ReturnType<typeof vi.fn>;
  updateSettingsBulkMutateAsync: ReturnType<typeof vi.fn>;
} => {
  const updateSettingMutateAsync = vi.fn().mockResolvedValue({});
  const updateSettingsBulkMutateAsync = vi.fn().mockResolvedValue([]);

  const params: BrainPersistenceParams = {
    analyticsPromptSystem: ' analytics prompt ',
    analyticsScheduleEnabled: true,
    analyticsScheduleMinutes: 15,
    anthropicApiKey: ' anthropic-key ',
    geminiApiKey: ' gemini-key ',
    logsAutoOnError: true,
    logsPromptSystem: ' logs prompt ',
    logsScheduleEnabled: true,
    logsScheduleMinutes: 20,
    openaiApiKey: ' openai-key ',
    overridesEnabled: {
      ...DEFAULT_BRAIN_OVERRIDES_ENABLED,
      products: true,
    },
    providerCatalog: {
      entries: [
        { pool: 'modelPresets', value: 'gpt-4o-mini' },
        { pool: 'playwrightPersonas', value: 'old-persona' },
      ],
    },
    runtimeAnalyticsPromptSystem: ' runtime prompt ',
    runtimeAnalyticsScheduleEnabled: false,
    runtimeAnalyticsScheduleMinutes: 25,
    setAnalyticsPromptSystem: vi.fn(),
    setAnalyticsScheduleEnabled: vi.fn(),
    setAnalyticsScheduleMinutes: vi.fn(),
    setAnthropicApiKey: vi.fn(),
    setGeminiApiKey: vi.fn(),
    setLogsAutoOnError: vi.fn(),
    setLogsPromptSystem: vi.fn(),
    setLogsScheduleEnabled: vi.fn(),
    setLogsScheduleMinutes: vi.fn(),
    setOpenaiApiKey: vi.fn(),
    setOverridesEnabled: vi.fn(),
    setProviderCatalog: vi.fn(),
    setRuntimeAnalyticsPromptSystem: vi.fn(),
    setRuntimeAnalyticsScheduleEnabled: vi.fn(),
    setRuntimeAnalyticsScheduleMinutes: vi.fn(),
    setSettings: vi.fn(),
    settings: {
      ...defaultBrainSettings,
      defaults: {
        ...defaultBrainAssignment,
        provider: 'agent',
        modelId: 'default-agent',
      },
      assignments: {
        ...defaultBrainSettings.assignments,
        products: {
          ...defaultBrainAssignment,
          provider: 'agent',
          modelId: 'product-agent',
        },
        analytics: {
          ...defaultBrainAssignment,
          provider: 'agent',
          modelId: 'analytics-agent',
        },
      },
      capabilities: {
        ...defaultBrainSettings.capabilities,
        'cms.css_stream': {
          ...defaultBrainAssignment,
          enabled: true,
          provider: 'agent',
          agentId: 'cms-agent',
        },
        'product.description.generation': {
          ...defaultBrainAssignment,
          enabled: true,
          provider: 'agent',
          modelId: 'product-capability-agent',
        },
      },
    },
    settingsMap: undefined,
    toast: vi.fn(),
    updateSetting: {
      mutateAsync: updateSettingMutateAsync,
      isPending: false,
    } as BrainPersistenceParams['updateSetting'],
    updateSettingsBulk: {
      mutateAsync: updateSettingsBulkMutateAsync,
      isPending: false,
    } as BrainPersistenceParams['updateSettingsBulk'],
  };

  return {
    ...params,
    ...overrides,
    updateSettingMutateAsync,
    updateSettingsBulkMutateAsync,
  };
};

describe('useBrainPersistence', () => {
  beforeEach(() => {
    vi.mocked(logClientCatch).mockReset();
  });

  it('hydrates settings, provider catalog, overrides, secrets, schedules, and prompts from the settings map', () => {
    const params = createParams();

    const parsedSettings: AiBrainSettings = {
      ...defaultBrainSettings,
      assignments: {
        ...defaultBrainSettings.assignments,
        products: {
          ...defaultBrainAssignment,
          modelId: 'hydrated-product',
        },
      },
    };

    const settingsMap = new Map<string, string>([
      [AI_BRAIN_SETTINGS_KEY, JSON.stringify(parsedSettings)],
      [
        AI_BRAIN_PROVIDER_CATALOG_KEY,
        JSON.stringify({
          entries: [{ pool: 'modelPresets', value: 'catalog-model' }],
        } satisfies AiBrainProviderCatalog),
      ],
      [
        PLAYWRIGHT_PERSONA_SETTINGS_KEY,
        JSON.stringify([{ id: ' persona-a ' }, { id: 'persona-b' }, { id: 'persona-a' }]),
      ],
      ['openai_api_key', 'openai-live'],
      ['anthropic_api_key', 'anthropic-live'],
      ['gemini_api_key', 'gemini-live'],
      [AI_INSIGHTS_SETTINGS_KEYS.analyticsScheduleEnabled, '1'],
      [AI_INSIGHTS_SETTINGS_KEYS.analyticsScheduleMinutes, '45'],
      [AI_INSIGHTS_SETTINGS_KEYS.runtimeAnalyticsScheduleEnabled, 'false'],
      [AI_INSIGHTS_SETTINGS_KEYS.runtimeAnalyticsScheduleMinutes, '55'],
      [AI_INSIGHTS_SETTINGS_KEYS.logsScheduleEnabled, 'true'],
      [AI_INSIGHTS_SETTINGS_KEYS.logsScheduleMinutes, '65'],
      [AI_INSIGHTS_SETTINGS_KEYS.logsAutoOnError, '0'],
      [AI_INSIGHTS_SETTINGS_KEYS.analyticsPromptSystem, 'hydrated analytics prompt'],
      [AI_INSIGHTS_SETTINGS_KEYS.runtimeAnalyticsPromptSystem, 'hydrated runtime prompt'],
      [AI_INSIGHTS_SETTINGS_KEYS.logsPromptSystem, 'hydrated logs prompt'],
    ]);

    const { result } = renderHook(() => useBrainPersistence(params));

    act(() => {
      result.current.hydrateFromSettingsMap(settingsMap);
    });

    expect(params.setSettings).toHaveBeenCalledWith(parsedSettings);
    expect(params.setOpenaiApiKey).toHaveBeenCalledWith('openai-live');
    expect(params.setAnthropicApiKey).toHaveBeenCalledWith('anthropic-live');
    expect(params.setGeminiApiKey).toHaveBeenCalledWith('gemini-live');
    expect(params.setAnalyticsPromptSystem).toHaveBeenCalledWith('hydrated analytics prompt');
    expect(params.setRuntimeAnalyticsPromptSystem).toHaveBeenCalledWith(
      'hydrated runtime prompt'
    );
    expect(params.setLogsPromptSystem).toHaveBeenCalledWith('hydrated logs prompt');

    const hydratedCatalog = params.setProviderCatalog.mock.calls[0]?.[0] as AiBrainProviderCatalog;
    expect(hydratedCatalog.entries).toEqual([
      { pool: 'modelPresets', value: 'catalog-model' },
      { pool: 'playwrightPersonas', value: 'persona-a' },
      { pool: 'playwrightPersonas', value: 'persona-b' },
    ]);

    expect(params.setOverridesEnabled).toHaveBeenCalledWith({
      ...DEFAULT_BRAIN_OVERRIDES_ENABLED,
      products: true,
      cms_builder: false,
      image_studio: false,
      prompt_engine: false,
      ai_paths: false,
      chatbot: false,
      kangur_ai_tutor: false,
      case_resolver: false,
      agent_runtime: false,
      agent_teaching: false,
    });

    const analyticsEnabledUpdater = params.setAnalyticsScheduleEnabled.mock.calls[0]?.[0] as (
      prev: boolean
    ) => boolean;
    const analyticsMinutesUpdater = params.setAnalyticsScheduleMinutes.mock.calls[0]?.[0] as (
      prev: number
    ) => number;
    const runtimeEnabledUpdater = params.setRuntimeAnalyticsScheduleEnabled.mock.calls[0]?.[0] as (
      prev: boolean
    ) => boolean;
    const runtimeMinutesUpdater =
      params.setRuntimeAnalyticsScheduleMinutes.mock.calls[0]?.[0] as (prev: number) => number;
    const logsEnabledUpdater = params.setLogsScheduleEnabled.mock.calls[0]?.[0] as (
      prev: boolean
    ) => boolean;
    const logsMinutesUpdater = params.setLogsScheduleMinutes.mock.calls[0]?.[0] as (
      prev: number
    ) => number;
    const logsAutoOnErrorUpdater = params.setLogsAutoOnError.mock.calls[0]?.[0] as (
      prev: boolean
    ) => boolean;

    expect(analyticsEnabledUpdater(false)).toBe(true);
    expect(analyticsMinutesUpdater(30)).toBe(45);
    expect(runtimeEnabledUpdater(true)).toBe(false);
    expect(runtimeMinutesUpdater(30)).toBe(55);
    expect(logsEnabledUpdater(false)).toBe(true);
    expect(logsMinutesUpdater(15)).toBe(65);
    expect(logsAutoOnErrorUpdater(true)).toBe(false);
  });

  it('blocks saves when a schedule interval is below five minutes', async () => {
    const params = createParams({
      analyticsScheduleMinutes: 4,
    });

    const { result } = renderHook(() => useBrainPersistence(params));

    await act(async () => {
      await result.current.handleSave();
    });

    expect(params.toast).toHaveBeenCalledWith('Schedule interval must be at least 5 minutes.', {
      variant: 'error',
    });
    expect(params.updateSettingMutateAsync).not.toHaveBeenCalled();
    expect(params.updateSettingsBulkMutateAsync).not.toHaveBeenCalled();
  });

  it('persists sanitized settings, provider catalog, and insight runtime settings on save', async () => {
    const params = createParams();

    const { result } = renderHook(() => useBrainPersistence(params));

    await act(async () => {
      await result.current.handleSave();
    });

    expect(params.updateSettingMutateAsync).toHaveBeenCalledTimes(2);
    expect(params.updateSettingsBulkMutateAsync).toHaveBeenCalledTimes(1);

    const savedSettingsPayload = params.updateSettingMutateAsync.mock.calls[0]?.[0] as {
      key: string;
      value: string;
    };
    expect(savedSettingsPayload.key).toBe(AI_BRAIN_SETTINGS_KEY);

    const savedSettings = JSON.parse(savedSettingsPayload.value) as AiBrainSettings;
    expect(savedSettings.defaults.provider).toBe('model');
    expect(savedSettings.assignments.products?.provider).toBe('model');
    expect(savedSettings.assignments.products?.modelId).toBe('product-agent');
    expect(savedSettings.assignments.analytics?.provider).toBe('model');
    expect(savedSettings.capabilities['cms.css_stream']?.provider).toBe('agent');
    expect(savedSettings.capabilities['product.description.generation']?.provider).toBe('model');

    const savedCatalogPayload = params.updateSettingMutateAsync.mock.calls[1]?.[0] as {
      key: string;
      value: string;
    };
    expect(savedCatalogPayload.key).toBe(AI_BRAIN_PROVIDER_CATALOG_KEY);
    expect(JSON.parse(savedCatalogPayload.value)).toEqual({
      entries: [
        { pool: 'modelPresets', value: 'gpt-4o-mini' },
        { pool: 'playwrightPersonas', value: 'old-persona' },
      ],
    });

    const bulkPayload = params.updateSettingsBulkMutateAsync.mock.calls[0]?.[0] as Array<{
      key: string;
      value: string;
    }>;
    expect(bulkPayload).toEqual(
      expect.arrayContaining([
        { key: 'openai_api_key', value: 'openai-key' },
        { key: 'anthropic_api_key', value: 'anthropic-key' },
        { key: 'gemini_api_key', value: 'gemini-key' },
        { key: AI_INSIGHTS_SETTINGS_KEYS.analyticsProvider, value: 'model' },
        { key: AI_INSIGHTS_SETTINGS_KEYS.analyticsModel, value: 'analytics-agent' },
        { key: AI_INSIGHTS_SETTINGS_KEYS.runtimeAnalyticsProvider, value: 'model' },
        { key: AI_INSIGHTS_SETTINGS_KEYS.logsProvider, value: 'model' },
        { key: AI_INSIGHTS_SETTINGS_KEYS.analyticsScheduleMinutes, value: '15' },
        { key: AI_INSIGHTS_SETTINGS_KEYS.runtimeAnalyticsScheduleEnabled, value: 'false' },
        { key: AI_INSIGHTS_SETTINGS_KEYS.logsScheduleMinutes, value: '20' },
        { key: AI_INSIGHTS_SETTINGS_KEYS.analyticsPromptSystem, value: 'analytics prompt' },
        {
          key: AI_INSIGHTS_SETTINGS_KEYS.runtimeAnalyticsPromptSystem,
          value: 'runtime prompt',
        },
        { key: AI_INSIGHTS_SETTINGS_KEYS.logsPromptSystem, value: 'logs prompt' },
      ])
    );
    expect(params.toast).toHaveBeenCalledWith('Brain settings saved.', { variant: 'success' });
  });

  it('logs and toasts when saving fails', async () => {
    const params = createParams();
    params.updateSettingMutateAsync.mockRejectedValueOnce(new Error('boom'));

    const { result } = renderHook(() => useBrainPersistence(params));

    await act(async () => {
      await result.current.handleSave();
    });

    expect(logClientCatch).toHaveBeenCalled();
    expect(params.toast).toHaveBeenCalledWith('Failed to save Brain settings.', {
      variant: 'error',
    });
  });

  it('resets by hydrating from the loaded settings map when one exists', () => {
    const settingsMap = new Map<string, string>([['ai_brain_saved', '1']]);
    const params = createParams({
      settingsMap,
    });

    const { result } = renderHook(() => useBrainPersistence(params));

    act(() => {
      result.current.handleReset();
    });

    expect(params.setSettings).not.toHaveBeenCalledWith(defaultBrainSettings);
    expect(params.setProviderCatalog).not.toHaveBeenCalledWith(defaultBrainProviderCatalog);
    expect(params.setSettings).not.toHaveBeenCalled();
  });

  it('resets local state to defaults when there is no settings map', () => {
    const params = createParams({
      settingsMap: undefined,
    });

    const { result } = renderHook(() => useBrainPersistence(params));

    act(() => {
      result.current.handleReset();
    });

    expect(params.setSettings).toHaveBeenCalledWith(defaultBrainSettings);
    expect(params.setOverridesEnabled).toHaveBeenCalledWith(DEFAULT_BRAIN_OVERRIDES_ENABLED);
    expect(params.setProviderCatalog).toHaveBeenCalledWith(defaultBrainProviderCatalog);
    expect(params.setOpenaiApiKey).toHaveBeenCalledWith('');
    expect(params.setAnthropicApiKey).toHaveBeenCalledWith('');
    expect(params.setGeminiApiKey).toHaveBeenCalledWith('');
    expect(params.setAnalyticsScheduleEnabled).toHaveBeenCalledWith(true);
    expect(params.setAnalyticsScheduleMinutes).toHaveBeenCalledWith(30);
    expect(params.setRuntimeAnalyticsScheduleEnabled).toHaveBeenCalledWith(true);
    expect(params.setRuntimeAnalyticsScheduleMinutes).toHaveBeenCalledWith(30);
    expect(params.setLogsScheduleEnabled).toHaveBeenCalledWith(true);
    expect(params.setLogsScheduleMinutes).toHaveBeenCalledWith(15);
    expect(params.setLogsAutoOnError).toHaveBeenCalledWith(true);
    expect(params.setAnalyticsPromptSystem).toHaveBeenCalledWith(
      DEFAULT_ANALYTICS_INSIGHT_SYSTEM_PROMPT
    );
    expect(params.setRuntimeAnalyticsPromptSystem).toHaveBeenCalledWith(
      DEFAULT_RUNTIME_ANALYTICS_INSIGHT_SYSTEM_PROMPT
    );
    expect(params.setLogsPromptSystem).toHaveBeenCalledWith(
      DEFAULT_LOGS_INSIGHT_SYSTEM_PROMPT
    );
  });

  it('handles Playwright persona sync loading, empty, and success cases', () => {
    const loadingParams = createParams({
      settingsMap: undefined,
    });
    const loadingView = renderHook(() => useBrainPersistence(loadingParams));

    act(() => {
      loadingView.result.current.syncPlaywrightPersonas();
    });

    expect(loadingParams.toast).toHaveBeenCalledWith('Settings are still loading.', {
      variant: 'error',
    });

    const emptyParams = createParams({
      settingsMap: new Map<string, string>([[PLAYWRIGHT_PERSONA_SETTINGS_KEY, JSON.stringify([])]]),
    });
    const emptyView = renderHook(() => useBrainPersistence(emptyParams));

    act(() => {
      emptyView.result.current.syncPlaywrightPersonas();
    });

    expect(emptyParams.toast).toHaveBeenCalledWith('No Playwright personas found to sync.', {
      variant: 'error',
    });

    const successParams = createParams({
      settingsMap: new Map<string, string>([
        [
          PLAYWRIGHT_PERSONA_SETTINGS_KEY,
          JSON.stringify([{ id: 'persona-x' }, { id: ' persona-y ' }]),
        ],
      ]),
    });
    const successView = renderHook(() => useBrainPersistence(successParams));

    act(() => {
      successView.result.current.syncPlaywrightPersonas();
    });

    const updater = successParams.setProviderCatalog.mock.calls[0]?.[0] as (
      prev: AiBrainProviderCatalog
    ) => AiBrainProviderCatalog;
    const nextCatalog = updater({
      entries: [
        { pool: 'modelPresets', value: 'gpt-4o-mini' },
        { pool: 'playwrightPersonas', value: 'stale-persona' },
      ],
    });

    expect(nextCatalog.entries).toEqual([
      { pool: 'modelPresets', value: 'gpt-4o-mini' },
      { pool: 'playwrightPersonas', value: 'persona-x' },
      { pool: 'playwrightPersonas', value: 'persona-y' },
    ]);
    expect(successParams.toast).toHaveBeenCalledWith(
      'Playwright personas synced into Brain provider catalog.',
      { variant: 'success' }
    );
  });
});
