import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { AiPathsCanvasView } from '../sections/AiPathsCanvasView';

let pageContextMock: Record<string, unknown> = {};

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

vi.mock('../sections/AiPathsRuntimeAnalysis', () => ({
  AiPathsRuntimeAnalysis: () => null,
}));

vi.mock('../sections/AiPathsLiveLog', () => ({
  AiPathsLiveLog: () => null,
}));

describe('AiPathsCanvasView switch guard', () => {
  it('disables delete while path switching and shows switching status', () => {
    pageContextMock = {
      activeTab: 'canvas',
      isFocusMode: false,
      renderActions: (actions: unknown) => actions,
      confirmNodeSwitch: async () => true,
      nodeConfigDirty: false,
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
      setLastError: vi.fn(),
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
    };

    render(<AiPathsCanvasView />);

    expect(screen.getByText('Switching path...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remove Selected' })).toBeDisabled();
  });
});

