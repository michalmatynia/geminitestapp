/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { createDefaultKangurProgressState } from '@kangur/contracts';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
  useLocalSearchParamsMock,
  useRouterMock,
  replaceMock,
  subscribeToProgressMock,
  shareKangurDuelInviteMock,
  useKangurMobileAuthMock,
  useKangurMobileHomeDuelsLeaderboardMock,
  useKangurMobileHomeDuelsInvitesMock,
  useKangurMobileHomeAssignmentsMock,
  useKangurMobileHomeBadgesMock,
  useKangurMobileHomeLessonCheckpointsMock,
  useKangurMobileHomeLessonMasteryMock,
  useKangurMobileHomeDuelsPresenceMock,
  useKangurMobileHomeDuelsRematchesMock,
  useKangurMobileHomeDuelsSpotlightMock,
  useKangurMobileRuntimeMock,
  useKangurMobileRecentResultsMock,
  useKangurMobileTrainingFocusMock,
  useHomeScreenBootStateMock,
  useHomeScreenDeferredPanelsMock,
} = vi.hoisted(() => ({
  useLocalSearchParamsMock: vi.fn(),
  useRouterMock: vi.fn(),
  replaceMock: vi.fn(),
  subscribeToProgressMock: vi.fn(),
  shareKangurDuelInviteMock: vi.fn(),
  useKangurMobileAuthMock: vi.fn(),
  useKangurMobileHomeDuelsLeaderboardMock: vi.fn(),
  useKangurMobileHomeDuelsInvitesMock: vi.fn(),
  useKangurMobileHomeAssignmentsMock: vi.fn(),
  useKangurMobileHomeBadgesMock: vi.fn(),
  useKangurMobileHomeLessonCheckpointsMock: vi.fn(),
  useKangurMobileHomeLessonMasteryMock: vi.fn(),
  useKangurMobileHomeDuelsPresenceMock: vi.fn(),
  useKangurMobileHomeDuelsRematchesMock: vi.fn(),
  useKangurMobileHomeDuelsSpotlightMock: vi.fn(),
  useKangurMobileRuntimeMock: vi.fn(),
  useKangurMobileRecentResultsMock: vi.fn(),
  useKangurMobileTrainingFocusMock: vi.fn(),
  useHomeScreenBootStateMock: vi.fn(),
  useHomeScreenDeferredPanelsMock: vi.fn(),
}));

vi.mock('expo-router', () => ({
  Link: ({ children }: React.PropsWithChildren) => children,
  useLocalSearchParams: useLocalSearchParamsMock,
  useRouter: useRouterMock,
}));

vi.mock('../duels/duelInviteShare', () => ({
  shareKangurDuelInvite: shareKangurDuelInviteMock,
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

vi.mock('./useKangurMobileHomeDuelsLeaderboard', () => ({
  useKangurMobileHomeDuelsLeaderboard: useKangurMobileHomeDuelsLeaderboardMock,
}));

vi.mock('./useKangurMobileHomeAssignments', () => ({
  useKangurMobileHomeAssignments: useKangurMobileHomeAssignmentsMock,
}));

vi.mock('./useKangurMobileHomeBadges', () => ({
  useKangurMobileHomeBadges: useKangurMobileHomeBadgesMock,
}));

vi.mock('./useKangurMobileHomeLessonCheckpoints', () => ({
  useKangurMobileHomeLessonCheckpoints: useKangurMobileHomeLessonCheckpointsMock,
}));

vi.mock('./useKangurMobileHomeLessonMastery', () => ({
  useKangurMobileHomeLessonMastery: useKangurMobileHomeLessonMasteryMock,
}));

vi.mock('./useKangurMobileHomeDuelsPresence', () => ({
  useKangurMobileHomeDuelsPresence: useKangurMobileHomeDuelsPresenceMock,
}));

vi.mock('./useKangurMobileHomeDuelsRematches', () => ({
  useKangurMobileHomeDuelsRematches: useKangurMobileHomeDuelsRematchesMock,
}));

vi.mock('./useKangurMobileHomeDuelsSpotlight', () => ({
  useKangurMobileHomeDuelsSpotlight: useKangurMobileHomeDuelsSpotlightMock,
}));

vi.mock('./useKangurMobileTrainingFocus', () => ({
  useKangurMobileTrainingFocus: useKangurMobileTrainingFocusMock,
}));

vi.mock('./useHomeScreenBootState', () => ({
  useHomeScreenBootState: useHomeScreenBootStateMock,
}));

vi.mock('./useHomeScreenDeferredPanels', () => ({
  useHomeScreenDeferredPanels: useHomeScreenDeferredPanelsMock,
  useHomeScreenDeferredPanelGroup: (
    panelKeys: readonly string[],
    isBlocked: boolean,
  ) => panelKeys.map((panelKey) => useHomeScreenDeferredPanelsMock(panelKey, isBlocked)),
  useHomeScreenDeferredPanelSequence: (
    panelKeys: readonly string[],
    isBlocked: boolean,
  ) => {
    let isCurrentPanelBlocked = isBlocked;

    return panelKeys.map((panelKey) => {
      const isPanelReady = useHomeScreenDeferredPanelsMock(
        panelKey,
        isCurrentPanelBlocked,
      );

      isCurrentPanelBlocked = !isPanelReady;
      return isPanelReady;
    });
  },
}));

let HomeScreen: typeof import('../../app/index').default;
let KangurMobileI18nProvider: typeof import('../i18n/kangurMobileI18n').KangurMobileI18nProvider;

const renderHomeScreen = (locale?: 'pl' | 'en' | 'de') =>
  render(
    locale ? (
      <KangurMobileI18nProvider locale={locale}>
        <HomeScreen />
      </KangurMobileI18nProvider>
    ) : (
      <HomeScreen />
    ),
  );

describe('HomeScreen', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    vi.resetModules();
    vi.stubGlobal('__DEV__', false);
    ({ KangurMobileI18nProvider } = await import('../i18n/kangurMobileI18n'));
    ({ default: HomeScreen } = await import('../../app/index'));
    const progressSnapshot = createDefaultKangurProgressState();
    const storageSnapshot = new Map<string, string>();
    subscribeToProgressMock.mockImplementation(() => () => {});
    shareKangurDuelInviteMock.mockResolvedValue(undefined);
    useLocalSearchParamsMock.mockReturnValue({});
    useRouterMock.mockReturnValue({
      replace: replaceMock,
    });
    useHomeScreenBootStateMock.mockReturnValue(false);
    useHomeScreenDeferredPanelsMock.mockReturnValue(true);
    useKangurMobileRuntimeMock.mockReturnValue({
      apiBaseUrl: 'http://localhost:3000',
      apiBaseUrlSource: 'env',
      progressStore: {
        subscribeToProgress: subscribeToProgressMock,
        loadProgress: () => progressSnapshot,
      },
      storage: {
        getItem: (key: string) => storageSnapshot.get(key) ?? null,
        removeItem: (key: string) => {
          storageSnapshot.delete(key);
        },
        setItem: (key: string, value: string) => {
          storageSnapshot.set(key, value);
        },
      },
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
      isDeferred: false,
      isAuthenticated: false,
      isLoading: false,
      isRestoringAuth: false,
      outgoingChallenges: [],
      refresh: vi.fn(),
    });
    useKangurMobileHomeDuelsLeaderboardMock.mockReturnValue({
      entries: [],
      error: null,
      isLoading: false,
      refresh: vi.fn(),
    });
    useKangurMobileHomeAssignmentsMock.mockReturnValue({
      assignmentItems: [],
    });
    useKangurMobileHomeBadgesMock.mockReturnValue({
      recentBadges: [],
      remainingBadges: 9,
      totalBadges: 9,
      unlockedBadges: 0,
    });
    useKangurMobileHomeLessonCheckpointsMock.mockReturnValue({
      recentCheckpoints: [],
    });
    useKangurMobileHomeLessonMasteryMock.mockReturnValue({
      lessonsNeedingPractice: 0,
      masteredLessons: 0,
      strongest: [],
      trackedLessons: 0,
      weakest: [],
    });
    useKangurMobileHomeDuelsPresenceMock.mockReturnValue({
      actionError: null,
      createPrivateChallenge: vi.fn(),
      entries: [],
      error: null,
      isActionPending: false,
      isAuthenticated: false,
      isLoading: false,
      isRestoringAuth: false,
      pendingLearnerId: null,
      refresh: vi.fn(),
    });
    useKangurMobileHomeDuelsRematchesMock.mockReturnValue({
      actionError: null,
      createRematch: vi.fn(),
      error: null,
      isActionPending: false,
      isAuthenticated: false,
      isLoading: false,
      isRestoringAuth: false,
      opponents: [],
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
      recentResults: [],
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
      recentResults: [],
      refresh: vi.fn(),
      strongestLessonFocus: null,
      strongestOperation: null,
      weakestLessonFocus: null,
      weakestOperation: null,
    });

    renderHomeScreen();

    expect(screen.getByText('Kangur mobilnie')).toBeTruthy();
    expect(screen.getByText('Wyniki 0')).toBeTruthy();
    expect(screen.getByText('Checkpointy 0')).toBeTruthy();
    expect(screen.getByText('Fokus treningowy: Trening mieszany')).toBeTruthy();
    expect(screen.getByText('Plan dnia teraz')).toBeTruthy();
    expect(screen.getByText('Status: przywracanie')).toBeTruthy();
    expect(screen.getByText('Użytkownik: przywracanie logowania')).toBeTruthy();
    expect(
      screen.getByText(
        'Przywracamy teraz logowanie, ostatnie wyniki i wskazówki treningowe.',
      ),
    ).toBeTruthy();
    expect(
      screen.getByText('Przywracamy logowanie i fokus treningowy oparty na wynikach.'),
    ).toBeTruthy();
    expect(screen.getByText('Pobieramy wyniki ucznia.')).toBeTruthy();
    expect(screen.queryByText('Login ucznia')).toBeNull();
    expect(useKangurMobileRecentResultsMock).not.toHaveBeenCalled();
    expect(useKangurMobileTrainingFocusMock).not.toHaveBeenCalled();
  });

  it('renders the home loading shell before the home panels settle', () => {
    useHomeScreenBootStateMock.mockReturnValue(true);

    renderHomeScreen();

    expect(document.querySelector('[testid="home-loading-shell"]')).not.toBeNull();
    expect(document.querySelector('[testid="home-loading-hero"]')).not.toBeNull();
    expect(document.querySelector('[testid="home-loading-account-card"]')).not.toBeNull();
    expect(document.querySelector('[testid="home-loading-navigation-card"]')).not.toBeNull();
    expect(screen.queryByText('Kangur mobilnie')).toBeNull();
    expect(subscribeToProgressMock).not.toHaveBeenCalled();
    expect(useHomeScreenDeferredPanelsMock).not.toHaveBeenCalled();
    expect(useKangurMobileAuthMock).not.toHaveBeenCalled();
    expect(useKangurMobileRecentResultsMock).not.toHaveBeenCalled();
    expect(useKangurMobileTrainingFocusMock).not.toHaveBeenCalled();
    expect(useKangurMobileHomeDuelsInvitesMock).not.toHaveBeenCalled();
  });

  it('shows duel placeholders until deferred home panels are ready', () => {
    useHomeScreenDeferredPanelsMock.mockReturnValue(false);

    renderHomeScreen();

    expect(
      screen.getByText(
        'Przygotowujemy zaproszenia, wysłane wyzwania i szybkie rewanże na ekran startowy.',
      ),
    ).toBeTruthy();
    expect(
      screen.getByText(
        'Przygotowujemy aktywnych rywali, pojedynki na żywo i ranking na następny etap ekranu startowego.',
      ),
    ).toBeTruthy();
    expect(
      screen.queryByText(
        'Po zalogowaniu zobaczysz tutaj prywatne zaproszenia do pojedynków od innych uczniów.',
      ),
    ).toBeNull();
    expect(
      screen.getByText(
        'Przygotowujemy fokus treningowy oparty na wynikach na ekran startowy.',
      ),
    ).toBeTruthy();
    expect(useKangurMobileHomeDuelsInvitesMock).not.toHaveBeenCalled();
    expect(useKangurMobileHomeDuelsPresenceMock).not.toHaveBeenCalled();
    expect(useKangurMobileHomeDuelsRematchesMock).not.toHaveBeenCalled();
    expect(useKangurMobileHomeDuelsSpotlightMock).not.toHaveBeenCalled();
    expect(useKangurMobileHomeDuelsLeaderboardMock).not.toHaveBeenCalled();
    expect(useKangurMobileRecentResultsMock).not.toHaveBeenCalled();
    expect(useKangurMobileTrainingFocusMock).not.toHaveBeenCalled();
  });

  it('keeps the shared home progress subscription deferred until the progress stage is ready', () => {
    useHomeScreenDeferredPanelsMock.mockImplementation(
      (panelKey: string) => panelKey !== 'home:progress',
    );

    renderHomeScreen();

    expect(screen.getByText('Kangur mobilnie')).toBeTruthy();
    expect(subscribeToProgressMock).not.toHaveBeenCalled();
    expect(useKangurMobileHomeLessonCheckpointsMock).not.toHaveBeenCalledWith({
      limit: 1,
    });
  });

  it('keeps duel cards deferred until the secondary duel stage is ready', () => {
    useHomeScreenDeferredPanelsMock.mockImplementation(
      (panelKey: string) =>
        panelKey !== 'home:duels:secondary' &&
        panelKey !== 'home:duels:invites' &&
        panelKey !== 'home:duels:advanced',
    );

    renderHomeScreen();

    expect(screen.getByText('Zaproszenia do pojedynków')).toBeTruthy();
    expect(screen.getByText('Wysłane wyzwania')).toBeTruthy();
    expect(
      screen.getAllByText(
        'Przygotowujemy kolejne karty pojedynków na następny etap ekranu startowego.',
      ),
    ).toHaveLength(6);
    expect(
      screen.queryByText(
        'Po zalogowaniu zobaczysz tutaj prywatne zaproszenia do pojedynków od innych uczniów.',
      ),
    ).toBeNull();
    expect(
      screen.queryByText(
        'Po zalogowaniu pojawią się tutaj Twoje prywatne wyzwania razem z akcją ponownego udostępnienia zaproszenia.',
      ),
    ).toBeNull();
    expect(
      screen.queryByText(
        'Po zalogowaniu zobaczysz tutaj aktywnych rywali z lobby pojedynków razem z bezpośrednią akcją prywatnego wyzwania.',
      ),
    ).toBeNull();
    expect(
      screen.queryByText(
        'Teraz nie ma aktywnych publicznych pojedynków. Otwórz lobby, aby wystartować z nowym meczem albo poczekać na kolejnego rywala.',
      ),
    ).toBeNull();
    expect(
      screen.queryByText(
        'Po zalogowaniu pojawią się tutaj ostatni rywale razem z akcją szybkiego prywatnego rewanżu.',
      ),
    ).toBeNull();
    expect(
      screen.queryByText(
        'W tym oknie nie ma jeszcze zakończonych pojedynków. Pierwsze skończone serie od razu wypełnią tutaj ten stan pojedynków.',
      ),
    ).toBeNull();
    expect(useKangurMobileHomeDuelsInvitesMock).not.toHaveBeenCalled();
    expect(useKangurMobileHomeDuelsPresenceMock).not.toHaveBeenCalled();
    expect(useKangurMobileHomeDuelsRematchesMock).not.toHaveBeenCalled();
    expect(useKangurMobileHomeDuelsSpotlightMock).not.toHaveBeenCalled();
    expect(useKangurMobileHomeDuelsLeaderboardMock).not.toHaveBeenCalled();
  });

  it('keeps private duel refresh deferred until the invites stage is ready', () => {
    useHomeScreenDeferredPanelsMock.mockImplementation(
      (panelKey: string) =>
        panelKey !== 'home:duels:invites' && panelKey !== 'home:duels:advanced',
    );
    useKangurMobileAuthMock.mockReturnValue({
      authError: null,
      authMode: 'learner-session',
      developerAutoSignInEnabled: false,
      hasAttemptedDeveloperAutoSignIn: false,
      isLoadingAuth: false,
      session: {
        status: 'authenticated',
        user: {
          activeLearner: {
            displayName: 'Ada Learner',
            id: 'learner-1',
          },
          actorType: 'learner',
          full_name: 'Ada Learner',
        },
      },
      signIn: vi.fn(),
      signInWithLearnerCredentials: vi.fn(),
      signOut: vi.fn(),
      supportsLearnerCredentials: true,
    });
    useKangurMobileHomeDuelsInvitesMock.mockReturnValue({
      error: null,
      invites: [],
      isDeferred: true,
      isAuthenticated: true,
      isLoading: false,
      isRestoringAuth: false,
      outgoingChallenges: [],
      refresh: vi.fn(),
    });

    renderHomeScreen();

    expect(
      screen.getByText(
        'Przygotowujemy odświeżone prywatne zaproszenia do pojedynków na kolejny etap ekranu startowego.',
      ),
    ).toBeTruthy();
    expect(
      screen.getByText(
        'Przygotowujemy odświeżone wysłane wyzwania na kolejny etap ekranu startowego.',
      ),
    ).toBeTruthy();
    expect(useKangurMobileHomeDuelsInvitesMock).toHaveBeenCalledWith({
      enabled: false,
    });
    expect(useKangurMobileHomeDuelsPresenceMock).toHaveBeenCalledWith({
      enabled: false,
    });
  });

  it('keeps advanced duel cards deferred until the advanced duel stage is ready', () => {
    useHomeScreenDeferredPanelsMock.mockImplementation(
      (panelKey: string) => panelKey !== 'home:duels:advanced',
    );
    useKangurMobileAuthMock.mockReturnValue({
      authError: null,
      authMode: 'learner-session',
      developerAutoSignInEnabled: false,
      hasAttemptedDeveloperAutoSignIn: false,
      isLoadingAuth: false,
      session: {
        status: 'authenticated',
        user: {
          activeLearner: {
            displayName: 'Ada Learner',
            id: 'learner-1',
          },
          actorType: 'learner',
          full_name: 'Ada Learner',
        },
      },
      signIn: vi.fn(),
      signInWithLearnerCredentials: vi.fn(),
      signOut: vi.fn(),
      supportsLearnerCredentials: true,
    });
    useKangurMobileHomeDuelsInvitesMock.mockReturnValue({
      error: null,
      invites: [],
      isDeferred: false,
      isAuthenticated: true,
      isLoading: false,
      isRestoringAuth: false,
      outgoingChallenges: [],
      refresh: vi.fn(),
    });

    renderHomeScreen();

    expect(screen.getByText('Zaproszenia do pojedynków')).toBeTruthy();
    expect(screen.getByText('Wysłane wyzwania')).toBeTruthy();
    expect(
      screen.getByText(
        'Brak oczekujących zaproszeń. Możesz otworzyć lobby i wysłać nowe wyzwanie.',
      ),
    ).toBeTruthy();
    expect(
      screen.getByText(
        'Nie wysłano jeszcze prywatnych wyzwań. Otwórz lobby, aby od razu zaprosić rywala.',
      ),
    ).toBeTruthy();
    expect(
      screen.getAllByText(
        'Przygotowujemy kolejne karty pojedynków na następny etap ekranu startowego.',
      ),
    ).toHaveLength(4);
    expect(useKangurMobileHomeDuelsInvitesMock).toHaveBeenCalledWith({
      enabled: true,
    });
    expect(useKangurMobileHomeDuelsPresenceMock).toHaveBeenCalledWith({
      enabled: false,
    });
    expect(useKangurMobileHomeDuelsRematchesMock).toHaveBeenCalledWith({
      enabled: false,
    });
    expect(useKangurMobileHomeDuelsSpotlightMock).not.toHaveBeenCalled();
    expect(useKangurMobileHomeDuelsLeaderboardMock).not.toHaveBeenCalled();
  });

  it('keeps secondary home insights deferred until the staged gate is ready', () => {
    useHomeScreenDeferredPanelsMock.mockImplementation((panelKey: string) =>
      panelKey === 'home:duels',
    );

    renderHomeScreen();

    expect(screen.getByText('Więcej danych startowych')).toBeTruthy();
    expect(
      screen.getByText(
        'Przygotowujemy zapisane lekcje, odznaki, zadania i rozszerzoną sekcję wyników na ekran startowy.',
      ),
    ).toBeTruthy();
    expect(screen.queryByText('Plan lekcji ze startu')).toBeNull();
    expect(useKangurMobileHomeAssignmentsMock).not.toHaveBeenCalled();
    expect(useKangurMobileHomeLessonMasteryMock).not.toHaveBeenCalled();
    expect(useKangurMobileHomeBadgesMock).not.toHaveBeenCalled();
    expect(useKangurMobileHomeLessonCheckpointsMock).not.toHaveBeenCalled();
    expect(useKangurMobileRecentResultsMock).not.toHaveBeenCalled();
    expect(useKangurMobileTrainingFocusMock).not.toHaveBeenCalled();
  });

  it('keeps live lesson insights deferred while recent lessons render from the boot snapshot', () => {
    const progressSnapshot = {
      ...createDefaultKangurProgressState(),
      lessonMastery: {
        adding: {
          attempts: 3,
          bestScorePercent: 72,
          completions: 1,
          lastCompletedAt: '2026-03-21T08:12:00.000Z',
          lastScorePercent: 70,
          masteryPercent: 68,
        },
      },
    };
    useHomeScreenDeferredPanelsMock.mockImplementation(
      (panelKey: string) => panelKey !== 'home:insights:lessons',
    );
    useKangurMobileRuntimeMock.mockReturnValue({
      apiBaseUrl: 'http://localhost:3000',
      apiBaseUrlSource: 'env',
      progressStore: {
        subscribeToProgress: subscribeToProgressMock,
        loadProgress: () => progressSnapshot,
      },
    });

    renderHomeScreen();

    expect(screen.getByText('Plan lekcji ze startu')).toBeTruthy();
    expect(
      screen.getByText(
        'Przygotowujemy pełne podsumowanie lekcji na kolejny etap ekranu startowego.',
      ),
    ).toBeTruthy();
    expect(screen.getByText('Powrót do ostatnich lekcji')).toBeTruthy();
    expect(screen.getByText('➕ Dodawanie')).toBeTruthy();
    expect(screen.getByText('Wróć do lekcji: Dodawanie')).toBeTruthy();
    expect(useKangurMobileHomeLessonMasteryMock).not.toHaveBeenCalled();
    expect(useKangurMobileHomeLessonCheckpointsMock).toHaveBeenCalledTimes(1);
    expect(useKangurMobileHomeLessonCheckpointsMock).toHaveBeenCalledWith({
      limit: 1,
    });
  });

  it('keeps lesson plan details deferred until the dedicated lesson-plan stage is ready', () => {
    useHomeScreenDeferredPanelsMock.mockImplementation(
      (panelKey: string) => panelKey !== 'home:insights:lessons:plan:details',
    );

    renderHomeScreen();

    expect(screen.getByText('Plan lekcji ze startu')).toBeTruthy();
    expect(
      screen.getByText(
        'Od razu zobacz, co wymaga powtórki, a którą lekcję trzeba tylko krótko odświeżyć.',
      ),
    ).toBeTruthy();
    expect(
      screen.getByText(
        'Przygotowujemy szczegółowe karty lekcji i wskazówki nauki na kolejny etap ekranu startowego.',
      ),
    ).toBeTruthy();
    expect(screen.queryByText('Śledzone 2')).toBeNull();
    expect(screen.queryByText('Opanowane 1')).toBeNull();
    expect(screen.queryByText('Najmocniejsza lekcja')).toBeNull();
    expect(screen.getByText('Powrót do ostatnich lekcji')).toBeTruthy();
    expect(useKangurMobileHomeLessonMasteryMock).not.toHaveBeenCalled();
    expect(useKangurMobileHomeLessonCheckpointsMock).toHaveBeenCalledWith({
      limit: 1,
    });
  });

  it('keeps recent lesson details deferred until the dedicated recent-lessons stage is ready', () => {
    useHomeScreenDeferredPanelsMock.mockImplementation(
      (panelKey: string) => panelKey !== 'home:insights:lessons:recent:details',
    );
    useKangurMobileHomeLessonCheckpointsMock.mockReturnValue({
      recentCheckpoints: [
        {
          attempts: 3,
          bestScorePercent: 72,
          componentId: 'adding',
          emoji: '➕',
          lastCompletedAt: '2026-03-21T08:12:00.000Z',
          lastScorePercent: 70,
          lessonHref: {
            pathname: '/lessons',
            params: {
              focus: 'adding',
            },
          },
          masteryPercent: 68,
          practiceHref: {
            pathname: '/practice',
            params: {
              operation: 'addition',
            },
          },
          title: 'Dodawanie',
        },
      ],
    });

    renderHomeScreen();

    expect(screen.getByText('Powrót do ostatnich lekcji')).toBeTruthy();
    expect(
      screen.getByText(
        'Przygotowujemy kolejne zapisane lekcje i szybkie przejścia na kolejny etap ekranu startowego.',
      ),
    ).toBeTruthy();
    expect(screen.queryByText('Nie ma jeszcze zapisanych checkpointów. Otwórz lekcję i zapisz pierwszy stan, aby ostatnie lekcje pojawiły się tutaj.')).toBeNull();
    expect(screen.queryByText('Otwórz wszystkie lekcje')).toBeNull();
  });

  it('keeps tertiary home insights deferred until the extra stage is ready', () => {
    useHomeScreenDeferredPanelsMock.mockImplementation(
      (panelKey: string) => panelKey !== 'home:insights:extras',
    );

    renderHomeScreen();

    expect(screen.getByText('Plan lekcji ze startu')).toBeTruthy();
    expect(screen.getByText('Powrót do ostatnich lekcji')).toBeTruthy();
    expect(screen.getByText('Kolejne zapisane sekcje')).toBeTruthy();
    expect(
      screen.getByText(
        'Przygotowujemy odznaki, zadania i centrum wyników na kolejny etap ekranu startowego.',
      ),
    ).toBeTruthy();
    expect(screen.queryByText('Centrum odznak')).toBeNull();
    expect(screen.queryByText('Plan z ekranu głównego')).toBeNull();
    expect(screen.queryByText('Centrum wyników')).toBeNull();
    expect(useKangurMobileHomeAssignmentsMock).not.toHaveBeenCalled();
    expect(useKangurMobileHomeBadgesMock).not.toHaveBeenCalled();
  });

  it('keeps the live score refresh deferred until the dedicated score stage is ready', () => {
    useHomeScreenDeferredPanelsMock.mockImplementation(
      (panelKey: string) => panelKey !== 'home:insights:scores',
    );
    useKangurMobileAuthMock.mockReturnValue({
      authError: null,
      authMode: 'learner-session',
      developerAutoSignInEnabled: false,
      hasAttemptedDeveloperAutoSignIn: false,
      isLoadingAuth: false,
      session: {
        status: 'authenticated',
        user: {
          activeLearner: {
            displayName: 'Maja Uczennica',
            id: 'learner-1',
          },
          actorType: 'learner',
          canManageLearners: false,
          full_name: 'Maja Uczennica',
        },
      },
      signIn: vi.fn(),
      signInWithLearnerCredentials: vi.fn(),
      signOut: vi.fn(),
      supportsLearnerCredentials: true,
    });

    renderHomeScreen();

    expect(
      screen.getByText(
        'Przygotowujemy odświeżony fokus treningowy na kolejny etap ekranu startowego.',
      ),
    ).toBeTruthy();
    expect(
      screen.getByText(
        'Przygotowujemy odświeżone podsumowanie wyników na kolejny etap ekranu startowego.',
      ),
    ).toBeTruthy();
    expect(useKangurMobileRecentResultsMock).toHaveBeenCalledWith({
      enabled: false,
    });
    expect(useKangurMobileTrainingFocusMock).toHaveBeenCalledWith({
      enabled: false,
      recentResultsLimit: 3,
    });
  });

  it('keeps authenticated hero score hooks deferred until the dedicated hero score stage is ready', () => {
    const progressSnapshot = createDefaultKangurProgressState();
    const storageSnapshot = new Map<string, string>([
      [
        'kangur.mobile.scores.recent',
        JSON.stringify({
          'learner:learner-1': [
            {
              correct_answers: 7,
              created_by: 'user-1',
              created_date: '2026-03-21T08:00:00.000Z',
              id: 'score-1',
              learner_id: 'learner-1',
              operation: 'addition',
              owner_user_id: 'user-1',
              player_name: 'Ada Learner',
              score: 7,
              subject: 'maths',
              time_taken: 42,
              total_questions: 8,
            },
          ],
        }),
      ],
      [
        'kangur.mobile.scores.trainingFocus',
        JSON.stringify({
          'learner:learner-1': {
            strongestOperation: null,
            weakestOperation: {
              averageAccuracyPercent: 52,
              bestAccuracyPercent: 66,
              family: 'arithmetic',
              operation: 'addition',
              sessions: 3,
            },
          },
        }),
      ],
    ]);
    const getItemMock = vi.fn((key: string) => storageSnapshot.get(key) ?? null);
    useHomeScreenDeferredPanelsMock.mockImplementation(
      (panelKey: string) => panelKey !== 'home:hero:scores',
    );
    useKangurMobileRuntimeMock.mockReturnValue({
      apiBaseUrl: 'http://localhost:3000',
      apiBaseUrlSource: 'env',
      progressStore: {
        subscribeToProgress: subscribeToProgressMock,
        loadProgress: () => progressSnapshot,
      },
      storage: {
        getItem: getItemMock,
        removeItem: (key: string) => {
          storageSnapshot.delete(key);
        },
        setItem: (key: string, value: string) => {
          storageSnapshot.set(key, value);
        },
      },
    });
    useKangurMobileAuthMock.mockReturnValue({
      authError: null,
      authMode: 'learner-session',
      developerAutoSignInEnabled: false,
      hasAttemptedDeveloperAutoSignIn: false,
      isLoadingAuth: false,
      session: {
        status: 'authenticated',
        user: {
          activeLearner: {
            displayName: 'Maja Uczennica',
            id: 'learner-1',
          },
          actorType: 'learner',
          canManageLearners: false,
          full_name: 'Maja Uczennica',
        },
      },
      signIn: vi.fn(),
      signInWithLearnerCredentials: vi.fn(),
      signOut: vi.fn(),
      supportsLearnerCredentials: true,
    });

    renderHomeScreen();

    expect(screen.getByText('Fokus treningowy: Trening mieszany')).toBeTruthy();
    expect(screen.queryByText('Ostatni wynik 7/8')).toBeNull();
    expect(useKangurMobileRecentResultsMock).not.toHaveBeenCalled();
    expect(useKangurMobileTrainingFocusMock).not.toHaveBeenCalled();
    expect(getItemMock).not.toHaveBeenCalled();
  });

  it('keeps detailed training focus cards deferred until the dedicated training focus stage is ready', () => {
    useHomeScreenDeferredPanelsMock.mockImplementation(
      (panelKey: string) => panelKey !== 'home:training-focus:details',
    );
    useKangurMobileAuthMock.mockReturnValue({
      authError: null,
      authMode: 'learner-session',
      developerAutoSignInEnabled: false,
      hasAttemptedDeveloperAutoSignIn: false,
      isLoadingAuth: false,
      session: {
        status: 'authenticated',
        user: {
          activeLearner: {
            displayName: 'Maja Uczennica',
            id: 'learner-1',
          },
          actorType: 'learner',
          canManageLearners: false,
          full_name: 'Maja Uczennica',
        },
      },
      signIn: vi.fn(),
      signInWithLearnerCredentials: vi.fn(),
      signOut: vi.fn(),
      supportsLearnerCredentials: true,
    });
    useKangurMobileTrainingFocusMock.mockReturnValue({
      error: null,
      isEnabled: true,
      isLoading: false,
      isRestoringAuth: false,
      recentResults: [],
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

    renderHomeScreen();

    expect(screen.getByText('Fokus treningowy')).toBeTruthy();
    expect(
      screen.getByText(
        'Przygotowujemy szczegółowe karty treningowe na kolejny etap ekranu startowego.',
      ),
    ).toBeTruthy();
    expect(screen.queryByText('Najmocniejszy tryb')).toBeNull();
    expect(screen.queryByText('Trenuj najsłabszy tryb')).toBeNull();
    expect(screen.queryByText('Utrzymaj tempo')).toBeNull();
  });

  it('keeps the long hero intro deferred until the dedicated hero intro stage is ready', () => {
    useHomeScreenDeferredPanelsMock.mockImplementation(
      (panelKey: string) => panelKey !== 'home:hero:intro',
    );
    useKangurMobileAuthMock.mockReturnValue({
      authError: null,
      authMode: 'learner-session',
      developerAutoSignInEnabled: false,
      hasAttemptedDeveloperAutoSignIn: false,
      isLoadingAuth: false,
      session: {
        status: 'authenticated',
        user: {
          activeLearner: {
            displayName: 'Ada Learner',
            id: 'learner-1',
          },
          actorType: 'learner',
          canManageLearners: false,
          full_name: 'Ada Learner',
        },
      },
      signIn: vi.fn(),
      signInWithLearnerCredentials: vi.fn(),
      signOut: vi.fn(),
      supportsLearnerCredentials: true,
    });

    renderHomeScreen();

    expect(screen.getByText('Kangur mobilnie')).toBeTruthy();
    expect(screen.getByText('Witaj ponownie, Ada Learner.')).toBeTruthy();
    expect(
      screen.queryByText(
        'Witaj ponownie, Ada Learner. Zacznij od fokusu treningowego, wróć do ostatniej lekcji albo od razu otwórz plan dnia.',
      ),
    ).toBeNull();
  });

  it('keeps hero chips and secondary quick links deferred until the dedicated hero details stage is ready', () => {
    useHomeScreenDeferredPanelsMock.mockImplementation(
      (panelKey: string) => panelKey !== 'home:hero:details',
    );

    renderHomeScreen();

    expect(screen.getByText('Kangur mobilnie')).toBeTruthy();
    expect(screen.getByText('Fokus treningowy: Trening mieszany')).toBeTruthy();
    expect(
      screen.getByText(
        'Przygotowujemy ostatnią lekcję, ostatni wynik i kolejne szybkie skróty na następny etap ekranu startowego.',
      ),
    ).toBeTruthy();
    expect(screen.queryByText('Wyniki 0')).toBeNull();
    expect(screen.queryByText('Checkpointy 0')).toBeNull();
    expect(screen.queryByText('Plan dnia teraz')).toBeNull();
    expect(screen.queryByText('Ostatnia lekcja: Dodawanie')).toBeNull();
    expect(useKangurMobileHomeLessonCheckpointsMock).not.toHaveBeenCalledWith({
      limit: 1,
    });
  });

  it('keeps results hub summary details deferred until the results stage is ready', () => {
    useHomeScreenDeferredPanelsMock.mockImplementation(
      (panelKey: string) => panelKey !== 'home:insights:results',
    );
    useKangurMobileAuthMock.mockReturnValue({
      authError: null,
      authMode: 'learner-session',
      developerAutoSignInEnabled: false,
      hasAttemptedDeveloperAutoSignIn: false,
      isLoadingAuth: false,
      session: {
        status: 'authenticated',
        user: {
          activeLearner: {
            displayName: 'Maja Uczennica',
            id: 'learner-1',
          },
          actorType: 'learner',
          canManageLearners: false,
          full_name: 'Maja Uczennica',
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
          correct_answers: 7,
          created_by: 'user-1',
          created_date: '2026-03-21T08:00:00.000Z',
          id: 'score-1',
          learner_id: 'learner-1',
          operation: 'addition',
          owner_user_id: 'user-1',
          player_name: 'Ada Learner',
          score: 7,
          subject: 'maths',
          time_taken: 42,
          total_questions: 8,
        },
      ],
    });

    renderHomeScreen();

    expect(screen.getByText('Centrum wyników')).toBeTruthy();
    expect(
      screen.getByText(
        'Przygotowujemy skrót ostatnich wyników na kolejny etap ekranu startowego.',
      ),
    ).toBeTruthy();
    expect(screen.queryByText('Pokaż ostatnie wyniki')).toBeNull();
    expect(screen.queryByText('Otwórz pełną historię')).toBeNull();
    expect(screen.queryByText('7/8 poprawnych')).toBeNull();
    expect(screen.queryByText('Historia trybu: Dodawanie')).toBeNull();
  });

  it('keeps results hub actions deferred until the dedicated results actions stage is ready', () => {
    useHomeScreenDeferredPanelsMock.mockImplementation(
      (panelKey: string) => panelKey !== 'home:insights:results:actions',
    );
    useKangurMobileAuthMock.mockReturnValue({
      authError: null,
      authMode: 'learner-session',
      developerAutoSignInEnabled: false,
      hasAttemptedDeveloperAutoSignIn: false,
      isLoadingAuth: false,
      session: {
        status: 'authenticated',
        user: {
          activeLearner: {
            displayName: 'Maja Uczennica',
            id: 'learner-1',
          },
          actorType: 'learner',
          canManageLearners: false,
          full_name: 'Maja Uczennica',
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
          correct_answers: 7,
          created_by: 'user-1',
          created_date: '2026-03-21T08:00:00.000Z',
          id: 'score-1',
          learner_id: 'learner-1',
          operation: 'addition',
          owner_user_id: 'user-1',
          player_name: 'Ada Learner',
          score: 7,
          subject: 'maths',
          time_taken: 42,
          total_questions: 8,
        },
      ],
    });

    renderHomeScreen();

    expect(screen.getByText('Centrum wyników')).toBeTruthy();
    expect(screen.getAllByText('Ostatni wynik 7/8').length).toBeGreaterThanOrEqual(1);
    expect(
      screen.getByText(
        'Przygotowujemy akcje ostatnich wyników na kolejny etap ekranu startowego.',
      ),
    ).toBeTruthy();
    expect(screen.queryByText('Pokaż ostatnie wyniki')).toBeNull();
    expect(screen.queryByText('Otwórz pełną historię')).toBeNull();
    expect(screen.queryByText('7/8 poprawnych')).toBeNull();
    expect(screen.queryByText('Historia trybu: Dodawanie')).toBeNull();
  });

  it('keeps auto-expanded result cards deferred until the later results cards stage, but opens them on demand', async () => {
    useHomeScreenDeferredPanelsMock.mockImplementation(
      (panelKey: string) => panelKey !== 'home:insights:results:cards',
    );
    useKangurMobileAuthMock.mockReturnValue({
      authError: null,
      authMode: 'learner-session',
      developerAutoSignInEnabled: false,
      hasAttemptedDeveloperAutoSignIn: false,
      isLoadingAuth: false,
      session: {
        status: 'authenticated',
        user: {
          activeLearner: {
            displayName: 'Maja Uczennica',
            id: 'learner-1',
          },
          actorType: 'learner',
          canManageLearners: false,
          full_name: 'Maja Uczennica',
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
          correct_answers: 7,
          created_by: 'user-1',
          created_date: '2026-03-21T08:00:00.000Z',
          id: 'score-1',
          learner_id: 'learner-1',
          operation: 'addition',
          owner_user_id: 'user-1',
          player_name: 'Ada Learner',
          score: 7,
          subject: 'maths',
          time_taken: 42,
          total_questions: 8,
        },
      ],
    });

    renderHomeScreen();

    expect(screen.getByText('Centrum wyników')).toBeTruthy();
    expect(screen.getByText('Pokaż ostatnie wyniki')).toBeTruthy();
    expect(screen.queryByText('7/8 poprawnych')).toBeNull();
    expect(screen.queryByText('Historia trybu: Dodawanie')).toBeNull();

    fireEvent.click(screen.getByText('Pokaż ostatnie wyniki'));

    await waitFor(() => {
      expect(screen.getByText('7/8 poprawnych')).toBeTruthy();
    });
    expect(screen.getByText('Historia trybu: Dodawanie')).toBeTruthy();
  });

  it('starts the shared home progress stage once the boot shell is clear', () => {
    renderHomeScreen();

    expect(useHomeScreenDeferredPanelsMock).toHaveBeenCalledWith('home:progress', false);
  });

  it('keeps account summary details deferred until the dedicated account summary stage is ready', () => {
    useHomeScreenDeferredPanelsMock.mockImplementation(
      (panelKey: string, isBlocked: boolean) =>
        !isBlocked && panelKey !== 'home:account:summary',
    );

    renderHomeScreen();

    expect(screen.getByText('Konto i połączenie')).toBeTruthy();
    expect(
      screen.getByText(
        'Przygotowujemy status, profil ucznia i kolejne szczegóły konta na następny etap ekranu startowego.',
      ),
    ).toBeTruthy();
    expect(screen.queryByText('Status: anonimowy')).toBeNull();
    expect(screen.queryByText('Użytkownik: anonimowy')).toBeNull();
    expect(screen.queryByText('Tryb logowania: learner-session')).toBeNull();
    expect(screen.queryByText('API: http://localhost:3000 (env)')).toBeNull();
    expect(
      screen.getByText(
        'Przygotowujemy formularz logowania ucznia na kolejny etap ekranu startowego. Możesz otworzyć go od razu.',
      ),
    ).toBeTruthy();
    expect(screen.getByText('Otwórz logowanie')).toBeTruthy();
    expect(screen.queryByText('Login ucznia')).toBeNull();
    expect(screen.queryByText('Hasło')).toBeNull();
    expect(screen.queryByText('Zaloguj')).toBeNull();
  });

  it('keeps extended account details deferred until the dedicated account stage is ready', () => {
    useHomeScreenDeferredPanelsMock.mockImplementation(
      (panelKey: string) => panelKey !== 'home:account:details',
    );

    renderHomeScreen();

    expect(screen.getByText('Konto i połączenie')).toBeTruthy();
    expect(screen.getByText('Status: anonimowy')).toBeTruthy();
    expect(screen.getByText('Użytkownik: anonimowy')).toBeTruthy();
    expect(
      screen.getByText(
        'Przygotowujemy kolejne szczegóły konta i połączenia na kolejny etap ekranu startowego.',
      ),
    ).toBeTruthy();
    expect(screen.queryByText('Tryb logowania: learner-session')).toBeNull();
    expect(screen.queryByText('API: http://localhost:3000 (env)')).toBeNull();
    expect(screen.getByText('Login ucznia')).toBeTruthy();
    expect(screen.getByText('Hasło')).toBeTruthy();
    expect(screen.getByText('Zaloguj')).toBeTruthy();
  });

  it('keeps the learner sign-in form deferred until the dedicated account sign-in stage is ready, but opens it on demand', async () => {
    useHomeScreenDeferredPanelsMock.mockImplementation(
      (panelKey: string) => panelKey !== 'home:account:sign-in',
    );

    renderHomeScreen();

    expect(screen.getByText('Konto i połączenie')).toBeTruthy();
    expect(
      screen.getByText(
        'Przygotowujemy formularz logowania ucznia na kolejny etap ekranu startowego. Możesz otworzyć go od razu.',
      ),
    ).toBeTruthy();
    expect(screen.getByText('Otwórz logowanie')).toBeTruthy();
    expect(screen.queryByText('Login ucznia')).toBeNull();
    expect(screen.queryByText('Hasło')).toBeNull();
    expect(screen.queryByText('Zaloguj')).toBeNull();

    fireEvent.click(screen.getByText('Otwórz logowanie'));

    await waitFor(() => {
      expect(screen.getByText('Login ucznia')).toBeTruthy();
    });
    expect(screen.getByText('Hasło')).toBeTruthy();
    expect(screen.getByText('Zaloguj')).toBeTruthy();
  });

  it('keeps secondary navigation links deferred until the dedicated navigation stage is ready', () => {
    useHomeScreenDeferredPanelsMock.mockImplementation(
      (panelKey: string) => panelKey !== 'home:navigation:secondary',
    );

    renderHomeScreen();

    expect(screen.getByText('Nawigacja')).toBeTruthy();
    expect(screen.getByText('Lekcje')).toBeTruthy();
    expect(screen.getByText('Trening')).toBeTruthy();
    expect(
      screen.getByText(
        'Przygotowujemy plan dnia, wyniki i kolejne ścieżki nauki na następny etap ekranu startowego.',
      ),
    ).toBeTruthy();
    expect(screen.queryByText('Plan dnia')).toBeNull();
    expect(screen.queryByText('Wyniki')).toBeNull();
    expect(screen.queryByText('Testy')).toBeNull();
    expect(screen.queryByText('Pojedynki')).toBeNull();
  });

  it('keeps extended navigation links deferred until the dedicated navigation stage is ready', () => {
    useHomeScreenDeferredPanelsMock.mockImplementation(
      (panelKey: string) => panelKey !== 'home:navigation:extended',
    );

    renderHomeScreen();

    expect(screen.getByText('Nawigacja')).toBeTruthy();
    expect(screen.getByText('Lekcje')).toBeTruthy();
    expect(screen.getByText('Trening')).toBeTruthy();
    expect(screen.getByText('Plan dnia')).toBeTruthy();
    expect(screen.getByText('Wyniki')).toBeTruthy();
    expect(
      screen.getByText(
        'Przygotowujemy kolejne skróty nawigacji na kolejny etap ekranu startowego.',
      ),
    ).toBeTruthy();
    expect(screen.queryByText('Konkurs')).toBeNull();
    expect(screen.queryByText('Profil')).toBeNull();
    expect(screen.queryByText('Pojedynki')).toBeNull();
  });

  it('keeps badge and plan details deferred until the extras detail stage is ready', () => {
    useHomeScreenDeferredPanelsMock.mockImplementation(
      (panelKey: string) => panelKey !== 'home:insights:extras:details',
    );

    renderHomeScreen();

    expect(screen.getByText('Kolejne karty postępu')).toBeTruthy();
    expect(
      screen.getByText(
        'Przygotowujemy zapisane odznaki i plan działań na kolejny etap ekranu startowego.',
      ),
    ).toBeTruthy();
    expect(screen.queryByText('Centrum odznak')).toBeNull();
    expect(screen.queryByText('Plan z ekranu głównego')).toBeNull();
    expect(screen.getByText('Centrum wyników')).toBeTruthy();
    expect(useKangurMobileHomeAssignmentsMock).not.toHaveBeenCalled();
    expect(useKangurMobileHomeBadgesMock).not.toHaveBeenCalled();
  });

  it('keeps the plan card deferred while badge details are already live', () => {
    useHomeScreenDeferredPanelsMock.mockImplementation(
      (panelKey: string) => panelKey !== 'home:insights:extras:plan',
    );

    renderHomeScreen();

    expect(screen.getByText('Centrum odznak')).toBeTruthy();
    expect(screen.getByText('Plan z ekranu głównego')).toBeTruthy();
    expect(
      screen.getByText(
        'Przygotowujemy plan działań na kolejny etap ekranu startowego.',
      ),
    ).toBeTruthy();
    expect(
      screen.queryByText(
        'Zamień postęp i zapisane lekcje bezpośrednio w kolejne kroki.',
      ),
    ).toBeNull();
    expect(useKangurMobileHomeBadgesMock).toHaveBeenCalledTimes(1);
    expect(useKangurMobileHomeAssignmentsMock).not.toHaveBeenCalled();
  });

  it('keeps the plan details deferred until the dedicated extras plan details stage is ready', () => {
    useHomeScreenDeferredPanelsMock.mockImplementation(
      (panelKey: string) => panelKey !== 'home:insights:extras:plan:details',
    );

    renderHomeScreen();

    expect(screen.getByText('Centrum odznak')).toBeTruthy();
    expect(screen.getByText('Plan z ekranu głównego')).toBeTruthy();
    expect(
      screen.getByText(
        'Przygotowujemy kolejne zadania i linki działań na kolejny etap ekranu startowego.',
      ),
    ).toBeTruthy();
    expect(
      screen.queryByText(
        'Zamień postęp i zapisane lekcje bezpośrednio w kolejne kroki.',
      ),
    ).toBeNull();
    expect(useKangurMobileHomeBadgesMock).toHaveBeenCalledTimes(1);
    expect(useKangurMobileHomeAssignmentsMock).not.toHaveBeenCalled();
  });

  it('keeps the live plan assignments deferred until the dedicated extras plan-assignments stage is ready', () => {
    useHomeScreenDeferredPanelsMock.mockImplementation(
      (panelKey: string) => panelKey !== 'home:insights:extras:plan:assignments',
    );

    renderHomeScreen();

    expect(screen.getByText('Centrum odznak')).toBeTruthy();
    expect(screen.getByText('Plan z ekranu głównego')).toBeTruthy();
    expect(
      screen.getByText(
        'Przygotowujemy kartę zadań i link do planu dnia na kolejny etap ekranu startowego.',
      ),
    ).toBeTruthy();
    expect(screen.queryByText('Trening celowany')).toBeNull();
    expect(screen.queryByText('Otwórz pełny plan dnia')).toBeNull();
    expect(useKangurMobileHomeBadgesMock).toHaveBeenCalledTimes(1);
    expect(useKangurMobileHomeAssignmentsMock).not.toHaveBeenCalled();
  });

  it('keeps badge details deferred until the dedicated extras badge stage is ready', () => {
    useHomeScreenDeferredPanelsMock.mockImplementation(
      (panelKey: string) => panelKey !== 'home:insights:extras:badges',
    );

    renderHomeScreen();

    expect(screen.getByText('Centrum odznak')).toBeTruthy();
    expect(
      screen.getByText(
        'Przygotowujemy zapisane podsumowanie odznak na kolejny etap ekranu startowego.',
      ),
    ).toBeTruthy();
    expect(screen.queryByText('Ostatnio odblokowane')).toBeNull();
    expect(screen.getByText('Plan z ekranu głównego')).toBeTruthy();
    expect(useKangurMobileHomeBadgesMock).not.toHaveBeenCalled();
    expect(useKangurMobileHomeAssignmentsMock).toHaveBeenCalledTimes(1);
  });

  it('keeps live badge summary deferred until the dedicated extras badge-details stage is ready', () => {
    useHomeScreenDeferredPanelsMock.mockImplementation(
      (panelKey: string) => panelKey !== 'home:insights:extras:badges:details',
    );

    renderHomeScreen();

    expect(screen.getByText('Centrum odznak')).toBeTruthy();
    expect(
      screen.getByText(
        'Przygotowujemy ostatnie odblokowania i linki do odznak na kolejny etap ekranu startowego.',
      ),
    ).toBeTruthy();
    expect(screen.queryByText('Odblokowane 0/9')).toBeNull();
    expect(screen.queryByText('Do zdobycia 9')).toBeNull();
    expect(screen.queryByText('Ostatnio odblokowane')).toBeNull();
    expect(screen.queryByText('Otwórz profil i odznaki')).toBeNull();
    expect(screen.getByText('Plan z ekranu głównego')).toBeTruthy();
    expect(useKangurMobileHomeBadgesMock).not.toHaveBeenCalled();
    expect(useKangurMobileHomeAssignmentsMock).toHaveBeenCalledTimes(1);
  });

  it('keeps the results hub summary deferred until the dedicated extras results stage is ready', () => {
    useHomeScreenDeferredPanelsMock.mockImplementation(
      (panelKey: string) => panelKey !== 'home:insights:extras:results',
    );

    renderHomeScreen();

    expect(screen.getByText('Centrum odznak')).toBeTruthy();
    expect(screen.getByText('Plan z ekranu głównego')).toBeTruthy();
    expect(screen.getByText('Centrum wyników')).toBeTruthy();
    expect(
      screen.getByText(
        'Przygotowujemy zapisane podsumowanie wyników na kolejny etap ekranu startowego.',
      ),
    ).toBeTruthy();
    expect(screen.queryByText('Nie ma tu jeszcze wyników.')).toBeNull();
    expect(screen.queryByText('Otwórz pełną historię')).toBeNull();
    expect(useKangurMobileHomeBadgesMock).toHaveBeenCalledTimes(1);
    expect(useKangurMobileHomeAssignmentsMock).toHaveBeenCalledTimes(1);
  });

  it('shows the parent dashboard link for parent accounts', () => {
    useKangurMobileAuthMock.mockReturnValue({
      authError: null,
      authMode: 'learner-session',
      developerAutoSignInEnabled: false,
      hasAttemptedDeveloperAutoSignIn: false,
      isLoadingAuth: false,
      session: {
        status: 'authenticated',
        user: {
          activeLearner: {
            displayName: 'Maja Uczennica',
            id: 'learner-1',
          },
          actorType: 'parent',
          canManageLearners: true,
          full_name: 'Ada Rodzic',
        },
      },
      signIn: vi.fn(),
      signInWithLearnerCredentials: vi.fn(),
      signOut: vi.fn(),
      supportsLearnerCredentials: true,
    });

    renderHomeScreen();

    expect(screen.getByText('Panel rodzica')).toBeTruthy();
  });

  it('shows duel standing fallbacks when the learner is not yet visible on home', () => {
    useKangurMobileAuthMock.mockReturnValue({
      authError: null,
      authMode: 'learner-session',
      developerAutoSignInEnabled: false,
      hasAttemptedDeveloperAutoSignIn: false,
      isLoadingAuth: false,
      session: {
        status: 'authenticated',
        user: {
          activeLearner: {
            displayName: 'Ada Learner',
            id: 'leader-2',
          },
          actorType: 'learner',
          full_name: 'Ada Learner',
        },
      },
      signIn: vi.fn(),
      signInWithLearnerCredentials: vi.fn(),
      signOut: vi.fn(),
      supportsLearnerCredentials: true,
    });
    useKangurMobileHomeDuelsPresenceMock.mockReturnValue({
      actionError: null,
      createPrivateChallenge: vi.fn(),
      entries: [
        {
          displayName: 'Iga Lobby',
          lastSeenAt: '2026-03-21T08:10:30.000Z',
          learnerId: 'learner-11',
        },
      ],
      error: null,
      isActionPending: false,
      isAuthenticated: true,
      isLoading: false,
      isRestoringAuth: false,
      pendingLearnerId: null,
      refresh: vi.fn(),
    });
    useKangurMobileHomeDuelsLeaderboardMock.mockReturnValue({
      entries: [
        {
          displayName: 'Maja Sprint',
          lastPlayedAt: '2026-03-21T08:03:00.000Z',
          learnerId: 'leader-1',
          losses: 1,
          matches: 4,
          ties: 0,
          winRate: 0.75,
          wins: 3,
        },
      ],
      error: null,
      isLoading: false,
      refresh: vi.fn(),
    });

    renderHomeScreen();

    expect(screen.getByText('Aktywni rywale w lobby')).toBeTruthy();
    expect(
      screen.getByText(
        'To aktywni rywale z lobby pojedynków. Otwórz lobby pojedynków, aby inni zobaczyli tu również Ciebie.',
      ),
    ).toBeTruthy();
    expect(screen.getByText('Iga Lobby')).toBeTruthy();
    expect(screen.getByText('Wyzwij: Iga Lobby')).toBeTruthy();
    expect(screen.getByText('Ranking pojedynków')).toBeTruthy();
    expect(
      screen.getByText(
        'Twojego konta nie widać jeszcze w tym stanie pojedynków. Rozegraj kolejny pojedynek albo otwórz lobby, aby pojawiła się tutaj Twoja pozycja.',
      ),
    ).toBeTruthy();
    expect(screen.getByText(/#1 Maja Sprint/)).toBeTruthy();
    expect(screen.getByText('Pełny ranking pojedynków')).toBeTruthy();
  });

  it('shows the empty results hub when an authenticated learner has no synced results yet', () => {
    useKangurMobileAuthMock.mockReturnValue({
      authError: null,
      authMode: 'learner-session',
      developerAutoSignInEnabled: false,
      hasAttemptedDeveloperAutoSignIn: false,
      isLoadingAuth: false,
      session: {
        status: 'authenticated',
        user: {
          activeLearner: {
            displayName: 'Ada Learner',
            id: 'leader-2',
          },
          actorType: 'learner',
          full_name: 'Ada Learner',
        },
      },
      signIn: vi.fn(),
      signInWithLearnerCredentials: vi.fn(),
      signOut: vi.fn(),
      supportsLearnerCredentials: true,
    });
    useKangurMobileTrainingFocusMock.mockReturnValue({
      error: null,
      isEnabled: true,
      isLoading: false,
      isRestoringAuth: false,
      refresh: vi.fn(),
      recentResults: [],
      strongestLessonFocus: null,
      strongestOperation: null,
      weakestLessonFocus: null,
      weakestOperation: null,
    });

    renderHomeScreen();

    expect(screen.getByText('Centrum wyników')).toBeTruthy();
    expect(screen.getByText('Nie ma tu jeszcze wyników.')).toBeTruthy();
  });

  it('renders authenticated focus cards and recent results after the shell settles', async () => {
    const createPresenceChallengeMock = vi.fn().mockResolvedValue('duel-presence-1');
    const createRematchMock = vi.fn().mockResolvedValue('duel-rematch-1');

    useKangurMobileAuthMock.mockReturnValue({
      authError: null,
      authMode: 'learner-session',
      developerAutoSignInEnabled: false,
      hasAttemptedDeveloperAutoSignIn: false,
      isLoadingAuth: false,
      session: {
        status: 'authenticated',
        user: {
          activeLearner: {
            displayName: 'Ada Learner',
            id: 'leader-2',
          },
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
          series: {
            bestOf: 3,
            completedGames: 1,
            gameIndex: 2,
            id: 'invite-series-1',
            isComplete: false,
            leaderLearnerId: 'learner-2',
            winsByPlayer: {
              'learner-2': 1,
            },
          },
          sessionId: 'invite-1',
          status: 'waiting',
          timePerQuestionSec: 15,
          updatedAt: '2026-03-21T08:05:00.000Z',
          visibility: 'private',
        },
      ],
      isDeferred: false,
      isAuthenticated: true,
      isLoading: false,
      isRestoringAuth: false,
      outgoingChallenges: [
        {
          createdAt: '2026-03-21T08:00:00.000Z',
          difficulty: 'easy',
          host: {
            bonusPoints: 0,
            currentQuestionIndex: 0,
            displayName: 'Ada Learner',
            joinedAt: '2026-03-21T08:00:00.000Z',
            learnerId: 'learner-1',
            score: 0,
            status: 'ready',
          },
          mode: 'challenge',
          operation: 'addition',
          questionCount: 5,
          series: {
            bestOf: 5,
            completedGames: 2,
            gameIndex: 3,
            id: 'outgoing-series-1',
            isComplete: false,
            leaderLearnerId: 'learner-1',
            winsByPlayer: {
              'learner-1': 2,
            },
          },
          sessionId: 'outgoing-home-1',
          status: 'waiting',
          timePerQuestionSec: 15,
          updatedAt: '2026-03-21T08:06:00.000Z',
          visibility: 'private',
        },
      ],
      refresh: vi.fn(),
    });
    useKangurMobileHomeDuelsRematchesMock.mockReturnValue({
      actionError: null,
      createRematch: createRematchMock,
      error: null,
      isActionPending: false,
      isAuthenticated: true,
      isLoading: false,
      isRestoringAuth: false,
      opponents: [
        {
          displayName: 'Nina Turbo',
          lastPlayedAt: '2026-03-21T08:04:00.000Z',
          learnerId: 'learner-8',
        },
      ],
      refresh: vi.fn(),
    });
    useKangurMobileHomeDuelsLeaderboardMock.mockReturnValue({
      entries: [
        {
          displayName: 'Ola',
          lastPlayedAt: '2026-03-21T08:03:00.000Z',
          learnerId: 'leader-1',
          losses: 1,
          matches: 4,
          ties: 0,
          winRate: 0.75,
          wins: 3,
        },
        {
          displayName: 'Ada Learner',
          lastPlayedAt: '2026-03-21T08:01:00.000Z',
          learnerId: 'leader-2',
          losses: 2,
          matches: 5,
          ties: 0,
          winRate: 0.6,
          wins: 3,
        },
      ],
      error: null,
      isLoading: false,
      refresh: vi.fn(),
    });
    useKangurMobileHomeDuelsPresenceMock.mockReturnValue({
      actionError: null,
      createPrivateChallenge: createPresenceChallengeMock,
      entries: [
        {
          displayName: 'Iga Lobby',
          lastSeenAt: '2026-03-21T08:10:30.000Z',
          learnerId: 'learner-11',
        },
        {
          displayName: 'Ada Learner',
          lastSeenAt: '2026-03-21T08:09:30.000Z',
          learnerId: 'leader-2',
        },
      ],
      error: null,
      isActionPending: false,
      isAuthenticated: true,
      isLoading: false,
      isRestoringAuth: false,
      pendingLearnerId: null,
      refresh: vi.fn(),
    });
    useKangurMobileHomeAssignmentsMock.mockReturnValue({
      assignmentItems: [
        {
          assignment: {
            action: {
              label: 'Open lesson',
              page: 'Lessons',
              query: {
                focus: 'adding',
              },
            },
            description:
              'To jeden z najsłabszych obszarów (58%). Potrzebna jest szybka powtórka i kolejna próba.',
            id: 'lesson-retry-adding',
            priority: 'high',
            target: '1 powtórka + wynik min. 75%',
            title: '➕ Powtórka: Dodawanie',
          },
          href: {
            pathname: '/lessons',
            params: {
              focus: 'adding',
            },
          },
        },
        {
          assignment: {
            action: {
              label: 'Practice now',
              page: 'Game',
              query: {
                operation: 'addition',
              },
            },
            description:
              'Po powtórkach uruchom trening celowany, aby od razu sprawdzić najsłabszy obszar w praktyce.',
            id: 'mixed-practice',
            priority: 'medium',
            target: '8 pytań',
            title: 'Trening celowany',
          },
          href: {
            pathname: '/practice',
            params: {
              operation: 'addition',
            },
          },
        },
      ],
    });
    useKangurMobileHomeLessonCheckpointsMock.mockReturnValue({
      recentCheckpoints: [
        {
          attempts: 3,
          bestScorePercent: 72,
          componentId: 'adding',
          emoji: '➕',
          lastCompletedAt: '2026-03-21T08:12:00.000Z',
          lastScorePercent: 70,
          lessonHref: {
            pathname: '/lessons',
            params: {
              focus: 'adding',
            },
          },
          masteryPercent: 68,
          practiceHref: {
            pathname: '/practice',
            params: {
              operation: 'addition',
            },
          },
          title: 'Dodawanie',
        },
        {
          attempts: 5,
          bestScorePercent: 100,
          componentId: 'clock',
          emoji: '🕒',
          lastCompletedAt: '2026-03-21T08:10:00.000Z',
          lastScorePercent: 100,
          lessonHref: {
            pathname: '/lessons',
            params: {
              focus: 'clock',
            },
          },
          masteryPercent: 96,
          practiceHref: {
            pathname: '/practice',
            params: {
              operation: 'clock',
            },
          },
          title: 'Zegar',
        },
      ],
    });
    useKangurMobileHomeBadgesMock.mockReturnValue({
      recentBadges: [
        {
          emoji: '🕐',
          id: 'clock_master',
          name: 'Mistrz zegara',
        },
        {
          emoji: '📚',
          id: 'lesson_hero',
          name: 'Bohater lekcji',
        },
      ],
      remainingBadges: 7,
      totalBadges: 9,
      unlockedBadges: 2,
    });
    useKangurMobileHomeLessonMasteryMock.mockReturnValue({
      lessonsNeedingPractice: 1,
      masteredLessons: 1,
      strongest: [
        {
          attempts: 5,
          bestScorePercent: 100,
          componentId: 'clock',
          emoji: '🕒',
          lastCompletedAt: '2026-03-21T08:06:00.000Z',
          lastScorePercent: 100,
          lessonHref: {
            pathname: '/lessons',
            params: {
              focus: 'clock',
            },
          },
          masteryPercent: 96,
          practiceHref: {
            pathname: '/practice',
            params: {
              operation: 'clock',
            },
          },
          title: 'Zegar',
        },
      ],
      trackedLessons: 2,
      weakest: [
        {
          attempts: 3,
          bestScorePercent: 72,
          componentId: 'adding',
          emoji: '➕',
          lastCompletedAt: '2026-03-21T08:02:00.000Z',
          lastScorePercent: 70,
          lessonHref: {
            pathname: '/lessons',
            params: {
              focus: 'adding',
            },
          },
          masteryPercent: 68,
          practiceHref: {
            pathname: '/practice',
            params: {
              operation: 'addition',
            },
          },
          title: 'Dodawanie',
        },
      ],
    });
    useKangurMobileTrainingFocusMock.mockReturnValue({
      error: null,
      isEnabled: true,
      isLoading: false,
      isRestoringAuth: false,
      recentResults: [
        {
          id: 'score-1',
          operation: 'clock',
          correct_answers: 7,
          total_questions: 8,
        },
      ],
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
          series: {
            bestOf: 3,
            completedGames: 1,
            gameIndex: 2,
            id: 'spotlight-series-1',
            isComplete: false,
            leaderLearnerId: 'learner-4',
            winsByPlayer: {
              'learner-4': 1,
            },
          },
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

    renderHomeScreen();

    expect(
      screen.getByText(
        'Witaj ponownie, Ada Learner. Zacznij od fokusu treningowego, wróć do ostatniej lekcji albo od razu otwórz plan dnia.',
      ),
    ).toBeTruthy();
    expect(screen.getByText('Wyniki 1')).toBeTruthy();
    expect(screen.getByText('Ostatni wynik 7/8')).toBeTruthy();
    expect(screen.getByText('Ostatnia lekcja Dodawanie')).toBeTruthy();
    expect(screen.getByText('Fokus treningowy: Dodawanie')).toBeTruthy();
    expect(screen.getByText('Ostatnia lekcja: Dodawanie')).toBeTruthy();
    expect(screen.getByText('Plan dnia teraz')).toBeTruthy();
    expect(screen.getByText('Status: zalogowany')).toBeTruthy();
    expect(screen.getByText('Użytkownik: Ada Learner (uczen)')).toBeTruthy();
    expect(screen.getAllByText('Do powtórki').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Najmocniejszy tryb')).toBeTruthy();
    expect(screen.getByText('Historia trybu: Dodawanie')).toBeTruthy();
    expect(screen.getAllByText('Historia trybu: Zegar').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Plan lekcji ze startu')).toBeTruthy();
    expect(screen.getByText('Śledzone 2')).toBeTruthy();
    expect(screen.getByText('Opanowane 1')).toBeTruthy();
    expect(screen.getAllByText('Do powtórki').length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('Najmocniejsza lekcja')).toBeTruthy();
    expect(screen.getAllByText('➕ Dodawanie').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('🕒 Zegar').length).toBeGreaterThanOrEqual(2);
    expect(screen.getAllByText('Otwórz lekcję: Dodawanie').length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Trenuj: Dodawanie')).toBeTruthy();
    expect(screen.getByText('Centrum odznak')).toBeTruthy();
    expect(screen.getByText('Odblokowane 2/9')).toBeTruthy();
    expect(screen.getByText('Do zdobycia 7')).toBeTruthy();
    expect(screen.getByText('Ostatnio odblokowane')).toBeTruthy();
    expect(screen.getByText('🕐 Mistrz zegara')).toBeTruthy();
    expect(screen.getByText('📚 Bohater lekcji')).toBeTruthy();
    expect(screen.getByText('Otwórz profil i odznaki')).toBeTruthy();
    expect(screen.getByText('Powrót do ostatnich lekcji')).toBeTruthy();
    expect(screen.getByText('Ostatni wynik 70% • opanowanie 68%')).toBeTruthy();
    expect(screen.getByText('Najlepszy wynik 72% • próby 3')).toBeTruthy();
    expect(screen.getByText('Wróć do lekcji: Dodawanie')).toBeTruthy();
    expect(screen.getByText('Potem trenuj: Dodawanie')).toBeTruthy();
    expect(screen.getByText('Otwórz wszystkie lekcje')).toBeTruthy();
    expect(screen.getByText('Plan z ekranu głównego')).toBeTruthy();
    expect(
      screen.getByText(
        'Zamień postęp i zapisane lekcje bezpośrednio w kolejne kroki.',
      ),
    ).toBeTruthy();
    expect(screen.getByText('➕ Powtórka: Dodawanie')).toBeTruthy();
    expect(screen.getByText('Priorytet wysoki')).toBeTruthy();
    expect(screen.getByText('Cel: 1 powtórka + wynik min. 75%')).toBeTruthy();
    expect(screen.getByText('Trening celowany')).toBeTruthy();
    expect(screen.getByText('Trenuj teraz')).toBeTruthy();
    expect(screen.getByText('Otwórz pełny plan dnia')).toBeTruthy();
    expect(screen.getByText('Centrum wyników')).toBeTruthy();
    expect(
      screen.getByText(
        'Ostatnie wyniki są tutaj pod ręką, aby od razu wrócić do treningu albo pełnej historii.',
      ),
    ).toBeTruthy();
    expect(screen.getByText('7/8 poprawnych')).toBeTruthy();
    expect(screen.getByText('Pojedynki')).toBeTruthy();
    expect(screen.getByText('Zaproszenia do pojedynków')).toBeTruthy();
    expect(screen.getByText('Leo Mentor')).toBeTruthy();
    expect(screen.getByText('Dołącz: Leo Mentor')).toBeTruthy();
    expect(
      screen.getAllByText('Seria BO3 • gra 2 z 3 • ukończone: 1').length,
    ).toBeGreaterThanOrEqual(2);
    expect(screen.getByText('Wysłane wyzwania')).toBeTruthy();
    expect(screen.getByText('Prywatne wyzwanie')).toBeTruthy();
    expect(screen.getByText('Udostępnij link')).toBeTruthy();
    expect(screen.getByText('Seria BO5 • gra 3 z 5 • ukończone: 2')).toBeTruthy();
    expect(screen.getByText('Aktywni rywale w lobby')).toBeTruthy();
    expect(screen.getByText('Iga Lobby')).toBeTruthy();
    expect(screen.getByText('Ada Learner · Ty')).toBeTruthy();
    expect(screen.getByText('Wyzwij: Iga Lobby')).toBeTruthy();
    expect(screen.getByText('Na żywo w pojedynkach')).toBeTruthy();
    expect(screen.getByText('Maja Sprint')).toBeTruthy();
    expect(screen.getByText('Obserwuj na żywo')).toBeTruthy();
    expect(screen.getByText('Ostatni rywale')).toBeTruthy();
    expect(screen.getByText('Nina Turbo')).toBeTruthy();
    expect(screen.getByText('Ranking pojedynków')).toBeTruthy();
    expect(screen.getByText('TWÓJ WYNIK W POJEDYNKACH')).toBeTruthy();
    expect(screen.getByText('#1 Ola')).toBeTruthy();
    expect(screen.getByText('#2 Ada Learner')).toBeTruthy();
    expect(screen.getByText('#2 Ada Learner · Ty')).toBeTruthy();
    expect(screen.getByText('Wygrane 3 • Porażki 1 • Remisy 0')).toBeTruthy();
    expect(screen.getByText('Pełny ranking pojedynków')).toBeTruthy();
    expect(screen.getByText('Otwórz pełną historię')).toBeTruthy();

    fireEvent.click(screen.getByText('Udostępnij link'));

    await waitFor(() => {
      expect(shareKangurDuelInviteMock).toHaveBeenCalledWith({
        sessionId: 'outgoing-home-1',
        sharerDisplayName: 'Ada Learner',
      });
    });

    fireEvent.click(screen.getByText('Wyzwij: Iga Lobby'));

    await waitFor(() => {
      expect(createPresenceChallengeMock).toHaveBeenCalledWith('learner-11');
    });
    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith({
        pathname: '/duels',
        params: {
          sessionId: 'duel-presence-1',
        },
      });
    });

    expect(screen.getByText('Szybki rewanż')).toBeTruthy();

    fireEvent.click(screen.getByText('Szybki rewanż'));

    await waitFor(() => {
      expect(createRematchMock).toHaveBeenCalledWith('learner-8');
    });
    await waitFor(() => {
      expect(replaceMock).toHaveBeenCalledWith({
        pathname: '/duels',
        params: {
          sessionId: 'duel-rematch-1',
        },
      });
    });
  });

  it('renders German mobile chrome when the locale provider resolves de', () => {
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
    useKangurMobileTrainingFocusMock.mockReturnValue({
      error: null,
      isEnabled: true,
      isLoading: false,
      isRestoringAuth: false,
      recentResults: [],
      refresh: vi.fn(),
      strongestLessonFocus: null,
      strongestOperation: null,
      weakestLessonFocus: null,
      weakestOperation: null,
    });

    renderHomeScreen('de');

    expect(screen.getByText('Kangur mobil')).toBeTruthy();
    expect(screen.getByText('Ergebnisse 0')).toBeTruthy();
    expect(screen.getByText('Trainingsfokus: Gemischtes Training')).toBeTruthy();
    expect(screen.getByText('Status: anonym')).toBeTruthy();
    expect(screen.getByText('Schuler-Login')).toBeTruthy();
    expect(screen.getByText('Anmelden')).toBeTruthy();
    expect(screen.getByText('Duelleinladungen')).toBeTruthy();
    expect(screen.getByText('Gesendete Herausforderungen')).toBeTruthy();
    expect(screen.getByText('Aktive Rivalen in der Lobby')).toBeTruthy();
    expect(screen.getByText('Live-Duelle')).toBeTruthy();
    expect(screen.getByText('Duell-Rangliste')).toBeTruthy();
    expect(screen.getByText('Lektionsplan zum Start')).toBeTruthy();
    expect(screen.getByText('Abzeichen-Zentrale')).toBeTruthy();
    expect(screen.getByText('Zurück zu den letzten Lektionen')).toBeTruthy();
    expect(screen.getByText('Plan zum Start')).toBeTruthy();
    expect(
      screen.getByText(
        'Verwandle Fortschritt und gespeicherte Lektionen direkt in die nächsten Schritte.',
      ),
    ).toBeTruthy();
    expect(screen.getByText('Ergebniszentrale')).toBeTruthy();
    expect(
      screen.getByText(
        'Wir bereiten die aktualisierte Ergebnisübersicht für den nächsten Startschritt vor.',
      ),
    ).toBeTruthy();
    expect(
      screen.getByText(
        'Die letzten Ergebnisse bleiben hier griffbereit, damit du direkt wieder ins Training oder in den vollständigen Verlauf springen kannst.',
      ),
    ).toBeTruthy();
    expect(
      screen.getByText(
        'Von hier aus kannst du Lektionen, Training, Ergebnisse und Duelle durchsuchen. Nach der Anmeldung siehst du hier auch Ergebnisse und den Tagesplan.',
      ),
    ).toBeTruthy();
  });

  it('shows the demo CTA when learner credentials are unavailable on home', () => {
    useKangurMobileAuthMock.mockReturnValue({
      authError: null,
      authMode: 'demo',
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
      supportsLearnerCredentials: false,
    });

    renderHomeScreen('de');

    expect(screen.getByText('Demo starten')).toBeTruthy();
  });
});
