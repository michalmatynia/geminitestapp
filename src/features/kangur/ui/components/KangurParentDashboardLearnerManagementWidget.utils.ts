'use client';

import { normalizeSiteLocale } from '@/shared/lib/i18n/site-locale';
import type { LearnerManagementCopy, ProfileModalTabId } from './KangurParentDashboardLearnerManagementWidget.types';

export const SESSION_PAGE_LIMIT = 20;

export const PROFILE_MODAL_TABS: Array<{ id: ProfileModalTabId; docId: string }> = [
  { id: 'settings', docId: 'parent_profile_tab_settings' },
  { id: 'metrics', docId: 'parent_profile_tab_metrics' },
];

export const getLearnerManagementCopy = (
  locale: ReturnType<typeof normalizeSiteLocale>
): LearnerManagementCopy => {
  if (locale === 'en') {
    return {
      activeSession: 'Active',
      activeStatus: 'Active',
      addLearner: 'Add learner',
      ageLabel: 'Age',
      agePlaceholder: 'Learner age',
      ageValue: (age) => `${age} years`,
      cancel: 'Cancel',
      confirmRemoval: 'Confirm removal',
      createModalClose: 'Close learner profile creation',
      createModalDescription: 'Add a child and set their login and password right away.',
      createModalTitle: 'New learner profile',
      currentProfileDescriptionPrefix: 'You are updating learner ',
      currentProfileLabel: 'Selected profile',
      disabledStatus: 'Disabled',
      durationLabel: 'Duration',
      endLabel: 'End',
      hidePassword: 'Hide password',
      inProgress: 'In progress',
      lastActivityLabel: 'Last login / activity',
      lastProfileUpdateLabel: 'Last profile update',
      learnerCardAriaLabel: (displayName, statusLabel) =>
        `Learner profile: ${displayName} (${statusLabel})`,
      learnerLoginDescription: (loginName) => `Login: ${loginName}`,
      learnerManagementDescription:
        'The parent signs in with email, and learners get separate login names and passwords.',
      learnerManagementEyebrow: 'Learner profiles',
      learnerManagementTitle: 'Manage profiles without leaving the dashboard',
      learnerNameLabel: 'Learner name',
      learnerNamePlaceholder: 'Learner name',
      learnerNicknameLabel: 'Nickname',
      learnerNicknamePlaceholder: 'nickname',
      learnerPasswordLabel: 'Password',
      learnerProfileSettings: 'Learner profile settings',
      learnerStatusLabel: 'Learner status',
      loadMoreSessions: 'Show older sessions',
      loading: 'Loading...',
      loginLabel: 'Learner login',
      loginOwnershipNote:
        'The login and password belong to the learner, but the account remains owned by the parent.',
      loginSessionsDescription: 'Learner login history with start and end times.',
      loginSessionsEmptyDescription:
        'The learner sessions will appear here after the first sign-in.',
      loginSessionsEmptyTitle: 'No login sessions.',
      loginSessionsLabel: 'Login sessions',
      metricsDescription: 'Quick details about the active learner profile, including recent activity.',
      metricsTab: 'Metrics',
      metricsTitle: 'Learner profile metrics',
      newPasswordOptional: 'New password (optional)',
      newProfileEyebrow: 'New profile',
      noData: 'No data',
      noSessionsError: 'Could not load the session history.',
      olderSessionsError: 'Could not load older sessions.',
      optional: 'optional',
      profileCreatedLabel: 'Profile created',
      profileDetailsDescription:
        'Quick details about the active learner profile, including recent activity.',
      profileDetailsLabel: 'Profile details',
      profileSettingsDescription:
        'Change the learner profile details, login, password, and activity status.',
      profileSettingsTitle: 'Learner profile settings',
      removeLearnerProfile: 'Remove learner profile',
      removalWarning:
        'Warning: removing the learner profile removes their login and access to data. This action cannot be undone.',
      saveLearner: 'Save learner',
      selectedProfileHint: 'Currently selected profile',
      settingsClose: 'Close learner profile settings',
      settingsTab: 'Settings',
      sessionCompleted: 'Completed',
      sessionErrorDescription: 'Try refreshing the metrics in a moment.',
      sessionLabel: (index) => `Session ${index}`,
      sessionsClose: 'Close learner profile metrics',
      sessionsLoadingDescription: 'We are loading the learner session history.',
      sessionsLoadingTitle: 'Loading sessions...',
      showPassword: 'Show password',
      startLabel: 'Start',
      statusLabel: 'Profile status',
      switchProfileHint: 'Click to switch profile',
      tabListLabel: 'Learner profile',
      updatedProfileDescription:
        'Change the learner profile details, login, password, and activity status.',
      widgetFeedbackPrefix: '',
    };
  }

  return {
    activeSession: 'Aktywna',
    activeStatus: 'Aktywny',
    addLearner: 'Dodaj ucznia',
    ageLabel: 'Wiek',
    agePlaceholder: 'Wiek ucznia',
    ageValue: (age) => `${age} lat`,
    cancel: 'Anuluj',
    confirmRemoval: 'Potwierź usunięcie',
    createModalClose: 'Zamknij dodawanie profilu',
    createModalDescription: 'Dodaj dziecko i od razu ustaw jego login oraz hasło do gry.',
    createModalTitle: 'Nowy profil ucznia',
    currentProfileDescriptionPrefix: 'Aktualizujesz dane ucznia ',
    currentProfileLabel: 'Wybrany profil',
    disabledStatus: 'Wyłączony',
    durationLabel: 'Czas trwania',
    endLabel: 'Koniec',
    hidePassword: 'Ukryj hasło',
    inProgress: 'W trakcie',
    lastActivityLabel: 'Ostatnie logowanie / aktywność',
    lastProfileUpdateLabel: 'Ostatnia aktualizacja profilu',
    learnerCardAriaLabel: (displayName, statusLabel) =>
      `Profil ucznia: ${displayName} (${statusLabel})`,
    learnerLoginDescription: (loginName) => `Login: ${loginName}`,
    learnerManagementDescription:
      'Rodzic loguje się emailem, a uczniowie dostają osobne nazwy logowania i hasła.',
    learnerManagementEyebrow: 'Profile uczniów',
    learnerManagementTitle: 'Zarządzaj profilami bez opuszczania panelu',
    learnerNameLabel: 'Imię ucznia',
    learnerNamePlaceholder: 'Imię ucznia',
    learnerNicknameLabel: 'Nick',
    learnerNicknamePlaceholder: 'nick',
    learnerPasswordLabel: 'Hasło',
    learnerProfileSettings: 'Ustawienia profilu ucznia',
    learnerStatusLabel: 'Status ucznia',
    loadMoreSessions: 'Pokaż starsze sesje',
    loading: 'Ładowanie...',
    loginLabel: 'Login ucznia',
    loginOwnershipNote:
      'Login i hasło należą do ucznia, ale konto pozostaje własnością rodzica.',
    loginSessionsDescription: 'Historia logowań ucznia z czasem rozpoczęcia i zakończenia.',
    loginSessionsEmptyDescription: 'Sesje ucznia pojawią się tutaj po pierwszym logowaniu.',
    loginSessionsEmptyTitle: 'Brak sesji logowania.',
    loginSessionsLabel: 'Sesje logowania',
    metricsDescription: 'Szybkie dane o aktywnym profilu ucznia, w tym ostatnia aktywność.',
    metricsTab: 'Metryka',
    metricsTitle: 'Metryka profilu ucznia',
    newPasswordOptional: 'Nowe hasło (opcjonalnie)',
    newProfileEyebrow: 'Nowy profil',
    noData: 'Brak danych',
    noSessionsError: 'Nie udało się wczytać historii sesji.',
    olderSessionsError: 'Nie udało się wczytać starszych sesji.',
    optional: 'opcjonalnie',
    profileCreatedLabel: 'Profil utworzony',
    profileDetailsDescription:
      'Szybkie dane o aktywnym profilu ucznia, w tym ostatnia aktywność.',
    profileDetailsLabel: 'Szczegóły profilu',
    profileSettingsDescription:
      'Zmieniaj dane profilu ucznia, login, hasło oraz status aktywności.',
    profileSettingsTitle: 'Ustawienia profilu ucznia',
    removeLearnerProfile: 'Usuń profil ucznia',
    removalWarning:
      'Uwaga: usunięcie profilu ucznia usuwa jego login i dostęp do danych. Tej operacji nie da się cofnąć.',
    saveLearner: 'Zapisz ucznia',
    selectedProfileHint: 'Aktualnie wybrany profil',
    settingsClose: 'Zamknij ustawienia profilu',
    settingsTab: 'Ustawienia',
    sessionCompleted: 'Zakończona',
    sessionErrorDescription: 'Spróbuj odświeżyć metrykę za chwilę.',
    sessionLabel: (index) => `Sesja ${index}`,
    sessionsClose: 'Zamknij metrykę profilu',
    sessionsLoadingDescription: 'Ładujemy historię sesji ucznia.',
    sessionsLoadingTitle: 'Ładowanie sesji...',
    showPassword: 'Pokaż hasło',
    startLabel: 'Start',
    statusLabel: 'Status profilu',
    switchProfileHint: 'Kliknij, aby przełączyć profil',
    tabListLabel: 'Profil ucznia',
    updatedProfileDescription:
      'Zmieniaj dane profilu ucznia, login, hasło oraz status aktywności.',
    widgetFeedbackPrefix: '',
  };
};
