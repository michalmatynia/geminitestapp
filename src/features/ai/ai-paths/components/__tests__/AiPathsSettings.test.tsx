import { render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockState = vi.hoisted(() => ({
  currentAiPathsState: null as Record<string, unknown> | null,
  currentPageValue: null as Record<string, unknown> | null,
  currentBundleResolved: null as Record<string, unknown> | null,
  boundarySources: [] as string[],
  registeredSources: [] as Array<[string, unknown]>,
  pageProviderValues: [] as unknown[],
  useAiPathsSettingsState: vi.fn(),
  useAiPathsSettingsPageValue: vi.fn(),
  buildAiPathsWorkspaceContextBundle: vi.fn(),
}));

vi.mock('@/features/ai/ai-context-registry/context/page-context', () => ({
  useRegisterContextRegistryPageSource: (sourceId: string, value: unknown) => {
    mockState.registeredSources.push([sourceId, value]);
  },
}));

vi.mock('@/shared/ui/AppErrorBoundary', () => ({
  AppErrorBoundary: ({
    source,
    children,
  }: {
    source: string;
    children: React.ReactNode;
  }) => {
    mockState.boundarySources.push(source);
    return children;
  },
}));

vi.mock('@/features/ai/ai-paths/context', () => ({
  AiPathsProvider: ({ children }: { children: React.ReactNode }) => children,
}));

vi.mock('@/features/ai/ai-paths/context-registry/workspace', () => ({
  buildAiPathsWorkspaceContextBundle: (input: unknown) =>
    mockState.buildAiPathsWorkspaceContextBundle(input),
}));

vi.mock('@/features/ai/ai-paths/components/ai-paths-settings/AiPathsSettingsPageContext', () => ({
  AiPathsSettingsPageProvider: ({
    value,
    children,
  }: {
    value: unknown;
    children: React.ReactNode;
  }) => {
    mockState.pageProviderValues.push(value);
    return children;
  },
}));

vi.mock('@/features/ai/ai-paths/components/ai-paths-settings/AiPathsSettingsView', () => ({
  AiPathsSettingsView: () => React.createElement('div', { 'data-testid': 'settings-view' }),
}));

vi.mock('@/features/ai/ai-paths/components/ai-paths-settings/useAiPathsSettingsPageValue', () => ({
  useAiPathsSettingsPageValue: (...args: unknown[]) => mockState.useAiPathsSettingsPageValue(...args),
}));

vi.mock('@/features/ai/ai-paths/components/ai-paths-settings/useAiPathsSettingsState', () => ({
  useAiPathsSettingsState: (...args: unknown[]) => mockState.useAiPathsSettingsState(...args),
}));

import { AiPathsSettings } from '../AiPathsSettings';

const createAiPathsState = (overrides: Record<string, unknown> = {}) => ({
  activePathId: 'path-1',
  pathName: 'Primary Path',
  pathDescription: 'Workflow used for workspace coverage.',
  paths: [{ id: 'path-1', name: 'Primary Path' }],
  nodes: [{ id: 'node-1', type: 'template' }],
  edges: [{ id: 'edge-1', source: 'node-1', target: 'node-2' }],
  selectedNodeId: 'node-1',
  selectedNode: { id: 'node-1', type: 'template' },
  activeTrigger: 'manual',
  executionMode: 'graph',
  runMode: 'manual',
  strictFlowMode: true,
  blockedRunPolicy: 'stop',
  aiPathsValidation: { enabled: true, warnThreshold: 80 },
  historyRetentionPasses: 2,
  runtimeState: {
    currentRun: { id: 'run-1', status: 'completed' },
    nodeStatuses: { 'node-1': 'completed' },
    inputs: { 'node-1': { value: true } },
    outputs: { 'node-1': { result: true } },
    variables: { token: 'abc' },
  },
  runtimeRunStatus: 'completed',
  runtimeEvents: [{ timestamp: '2026-03-19T08:00:00.000Z', message: 'completed' }],
  isPathLocked: false,
  isPathActive: true,
  sendingToAi: false,
  saving: false,
  lastRunAt: '2026-03-19T08:00:00.000Z',
  lastError: null,
  parserSamples: { sample: { id: 1 } },
  updaterSamples: { update: { ok: true } },
  ConfirmationModal: () => React.createElement('div', { 'data-testid': 'confirmation-modal' }),
  ...overrides,
});

describe('AiPathsSettings', () => {
  beforeEach(() => {
    mockState.boundarySources.length = 0;
    mockState.registeredSources.length = 0;
    mockState.pageProviderValues.length = 0;
    mockState.currentAiPathsState = createAiPathsState();
    mockState.currentPageValue = { id: 'page-value' };
    mockState.currentBundleResolved = { id: 'bundle-value' };

    mockState.useAiPathsSettingsState.mockReset();
    mockState.useAiPathsSettingsState.mockImplementation(() => mockState.currentAiPathsState);

    mockState.useAiPathsSettingsPageValue.mockReset();
    mockState.useAiPathsSettingsPageValue.mockImplementation(() => mockState.currentPageValue);

    mockState.buildAiPathsWorkspaceContextBundle.mockReset();
    mockState.buildAiPathsWorkspaceContextBundle.mockImplementation(() => mockState.currentBundleResolved);
  });

  it('orchestrates state, registry bundle, page context, and confirmation modal rendering', () => {
    const onTabChange = vi.fn();
    const onFocusModeChange = vi.fn();
    const renderActions = vi.fn((actions: React.ReactNode) => actions);

    render(
      <AiPathsSettings
        activeTab='canvas'
        renderActions={renderActions}
        onTabChange={onTabChange}
        isFocusMode
        onFocusModeChange={onFocusModeChange}
      />
    );

    expect(screen.getByTestId('settings-view')).toBeInTheDocument();
    expect(screen.getByTestId('confirmation-modal')).toBeInTheDocument();

    expect(mockState.boundarySources).toEqual(['AiPathsSettings']);
    expect(mockState.useAiPathsSettingsState).toHaveBeenCalledWith({ activeTab: 'canvas' });
    expect(mockState.useAiPathsSettingsPageValue).toHaveBeenCalledWith(
      expect.objectContaining({
        activeTab: 'canvas',
        renderActions,
        onTabChange,
        isFocusMode: true,
        onFocusModeChange,
      }),
      mockState.currentAiPathsState
    );
    expect(mockState.pageProviderValues).toEqual([mockState.currentPageValue]);

    expect(mockState.buildAiPathsWorkspaceContextBundle).toHaveBeenCalledWith(
      expect.objectContaining({
        activeTab: 'canvas',
        activePathId: 'path-1',
        pathName: 'Primary Path',
        pathDescription: 'Workflow used for workspace coverage.',
        nodes: mockState.currentAiPathsState?.nodes,
        edges: mockState.currentAiPathsState?.edges,
        runtimeRunStatus: 'completed',
        parserSamples: mockState.currentAiPathsState?.parserSamples,
        updaterSamples: mockState.currentAiPathsState?.updaterSamples,
      })
    );

    expect(mockState.registeredSources).toEqual([
      [
        'ai-paths-workspace-state',
        {
          label: 'AI Paths workspace state',
          resolved: mockState.currentBundleResolved,
        },
      ],
    ]);
  });

  it('rebuilds the workspace bundle when props and state change on rerender', () => {
    const { rerender } = render(<AiPathsSettings activeTab='canvas' />);

    mockState.currentAiPathsState = createAiPathsState({
      activePathId: 'path-2',
      pathName: 'Docs Path',
      selectedNodeId: null,
      selectedNode: null,
      runtimeRunStatus: 'running',
      runtimeEvents: [],
      sendingToAi: true,
      saving: true,
      lastError: { message: 'boom', time: '2026-03-19T08:05:00.000Z', pathId: 'path-2' },
      ConfirmationModal: () =>
        React.createElement('div', { 'data-testid': 'confirmation-modal-updated' }),
    });
    mockState.currentPageValue = { id: 'page-value-2' };
    mockState.currentBundleResolved = { id: 'bundle-value-2' };

    rerender(<AiPathsSettings activeTab='docs' isFocusMode={false} />);

    expect(screen.getByTestId('confirmation-modal-updated')).toBeInTheDocument();
    expect(mockState.useAiPathsSettingsState).toHaveBeenLastCalledWith({ activeTab: 'docs' });
    expect(mockState.useAiPathsSettingsPageValue).toHaveBeenLastCalledWith(
      expect.objectContaining({
        activeTab: 'docs',
        isFocusMode: false,
      }),
      mockState.currentAiPathsState
    );
    expect(mockState.pageProviderValues.at(-1)).toEqual(mockState.currentPageValue);
    expect(mockState.buildAiPathsWorkspaceContextBundle).toHaveBeenLastCalledWith(
      expect.objectContaining({
        activeTab: 'docs',
        activePathId: 'path-2',
        pathName: 'Docs Path',
        selectedNodeId: null,
        selectedNode: null,
        runtimeRunStatus: 'running',
        runtimeEvents: [],
        sendingToAi: true,
        saving: true,
        lastError: { message: 'boom', time: '2026-03-19T08:05:00.000Z', pathId: 'path-2' },
      })
    );
    expect(mockState.registeredSources.at(-1)).toEqual([
      'ai-paths-workspace-state',
      {
        label: 'AI Paths workspace state',
        resolved: mockState.currentBundleResolved,
      },
    ]);
  });
});
