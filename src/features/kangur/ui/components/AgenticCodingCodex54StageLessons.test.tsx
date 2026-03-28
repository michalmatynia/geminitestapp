/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/features/kangur/ui/context/KangurAuthContext', () => ({
  useKangurAuth: () => ({
    isAuthenticated: true,
    user: { actorType: 'learner', ownerUserId: 'parent-1' },
  }),
}));

vi.mock('@/features/kangur/ui/hooks/useKangurLessonPanelProgress', () => ({
  useKangurLessonPanelProgress: () => ({
    markSectionOpened: vi.fn(),
    markSectionViewedCount: vi.fn(),
    recordPanelTime: vi.fn(),
    sectionProgress: {},
  }),
}));

vi.mock('@/features/kangur/ui/hooks/useKangurMobileBreakpoint', () => ({
  useKangurMobileBreakpoint: () => false,
}));

vi.mock('@/features/kangur/ui/learner-activity/hooks', async (importOriginal) => {
  const actual =
    await importOriginal<typeof import('@/features/kangur/ui/learner-activity/hooks')>();
  return {
    ...actual,
    useLessonTimeTracking: () => ({
      recordComplete: vi.fn(async () => undefined),
      recordPanelTime: vi.fn(),
    }),
  };
});

vi.mock('@/features/kangur/ui/components/AgenticPromptTrimGame', () => ({
  __esModule: true,
  default: ({ onFinish }: { onFinish: () => void }): React.JSX.Element => (
    <div data-testid='mock-agentic-prompt-trim-game'>
      <button type='button' onClick={onFinish}>
        Finish prompt trim game
      </button>
    </div>
  ),
}));

vi.mock('@/features/kangur/ui/components/AgenticApprovalGateGame', () => ({
  __esModule: true,
  default: ({ onFinish }: { onFinish: () => void }): React.JSX.Element => (
    <div data-testid='mock-agentic-approval-gate-game'>
      <button type='button' onClick={onFinish}>
        Finish approval gate game
      </button>
    </div>
  ),
}));

vi.mock('@/features/kangur/ui/components/AgenticReasoningRouterGame', () => ({
  __esModule: true,
  default: ({ onFinish }: { onFinish: () => void }): React.JSX.Element => (
    <div data-testid='mock-agentic-reasoning-router-game'>
      <button type='button' onClick={onFinish}>
        Finish reasoning router game
      </button>
    </div>
  ),
}));

vi.mock('@/features/kangur/ui/components/AgenticSurfaceMatchGame', () => ({
  __esModule: true,
  default: ({ onFinish }: { onFinish: () => void }): React.JSX.Element => (
    <div data-testid='mock-agentic-surface-match-game'>
      <button type='button' onClick={onFinish}>
        Finish surface match game
      </button>
    </div>
  ),
}));

vi.mock('@/features/kangur/ui/components/KangurLaunchableGameInstanceRuntime', () => ({
  __esModule: true,
  default: ({
    gameId,
    onFinish,
  }: {
    gameId: string;
    onFinish: () => void;
  }): React.JSX.Element => {
    const config: Record<
      string,
      { testId: string; finishButtonLabel: string }
    > = {
      agentic_prompt_trim_stage: {
        testId: 'mock-agentic-prompt-trim-game',
        finishButtonLabel: 'Finish prompt trim game',
      },
      agentic_approval_gate: {
        testId: 'mock-agentic-approval-gate-game',
        finishButtonLabel: 'Finish approval gate game',
      },
      agentic_reasoning_router: {
        testId: 'mock-agentic-reasoning-router-game',
        finishButtonLabel: 'Finish reasoning router game',
      },
      agentic_surface_match: {
        testId: 'mock-agentic-surface-match-game',
        finishButtonLabel: 'Finish surface match game',
      },
    };
    const entry = config[gameId];
    return (
      <div data-testid={entry?.testId ?? `mock-${gameId}`}>
        <button type='button' onClick={onFinish}>
          {entry?.finishButtonLabel ?? `Finish ${gameId}`}
        </button>
      </div>
    );
  },
}));

import AgenticCodingCodex54ApprovalsLesson from '@/features/kangur/ui/components/AgenticCodingCodex54ApprovalsLesson';
import AgenticCodingCodex54ModelsLesson from '@/features/kangur/ui/components/AgenticCodingCodex54ModelsLesson';
import AgenticCodingCodex54PromptingLesson from '@/features/kangur/ui/components/AgenticCodingCodex54PromptingLesson';
import AgenticCodingCodex54SurfacesLesson from '@/features/kangur/ui/components/AgenticCodingCodex54SurfacesLesson';
import { KangurLessonNavigationProvider } from '@/features/kangur/ui/context/KangurLessonNavigationContext';

describe('AgenticCodingCodex54 stage lessons', () => {
  it.each([
    {
      title: 'Prompt Trim Game',
      Component: AgenticCodingCodex54PromptingLesson,
      hubSectionTestId: 'lesson-hub-section-prompt_trim_game',
      shellTestId: 'agentic-prompt-trim-game-shell',
      mockTestId: 'mock-agentic-prompt-trim-game',
      finishButtonLabel: 'Finish prompt trim game',
    },
    {
      title: 'Approval Gate',
      Component: AgenticCodingCodex54ApprovalsLesson,
      hubSectionTestId: 'lesson-hub-section-approval_gate_game',
      shellTestId: 'agentic-approval-gate-game-shell',
      mockTestId: 'mock-agentic-approval-gate-game',
      finishButtonLabel: 'Finish approval gate game',
    },
    {
      title: 'Reasoning Router',
      Component: AgenticCodingCodex54ModelsLesson,
      hubSectionTestId: 'lesson-hub-section-reasoning_router_game',
      shellTestId: 'agentic-reasoning-router-game-shell',
      mockTestId: 'mock-agentic-reasoning-router-game',
      finishButtonLabel: 'Finish reasoning router game',
    },
    {
      title: 'Surface Match',
      Component: AgenticCodingCodex54SurfacesLesson,
      hubSectionTestId: 'lesson-hub-section-surface_match_game',
      shellTestId: 'agentic-surface-match-game-shell',
      mockTestId: 'mock-agentic-surface-match-game',
      finishButtonLabel: 'Finish surface match game',
    },
  ])('opens the $title section through the shared launchable instance runtime and returns to the hub', async ({
    Component,
    hubSectionTestId,
    shellTestId,
    mockTestId,
    finishButtonLabel,
  }) => {
    render(
      <KangurLessonNavigationProvider onBack={vi.fn()}>
        <Component />
      </KangurLessonNavigationProvider>
    );

    expect(screen.getByTestId(hubSectionTestId)).toBeInTheDocument();

    fireEvent.click(screen.getByTestId(hubSectionTestId));

    await waitFor(() => {
      expect(screen.getByTestId(shellTestId)).toBeInTheDocument();
    });

    expect(screen.getByTestId(mockTestId)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: finishButtonLabel }));

    await waitFor(() => {
      expect(screen.getByTestId(hubSectionTestId)).toBeInTheDocument();
    });
  });
});
