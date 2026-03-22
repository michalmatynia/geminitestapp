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
      message: 'Wynik zapisany lokalnie. Gdy logowanie wróci, wyślemy go do Kangura.',
    });
    expect(buildSyncedState()).toEqual({
      status: 'synced',
      message:
        'Wynik zapisano w API Kangura. Powinien być od razu widoczny w profilu, rankingu i ostatnich wynikach.',
    });
    expect(buildSyncingState('en')).toEqual({
      status: 'syncing',
      message: 'The result is saved locally. We are now writing it to the Kangur API.',
    });
    expect(buildSyncedState('de')).toEqual({
      status: 'synced',
      message:
        'Das Ergebnis wurde in der Kangur-API gespeichert. Es sollte sofort im Profil, in der Rangliste und in den letzten Ergebnissen sichtbar sein.',
    });
  });

  it('marks local-only as a fallback instead of a neutral state', () => {
    expect(buildLocalOnlySyncState('auth')).toEqual({
      status: 'local-only',
      message: 'Wynik zapisano tylko lokalnie. Zaloguj się, aby wysyłać wyniki do Kangura.',
    });
    expect(buildLocalOnlySyncState('expected-error')).toEqual({
      status: 'local-only',
      message: 'Wynik zapisano tylko lokalnie. Serwer nie był jeszcze gotowy do synchronizacji, więc wynik nie trafił jeszcze do Kangura.',
    });
    expect(buildLocalOnlySyncState('auth', 'en')).toEqual({
      status: 'local-only',
      message: 'The result was saved only locally. Sign in to send results to Kangur.',
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
      message: 'Wynik zapisano lokalnie, ale zapis do API Kangura nie udał się. Odśwież logowanie i spróbuj ponownie.',
    });
    expect(buildUnexpectedSyncFailureState('de')).toEqual({
      status: 'sync-failed',
      message:
        'Das Ergebnis wurde lokal gespeichert, aber der Schreibvorgang in die Kangur-API ist fehlgeschlagen. Aktualisiere die Anmeldung und versuche es erneut.',
    });
  });
});
