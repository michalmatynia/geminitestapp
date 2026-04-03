import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  AI_PATHS_RUNTIME_KERNEL_CODE_OBJECT_RESOLVER_IDS_KEY,
  AI_PATHS_RUNTIME_KERNEL_NODE_TYPES_KEY,
} from '@/shared/lib/ai-paths';
import {
  DEPRECATED_RUNTIME_KERNEL_CONFIG_NODE_TYPES_FIELD,
  DEPRECATED_RUNTIME_KERNEL_CONFIG_RESOLVER_IDS_FIELD,
  DEPRECATED_RUNTIME_KERNEL_CONFIG_STRICT_ALIAS_FIELD,
  DEPRECATED_RUNTIME_KERNEL_CONFIG_STRICT_NATIVE_FIELD,
} from '@/shared/lib/ai-paths/core/runtime/runtime-kernel-legacy-aliases';
import { fetchAiPathsSettingsByKeysCached } from '@/shared/lib/ai-paths/settings-store-client';

import { AiPathsCanvasView } from '../sections/AiPathsCanvasView';
import {
  buildCanvasPageContext,
  buildCanvasPathDraft,
  buildCanvasPersistedPathConfig,
} from './AiPathsCanvasView.switching-delete-guard.test-helpers';

let pageContextMock: Record<string, unknown> = {};
const setPathsMock = vi.fn();
const setPathConfigsMock = vi.fn();
const routerPushMock = vi.fn();
const mockedFetchAiPathsSettingsByKeysCached = vi.mocked(fetchAiPathsSettingsByKeysCached);
const graphActionsMock = {
  setPaths: setPathsMock,
  setPathConfigs: setPathConfigsMock,
};

vi.mock('next/navigation', () => ({
  usePathname: () => '/admin/ai-paths',
  useRouter: () => ({
    push: routerPushMock,
  }),
}));

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

vi.mock('@/features/ai/ai-paths/context', () => ({
  useSelectionState: () => ({
    selectionToolMode: 'pan',
    selectedNodeIds: ['node-a'],
    selectedEdgeId: null,
  }),
  useSelectionActions: () => ({
    setSelectionToolMode: vi.fn(),
  }),
  useGraphActions: () => graphActionsMock,
}));

vi.mock('../../canvas-board', () => ({
  CanvasBoard: () => <div data-testid='canvas-board' />,
}));

vi.mock('../../canvas-sidebar', () => ({
  CanvasSidebar: () => <div data-testid='canvas-sidebar' />,
}));

vi.mock('../../cluster-presets-panel', () => ({
  ClusterPresetsPanel: () => <div data-testid='cluster-presets-panel' />,
}));

vi.mock('../../graph-model-debug-panel', () => ({
  GraphModelDebugPanel: () => <div data-testid='graph-model-debug-panel' />,
}));

vi.mock('../../run-history-panel', () => ({
  RunHistoryPanel: () => <div data-testid='run-history-panel' />,
}));

vi.mock('../../runtime-event-log-panel', () => ({
  RuntimeEventLogPanel: () => <div data-testid='runtime-event-log-panel' />,
}));

vi.mock('../panels/AiPathsRuntimeAnalysis', () => ({
  AiPathsRuntimeAnalysis: () => <div data-testid='runtime-analysis-panel' />,
}));

vi.mock('../sections/AiPathsLiveLog', () => ({
  AiPathsLiveLog: () => <div data-testid='live-log-panel' />,
}));

vi.mock('@/shared/lib/ai-paths/settings-store-client', () => ({
  fetchAiPathsSettingsByKeysCached: vi.fn(async () => []),
  invalidateAiPathsSettingsCache: vi.fn(),
  updateAiPathsSettingsBulk: vi.fn(async () => undefined),
}));

describe('AiPathsCanvasView switch guard', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('loads canonical runtime-kernel controls without strict-native compatibility settings', async () => {
    mockedFetchAiPathsSettingsByKeysCached.mockResolvedValueOnce([]);
    pageContextMock = buildCanvasPageContext();

    render(<AiPathsCanvasView />);

    await waitFor(() => {
      expect(screen.getAllByText('Strict Native: On (fixed)').length).toBeGreaterThan(0);
    });
    expect(mockedFetchAiPathsSettingsByKeysCached).toHaveBeenCalledWith(
      [
        AI_PATHS_RUNTIME_KERNEL_NODE_TYPES_KEY,
        AI_PATHS_RUNTIME_KERNEL_CODE_OBJECT_RESOLVER_IDS_KEY,
      ],
      { timeoutMs: 8_000 }
    );
  });

  it('keeps fixed strict-native badges even when stale path compatibility fields are present', async () => {
    mockedFetchAiPathsSettingsByKeysCached.mockResolvedValueOnce([]);
    pageContextMock = buildCanvasPageContext({
      pathConfigs: {
        'path-main': buildCanvasPathDraft({
          extensions: {
            runtimeKernel: {
              [DEPRECATED_RUNTIME_KERNEL_CONFIG_STRICT_ALIAS_FIELD]: false,
            },
          },
        }),
      },
    });

    render(<AiPathsCanvasView />);

    await waitFor(() => {
      expect(screen.getAllByText('Strict Native: On (fixed)').length).toBe(2);
    });
  });

  it('ignores stale path runtime-kernel alias fields when loading path drafts', async () => {
    mockedFetchAiPathsSettingsByKeysCached.mockResolvedValueOnce([]);
    pageContextMock = buildCanvasPageContext({
      pathConfigs: {
        'path-main': buildCanvasPathDraft({
          extensions: {
            runtimeKernel: {
              [DEPRECATED_RUNTIME_KERNEL_CONFIG_NODE_TYPES_FIELD]: ['template'],
              [DEPRECATED_RUNTIME_KERNEL_CONFIG_RESOLVER_IDS_FIELD]: ['resolver.path'],
              [DEPRECATED_RUNTIME_KERNEL_CONFIG_STRICT_ALIAS_FIELD]: true,
            },
          },
        }),
      },
    });

    render(<AiPathsCanvasView />);

    await waitFor(() => {
      expect(screen.getByText('Runtime Kernel Path')).toBeInTheDocument();
    });
    expect(screen.getByPlaceholderText('path kernel nodes: template, parser')).toHaveValue('');
    expect(screen.getByPlaceholderText('path resolvers: resolver.path')).toHaveValue('');
  });

  it('disables delete while path switching and shows switching status', async () => {
    pageContextMock = buildCanvasPageContext({
      isPathSwitching: true,
    });

    render(<AiPathsCanvasView />);
    await waitFor(() => {
      expect(screen.getByText('Runtime Kernel Global')).toBeInTheDocument();
    });

    expect(screen.getByText('Switching path...')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Remove Selected' })).toBeDisabled();
  });

  it('persists path runtime-kernel config through path settings', async () => {
    const persistPathSettingsMock = vi.fn(async () => undefined);
    pageContextMock = buildCanvasPageContext({
      pathConfigs: {
        'path-main': buildCanvasPersistedPathConfig({
          extensions: {
            runtimeKernel: {
              [DEPRECATED_RUNTIME_KERNEL_CONFIG_STRICT_NATIVE_FIELD]: true,
            },
          },
        }),
      },
      persistPathSettings: persistPathSettingsMock,
    });

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
    });
  });

  it('defers secondary sidebar and diagnostics panels until after the idle bootstrap', async () => {
    vi.useFakeTimers();
    mockedFetchAiPathsSettingsByKeysCached.mockResolvedValueOnce([]);
    pageContextMock = buildCanvasPageContext({
      palette: [],
    });

    render(<AiPathsCanvasView />);

    expect(screen.getByTestId('canvas-board')).toBeInTheDocument();
    expect(screen.getByTestId('canvas-sidebar')).toBeInTheDocument();
    expect(screen.queryByTestId('cluster-presets-panel')).not.toBeInTheDocument();
    expect(screen.queryByTestId('runtime-event-log-panel')).not.toBeInTheDocument();
    expect(screen.queryByTestId('runtime-analysis-panel')).not.toBeInTheDocument();

    await act(async () => {
      await vi.advanceTimersByTimeAsync(1);
    });

    expect(screen.getByTestId('cluster-presets-panel')).toBeInTheDocument();
    expect(screen.getByTestId('graph-model-debug-panel')).toBeInTheDocument();
    expect(screen.getByTestId('run-history-panel')).toBeInTheDocument();
    expect(screen.getByTestId('runtime-event-log-panel')).toBeInTheDocument();
    expect(screen.getByTestId('runtime-analysis-panel')).toBeInTheDocument();
    expect(screen.getByTestId('live-log-panel')).toBeInTheDocument();
  });
});
