import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AdminBrainPage } from '../pages/AdminBrainPage';
import { useBrain } from '../context/BrainContext';
import {
  buildAiBrainWorkspaceContextBundle,
  AI_BRAIN_CONTEXT_ROOT_IDS,
} from '@/shared/lib/ai-brain/context-registry/workspace';
import { useRegisterContextRegistryPageSource } from '@/shared/lib/ai-context-registry/page-context';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';

vi.mock('next/navigation', () => ({
  usePathname: vi.fn(),
  useRouter: vi.fn(),
  useSearchParams: vi.fn(),
}));

vi.mock('../context/BrainContext', () => ({
  BrainProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid='brain-provider'>{children}</div>
  ),
  useBrain: vi.fn(),
}));

vi.mock('@/shared/lib/ai-brain/context-registry/workspace', () => ({
  AI_BRAIN_CONTEXT_ROOT_IDS: ['brain-root-a', 'brain-root-b'],
  buildAiBrainWorkspaceContextBundle: vi.fn(() => ({ bundle: 'brain-workspace' })),
}));

vi.mock('@/shared/lib/ai-context-registry/page-context', () => ({
  ContextRegistryPageProvider: ({
    children,
    pageId,
    title,
    rootNodeIds,
  }: {
    children: React.ReactNode;
    pageId: string;
    title: string;
    rootNodeIds: string[];
  }) => (
    <div
      data-testid='context-registry-provider'
      data-page-id={pageId}
      data-title={title}
      data-root-ids={rootNodeIds.join(',')}
    >
      {children}
    </div>
  ),
  useRegisterContextRegistryPageSource: vi.fn(),
}));

vi.mock('../components/BrainSettingsHeader', () => ({
  BrainSettingsHeader: () => <div>BrainSettingsHeader</div>,
}));

vi.mock('../components/BrainStateOverview', () => ({
  BrainStateOverview: () => <div>BrainStateOverview</div>,
}));

vi.mock('../components/OperationsTab', () => ({
  OperationsTab: () => <div>OperationsTab</div>,
}));

vi.mock('../components/RoutingTab', () => ({
  RoutingTab: () => <div>RoutingTab</div>,
}));

vi.mock('../components/ProvidersTab', () => ({
  ProvidersTab: () => <div>ProvidersTab</div>,
}));

vi.mock('../components/ReportsTab', () => ({
  ReportsTab: () => <div>ReportsTab</div>,
}));

vi.mock('../components/MetricsTab', () => ({
  MetricsTab: () => <div>MetricsTab</div>,
}));

vi.mock('@/shared/ui', () => ({
  Tabs: ({
    value,
    onValueChange,
    children,
  }: {
    value: string;
    onValueChange: (value: string) => void;
    children: React.ReactNode;
  }) => (
    <div data-testid='tabs' data-value={value}>
      <button type='button' onClick={() => onValueChange('reports')}>
        switch-to-reports
      </button>
      <button type='button' onClick={() => onValueChange('invalid')}>
        switch-invalid
      </button>
      {children}
    </div>
  ),
  TabsList: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsTrigger: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  TabsContent: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
}));

describe('AdminBrainPage', () => {
  const setActiveTab = vi.fn();
  const replace = vi.fn();

  beforeEach(() => {
    setActiveTab.mockReset();
    replace.mockReset();

    vi.mocked(usePathname).mockReturnValue('/admin/brain');
    vi.mocked(useRouter).mockReturnValue({
      replace,
    } as unknown as ReturnType<typeof useRouter>);
    vi.mocked(useSearchParams).mockReturnValue({
      get: vi.fn(() => null),
      toString: vi.fn(() => ''),
    } as unknown as ReturnType<typeof useSearchParams>);
    vi.mocked(useBrain).mockReturnValue({
      activeTab: 'routing',
      setActiveTab,
      analyticsPromptSystem: 'analytics prompt',
      analyticsScheduleEnabled: true,
      analyticsScheduleMinutes: 15,
      analyticsSummaryQuery: {
        data: { totals: { events: 12 } },
      },
      effectiveAssignments: {
        products: { modelId: 'product-model' },
      },
      effectiveCapabilityAssignments: {
        'product.description.generation': { modelId: 'capability-model' },
      },
      insightsQuery: {
        data: { analytics: [], runtimeAnalytics: [], logs: [] },
      },
      liveOllamaModels: ['llama3'],
      logMetricsQuery: {
        data: { total: 3 },
      },
      logsAutoOnError: false,
      logsPromptSystem: 'logs prompt',
      logsScheduleEnabled: true,
      logsScheduleMinutes: 30,
      modelQuickPicks: [{ value: 'gpt-4o-mini' }],
      agentQuickPicks: [{ value: 'agent-a' }, { value: 'agent-b' }],
      operationsOverviewQuery: {
        data: { domains: {} },
      },
      operationsRange: '24h',
      overridesEnabled: { products: true },
      runtimeAnalyticsLiveEnabled: true,
      runtimeAnalyticsPromptSystem: 'runtime prompt',
      runtimeAnalyticsQuery: {
        data: { runs: { total: 5 } },
      },
      runtimeAnalyticsScheduleEnabled: false,
      runtimeAnalyticsScheduleMinutes: 45,
      saving: true,
      settings: {
        assignments: { products: { modelId: 'product-model' } },
        capabilities: { 'product.description.generation': { modelId: 'capability-model' } },
      },
    } as unknown as ReturnType<typeof useBrain>);
  });

  it('hydrates the default operations tab, registers workspace context, and wraps the page in providers', () => {
    render(<AdminBrainPage />);

    expect(screen.getByTestId('context-registry-provider')).toHaveAttribute(
      'data-page-id',
      'admin:brain'
    );
    expect(screen.getByTestId('context-registry-provider')).toHaveAttribute(
      'data-title',
      'AI Brain'
    );
    expect(screen.getByTestId('context-registry-provider')).toHaveAttribute(
      'data-root-ids',
      AI_BRAIN_CONTEXT_ROOT_IDS.join(',')
    );
    expect(screen.getByTestId('brain-provider')).toBeInTheDocument();
    expect(setActiveTab).toHaveBeenCalledWith('operations');
    expect(buildAiBrainWorkspaceContextBundle).toHaveBeenCalledWith(
      expect.objectContaining({
        activeTab: 'routing',
        operationsRange: '24h',
        saving: true,
        modelQuickPickCount: 1,
        agentQuickPickCount: 2,
        liveOllamaModels: ['llama3'],
      })
    );
    expect(useRegisterContextRegistryPageSource).toHaveBeenCalledWith(
      'brain-workspace-state',
      expect.objectContaining({
        label: 'AI Brain workspace state',
        resolved: { bundle: 'brain-workspace' },
      })
    );
    expect(screen.getByText('OperationsTab')).toBeInTheDocument();
    expect(screen.getByText('MetricsTab')).toBeInTheDocument();
  });

  it('uses a valid tab query parameter and updates the url when the tab changes', () => {
    vi.mocked(useSearchParams).mockReturnValue({
      get: vi.fn((key: string) => (key === 'tab' ? 'metrics' : null)),
      toString: vi.fn(() => 'filter=active'),
    } as unknown as ReturnType<typeof useSearchParams>);

    render(<AdminBrainPage />);

    expect(setActiveTab).toHaveBeenCalledWith('metrics');

    fireEvent.click(screen.getByRole('button', { name: 'switch-to-reports' }));

    expect(setActiveTab).toHaveBeenCalledWith('reports');
    expect(replace).toHaveBeenCalledWith('/admin/brain?filter=active&tab=reports', {
      scroll: false,
    });
  });

  it('ignores invalid tab changes from the tabs control', () => {
    render(<AdminBrainPage />);

    setActiveTab.mockClear();
    replace.mockClear();

    fireEvent.click(screen.getByRole('button', { name: 'switch-invalid' }));

    expect(setActiveTab).not.toHaveBeenCalled();
    expect(replace).not.toHaveBeenCalled();
  });
});
