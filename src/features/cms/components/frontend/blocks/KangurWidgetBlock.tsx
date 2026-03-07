'use client';

import React from 'react';

import { getKangurWidgetLabel } from '@/features/kangur/cms-builder/project';
import KangurAssignmentSpotlight from '@/features/kangur/ui/components/KangurAssignmentSpotlight';
import { KangurActiveLessonPanelWidget } from '@/features/kangur/ui/components/KangurActiveLessonPanelWidget';
import { KangurGameCalendarTrainingWidget } from '@/features/kangur/ui/components/KangurGameCalendarTrainingWidget';
import { KangurGameGeometryTrainingWidget } from '@/features/kangur/ui/components/KangurGameGeometryTrainingWidget';
import { KangurGameHomeActionsWidget } from '@/features/kangur/ui/components/KangurGameHomeActionsWidget';
import { KangurGameHomeHeroWidget } from '@/features/kangur/ui/components/KangurGameHomeHeroWidget';
import { KangurGameKangurSessionWidget } from '@/features/kangur/ui/components/KangurGameKangurSessionWidget';
import { KangurGameKangurSetupWidget } from '@/features/kangur/ui/components/KangurGameKangurSetupWidget';
import { KangurGameNavigationWidget } from '@/features/kangur/ui/components/KangurGameNavigationWidget';
import { KangurGameOperationSelectorWidget } from '@/features/kangur/ui/components/KangurGameOperationSelectorWidget';
import { KangurGameQuestionWidget } from '@/features/kangur/ui/components/KangurGameQuestionWidget';
import { KangurGameResultWidget } from '@/features/kangur/ui/components/KangurGameResultWidget';
import { KangurGameTrainingSetupWidget } from '@/features/kangur/ui/components/KangurGameTrainingSetupWidget';
import { KangurGameXpToastWidget } from '@/features/kangur/ui/components/KangurGameXpToastWidget';
import { KangurLessonNavigationWidget } from '@/features/kangur/ui/components/KangurLessonNavigationWidget';
import { KangurLearnerProfileAssignmentsWidget } from '@/features/kangur/ui/components/KangurLearnerProfileAssignmentsWidget';
import { KangurLearnerProfileHeroWidget } from '@/features/kangur/ui/components/KangurLearnerProfileHeroWidget';
import { KangurLearnerProfileLevelProgressWidget } from '@/features/kangur/ui/components/KangurLearnerProfileLevelProgressWidget';
import { KangurLearnerProfileMasteryWidget } from '@/features/kangur/ui/components/KangurLearnerProfileMasteryWidget';
import { KangurLearnerProfileOverviewWidget } from '@/features/kangur/ui/components/KangurLearnerProfileOverviewWidget';
import { KangurLearnerProfilePerformanceWidget } from '@/features/kangur/ui/components/KangurLearnerProfilePerformanceWidget';
import { KangurLearnerProfileRecommendationsWidget } from '@/features/kangur/ui/components/KangurLearnerProfileRecommendationsWidget';
import { KangurLearnerProfileSessionsWidget } from '@/features/kangur/ui/components/KangurLearnerProfileSessionsWidget';
import { KangurParentDashboardAssignmentsWidget } from '@/features/kangur/ui/components/KangurParentDashboardAssignmentsWidget';
import { KangurParentDashboardHeroWidget } from '@/features/kangur/ui/components/KangurParentDashboardHeroWidget';
import { KangurParentDashboardLearnerManagementWidget } from '@/features/kangur/ui/components/KangurParentDashboardLearnerManagementWidget';
import { KangurParentDashboardProgressWidget } from '@/features/kangur/ui/components/KangurParentDashboardProgressWidget';
import { KangurParentDashboardScoresWidget } from '@/features/kangur/ui/components/KangurParentDashboardScoresWidget';
import { KangurParentDashboardTabsWidget } from '@/features/kangur/ui/components/KangurParentDashboardTabsWidget';
import Leaderboard from '@/features/kangur/ui/components/Leaderboard';
import { KangurLessonsCatalogWidget } from '@/features/kangur/ui/components/KangurLessonsCatalogWidget';
import PlayerProgressCard from '@/features/kangur/ui/components/PlayerProgressCard';
import { KangurPriorityAssignments } from '@/features/kangur/ui/components/KangurPriorityAssignments';
import {
  isKangurGameScreen,
  useOptionalKangurGameRuntime,
} from '@/features/kangur/ui/context/KangurGameRuntimeContext';
import { useOptionalKangurLearnerProfileRuntime } from '@/features/kangur/ui/context/KangurLearnerProfileRuntimeContext';
import { useOptionalKangurParentDashboardRuntime } from '@/features/kangur/ui/context/KangurParentDashboardRuntimeContext';
import { useOptionalKangurLessonsRuntime } from '@/features/kangur/ui/context/KangurLessonsRuntimeContext';
import { useKangurProgressState } from '@/features/kangur/ui/hooks/useKangurProgressState';
import { useOptionalKangurRouting } from '@/features/kangur/ui/context/KangurRoutingContext';
import GamePage from '@/features/kangur/ui/pages/Game';
import LearnerProfilePage from '@/features/kangur/ui/pages/LearnerProfile';
import LessonsPage from '@/features/kangur/ui/pages/Lessons';
import ParentDashboardPage from '@/features/kangur/ui/pages/ParentDashboard';
import { Card } from '@/shared/ui';

import { useRequiredBlockSettings } from './BlockContext';

const resolveLimit = (value: unknown, fallback: number): number => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.max(1, Math.min(12, Math.round(value)));
};

const resolveText = (value: unknown, fallback: string): string =>
  typeof value === 'string' && value.trim().length > 0 ? value.trim() : fallback;

const resolveParentDashboardDisplayMode = (
  value: unknown
): 'always' | 'active-tab' =>
  value === 'active-tab' ? 'active-tab' : 'always';

const resolveGameScreenVisibility = (value: unknown): string =>
  typeof value === 'string' && (value === 'always' || isKangurGameScreen(value))
    ? value
    : 'always';

function KangurWidgetFallback({
  title,
  description,
}: {
  title: string;
  description: string;
}): React.JSX.Element {
  return (
    <Card variant='subtle' padding='md' className='w-full border-border/40 bg-card/30 text-left'>
      <div className='text-sm font-semibold text-white'>{title}</div>
      <div className='mt-2 text-xs text-gray-400'>{description}</div>
    </Card>
  );
}

const LESSONS_RUNTIME_WIDGET_IDS = new Set([
  'lesson-catalog',
  'active-lesson-panel',
  'lesson-navigation',
]);

const GAME_RUNTIME_WIDGET_IDS = new Set([
  'game-navigation',
  'game-xp-toast',
  'game-home-hero',
  'game-home-actions',
  'game-training-setup',
  'game-kangur-setup',
  'game-kangur-session',
  'game-calendar-training',
  'game-geometry-training',
  'game-operation-selector',
  'game-question-session',
  'game-result-summary',
]);

const LEARNER_PROFILE_RUNTIME_WIDGET_IDS = new Set([
  'learner-profile-hero',
  'learner-profile-level-progress',
  'learner-profile-overview',
  'learner-profile-recommendations',
  'learner-profile-assignments',
  'learner-profile-mastery',
  'learner-profile-performance',
  'learner-profile-sessions',
]);

const PARENT_DASHBOARD_RUNTIME_WIDGET_IDS = new Set([
  'parent-dashboard-hero',
  'parent-dashboard-learner-management',
  'parent-dashboard-tabs',
  'parent-dashboard-progress',
  'parent-dashboard-scores',
  'parent-dashboard-assignments',
]);

export function KangurWidgetBlock(): React.ReactNode {
  const settings = useRequiredBlockSettings();
  const routing = useOptionalKangurRouting();
  const gameRuntime = useOptionalKangurGameRuntime();
  const lessonsRuntime = useOptionalKangurLessonsRuntime();
  const learnerProfileRuntime = useOptionalKangurLearnerProfileRuntime();
  const parentDashboardRuntime = useOptionalKangurParentDashboardRuntime();
  const widgetId = typeof settings['widgetId'] === 'string' ? settings['widgetId'] : '';
  const widgetLabel = getKangurWidgetLabel(widgetId);
  const progress = useKangurProgressState();
  const gameScreenVisibility = resolveGameScreenVisibility(settings['gameScreen']);

  if (!routing) {
    return (
      <KangurWidgetFallback
        title={widgetLabel}
        description='Kangur widgets render only inside the Kangur app runtime.'
      />
    );
  }

  if (LESSONS_RUNTIME_WIDGET_IDS.has(widgetId) && !lessonsRuntime) {
    return (
      <KangurWidgetFallback
        title={widgetLabel}
        description='Lessons widgets render only inside the Lessons screen runtime.'
      />
    );
  }

  if (GAME_RUNTIME_WIDGET_IDS.has(widgetId) && !gameRuntime) {
    return (
      <KangurWidgetFallback
        title={widgetLabel}
        description='Game widgets render only inside the Game screen runtime.'
      />
    );
  }

  if (LEARNER_PROFILE_RUNTIME_WIDGET_IDS.has(widgetId) && !learnerProfileRuntime) {
    return (
      <KangurWidgetFallback
        title={widgetLabel}
        description='Learner Profile widgets render only inside the Learner Profile screen runtime.'
      />
    );
  }

  if (PARENT_DASHBOARD_RUNTIME_WIDGET_IDS.has(widgetId) && !parentDashboardRuntime) {
    return (
      <KangurWidgetFallback
        title={widgetLabel}
        description='Parent Dashboard widgets render only inside the Parent Dashboard screen runtime.'
      />
    );
  }

  if (routing.pageKey === 'Game' && gameScreenVisibility !== 'always') {
    if (gameRuntime?.screen !== gameScreenVisibility) {
      return null;
    }
  }

  switch (widgetId) {
    case 'game-screen':
      return <GamePage />;
    case 'game-navigation':
      return <KangurGameNavigationWidget />;
    case 'game-xp-toast':
      return <KangurGameXpToastWidget />;
    case 'game-home-hero':
      return <KangurGameHomeHeroWidget />;
    case 'game-home-actions':
      return <KangurGameHomeActionsWidget />;
    case 'game-training-setup':
      return <KangurGameTrainingSetupWidget />;
    case 'game-kangur-setup':
      return <KangurGameKangurSetupWidget />;
    case 'game-kangur-session':
      return <KangurGameKangurSessionWidget />;
    case 'game-calendar-training':
      return <KangurGameCalendarTrainingWidget />;
    case 'game-geometry-training':
      return <KangurGameGeometryTrainingWidget />;
    case 'game-operation-selector':
      return <KangurGameOperationSelectorWidget />;
    case 'game-question-session':
      return <KangurGameQuestionWidget />;
    case 'game-result-summary':
      return <KangurGameResultWidget />;
    case 'lessons-screen':
      return <LessonsPage />;
    case 'learner-profile-screen':
      return <LearnerProfilePage />;
    case 'parent-dashboard-screen':
      return <ParentDashboardPage />;
    case 'lesson-catalog':
      return <KangurLessonsCatalogWidget />;
    case 'active-lesson-panel':
      return <KangurActiveLessonPanelWidget />;
    case 'lesson-navigation':
      return <KangurLessonNavigationWidget />;
    case 'learner-profile-hero':
      return <KangurLearnerProfileHeroWidget />;
    case 'learner-profile-level-progress':
      return <KangurLearnerProfileLevelProgressWidget />;
    case 'learner-profile-overview':
      return <KangurLearnerProfileOverviewWidget />;
    case 'learner-profile-recommendations':
      return <KangurLearnerProfileRecommendationsWidget />;
    case 'learner-profile-assignments':
      return <KangurLearnerProfileAssignmentsWidget />;
    case 'learner-profile-mastery':
      return <KangurLearnerProfileMasteryWidget />;
    case 'learner-profile-performance':
      return <KangurLearnerProfilePerformanceWidget />;
    case 'learner-profile-sessions':
      return <KangurLearnerProfileSessionsWidget />;
    case 'parent-dashboard-hero':
      return <KangurParentDashboardHeroWidget />;
    case 'parent-dashboard-learner-management':
      return <KangurParentDashboardLearnerManagementWidget />;
    case 'parent-dashboard-tabs':
      return <KangurParentDashboardTabsWidget />;
    case 'parent-dashboard-progress':
      return (
        <KangurParentDashboardProgressWidget
          displayMode={resolveParentDashboardDisplayMode(settings['displayMode'])}
        />
      );
    case 'parent-dashboard-scores':
      return (
        <KangurParentDashboardScoresWidget
          displayMode={resolveParentDashboardDisplayMode(settings['displayMode'])}
        />
      );
    case 'parent-dashboard-assignments':
      return (
        <KangurParentDashboardAssignmentsWidget
          displayMode={resolveParentDashboardDisplayMode(settings['displayMode'])}
        />
      );
    case 'player-progress':
      return <PlayerProgressCard progress={progress} />;
    case 'leaderboard':
      return <Leaderboard />;
    case 'priority-assignments':
      return (
        <KangurPriorityAssignments
          basePath={routing.basePath}
          title={resolveText(settings['title'], 'Priority Assignments')}
          emptyLabel={resolveText(settings['emptyLabel'], 'No priority assignments yet.')}
          limit={resolveLimit(settings['limit'], 3)}
        />
      );
    case 'assignment-spotlight':
      return <KangurAssignmentSpotlight basePath={routing.basePath} />;
    default:
      return (
        <KangurWidgetFallback
          title={widgetLabel}
          description='Select a Kangur widget in the block settings to render runtime content here.'
        />
      );
  }
}
