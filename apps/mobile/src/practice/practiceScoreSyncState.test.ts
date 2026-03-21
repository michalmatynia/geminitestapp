import { describe, expect, it } from 'vitest';

import {
  buildAwaitingAuthRetryState,
  buildLocalOnlySyncState,
  buildSyncedState,
  buildSyncingState,
  buildUnexpectedSyncFailureState,
  resolvePracticeScoreSyncAppearance,
} from './practiceScoreSyncState';

describe('practiceScoreSyncState', () => {
  it('treats synced as the happy path for learner-session runs', () => {
    expect(buildSyncingState()).toEqual({
      status: 'syncing',
      message: 'Wynik zapisany lokalnie. Zapisujemy go teraz w API Kangura.',
    });
    expect(buildAwaitingAuthRetryState()).toEqual({
      status: 'awaiting-auth',
      message:
        'Wynik zapisany lokalnie. Czekamy na odtworzenie sesji ucznia, aby doslac go do Kangura.',
    });
    expect(buildSyncedState()).toEqual({
      status: 'synced',
      message:
        'Wynik zapisano w API Kangura. Powinien byc od razu widoczny w profilu, rankingu i ostatnich wynikach.',
    });
  });

  it('marks local-only as a fallback instead of a neutral state', () => {
    expect(buildLocalOnlySyncState('auth')).toEqual({
      status: 'local-only',
      message:
        'Wynik zapisano tylko lokalnie. Zaloguj sesje ucznia, aby wysylac wyniki do Kangura.',
    });
    expect(buildLocalOnlySyncState('expected-error')).toEqual({
      status: 'local-only',
      message:
        'Wynik zapisano tylko lokalnie. Sesja serwera nie byla gotowa do synchronizacji, wiec wynik nie trafil jeszcze do Kangura.',
    });
  });

  it('returns distinct warning and failure colors for fallback states', () => {
    expect(resolvePracticeScoreSyncAppearance('awaiting-auth')).toEqual({
      backgroundColor: '#eff6ff',
      borderColor: '#93c5fd',
      textColor: '#1d4ed8',
    });
    expect(resolvePracticeScoreSyncAppearance('local-only')).toEqual({
      backgroundColor: '#fffbeb',
      borderColor: '#fcd34d',
      textColor: '#92400e',
    });
    expect(resolvePracticeScoreSyncAppearance('sync-failed')).toEqual({
      backgroundColor: '#fef2f2',
      borderColor: '#fca5a5',
      textColor: '#b91c1c',
    });
    expect(buildUnexpectedSyncFailureState()).toEqual({
      status: 'sync-failed',
      message:
        'Wynik zapisano lokalnie, ale zapis do API Kangura nie udal sie. Odswiez sesje i sprobuj ponownie.',
    });
  });
});
