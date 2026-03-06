import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AI_PATHS_RUNTIME_KERNEL_STRICT_NATIVE_REGISTRY_KEY } from '@/shared/lib/ai-paths';
import { fetchAiPathsSettingsByKeysCached } from '@/shared/lib/ai-paths/settings-store-client';

import { AiPathsCanvasView } from '../sections/AiPathsCanvasView';

let pageContextMock: Record<string, unknown> = {};
const setPathsMock = vi.fn();
const setPathConfigsMock = vi.fn();
const mockedFetchAiPathsSettingsByKeysCached = vi.mocked(fetchAiPathsSettingsByKeysCached);

vi.mock('react-dom', async () => {
  const actual = await vi.importActual<typeof import('react-dom')>('react-dom');
  return {
    ...actual,
    createPortal: (node: unknown) => node,
  };
});

vi.mock('../AiPathsSettingsPageContext', () => ({
  useAiPathsSettingsPageContext: () => pageContextMock,
}));

vi.mock('../../../context', () => ({
  useSelectionState: () => ({
    selectionToolMode: 'pan',
    selectedNodeIds: ['node-a'],
    selectedEdgeId: null,
  }),
  useSelectionActions: () => ({
    setSelectionToolMode: vi.fn(),
  }),
  useGraphActions: () => ({
    setPaths: setPathsMock,
    setPathConfigs: setPathConfigsMock,
  }),
}));

vi.mock('../../canvas-board', () => ({
  CanvasBoard: () => <div data-testid='canvas-board' />,
}));

vi.mock('../../canvas-sidebar', () => ({
  CanvasSidebar: () => <div data-testid='canvas-sidebar' />,
}));

vi.mock('../../cluster-presets-panel', () => ({
  ClusterPresetsPanel: () => null,
}));

vi.mock('../../graph-model-debug-panel', () => ({
  GraphModelDebugPanel: () => null,
}));

vi.mock('../../run-history-panel', () => ({
  RunHistoryPanel: () => null,
}));

vi.mock('../../runtime-event-log-panel', () => ({
  RuntimeEventLogPanel: () => null,
}));

vi.mock('../panels/AiPathsRuntimeAnalysis', () => ({
  AiPathsRuntimeAnalysis: () => null,
}));

vi.mock('../sections/AiPathsLiveLog', () => ({
  AiPathsLiveLog: () => null,
}));

vi.mock('@/shared/lib/ai-paths/settings-store-client', () => ({
  fetchAiPathsSettingsByKeysCached: vi.fn(async () => []),
  invalidateAiPathsSettingsCache: vi.fn(),
  updateAiPathsSettingsBulk: vi.fn(async () => undefined),
}));

describe('AiPathsCanvasView switch guard', () => {
  it('shows effective strict-native source from settings while path settings inherit', async () => {
    mockedFetchAiPathsSettingsByKeysCached.mockResolvedValueOnce([
      { key: AI_PATHS_RUNTIME_KERNEL_STRICT_NATIVE_REGISTRY_KEY, value: 'true' },
    ]);
    pageContextMock = {
      activeTab: 'canvas',
      isFocusMode: false,
      renderActions: (actions: unknown) => actions,
      confirmNodeSwitch: async () => true,
      savePathConfig: vi.fn(async () => true),
      saving: false,
      setPathSettingsModalOpen: vi.fn(),
      activePathId: 'path-main',
      nodeValidationEnabled: true,
      updateAiPathsValidation: vi.fn(),
      validationPreflightReport: {
        score: 100,
        failedRules: 0,
        blocked: false,
        shouldWarn: false,
        findings: [],
        recommendations: [],
        schemaVersion: 1,
        skippedRuleIds: [],
        moduleImpact: {},
      },
      handleOpenNodeValidator: vi.fn(),
      docsTooltipsEnabled: true,
      setDocsTooltipsEnabled: vi.fn(),
      handleTogglePathLock: vi.fn(),
      isPathLocked: false,
      handleRunNodeValidationCheck: vi.fn(),
      toast: vi.fn(),
      autoSaveLabel: '',
      autoSaveVariant: 'neutral',
      lastRunAt: null,
      isPathNameEditing: false,
      renameDraft: '',
      setRenameDraft: vi.fn(),
      commitPathNameEdit: vi.fn(),
      cancelPathNameEdit: vi.fn(),
      startPathNameEdit: vi.fn(),
      pathName: 'Path Main',
      pathSwitchOptions: [{ label: 'Path Main', value: 'path-main' }],
      handleSwitchPath: vi.fn(),
      isPathSwitching: false,
      lastError: null,
      persistLastError: vi.fn(async () => undefined),
      incrementLoadNonce: vi.fn(),
      handleClearConnectorData: vi.fn(async () => undefined),
      handleClearHistory: vi.fn(async () => undefined),
      handleDeleteSelectedNode: vi.fn(),
      isPathActive: true,
      handleTogglePathActive: vi.fn(),
      hasHistory: false,
      selectionScopeMode: 'portion',
      setSelectionScopeMode: vi.fn(),
      dataContractReport: { byNodeId: {} },
      setDataContractInspectorNodeId: vi.fn(),
      paths: [
        {
          id: 'path-main',
          name: 'Path Main',
          createdAt: '2026-03-05',
          updatedAt: '2026-03-05',
        },
      ],
      pathConfigs: {
        'path-main': {
          id: 'path-main',
          extensions: {},
        },
      },
      persistPathSettings: vi.fn(async () => undefined),
    };

    render(<AiPathsCanvasView />);

    await waitFor(() => {
      expect(screen.getAllByText('Strict Native: On (settings)').length).toBeGreaterThan(0);
    });
  });

  it('shows path strict-native-registry override above global settings (including legacy alias)', async () => {
    mockedFetchAiPathsSettingsByKeysCached.mockResolvedValueOnce([
      { key: AI_PATHS_RUNTIME_KERNEL_STRICT_NATIVE_REGISTRY_KEY, value: 'true' },
    ]);
    pageContextMock = {
      activeTab: 'canvas',
      isFocusMode: false,
      renderActions: (actions: unknown) => actions,
      confirmNodeSwitch: async () => true,
      savePathConfig: vi.fn(async () => true),
      saving: false,
      setPathSettingsModalOpen: vi.fn(),
      activePathId: 'path-main',
      nodeValidationEnabled: true,
      updateAiPathsValidation: vi.fn(),
      validationPreflightReport: {
        score: 100,
        failedRules: 0,
        blocked: false,
        shouldWarn: false,
        findings: [],
        recommendations: [],
        schemaVersion: 1,
        skippedRuleIds: [],
        moduleImpact: {},
      },
      handleOpenNodeValidator: vi.fn(),
      docsTooltipsEnabled: true,
      setDocsTooltipsEnabled: vi.fn(),
      handleTogglePathLock: vi.fn(),
      isPathLocked: false,
      handleRunNodeValidationCheck: vi.fn(),
      toast: vi.fn(),
      autoSaveLabel: '',
      autoSaveVariant: 'neutral',
      lastRunAt: null,
      isPathNameEditing: false,
      renameDraft: '',
      setRenameDraft: vi.fn(),
      commitPathNameEdit: vi.fn(),
      cancelPathNameEdit: vi.fn(),
      startPathNameEdit: vi.fn(),
      pathName: 'Path Main',
      pathSwitchOptions: [{ label: 'Path Main', value: 'path-main' }],
      handleSwitchPath: vi.fn(),
      isPathSwitching: false,
      lastError: null,
      persistLastError: vi.fn(async () => undefined),
      incrementLoadNonce: vi.fn(),
      handleClearConnectorData: vi.fn(async () => undefined),
      handleClearHistory: vi.fn(async () => undefined),
      handleDeleteSelectedNode: vi.fn(),
      isPathActive: true,
      handleTogglePathActive: vi.fn(),
      hasHistory: false,
      selectionScopeMode: 'portion',
      setSelectionScopeMode: vi.fn(),
      dataContractReport: { byNodeId: {} },
      setDataContractInspectorNodeId: vi.fn(),
      paths: [
        {
          id: 'path-main',
          name: 'Path Main',
          createdAt: '2026-03-05',
          updatedAt: '2026-03-05',
        },
      ],
      pathConfigs: {
        'path-main': {
          id: 'path-main',
          extensions: {
            runtimeKernel: {
              strictCodeObjectRegistry: false,
            },
          },
        },
      },
      persistPathSettings: vi.fn(async () => undefined),
    };

    render(<AiPathsCanvasView />);

    await waitFor(() => {
      expect(screen.getByText('Strict Native: On (settings)')).toBeInTheDocument();
      expect(screen.getByText('Strict Native: Off (path)')).toBeInTheDocument();
    });
  });

  it('disables delete while path switching and shows switching status', async () => {
    pageContextMock = {
      activeTab: 'canvas',
      isFocusMode: false,
      renderActions: (actions: unknown) => actions,
      confirmNodeSwitch: async () => true,
      savePathConfig: vi.fn(async () => true),
      saving: false,
      setPathSettingsModalOpen: vi.fn(),
      activePathId: 'path-main',
      nodeValidationEnabled: true,
      updateAiPathsValidation: vi.fn(),
      validationPreflightReport: {
        score: 100,
        failedRules: 0,
        blocked: false,
        shouldWarn: false,
        findings: [],
        recommendations: [],
        schemaVersion: 1,
        skippedRuleIds: [],
        moduleImpact: {},
      },
      handleOpenNodeValidator: vi.fn(),
      docsTooltipsEnabled: true,
      setDocsTooltipsEnabled: vi.fn(),
      handleTogglePathLock: vi.fn(),
      isPathLocked: false,
      handleRunNodeValidationCheck: vi.fn(),
      toast: vi.fn(),
      autoSaveLabel: '',
      autoSaveVariant: 'neutral',
      lastRunAt: null,
      isPathNameEditing: false,
      renameDraft: '',
      setRenameDraft: vi.fn(),
      commitPathNameEdit: vi.fn(),
      cancelPathNameEdit: vi.fn(),
      startPathNameEdit: vi.fn(),
      pathName: 'Path Main',
      pathSwitchOptions: [{ label: 'Path Main', value: 'path-main' }],
      handleSwitchPath: vi.fn(),
      isPathSwitching: true,
      lastError: null,
      persistLastError: vi.fn(async () => undefined),
      incrementLoadNonce: vi.fn(),
      handleClearConnectorData: vi.fn(async () => undefined),
      handleClearHistory: vi.fn(async () => undefined),
      handleDeleteSelectedNode: vi.fn(),
      isPathActive: true,
      handleTogglePathActive: vi.fn(),
      hasHistory: false,
      selectionScopeMode: 'portion',
      setSelectionScopeMode: vi.fn(),
      dataContractReport: { byNodeId: {} },
      setDataContractInspectorNodeId: vi.fn(),
      paths: [
        { id: 'path-main', name: 'Path Main', createdAt: '2026-03-05', updatedAt: '2026-03-05' },
      ],
      pathConfigs: { 'path-main': { id: 'path-main', extensions: {} } },
      persistPathSettings: vi.fn(async () => undefined),
    };

    render(<AiPathsCanvasView />);
    await waitFor(() => {
      expect(screen.getByText('Runtime Kernel Global')).toBeInTheDocument();
    });

    expect(screen.getByText('Switching path...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remove Selected' })).toBeDisabled();
  });

  it('persists path runtime-kernel config through path settings', async () => {
    const persistPathSettingsMock = vi.fn(async () => undefined);
    pageContextMock = {
      activeTab: 'canvas',
      isFocusMode: false,
      renderActions: (actions: unknown) => actions,
      confirmNodeSwitch: async () => true,
      savePathConfig: vi.fn(async () => true),
      saving: false,
      setPathSettingsModalOpen: vi.fn(),
      activePathId: 'path-main',
      nodeValidationEnabled: true,
      updateAiPathsValidation: vi.fn(),
      validationPreflightReport: {
        score: 100,
        failedRules: 0,
        blocked: false,
        shouldWarn: false,
        findings: [],
        recommendations: [],
        schemaVersion: 1,
        skippedRuleIds: [],
        moduleImpact: {},
      },
      handleOpenNodeValidator: vi.fn(),
      docsTooltipsEnabled: true,
      setDocsTooltipsEnabled: vi.fn(),
      handleTogglePathLock: vi.fn(),
      isPathLocked: false,
      handleRunNodeValidationCheck: vi.fn(),
      toast: vi.fn(),
      autoSaveLabel: '',
      autoSaveVariant: 'neutral',
      lastRunAt: null,
      isPathNameEditing: false,
      renameDraft: '',
      setRenameDraft: vi.fn(),
      commitPathNameEdit: vi.fn(),
      cancelPathNameEdit: vi.fn(),
      startPathNameEdit: vi.fn(),
      pathName: 'Path Main',
      pathSwitchOptions: [{ label: 'Path Main', value: 'path-main' }],
      handleSwitchPath: vi.fn(),
      isPathSwitching: false,
      lastError: null,
      persistLastError: vi.fn(async () => undefined),
      incrementLoadNonce: vi.fn(),
      handleClearConnectorData: vi.fn(async () => undefined),
      handleClearHistory: vi.fn(async () => undefined),
      handleDeleteSelectedNode: vi.fn(),
      isPathActive: true,
      handleTogglePathActive: vi.fn(),
      hasHistory: false,
      selectionScopeMode: 'portion',
      setSelectionScopeMode: vi.fn(),
      dataContractReport: { byNodeId: {} },
      setDataContractInspectorNodeId: vi.fn(),
      paths: [
        { id: 'path-main', name: 'Path Main', createdAt: '2026-03-05', updatedAt: '2026-03-05' },
      ],
      pathConfigs: {
        'path-main': {
          id: 'path-main',
          name: 'Path Main',
          description: '',
          trigger: 'manual',
          version: 1,
          updatedAt: '2026-03-05T10:00:00.000Z',
          nodes: [],
          edges: [],
          extensions: {
            runtimeKernel: {
              strictNativeRegistry: true,
            },
          },
        },
      },
      persistPathSettings: persistPathSettingsMock,
    };

    render(<AiPathsCanvasView />);

    fireEvent.change(screen.getByPlaceholderText('path kernel nodes: template, parser'), {
      target: { value: 'template, parser' },
    });
    fireEvent.change(screen.getByPlaceholderText('path resolvers: resolver.path'), {
      target: { value: 'resolver.path' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Apply to Path' }));

    await waitFor(() => {
      expect(persistPathSettingsMock).toHaveBeenCalledTimes(1);
    });
    const config = persistPathSettingsMock.mock.calls[0]?.[2] as Record<string, unknown>;
    const extensions = config?.['extensions'] as Record<string, unknown> | undefined;
    const runtimeKernel = extensions?.['runtimeKernel'] as Record<string, unknown> | undefined;
    expect(runtimeKernel).toEqual({
      nodeTypes: ['template', 'parser'],
      codeObjectResolverIds: ['resolver.path'],
      strictNativeRegistry: true,
    });
  });
});
