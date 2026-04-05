import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useBrainRuntime } from '../context/useBrainRuntime';
import { useBrainDerivedState } from '../context/useBrainDerivedState';
import { useBrainPersistence } from '../context/useBrainPersistence';
import {
  defaultBrainAssignment,
  defaultBrainSettings,
} from '@/shared/lib/ai-brain/settings';
import {
  useSettingsMap,
  useUpdateSetting,
  useUpdateSettingsBulk,
} from '@/shared/hooks/use-settings';
import { useToast } from '@/shared/ui/primitives.public';

vi.mock('../context/useBrainDerivedState', () => ({
  useBrainDerivedState: vi.fn(),
}));

vi.mock('../context/useBrainPersistence', () => ({
  useBrainPersistence: vi.fn(),
}));

vi.mock('@/shared/hooks/use-settings', () => ({
  useSettingsMap: vi.fn(),
  useUpdateSetting: vi.fn(),
  useUpdateSettingsBulk: vi.fn(),
}));

vi.mock('@/shared/ui', () => ({
  useToast: vi.fn(),
}));

describe('useBrainRuntime', () => {
  const toast = vi.fn();
  const hydrateFromSettingsMap = vi.fn();
  const handleSave = vi.fn();
  const handleReset = vi.fn();
  const syncPlaywrightPersonas = vi.fn();

  beforeEach(() => {
    toast.mockReset();
    hydrateFromSettingsMap.mockReset();
    handleSave.mockReset();
    handleReset.mockReset();
    syncPlaywrightPersonas.mockReset();

    vi.mocked(useToast).mockReturnValue({ toast } as ReturnType<typeof useToast>);
    vi.mocked(useSettingsMap).mockReturnValue({
      data: undefined,
      dataUpdatedAt: 0,
    } as ReturnType<typeof useSettingsMap>);
    vi.mocked(useUpdateSetting).mockReturnValue({} as ReturnType<typeof useUpdateSetting>);
    vi.mocked(useUpdateSettingsBulk).mockReturnValue({} as ReturnType<typeof useUpdateSettingsBulk>);
    vi.mocked(useBrainDerivedState).mockReturnValue({
      agentQuickPicks: [],
      analyticsSummaryQuery: { id: 'analytics' },
      effectiveAssignments: {
        products: { ...defaultBrainAssignment, modelId: 'derived-product' },
      },
      effectiveCapabilityAssignments: {
        'product.description.generation': {
          ...defaultBrainAssignment,
          modelId: 'derived-capability',
        },
      },
      insightsQuery: { id: 'insights' },
      liveOllamaModels: ['llama3'],
      logMetricsQuery: { id: 'logs' },
      modelQuickPicks: [{ value: 'gpt-4o-mini', label: 'gpt-4o-mini', description: 'preset' }],
      ollamaModelsQuery: { id: 'ollama' },
      operationsOverviewQuery: { id: 'operations' },
      runtimeAnalyticsLiveEnabled: true,
      runtimeAnalyticsQuery: { id: 'runtime' },
    } as ReturnType<typeof useBrainDerivedState>);
    vi.mocked(useBrainPersistence).mockReturnValue({
      handleReset,
      handleSave,
      hydrateFromSettingsMap,
      saving: false,
      syncPlaywrightPersonas,
    } as ReturnType<typeof useBrainPersistence>);
  });

  it('hydrates from settings data and exposes derived state plus persistence actions', async () => {
    const settingsMap = new Map<string, string>([['ai_brain_seed', '1']]);
    vi.mocked(useSettingsMap).mockReturnValue({
      data: settingsMap,
      dataUpdatedAt: 42,
    } as ReturnType<typeof useSettingsMap>);

    const { result } = renderHook(() => useBrainRuntime());

    await waitFor(() => expect(hydrateFromSettingsMap).toHaveBeenCalledWith(settingsMap));

    expect(useBrainDerivedState).toHaveBeenCalledWith(
      expect.objectContaining({
        activeTab: 'routing',
        operationsRange: '1h',
      })
    );

    expect(result.current.stateValue.activeTab).toBe('routing');
    expect(result.current.stateValue.operationsRange).toBe('1h');
    expect(result.current.stateValue.analyticsSummaryQuery).toEqual({ id: 'analytics' });
    expect(result.current.stateValue.runtimeAnalyticsQuery).toEqual({ id: 'runtime' });
    expect(result.current.stateValue.modelQuickPicks).toEqual([
      { value: 'gpt-4o-mini', label: 'gpt-4o-mini', description: 'preset' },
    ]);
    expect(result.current.stateValue.liveOllamaModels).toEqual(['llama3']);
    expect(result.current.actionsValue.handleSave).toBe(handleSave);
    expect(result.current.actionsValue.handleReset).toBe(handleReset);
    expect(result.current.actionsValue.syncPlaywrightPersonas).toBe(syncPlaywrightPersonas);
  });

  it('updates defaults, feature overrides, capability overrides, and top-level UI state through actions', () => {
    const { result } = renderHook(() => useBrainRuntime());

    act(() => {
      result.current.actionsValue.setActiveTab('providers');
      result.current.actionsValue.setOperationsRange('24h');
      result.current.actionsValue.setFeatureEnabled('prompt_engine', false);
      result.current.actionsValue.handleDefaultChange({
        ...defaultBrainAssignment,
        provider: 'agent',
        modelId: 'default-agent-attempt',
      });
      result.current.actionsValue.toggleOverride('products', true);
      result.current.actionsValue.handleOverrideChange('products', {
        ...defaultBrainAssignment,
        provider: 'agent',
        modelId: 'feature-agent-attempt',
      });
      result.current.actionsValue.toggleCapabilityOverride('product.description.generation', true);
      result.current.actionsValue.handleCapabilityChange('product.description.generation', {
        ...defaultBrainAssignment,
        provider: 'agent',
        modelId: 'capability-agent-attempt',
      });
      result.current.actionsValue.setCapabilityEnabled('cms.css_stream', true);
    });

    expect(result.current.stateValue.activeTab).toBe('providers');
    expect(result.current.stateValue.operationsRange).toBe('24h');
    expect(result.current.stateValue.overridesEnabled.prompt_engine).toBe(true);
    expect(result.current.stateValue.settings.assignments.prompt_engine?.enabled).toBe(false);
    expect(result.current.stateValue.settings.defaults.provider).toBe('model');
    expect(result.current.stateValue.settings.defaults.modelId).toBe('default-agent-attempt');
    expect(result.current.stateValue.overridesEnabled.products).toBe(true);
    expect(result.current.stateValue.settings.assignments.products?.provider).toBe('model');
    expect(result.current.stateValue.settings.assignments.products?.modelId).toBe(
      'feature-agent-attempt'
    );
    expect(
      result.current.stateValue.settings.capabilities['product.description.generation']?.provider
    ).toBe('model');
    expect(
      result.current.stateValue.settings.capabilities['product.description.generation']?.modelId
    ).toBe('capability-agent-attempt');
    expect(result.current.stateValue.settings.capabilities['cms.css_stream']?.enabled).toBe(true);
  });

  it('recomputes derived state when the active brain tab changes', () => {
    const { result } = renderHook(() => useBrainRuntime());

    expect(useBrainDerivedState).toHaveBeenLastCalledWith(
      expect.objectContaining({
        activeTab: 'routing',
      })
    );

    act(() => {
      result.current.actionsValue.setActiveTab('metrics');
    });

    expect(useBrainDerivedState).toHaveBeenLastCalledWith(
      expect.objectContaining({
        activeTab: 'metrics',
      })
    );
  });

  it('clears feature and capability overrides when toggled off or explicitly cleared', () => {
    const { result } = renderHook(() => useBrainRuntime());

    act(() => {
      result.current.actionsValue.toggleOverride('products', true);
      result.current.actionsValue.toggleCapabilityOverride('product.description.generation', true);
    });

    expect(result.current.stateValue.settings.assignments.products).toBeDefined();
    expect(
      result.current.stateValue.settings.capabilities['product.description.generation']
    ).toBeDefined();

    act(() => {
      result.current.actionsValue.toggleOverride('products', false);
      result.current.actionsValue.clearCapabilityOverride('product.description.generation');
    });

    expect(result.current.stateValue.overridesEnabled.products).toBe(false);
    expect(result.current.stateValue.settings.assignments.products).toBeUndefined();
    expect(
      result.current.stateValue.settings.capabilities['product.description.generation']
    ).toBeUndefined();
  });
});
