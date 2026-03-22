/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { KangurMobileI18nProvider } from '../i18n/kangurMobileI18n';

const {
  refreshDashboardMock,
  selectLearnerMock,
  useKangurMobileParentDashboardMock,
} = vi.hoisted(() => ({
  refreshDashboardMock: vi.fn(),
  selectLearnerMock: vi.fn(),
  useKangurMobileParentDashboardMock: vi.fn(),
}));

vi.mock('react-native', () => {
  const createPrimitive = (tagName: keyof React.JSX.IntrinsicElements) => {
    return ({
      children,
      onPress,
      ...props
    }: React.PropsWithChildren<Record<string, unknown> & { onPress?: () => void }>) =>
      React.createElement(
        tagName,
        {
          ...props,
          ...(onPress ? { onClick: onPress } : {}),
        },
        children,
      );
  };

  return {
    Pressable: createPrimitive('button'),
    ScrollView: createPrimitive('div'),
    Text: createPrimitive('span'),
    View: createPrimitive('div'),
  };
});

vi.mock('react-native-safe-area-context', () => {
  const createPrimitive = (tagName: keyof React.JSX.IntrinsicElements) => {
    return ({ children, ...props }: React.PropsWithChildren<Record<string, unknown>>) =>
      React.createElement(tagName, props, children);
  };

  return {
    SafeAreaView: createPrimitive('div'),
  };
});

vi.mock('expo-router', () => ({
  Link: ({ children }: React.PropsWithChildren) => children,
}));

vi.mock('./useKangurMobileParentDashboard', () => ({
  useKangurMobileParentDashboard: useKangurMobileParentDashboardMock,
}));

vi.mock('../ai-tutor/KangurMobileAiTutorCard', () => ({
  KangurMobileAiTutorCard: () => React.createElement('div', {}, 'AI Tutor Card'),
}));

import { KangurParentDashboardScreen } from './KangurParentDashboardScreen';

const renderParentDashboardScreen = (locale?: 'pl' | 'en' | 'de') =>
  render(
    locale ? (
      <KangurMobileI18nProvider locale={locale}>
        <KangurParentDashboardScreen />
      </KangurMobileI18nProvider>
    ) : (
      <KangurParentDashboardScreen />
    ),
  );

describe('KangurParentDashboardScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    refreshDashboardMock.mockResolvedValue(undefined);
    selectLearnerMock.mockResolvedValue(undefined);
    useKangurMobileParentDashboardMock.mockReturnValue({
      activeLearner: null,
      assignmentItems: [],
      assignmentMonitoring: {
        completedCount: 0,
        highPriorityCount: 0,
        inProgressCount: 0,
        lessonCount: 0,
        notStartedCount: 0,
        practiceCount: 0,
        totalCount: 0,
      },
      assignmentsError: null,
      canAccessDashboard: false,
      isAuthenticated: false,
      isLoadingAssignments: false,
      isLoadingAuth: false,
      isLoadingProgress: false,
      isLoadingResults: false,
      learners: [],
      parentDisplayName: 'Konto rodzica',
      progressError: null,
      recentResultItems: [],
      refreshDashboard: refreshDashboardMock,
      resultsError: null,
      selectLearner: selectLearnerMock,
      selectedLearnerId: null,
      selectionError: null,
      snapshot: null,
      supportsLearnerCredentials: true,
      switchingLearnerId: null,
    });
  });

  it('shows the signed-out parent handoff', () => {
    renderParentDashboardScreen();

    expect(screen.getByText('Panel rodzica')).toBeTruthy();
    expect(screen.getByText('AI Tutor Card')).toBeTruthy();
    expect(
      screen.getByText(
        'Zaloguj się na konto rodzica, aby przełączać uczniów, sprawdzać postęp i porządkować zadania.',
      ),
    ).toBeTruthy();
    expect(screen.getByText('Przejdź do logowania')).toBeTruthy();
  });

  it('renders the populated parent view and switches learners', () => {
    useKangurMobileParentDashboardMock.mockReturnValue({
      activeLearner: {
        displayName: 'Maja Uczennica',
        id: 'learner-1',
        status: 'active',
      },
      assignmentItems: [
        {
          assignment: {
            description: 'Powtórz mnożenie do 50.',
            id: 'assignment-1',
            priority: 'high',
            progress: {
              summary: '1 z 3 ukończone',
            },
            target: {
              type: 'practice',
            },
            title: 'Trening mnożenia',
          },
          href: '/practice',
        },
      ],
      assignmentMonitoring: {
        completedCount: 1,
        highPriorityCount: 1,
        inProgressCount: 1,
        lessonCount: 1,
        notStartedCount: 0,
        practiceCount: 1,
        totalCount: 2,
      },
      assignmentsError: null,
      canAccessDashboard: true,
      isAuthenticated: true,
      isLoadingAssignments: false,
      isLoadingAuth: false,
      isLoadingProgress: false,
      isLoadingResults: false,
      learners: [
        {
          displayName: 'Maja Uczennica',
          id: 'learner-1',
          status: 'active',
        },
        {
          displayName: 'Olek Uczeń',
          id: 'learner-2',
          status: 'active',
        },
      ],
      parentDisplayName: 'Ada Rodzic',
      progressError: null,
      recentResultItems: [
        {
          historyHref: '/results',
          lessonHref: '/lessons',
          practiceHref: '/practice',
          result: {
            correct_answers: 2,
            created_date: '2026-03-22T08:10:30.000Z',
            id: 'score-1',
            operation: 'addition',
            total_questions: 3,
          },
        },
      ],
      refreshDashboard: refreshDashboardMock,
      resultsError: null,
      selectLearner: selectLearnerMock,
      selectedLearnerId: 'learner-1',
      selectionError: null,
      snapshot: {
        averageAccuracy: 78,
        bestAccuracy: 100,
        currentStreakDays: 4,
        dailyGoalGames: 5,
        dailyGoalPercent: 40,
        level: {
          level: 3,
        },
        longestStreakDays: 7,
        todayGames: 2,
        totalXp: 240,
      },
      supportsLearnerCredentials: true,
      switchingLearnerId: null,
    });

    renderParentDashboardScreen();

    expect(screen.getByText('Przegląd postępu: Maja Uczennica')).toBeTruthy();
    expect(screen.getByText('Zakładki rodzica')).toBeTruthy();

    fireEvent.click(screen.getByText('Wyniki'));

    expect(screen.getByText('2/3 poprawnych odpowiedzi')).toBeTruthy();
    expect(screen.getByText('Otwórz pełną historię')).toBeTruthy();

    fireEvent.click(screen.getByText('Monitorowanie'));

    expect(screen.getByText('Przegląd realizacji')).toBeTruthy();
    expect(screen.getByText('Aktywne')).toBeTruthy();

    fireEvent.click(screen.getByText('Zadania'));

    expect(screen.getByText('Trening mnożenia')).toBeTruthy();
    expect(screen.getByText('Otwórz trening')).toBeTruthy();

    fireEvent.click(screen.getByText('AI Tutor'));

    expect(screen.getByText('Kontekst AI Tutora ucznia')).toBeTruthy();
    expect(screen.getByText('AI Tutor Card')).toBeTruthy();

    fireEvent.click(screen.getByText('Olek Uczeń'));

    expect(selectLearnerMock).toHaveBeenCalledWith('learner-2');
  });
});
