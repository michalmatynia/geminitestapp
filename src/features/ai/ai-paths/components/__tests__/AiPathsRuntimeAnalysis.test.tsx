import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  useAiPathRuntimeAnalyticsMock,
  useRuntimeStatusStateMock,
  useGraphDataStateMock,
  usePathMetadataStateMock,
  useAiPathsErrorStateMock,
  useRunHistoryActionsMock,
  useBrainAssignmentMock,
  useBrainModelOptionsMock,
  toastMock,
} = vi.hoisted(() => ({
  useAiPathRuntimeAnalyticsMock: vi.fn(),
  useRuntimeStatusStateMock: vi.fn(),
  useGraphDataStateMock: vi.fn(),
  usePathMetadataStateMock: vi.fn(),
  useAiPathsErrorStateMock: vi.fn(),
  useRunHistoryActionsMock: vi.fn(),
  useBrainAssignmentMock: vi.fn(),
  useBrainModelOptionsMock: vi.fn(),
  toastMock: vi.fn(),
}));

vi.mock('@/shared/lib/ai-paths/hooks/useAiPathQueries', () => ({
  useAiPathRuntimeAnalytics: useAiPathRuntimeAnalyticsMock,
}));

vi.mock('@/features/ai/ai-paths/context', () => ({
  useRunHistoryActions: useRunHistoryActionsMock,
  useRuntimeStatusState: useRuntimeStatusStateMock,
  useGraphDataState: useGraphDataStateMock,
  usePathMetadataState: usePathMetadataStateMock,
}));

vi.mock(
  '@/features/ai/ai-paths/components/ai-paths-settings/hooks/useAiPathsErrorState',
  () => ({
    useAiPathsErrorState: useAiPathsErrorStateMock,
  })
);

vi.mock('@/shared/lib/ai-brain/hooks/useBrainAssignment', () => ({
  useBrainAssignment: useBrainAssignmentMock,
}));

vi.mock('@/shared/lib/ai-brain/hooks/useBrainModelOptions', () => ({
  useBrainModelOptions: useBrainModelOptionsMock,
}));

vi.mock('@/shared/ui/primitives.public', async () => {
  const actual = await vi.importActual<typeof import('@/shared/ui')>('@/shared/ui');
  return {
    ...actual,
    useToast: () => ({ toast: toastMock }),
  };
});

import { AiPathsRuntimeAnalysis } from '@/features/ai/ai-paths/components/ai-paths-settings/panels/AiPathsRuntimeAnalysis';
import { expectNoAxeViolations } from '@/testing/accessibility/axe';

describe('AiPathsRuntimeAnalysis', () => {
  beforeEach(() => {
    useBrainModelOptionsMock.mockReturnValue({
      models: [],
      descriptors: {},
      isLoading: false,
      assignment: { enabled: true },
      effectiveModelId: '',
      sourceWarnings: [],
      refresh: vi.fn(),
    });
  });

  it('has no obvious accessibility violations in the disabled analytics state', async () => {
    useRuntimeStatusStateMock.mockReturnValue({ runtimeRunStatus: 'idle', runtimeNodeStatuses: {} });
    useGraphDataStateMock.mockReturnValue({ nodes: [] });
    usePathMetadataStateMock.mockReturnValue({ activePathId: null });
    useAiPathsErrorStateMock.mockReturnValue({ reportAiPathsError: vi.fn() });
    useRunHistoryActionsMock.mockReturnValue({
      setRunHistoryNodeId: vi.fn(),
      setRunFilter: vi.fn(),
      openRunDetail: vi.fn(),
    });
    useBrainAssignmentMock.mockImplementation(
      ({ capability }: { capability?: 'insights.runtime_analytics' | 'ai_paths.model' }) => ({
        assignment: {
          enabled: capability === 'ai_paths.model',
        },
        effectiveModelId: '',
      })
    );
    useAiPathRuntimeAnalyticsMock.mockReturnValue({
      data: undefined,
      isFetching: false,
      refetch: vi.fn(),
    });

    const { container } = render(<AiPathsRuntimeAnalysis />);

    await expectNoAxeViolations(container);
  });

  it('shows a disabled state and does not enable the runtime analytics query when the capability is off', () => {
    useRuntimeStatusStateMock.mockReturnValue({ runtimeRunStatus: 'idle', runtimeNodeStatuses: {} });
    useGraphDataStateMock.mockReturnValue({ nodes: [] });
    usePathMetadataStateMock.mockReturnValue({ activePathId: null });
    useAiPathsErrorStateMock.mockReturnValue({ reportAiPathsError: vi.fn() });
    useRunHistoryActionsMock.mockReturnValue({
      setRunHistoryNodeId: vi.fn(),
      setRunFilter: vi.fn(),
      openRunDetail: vi.fn(),
    });
    useBrainAssignmentMock.mockImplementation(
      ({ capability }: { capability?: 'insights.runtime_analytics' | 'ai_paths.model' }) => ({
        assignment: {
          enabled: capability === 'ai_paths.model',
        },
        effectiveModelId: '',
      })
    );
    useAiPathRuntimeAnalyticsMock.mockReturnValue({
      data: undefined,
      isFetching: false,
      refetch: vi.fn(),
    });

    render(<AiPathsRuntimeAnalysis />);

    expect(useAiPathRuntimeAnalyticsMock).toHaveBeenCalledWith('24h', false);
    expect(screen.getByText(/Runtime analytics is disabled in AI Brain/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Disabled' })).toBeDisabled();
  });

  it('supports keyboard focus and enter activation on refresh when runtime analytics is enabled', async () => {
    const user = userEvent.setup();
    const refetchMock = vi.fn().mockResolvedValue(undefined);

    useRuntimeStatusStateMock.mockReturnValue({ runtimeRunStatus: 'idle', runtimeNodeStatuses: {} });
    useGraphDataStateMock.mockReturnValue({ nodes: [] });
    usePathMetadataStateMock.mockReturnValue({ activePathId: null });
    useAiPathsErrorStateMock.mockReturnValue({ reportAiPathsError: vi.fn() });
    useRunHistoryActionsMock.mockReturnValue({
      setRunHistoryNodeId: vi.fn(),
      setRunFilter: vi.fn(),
      openRunDetail: vi.fn(),
    });
    useBrainAssignmentMock.mockImplementation(() => ({
      assignment: {
        enabled: true,
      },
      effectiveModelId: '',
    }));
    useAiPathRuntimeAnalyticsMock.mockReturnValue({
      data: {
        storage: 'redis',
        runs: {
          total: 4,
          successRate: 100,
          avgDurationMs: 120,
          p95DurationMs: 240,
        },
        traces: {
          sampledRuns: 1,
          sampledSpans: 1,
          avgDurationMs: 50,
          p95DurationMs: 50,
          slowestSpan: null,
          topSlowNodes: [],
          topFailedNodes: [],
          kernelParity: {
            sampledRuns: 1,
            runsWithKernelParity: 1,
            sampledHistoryEntries: 2,
            strategyCounts: {
              code_object_v3: 1,
              unknown: 1,
            },
            resolutionSourceCounts: {
              override: 1,
              registry: 1,
              missing: 0,
              unknown: 0,
            },
            codeObjectIds: [],
          },
        },
      },
      isFetching: false,
      refetch: refetchMock,
    });

    render(<AiPathsRuntimeAnalysis />);

    expect(useAiPathRuntimeAnalyticsMock).toHaveBeenCalledWith('24h', true);
    const refreshButton = screen.getByRole('button', { name: 'Refresh' });
    await user.tab();
    expect(refreshButton).toHaveFocus();
    await user.keyboard('{Enter}');
    expect(refetchMock).toHaveBeenCalledTimes(1);
  });

  it('renders portable engine analytics details when provided by runtime summary', () => {
    useRuntimeStatusStateMock.mockReturnValue({ runtimeRunStatus: 'running', runtimeNodeStatuses: {} });
    useGraphDataStateMock.mockReturnValue({ nodes: [] });
    usePathMetadataStateMock.mockReturnValue({ activePathId: null });
    useAiPathsErrorStateMock.mockReturnValue({ reportAiPathsError: vi.fn() });
    useRunHistoryActionsMock.mockReturnValue({
      setRunHistoryNodeId: vi.fn(),
      setRunFilter: vi.fn(),
      openRunDetail: vi.fn(),
    });
    useBrainAssignmentMock.mockImplementation(() => ({
      assignment: {
        enabled: true,
      },
      effectiveModelId: '',
    }));
    useAiPathRuntimeAnalyticsMock.mockReturnValue({
      data: {
        storage: 'redis',
        runs: {
          total: 12,
          successRate: 75,
          avgDurationMs: 100,
          p95DurationMs: 200,
        },
        traces: {
          sampledRuns: 2,
          sampledSpans: 8,
          avgDurationMs: 60,
          p95DurationMs: 90,
          slowestSpan: null,
          topSlowNodes: [],
          topFailedNodes: [],
          kernelParity: {
            sampledRuns: 2,
            runsWithKernelParity: 2,
            sampledHistoryEntries: 5,
            strategyCounts: {
              code_object_v3: 3,
              unknown: 2,
            },
            resolutionSourceCounts: {
              override: 3,
              registry: 2,
              missing: 0,
              unknown: 0,
            },
            codeObjectIds: [
              'ai-paths.node-code-object.constant.v3',
              'ai-paths.node-code-object.template.v3',
            ],
          },
        },
        portableEngine: {
          source: 'in_memory',
          totals: {
            attempts: 12,
            successes: 9,
            failures: 3,
            successRate: 75,
            failureRate: 25,
          },
          byRunner: {
            client: { attempts: 7, successes: 6, failures: 1 },
            server: { attempts: 5, successes: 3, failures: 2 },
          },
          bySurface: {
            canvas: { attempts: 4, successes: 3, failures: 1 },
            product: { attempts: 5, successes: 4, failures: 1 },
            api: { attempts: 3, successes: 2, failures: 1 },
          },
          byInputSource: {
            portable_package: { attempts: 2, successes: 2, failures: 0 },
            portable_envelope: { attempts: 1, successes: 0, failures: 1 },
            semantic_canvas: { attempts: 3, successes: 3, failures: 0 },
            path_config: { attempts: 6, successes: 4, failures: 2 },
          },
          failureStageCounts: {
            resolve: 1,
            validation: 1,
            runtime: 1,
          },
          recentFailures: [
            {
              at: '2026-03-05T11:00:00.000Z',
              runner: 'client',
              surface: 'canvas',
              source: 'path_config',
              stage: 'runtime',
              error: 'runtime failed',
              durationMs: 321,
              validateBeforeRun: true,
              validationMode: 'strict',
            },
          ],
        },
      },
      isFetching: false,
      refetch: vi.fn(),
    });

    render(<AiPathsRuntimeAnalysis />);

    expect(screen.getByText('Portable Engine (24h)')).toBeInTheDocument();
    expect(screen.getByText('in_memory')).toBeInTheDocument();
    expect(screen.getByText(/Attempts 12/i)).toBeInTheDocument();
    expect(screen.getByText(/Failures 3 \(R 1 · V 1 · RT 1\)/i)).toBeInTheDocument();
    expect(screen.getByText(/Latest client runtime · canvas/i)).toBeInTheDocument();
    expect(screen.getByText('Kernel coverage (24h)')).toBeInTheDocument();
    expect(screen.getByText(/Coverage 2\/2 \(100.0%\)/i)).toBeInTheDocument();
    expect(screen.getByText(/History entries 5/i)).toBeInTheDocument();
    expect(screen.getByText(/Resolution O\/R\/M\/U: 3\/2\/0\/0/i)).toBeInTheDocument();
    expect(screen.getByText('ai-paths.node-code-object.constant.v3')).toBeInTheDocument();
  });

  it('surfaces AI Brain model capability issues for vision-enabled nodes before run time', () => {
    useRuntimeStatusStateMock.mockReturnValue({ runtimeRunStatus: 'idle', runtimeNodeStatuses: {} });
    useGraphDataStateMock.mockReturnValue({
      nodes: [
        {
          id: 'node-model',
          type: 'model',
          title: 'Normalize Model',
          description: '',
          inputs: [],
          outputs: [],
          position: { x: 0, y: 0 },
          data: {},
          config: {
            model: {
              vision: true,
              temperature: 0.2,
              maxTokens: 500,
              waitForResult: true,
            },
          },
        },
      ],
    });
    usePathMetadataStateMock.mockReturnValue({
      activePathId: 'path-normalize',
    });
    useAiPathsErrorStateMock.mockReturnValue({ reportAiPathsError: vi.fn() });
    useRunHistoryActionsMock.mockReturnValue({
      setRunHistoryNodeId: vi.fn(),
      setRunFilter: vi.fn(),
      openRunDetail: vi.fn(),
    });
    useBrainAssignmentMock.mockImplementation(() => ({
      assignment: {
        enabled: true,
      },
      effectiveModelId: '',
    }));
    useBrainModelOptionsMock.mockReturnValue({
      models: ['brain-default-text'],
      descriptors: {
        'brain-default-text': {
          id: 'brain-default-text',
          modality: 'text',
        },
      },
      isLoading: false,
      assignment: { enabled: true },
      effectiveModelId: 'brain-default-text',
      sourceWarnings: [],
      refresh: vi.fn(),
    });
    useAiPathRuntimeAnalyticsMock.mockReturnValue({
      data: undefined,
      isFetching: false,
      refetch: vi.fn(),
    });

    render(<AiPathsRuntimeAnalysis />);

    expect(screen.getByText('Model Capability')).toBeInTheDocument();
    expect(screen.getByText(/1 node will be blocked by AI Brain preflight/i)).toBeInTheDocument();
    expect(screen.getByText(/Normalize Model/)).toBeInTheDocument();
    expect(screen.getByText(/brain-default-text/)).toBeInTheDocument();
    expect(screen.getByText(/Accepts Images enabled/i)).toBeInTheDocument();
  });
});
