
/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import {
  loadProgressMock,
  persistedHeroRecentScoresBootSnapshot,
  persistedHeroTrainingFocusBootSnapshot,
  persistedLessonCheckpointBootSnapshot,
  renderHomeScreen,
  replaceMock,
  setupHomeScreenTest,
  shareKangurDuelInviteMock,
  subscribeToProgressMock,
  useHomeScreenBootStateMock,
  useHomeScreenDeferredPanelsMock,
  useKangurMobileAuthMock,
  useKangurMobileHomeAssignmentsMock,
  useKangurMobileHomeBadgesMock,
  useKangurMobileHomeDuelsInvitesMock,
  useKangurMobileHomeDuelsLeaderboardMock,
  useKangurMobileHomeDuelsPresenceMock,
  useKangurMobileHomeDuelsRematchesMock,
  useKangurMobileHomeDuelsSpotlightMock,
  useKangurMobileHomeLessonCheckpointsMock,
  useKangurMobileHomeLessonMasteryMock,
  useKangurMobileRecentResultsMock,
  useKangurMobileRuntimeMock,
  useKangurMobileTrainingFocusMock,
} from './HomeScreen.test-support';

describe('HomeScreen', () => {
  setupHomeScreenTest();

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

});
