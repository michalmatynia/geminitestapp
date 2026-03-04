import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

const {
  useAiPathRuntimeAnalyticsMock,
  useAiPathsSettingsOrchestratorMock,
  useRunHistoryActionsMock,
  useBrainAssignmentMock,
  toastMock,
} = vi.hoisted(() => ({
  useAiPathRuntimeAnalyticsMock: vi.fn(),
  useAiPathsSettingsOrchestratorMock: vi.fn(),
  useRunHistoryActionsMock: vi.fn(),
  useBrainAssignmentMock: vi.fn(),
  toastMock: vi.fn(),
}));

vi.mock('@/shared/lib/ai-paths/hooks/useAiPathQueries', () => ({
  useAiPathRuntimeAnalytics: useAiPathRuntimeAnalyticsMock,
}));

vi.mock(
  '@/features/ai/ai-paths/components/ai-paths-settings/AiPathsSettingsOrchestratorContext',
  () => ({
    useAiPathsSettingsOrchestrator: useAiPathsSettingsOrchestratorMock,
  })
);

vi.mock('@/features/ai/ai-paths/context', () => ({
  useRunHistoryActions: useRunHistoryActionsMock,
}));

vi.mock('@/shared/lib/ai-brain/hooks/useBrainAssignment', () => ({
  useBrainAssignment: useBrainAssignmentMock,
}));

vi.mock('@/shared/ui', async () => {
  const actual = await vi.importActual<typeof import('@/shared/ui')>('@/shared/ui');
  return {
    ...actual,
    useToast: () => ({ toast: toastMock }),
  };
});

import { AiPathsRuntimeAnalysis } from '@/features/ai/ai-paths/components/ai-paths-settings/panels/AiPathsRuntimeAnalysis';

describe('AiPathsRuntimeAnalysis', () => {
  it('shows a disabled state and does not enable the runtime analytics query when the capability is off', () => {
    useAiPathsSettingsOrchestratorMock.mockReturnValue({
      runtimeRunStatus: 'idle',
      runtimeNodeStatuses: {},
      activePathId: null,
      nodes: [],
      reportAiPathsError: vi.fn(),
    });
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
});
