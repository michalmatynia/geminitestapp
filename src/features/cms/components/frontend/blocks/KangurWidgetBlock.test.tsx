/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { BlockSettingsContext } from './BlockContext';
import { KangurWidgetBlock } from './KangurWidgetBlock';

const runtimeState = vi.hoisted(() => ({
  learnerProfileRuntime: null as null | Record<string, unknown>,
  routing: null as null | Record<string, unknown>,
}));

vi.mock('@/shared/lib/kangur-cms-bridge', () => {
  const Stub = () => <div />;

  return {
    Game: Stub,
    Lessons: Stub,
    LearnerProfile: Stub,
    ParentDashboard: Stub,
    getKangurWidgetLabel: () => 'Legacy Parent Dashboard Scores',
    isKangurGameScreen: () => false,
    KangurActiveLessonPanelWidget: Stub,
    KangurAssignmentSpotlight: Stub,
    KangurGameCalendarTrainingWidget: Stub,
    KangurGameGeometryTrainingWidget: Stub,
    KangurGameHomeActionsWidget: Stub,
    KangurGameKangurSessionWidget: Stub,
    KangurGameKangurSetupWidget: Stub,
    KangurGameNavigationWidget: Stub,
    KangurGameOperationSelectorWidget: Stub,
    KangurGameQuestionWidget: Stub,
    KangurGameResultWidget: Stub,
    KangurGameTrainingSetupWidget: Stub,
    KangurGameXpToastWidget: Stub,
    KangurLearnerProfileAssignmentsWidget: Stub,
    KangurLearnerProfileHeroWidget: Stub,
    KangurLearnerProfileLevelProgressWidget: Stub,
    KangurLearnerProfileMasteryWidget: Stub,
    KangurLearnerProfileOverviewWidget: Stub,
    KangurLearnerProfilePerformanceWidget: Stub,
    KangurLearnerProfileRecommendationsWidget: Stub,
    KangurLearnerProfileResultsWidget: () => (
      <div data-testid='learner-profile-results-widget-stub' />
    ),
    KangurLearnerProfileSessionsWidget: Stub,
    KangurLessonNavigationWidget: Stub,
    KangurLessonsCatalogWidget: Stub,
    KangurParentDashboardAssignmentsMonitoringWidget: Stub,
    KangurParentDashboardAssignmentsWidget: Stub,
    KangurParentDashboardHeroWidget: Stub,
    KangurParentDashboardLearnerManagementWidget: Stub,
    KangurParentDashboardProgressWidget: Stub,
    KangurParentDashboardScoresWidget: () => (
      <div data-testid='parent-dashboard-scores-widget-stub' />
    ),
    KangurParentDashboardTabsWidget: Stub,
    KangurPriorityAssignments: Stub,
    Leaderboard: Stub,
    PlayerProgressCard: Stub,
    useKangurProgressState: () => ({}),
    useOptionalKangurGameRuntime: () => null,
    useOptionalKangurLearnerProfileRuntime: () => runtimeState.learnerProfileRuntime,
    useOptionalKangurLessonsRuntime: () => null,
    useOptionalKangurParentDashboardRuntime: () => null,
    useOptionalKangurRouting: () => runtimeState.routing,
  };
});

describe('KangurWidgetBlock', () => {
  it('shows a moved-to-learner-profile fallback for legacy parent results widgets', () => {
    runtimeState.learnerProfileRuntime = null;
    runtimeState.routing = null;

    render(
      <BlockSettingsContext.Provider value={{ widgetId: 'parent-dashboard-scores' }}>
        <KangurWidgetBlock />
      </BlockSettingsContext.Provider>
    );

    expect(screen.getByText('Learner Profile Results')).toBeInTheDocument();
    expect(
      screen.getByText('This legacy Parent Dashboard widget moved to the Learner Profile screen.')
    ).toBeInTheDocument();
    expect(screen.queryByTestId('parent-dashboard-scores-widget-stub')).toBeNull();
  });

  it('renders learner-profile results for the legacy widget id when learner runtime is present', () => {
    runtimeState.learnerProfileRuntime = {};
    runtimeState.routing = { basePath: '/kangur', pageKey: 'LearnerProfile' };

    render(
      <BlockSettingsContext.Provider value={{ widgetId: 'parent-dashboard-scores' }}>
        <KangurWidgetBlock />
      </BlockSettingsContext.Provider>
    );

    expect(screen.getByTestId('learner-profile-results-widget-stub')).toBeInTheDocument();
    expect(screen.queryByTestId('parent-dashboard-scores-widget-stub')).toBeNull();
  });

  it('renders learner-profile results for the learner-profile-results widget id', () => {
    runtimeState.learnerProfileRuntime = {};
    runtimeState.routing = { basePath: '/kangur', pageKey: 'LearnerProfile' };

    render(
      <BlockSettingsContext.Provider value={{ widgetId: 'learner-profile-results' }}>
        <KangurWidgetBlock />
      </BlockSettingsContext.Provider>
    );

    expect(screen.getByTestId('learner-profile-results-widget-stub')).toBeInTheDocument();
  });

  it('shows the learner-profile runtime fallback for learner-profile-results outside learner profile', () => {
    runtimeState.learnerProfileRuntime = null;
    runtimeState.routing = { basePath: '/kangur', pageKey: 'Lessons' };

    render(
      <BlockSettingsContext.Provider value={{ widgetId: 'learner-profile-results' }}>
        <KangurWidgetBlock />
      </BlockSettingsContext.Provider>
    );

    expect(screen.getByText('Legacy Parent Dashboard Scores')).toBeInTheDocument();
    expect(
      screen.getByText('Learner Profile widgets render only inside the Learner Profile screen runtime.')
    ).toBeInTheDocument();
  });
});
