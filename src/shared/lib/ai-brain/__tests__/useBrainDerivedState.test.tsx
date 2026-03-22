import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useBrainDerivedState } from '@/shared/lib/ai-brain/context/useBrainDerivedState';
import {
  defaultBrainAssignment,
  defaultBrainSettings,
  type AiBrainProviderCatalog,
  type AiBrainSettings,
} from '@/shared/lib/ai-brain/settings';
import {
  useBrainAnalyticsSummary,
  useBrainInsights,
  useBrainLogMetrics,
  useBrainModels,
  useBrainOperationsOverview,
  useBrainRuntimeAnalytics,
} from '@/shared/lib/ai-brain/hooks/useBrainQueries';

vi.mock('@/shared/lib/ai-brain/hooks/useBrainQueries', () => ({
  useBrainModels: vi.fn(),
  useBrainOperationsOverview: vi.fn(),
  useBrainAnalyticsSummary: vi.fn(),
  useBrainLogMetrics: vi.fn(),
  useBrainInsights: vi.fn(),
  useBrainRuntimeAnalytics: vi.fn(),
}));

describe('useBrainDerivedState', () => {
  const analyticsSummaryQuery = { id: 'analytics-summary' };
  const logMetricsQuery = { id: 'log-metrics' };
  const insightsQuery = { id: 'insights' };
  const operationsOverviewQuery = { id: 'operations-overview' };
  const runtimeAnalyticsQuery = { id: 'runtime-analytics' };

  beforeEach(() => {
    vi.mocked(useBrainAnalyticsSummary).mockReturnValue(
      analyticsSummaryQuery as ReturnType<typeof useBrainAnalyticsSummary>
    );
    vi.mocked(useBrainLogMetrics).mockReturnValue(
      logMetricsQuery as ReturnType<typeof useBrainLogMetrics>
    );
    vi.mocked(useBrainInsights).mockReturnValue(
      insightsQuery as ReturnType<typeof useBrainInsights>
    );
    vi.mocked(useBrainOperationsOverview).mockReturnValue(
      operationsOverviewQuery as ReturnType<typeof useBrainOperationsOverview>
    );
    vi.mocked(useBrainRuntimeAnalytics).mockReturnValue(
      runtimeAnalyticsQuery as ReturnType<typeof useBrainRuntimeAnalytics>
    );
  });

  it('derives effective assignments, quick picks, and runtime enablement from settings and catalog data', () => {
    vi.mocked(useBrainModels).mockReturnValue({
      data: {
        sources: {
          liveOllamaModels: [' live-alpha ', '', 'live-beta '],
        },
      },
    } as ReturnType<typeof useBrainModels>);

    const providerCatalog: AiBrainProviderCatalog = {
      entries: [
        { pool: 'modelPresets', value: 'preset-model' },
        { pool: 'paidModels', value: 'paid-model' },
        { pool: 'ollamaModels', value: 'catalog-ollama' },
        { pool: 'agentModels', value: 'agent-runner' },
        { pool: 'deepthinkingAgents', value: 'deep-thinker' },
        { pool: 'playwrightPersonas', value: 'persona-1' },
      ],
    };

    const settings: AiBrainSettings = {
      ...defaultBrainSettings,
      defaults: {
        ...defaultBrainAssignment,
        modelId: 'global-model',
      },
      assignments: {
        ...defaultBrainSettings.assignments,
        products: {
          ...defaultBrainAssignment,
          modelId: 'product-model',
        },
      },
      capabilities: {
        ...defaultBrainSettings.capabilities,
        'insights.runtime_analytics': {
          ...defaultBrainAssignment,
          enabled: true,
          modelId: 'runtime-model',
        },
        'ai_paths.model': {
          ...defaultBrainAssignment,
          enabled: true,
          modelId: 'paths-model',
        },
      },
    };

    const { result } = renderHook(() =>
      useBrainDerivedState({
        operationsRange: '24h',
        providerCatalog,
        settings,
      })
    );

    expect(useBrainOperationsOverview).toHaveBeenCalledWith({ range: '24h' });
    expect(useBrainRuntimeAnalytics).toHaveBeenCalledWith(true);
    expect(result.current.analyticsSummaryQuery).toBe(analyticsSummaryQuery);
    expect(result.current.logMetricsQuery).toBe(logMetricsQuery);
    expect(result.current.insightsQuery).toBe(insightsQuery);
    expect(result.current.operationsOverviewQuery).toBe(operationsOverviewQuery);
    expect(result.current.runtimeAnalyticsQuery).toBe(runtimeAnalyticsQuery);
    expect(result.current.runtimeAnalyticsLiveEnabled).toBe(true);
    expect(result.current.liveOllamaModels).toEqual(['live-alpha', 'live-beta']);
    expect(result.current.effectiveAssignments.products.modelId).toBe('product-model');
    expect(result.current.effectiveAssignments.image_studio.modelId).toBe('global-model');
    expect(result.current.effectiveCapabilityAssignments['insights.runtime_analytics'].modelId).toBe(
      'runtime-model'
    );
    expect(result.current.modelQuickPicks).toEqual([
      { value: 'preset-model', label: 'preset-model', description: 'model preset' },
      { value: 'paid-model', label: 'paid-model', description: 'paid model' },
      { value: 'catalog-ollama', label: 'catalog-ollama', description: 'ollama' },
      { value: 'live-alpha', label: 'live-alpha', description: 'ollama (live)' },
      { value: 'live-beta', label: 'live-beta', description: 'ollama (live)' },
    ]);
    expect(result.current.agentQuickPicks).toEqual([
      { value: 'agent-runner', label: 'agent-runner', description: 'agent' },
      { value: 'deep-thinker', label: 'deep-thinker', description: 'deepthinking' },
      { value: 'persona-1', label: 'persona-1', description: 'playwright persona' },
    ]);
  });

  it('disables runtime analytics when required capabilities are not both enabled', () => {
    vi.mocked(useBrainModels).mockReturnValue({
      data: {
        sources: {
          liveOllamaModels: ['   '],
        },
      },
    } as ReturnType<typeof useBrainModels>);

    const { result } = renderHook(() =>
      useBrainDerivedState({
        operationsRange: '7d',
        providerCatalog: { entries: [] },
        settings: {
          ...defaultBrainSettings,
          capabilities: {
            ...defaultBrainSettings.capabilities,
            'insights.runtime_analytics': {
              ...defaultBrainAssignment,
              enabled: false,
              modelId: 'runtime-model',
            },
            'ai_paths.model': {
              ...defaultBrainAssignment,
              enabled: true,
              modelId: 'paths-model',
            },
          },
        },
      })
    );

    expect(useBrainOperationsOverview).toHaveBeenCalledWith({ range: '7d' });
    expect(useBrainRuntimeAnalytics).toHaveBeenLastCalledWith(false);
    expect(result.current.runtimeAnalyticsLiveEnabled).toBe(false);
    expect(result.current.liveOllamaModels).toEqual([]);
    expect(result.current.modelQuickPicks).toEqual([]);
    expect(result.current.agentQuickPicks).toEqual([]);
  });
});
