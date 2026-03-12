/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { runtimeState, useKangurPageContentEntryMock } = vi.hoisted(() => ({
  runtimeState: {
    value: {
      activeLearner: {
        id: 'learner-1',
      },
      activeTab: 'scores',
      basePath: '/kangur',
      canAccessDashboard: true,
      scoreViewerEmail: 'parent@example.com',
      scoreViewerName: 'Ada',
    },
  },
  useKangurPageContentEntryMock: vi.fn(),
}));

const scoreHistoryMock = vi.hoisted(() => vi.fn());

vi.mock('@/features/kangur/ui/context/KangurParentDashboardRuntimeContext', () => ({
  shouldRenderKangurParentDashboardPanel: (displayMode: string, activeTab: string, targetTab: string) =>
    displayMode === 'always' || activeTab === targetTab,
  useKangurParentDashboardRuntime: () => runtimeState.value,
}));

vi.mock('@/features/kangur/ui/hooks/useKangurPageContent', () => ({
  useKangurPageContentEntry: useKangurPageContentEntryMock,
}));

vi.mock('@/features/kangur/ui/components/ScoreHistory', () => ({
  default: (props: unknown) => {
    scoreHistoryMock(props);
    return <div data-testid='score-history-stub' />;
  },
}));

import { KangurParentDashboardScoresWidget } from './KangurParentDashboardScoresWidget';

describe('KangurParentDashboardScoresWidget', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    runtimeState.value = {
      activeLearner: {
        id: 'learner-1',
      },
      activeTab: 'scores',
      basePath: '/kangur',
      canAccessDashboard: true,
      scoreViewerEmail: 'parent@example.com',
      scoreViewerName: 'Ada',
    };
    useKangurPageContentEntryMock.mockReturnValue({
      data: undefined,
      entry: null,
      error: null,
      isError: false,
      isFetched: true,
      isFetching: false,
      isLoading: false,
      isPending: false,
      isSuccess: true,
      refetch: vi.fn(),
      status: 'success',
    });
  });

  it('passes the learner-scoped filters into shared score history', () => {
    render(<KangurParentDashboardScoresWidget />);

    expect(screen.getByTestId('score-history-stub')).toBeInTheDocument();
    expect(scoreHistoryMock).toHaveBeenCalledWith(
      expect.objectContaining({
        basePath: '/kangur',
        createdBy: 'parent@example.com',
        learnerId: 'learner-1',
        playerName: 'Ada',
      })
    );
  });

  it('renders Mongo-backed section intro copy when available', () => {
    useKangurPageContentEntryMock.mockReturnValue({
      data: undefined,
      entry: {
        id: 'parent-dashboard-scores',
        title: 'Wyniki ucznia',
        summary: 'Sprawdz ostatnie gry i obszary, ktore warto teraz powtorzyc.',
      },
      error: null,
      isError: false,
      isFetched: true,
      isFetching: false,
      isLoading: false,
      isPending: false,
      isSuccess: true,
      refetch: vi.fn(),
      status: 'success',
    });

    render(<KangurParentDashboardScoresWidget />);

    expect(screen.getByText('Wyniki ucznia')).toHaveClass('[color:var(--kangur-page-text)]');
    expect(
      screen.getByText('Sprawdz ostatnie gry i obszary, ktore warto teraz powtorzyc.')
    ).toHaveClass('[color:var(--kangur-page-muted-text)]');
  });

  it('does not render when the dashboard is inaccessible', () => {
    runtimeState.value = {
      ...runtimeState.value,
      canAccessDashboard: false,
    };

    render(<KangurParentDashboardScoresWidget />);

    expect(screen.queryByTestId('score-history-stub')).toBeNull();
    expect(scoreHistoryMock).not.toHaveBeenCalled();
  });
});
