/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
  useLocalSearchParamsMock,
  useKangurMobileAuthMock,
  useKangurMobileHomeDuelsInvitesMock,
  useKangurMobileHomeDuelsSpotlightMock,
  useKangurMobileRuntimeMock,
  useKangurMobileRecentResultsMock,
  useKangurMobileTrainingFocusMock,
} = vi.hoisted(() => ({
  useLocalSearchParamsMock: vi.fn(),
  useKangurMobileAuthMock: vi.fn(),
  useKangurMobileHomeDuelsInvitesMock: vi.fn(),
  useKangurMobileHomeDuelsSpotlightMock: vi.fn(),
  useKangurMobileRuntimeMock: vi.fn(),
  useKangurMobileRecentResultsMock: vi.fn(),
  useKangurMobileTrainingFocusMock: vi.fn(),
}));

vi.mock('expo-router', () => ({
  Link: ({ children }: React.PropsWithChildren) => children,
  useLocalSearchParams: useLocalSearchParamsMock,
}));

vi.mock('../auth/KangurMobileAuthContext', () => ({
  useKangurMobileAuth: useKangurMobileAuthMock,
}));

vi.mock('../providers/KangurRuntimeContext', () => ({
  useKangurMobileRuntime: useKangurMobileRuntimeMock,
}));

vi.mock('./useKangurMobileRecentResults', () => ({
  useKangurMobileRecentResults: useKangurMobileRecentResultsMock,
}));

vi.mock('./useKangurMobileHomeDuelsInvites', () => ({
  useKangurMobileHomeDuelsInvites: useKangurMobileHomeDuelsInvitesMock,
}));

vi.mock('./useKangurMobileHomeDuelsSpotlight', () => ({
  useKangurMobileHomeDuelsSpotlight: useKangurMobileHomeDuelsSpotlightMock,
}));

vi.mock('./useKangurMobileTrainingFocus', () => ({
  useKangurMobileTrainingFocus: useKangurMobileTrainingFocusMock,
}));

import HomeScreen from '../../app/index';

describe('HomeScreen', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal('__DEV__', false);
    useLocalSearchParamsMock.mockReturnValue({});
    useKangurMobileRuntimeMock.mockReturnValue({
      apiBaseUrl: 'http://localhost:3000',
      apiBaseUrlSource: 'env',
    });
    useKangurMobileAuthMock.mockReturnValue({
      authError: null,
      authMode: 'learner-session',
      developerAutoSignInEnabled: false,
      hasAttemptedDeveloperAutoSignIn: false,
      isLoadingAuth: false,
      session: {
        status: 'anonymous',
        user: null,
      },
      signIn: vi.fn(),
      signInWithLearnerCredentials: vi.fn(),
      signOut: vi.fn(),
      supportsLearnerCredentials: true,
    });
    useKangurMobileRecentResultsMock.mockReturnValue({
      error: null,
      isEnabled: false,
      isLoading: false,
      isRestoringAuth: false,
      refresh: vi.fn(),
      results: [],
    });
    useKangurMobileHomeDuelsInvitesMock.mockReturnValue({
      error: null,
      invites: [],
      isAuthenticated: false,
      isLoading: false,
      isRestoringAuth: false,
      refresh: vi.fn(),
    });
    useKangurMobileHomeDuelsSpotlightMock.mockReturnValue({
      entries: [],
      error: null,
      isLoading: false,
      refresh: vi.fn(),
    });
    useKangurMobileTrainingFocusMock.mockReturnValue({
      error: null,
      isEnabled: false,
      isLoading: false,
      isRestoringAuth: false,
      refresh: vi.fn(),
      strongestLessonFocus: null,
      strongestOperation: null,
      weakestLessonFocus: null,
      weakestOperation: null,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('shows the learner-session restoring shell while auth-backed sections are still loading', () => {
    useKangurMobileAuthMock.mockReturnValue({
      authError: null,
      authMode: 'learner-session',
      developerAutoSignInEnabled: false,
      hasAttemptedDeveloperAutoSignIn: false,
      isLoadingAuth: true,
      session: {
        status: 'anonymous',
        user: null,
      },
      signIn: vi.fn(),
      signInWithLearnerCredentials: vi.fn(),
      signOut: vi.fn(),
      supportsLearnerCredentials: true,
    });
    useKangurMobileRecentResultsMock.mockReturnValue({
      error: null,
      isEnabled: false,
      isLoading: true,
      isRestoringAuth: true,
      refresh: vi.fn(),
      results: [],
    });
    useKangurMobileTrainingFocusMock.mockReturnValue({
      error: null,
      isEnabled: false,
      isLoading: true,
      isRestoringAuth: true,
      refresh: vi.fn(),
      strongestLessonFocus: null,
      strongestOperation: null,
      weakestLessonFocus: null,
      weakestOperation: null,
    });

    render(<HomeScreen />);

    expect(screen.getByText('Kangur mobilnie')).toBeTruthy();
    expect(screen.getByText('Status: przywracanie')).toBeTruthy();
    expect(screen.getByText('Użytkownik: przywracanie sesji ucznia')).toBeTruthy();
    expect(
      screen.getByText('Przywracamy sesję ucznia i fokus treningowy oparty na wynikach.'),
    ).toBeTruthy();
    expect(screen.getByText('Pobieramy wyniki ucznia.')).toBeTruthy();
    expect(screen.queryByText('Login ucznia')).toBeNull();
  });

  it('renders authenticated focus cards and recent results after the shell settles', () => {
    useKangurMobileAuthMock.mockReturnValue({
      authError: null,
      authMode: 'learner-session',
      developerAutoSignInEnabled: false,
      hasAttemptedDeveloperAutoSignIn: false,
      isLoadingAuth: false,
      session: {
        status: 'authenticated',
        user: {
          actorType: 'learner',
          full_name: 'Ada Learner',
        },
      },
      signIn: vi.fn(),
      signInWithLearnerCredentials: vi.fn(),
      signOut: vi.fn(),
      supportsLearnerCredentials: true,
    });
    useKangurMobileRecentResultsMock.mockReturnValue({
      error: null,
      isEnabled: true,
      isLoading: false,
      isRestoringAuth: false,
      refresh: vi.fn(),
      results: [
        {
          id: 'score-1',
          operation: 'clock',
          correct_answers: 7,
          total_questions: 8,
        },
      ],
    });
    useKangurMobileHomeDuelsInvitesMock.mockReturnValue({
      error: null,
      invites: [
        {
          createdAt: '2026-03-21T08:00:00.000Z',
          difficulty: 'medium',
          host: {
            bonusPoints: 0,
            currentQuestionIndex: 0,
            displayName: 'Leo Mentor',
            joinedAt: '2026-03-21T08:00:00.000Z',
            learnerId: 'learner-2',
            score: 0,
            status: 'ready',
          },
          mode: 'challenge',
          operation: 'multiplication',
          questionCount: 5,
          sessionId: 'invite-1',
          status: 'waiting',
          timePerQuestionSec: 15,
          updatedAt: '2026-03-21T08:05:00.000Z',
          visibility: 'private',
        },
      ],
      isAuthenticated: true,
      isLoading: false,
      isRestoringAuth: false,
      refresh: vi.fn(),
    });
    useKangurMobileTrainingFocusMock.mockReturnValue({
      error: null,
      isEnabled: true,
      isLoading: false,
      isRestoringAuth: false,
      refresh: vi.fn(),
      strongestLessonFocus: 'clock',
      strongestOperation: {
        averageAccuracyPercent: 94,
        operation: 'clock',
        sessions: 4,
      },
      weakestLessonFocus: 'adding',
      weakestOperation: {
        averageAccuracyPercent: 52,
        operation: 'addition',
        sessions: 3,
      },
    });
    useKangurMobileHomeDuelsSpotlightMock.mockReturnValue({
      entries: [
        {
          createdAt: '2026-03-21T08:00:00.000Z',
          difficulty: 'hard',
          host: {
            bonusPoints: 0,
            currentQuestionIndex: 2,
            displayName: 'Maja Sprint',
            joinedAt: '2026-03-21T08:00:00.000Z',
            learnerId: 'learner-4',
            score: 4,
            status: 'playing',
          },
          mode: 'quick_match',
          operation: 'division',
          questionCount: 6,
          sessionId: 'public-live-1',
          status: 'in_progress',
          timePerQuestionSec: 12,
          updatedAt: '2026-03-21T08:09:00.000Z',
          visibility: 'public',
        },
      ],
      error: null,
      isLoading: false,
      refresh: vi.fn(),
    });

    render(<HomeScreen />);

    expect(screen.getByText('Status: zalogowany')).toBeTruthy();
    expect(screen.getByText('Użytkownik: Ada Learner (uczen)')).toBeTruthy();
    expect(screen.getByText('Do powtórki')).toBeTruthy();
    expect(screen.getByText('Najmocniejszy tryb')).toBeTruthy();
    expect(screen.getByText('Historia trybu: Dodawanie')).toBeTruthy();
    expect(screen.getAllByText('Historia trybu: Zegar').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('7/8 poprawnych')).toBeTruthy();
    expect(screen.getByText('Pojedynki')).toBeTruthy();
    expect(screen.getByText('Zaproszenia do pojedynków')).toBeTruthy();
    expect(screen.getByText('Leo Mentor')).toBeTruthy();
    expect(screen.getByText('Dołącz: Leo Mentor')).toBeTruthy();
    expect(screen.getByText('Na żywo w pojedynkach')).toBeTruthy();
    expect(screen.getByText('Maja Sprint')).toBeTruthy();
    expect(screen.getByText('Obserwuj na żywo')).toBeTruthy();
  });
});
