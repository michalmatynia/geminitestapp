import type { KangurMobileLocale } from '../i18n/kangurMobileI18n';

export type PracticeScoreSyncStatus =
  | 'syncing'
  | 'awaiting-auth'
  | 'synced'
  | 'local-only'
  | 'sync-failed';

export type PracticeScoreSyncState = {
  status: PracticeScoreSyncStatus;
  message: string;
};

const getPracticeScoreSyncCopy = (
  locale: KangurMobileLocale,
): Record<
  'awaitingAuth' | 'localOnlyAuth' | 'localOnlyExpectedError' | 'synced' | 'syncFailed' | 'syncing',
  string
> => ({
  awaitingAuth: {
    de: 'Das Ergebnis ist lokal gespeichert. Wir warten auf die Wiederherstellung der Lernenden-Sitzung, um es an Kangur zu senden.',
    en: 'The result is saved locally. Waiting for the learner session to be restored so it can be sent to Kangur.',
    pl: 'Wynik zapisany lokalnie. Czekamy na odtworzenie sesji ucznia, aby dosłać go do Kangura.',
  }[locale],
  localOnlyAuth: {
    de: 'Das Ergebnis wurde nur lokal gespeichert. Melde eine Lernenden-Sitzung an, um Ergebnisse an Kangur zu senden.',
    en: 'The result was saved only locally. Sign in the learner session to send results to Kangur.',
    pl: 'Wynik zapisano tylko lokalnie. Zaloguj sesję ucznia, aby wysyłać wyniki do Kangura.',
  }[locale],
  localOnlyExpectedError: {
    de: 'Das Ergebnis wurde nur lokal gespeichert. Die Server-Sitzung war noch nicht bereit fuer die Synchronisierung, deshalb ist das Ergebnis noch nicht bei Kangur angekommen.',
    en: 'The result was saved only locally. The server session was not ready for sync yet, so the result has not reached Kangur.',
    pl: 'Wynik zapisano tylko lokalnie. Sesja serwera nie była gotowa do synchronizacji, więc wynik nie trafił jeszcze do Kangura.',
  }[locale],
  synced: {
    de: 'Das Ergebnis wurde in der Kangur-API gespeichert. Es sollte sofort im Profil, in der Rangliste und in den letzten Ergebnissen sichtbar sein.',
    en: 'The result was saved in the Kangur API. It should be visible right away in the profile, leaderboard, and recent results.',
    pl: 'Wynik zapisano w API Kangura. Powinien być od razu widoczny w profilu, rankingu i ostatnich wynikach.',
  }[locale],
  syncFailed: {
    de: 'Das Ergebnis wurde lokal gespeichert, aber der Schreibvorgang in die Kangur-API ist fehlgeschlagen. Aktualisiere die Sitzung und versuche es erneut.',
    en: 'The result was saved locally, but writing to the Kangur API failed. Refresh the session and try again.',
    pl: 'Wynik zapisano lokalnie, ale zapis do API Kangura nie udał się. Odśwież sesję i spróbuj ponownie.',
  }[locale],
  syncing: {
    de: 'Das Ergebnis ist lokal gespeichert. Wir schreiben es jetzt in die Kangur-API.',
    en: 'The result is saved locally. We are now writing it to the Kangur API.',
    pl: 'Wynik zapisany lokalnie. Zapisujemy go teraz w API Kangura.',
  }[locale],
});

export const buildSyncingState = (
  locale: KangurMobileLocale = 'pl',
): PracticeScoreSyncState => ({
  status: 'syncing',
  message: getPracticeScoreSyncCopy(locale).syncing,
});

export const buildAwaitingAuthRetryState = (
  locale: KangurMobileLocale = 'pl',
): PracticeScoreSyncState => ({
  status: 'awaiting-auth',
  message: getPracticeScoreSyncCopy(locale).awaitingAuth,
});

export const buildSyncedState = (
  locale: KangurMobileLocale = 'pl',
): PracticeScoreSyncState => ({
  status: 'synced',
  message: getPracticeScoreSyncCopy(locale).synced,
});

export const buildLocalOnlySyncState = (
  reason: 'auth' | 'expected-error',
  locale: KangurMobileLocale = 'pl',
): PracticeScoreSyncState => ({
  status: 'local-only',
  message:
    reason === 'auth'
      ? getPracticeScoreSyncCopy(locale).localOnlyAuth
      : getPracticeScoreSyncCopy(locale).localOnlyExpectedError,
});

export const buildUnexpectedSyncFailureState = (
  locale: KangurMobileLocale = 'pl',
): PracticeScoreSyncState => ({
  status: 'sync-failed',
  message: getPracticeScoreSyncCopy(locale).syncFailed,
});

export const resolvePracticeScoreSyncAppearance = (
  status: PracticeScoreSyncStatus,
): {
  backgroundColor: string;
  borderColor: string;
  textColor: string;
} => {
  if (status === 'synced') {
    return {
      backgroundColor: '#ecfdf5',
      borderColor: '#86efac',
      textColor: '#166534',
    };
  }

  if (status === 'sync-failed') {
    return {
      backgroundColor: '#fef2f2',
      borderColor: '#fca5a5',
      textColor: '#b91c1c',
    };
  }

  if (status === 'local-only') {
    return {
      backgroundColor: '#fffbeb',
      borderColor: '#fcd34d',
      textColor: '#92400e',
    };
  }

  if (status === 'awaiting-auth') {
    return {
      backgroundColor: '#eff6ff',
      borderColor: '#93c5fd',
      textColor: '#1d4ed8',
    };
  }

  return {
    backgroundColor: '#eff6ff',
    borderColor: '#93c5fd',
    textColor: '#1d4ed8',
  };
};
