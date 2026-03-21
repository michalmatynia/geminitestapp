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

export const buildSyncingState = (): PracticeScoreSyncState => ({
  status: 'syncing',
  message: 'Wynik zapisany lokalnie. Zapisujemy go teraz w API Kangura.',
});

export const buildAwaitingAuthRetryState = (): PracticeScoreSyncState => ({
  status: 'awaiting-auth',
  message:
    'Wynik zapisany lokalnie. Czekamy na odtworzenie sesji ucznia, aby doslac go do Kangura.',
});

export const buildSyncedState = (): PracticeScoreSyncState => ({
  status: 'synced',
  message:
    'Wynik zapisano w API Kangura. Powinien byc od razu widoczny w profilu, rankingu i ostatnich wynikach.',
});

export const buildLocalOnlySyncState = (
  reason: 'auth' | 'expected-error',
): PracticeScoreSyncState => ({
  status: 'local-only',
  message:
    reason === 'auth'
      ? 'Wynik zapisano tylko lokalnie. Zaloguj sesje ucznia, aby wysylac wyniki do Kangura.'
      : 'Wynik zapisano tylko lokalnie. Sesja serwera nie byla gotowa do synchronizacji, wiec wynik nie trafil jeszcze do Kangura.',
});

export const buildUnexpectedSyncFailureState = (): PracticeScoreSyncState => ({
  status: 'sync-failed',
  message:
    'Wynik zapisano lokalnie, ale zapis do API Kangura nie udal sie. Odswiez sesje i sprobuj ponownie.',
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
