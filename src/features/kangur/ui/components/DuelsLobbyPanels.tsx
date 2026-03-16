'use client';

import type { Dispatch, MutableRefObject, SetStateAction } from 'react';

import { trackKangurClientEvent } from '@/features/kangur/observability/client';
import type { KangurDuelLobbyEntry, KangurDuelMode } from '@/features/kangur/shared/contracts/kangur-duels';
import { cn } from '@/features/kangur/shared/utils';
import {
  KangurButton,
  KangurGlassPanel,
  KangurInfoCard,
  KangurSelectField,
  KangurStatusChip,
} from '@/features/kangur/ui/design/primitives';
import { KANGUR_PANEL_GAP_CLASSNAME } from '@/features/kangur/ui/design/tokens';
import {
  LOBBY_MODE_ACCENTS,
  LOBBY_MODE_LABELS,
  SESSION_STATUS_LABELS,
  formatDurationLabel,
  formatRelativeAge,
  resolveLobbyHostInitial,
  resolveSessionAccent,
} from '@/features/kangur/ui/pages/duels/duels-helpers';

type LobbySortValue =
  | 'recent'
  | 'time_fast'
  | 'time_slow'
  | 'questions_low'
  | 'questions_high';

type DuelsLobbyPanelsProps = {
  inviteLobbyEntries: KangurDuelLobbyEntry[];
  inviteHeadingId: string;
  inviteListId: string;
  lobbyHeadingId: string;
  lobbyDescriptionId: string;
  lobbyListId: string;
  lobbyEntries: KangurDuelLobbyEntry[];
  lobbyCountLabel: string;
  lobbyLastUpdatedAt: string | null;
  relativeNow: number;
  lobbyRefreshSeconds: number;
  loadLobby: (options?: { showLoading?: boolean }) => Promise<void>;
  isLobbyLoading: boolean;
  lobbyModeFilter: 'all' | KangurDuelMode;
  setLobbyModeFilter: Dispatch<SetStateAction<'all' | KangurDuelMode>>;
  lobbySort: LobbySortValue;
  setLobbySort: Dispatch<SetStateAction<LobbySortValue>>;
  publicLobbyEntries: KangurDuelLobbyEntry[];
  filteredPublicLobbyEntries: KangurDuelLobbyEntry[];
  hasAnyPublicLobbyEntries: boolean;
  hasVisiblePublicLobbyEntries: boolean;
  lobbyError: string | null;
  isBusy: boolean;
  joiningSessionId: string | null;
  isPageActive: boolean;
  isOnline: boolean;
  isLobbyStale: boolean;
  canJoinLobby: boolean;
  onRequireLogin: () => void;
  handleJoinLobbySession: (sessionId: string) => Promise<void>;
  handleCreateChallenge: () => Promise<void>;
  lobbyFreshRef: MutableRefObject<Map<string, number>>;
  lobbyFreshWindowMs: number;
};

export function DuelsLobbyPanels(props: DuelsLobbyPanelsProps): React.JSX.Element {
  const {
    inviteLobbyEntries,
    inviteHeadingId,
    inviteListId,
    lobbyHeadingId,
    lobbyDescriptionId,
    lobbyListId,
    lobbyEntries,
    lobbyCountLabel,
    lobbyLastUpdatedAt,
    relativeNow,
    lobbyRefreshSeconds,
    loadLobby,
    isLobbyLoading,
    lobbyModeFilter,
    setLobbyModeFilter,
    lobbySort,
    setLobbySort,
    publicLobbyEntries,
    filteredPublicLobbyEntries,
    hasAnyPublicLobbyEntries,
    hasVisiblePublicLobbyEntries,
    lobbyError,
    isBusy,
    joiningSessionId,
    isPageActive,
    isOnline,
    isLobbyStale,
    canJoinLobby,
    onRequireLogin,
    handleJoinLobbySession,
    handleCreateChallenge,
    lobbyFreshRef,
    lobbyFreshWindowMs,
  } = props;
  const isGuest = !canJoinLobby;
  const showPausedChip = !isPageActive;
  const showOfflineChip = !isOnline;
  const showStaleChip = isLobbyStale && !lobbyError && isPageActive && isOnline;
  const showErrorChip = Boolean(lobbyError) && !showOfflineChip;
  const lobbyEntryMotionClass =
    'motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2 motion-safe:duration-300 motion-safe:ease-out';
  const lobbyEntryHoverClass =
    'transition-transform duration-200 ease-out hover:-translate-y-1 hover:shadow-md focus-within:-translate-y-1 focus-within:shadow-md motion-reduce:transform-none motion-reduce:transition-none';

  return (
    <>
      {inviteLobbyEntries.length > 0 ? (
        <KangurGlassPanel
          className={cn('flex flex-col', KANGUR_PANEL_GAP_CLASSNAME)}
          padding='lg'
          surface='solid'
          role='region'
          aria-labelledby={inviteHeadingId}
        >
          <div className='flex flex-wrap items-center justify-between kangur-panel-gap'>
            <div className='space-y-1'>
              <div className='flex flex-wrap items-center gap-2'>
                <h3 id={inviteHeadingId} className='text-xl font-semibold text-slate-900'>
                  Zaproszenia
                </h3>
                <KangurStatusChip accent='indigo' size='sm'>
                  {inviteLobbyEntries.length}
                </KangurStatusChip>
              </div>
              <p className='text-sm text-slate-600'>
                Prywatne pojedynki, do których zostałeś zaproszony.
              </p>
            </div>
          </div>

          <ul
            className='grid kangur-panel-gap sm:grid-cols-2'
            role='list'
            aria-label='Zaproszenia prywatne'
            id={inviteListId}
          >
            {inviteLobbyEntries.map((entry, index) => {
              const hostInitial = resolveLobbyHostInitial(entry.host.displayName);
              const freshAt = lobbyFreshRef.current.get(entry.sessionId);
              const isFresh =
                typeof freshAt === 'number' && relativeNow - freshAt < lobbyFreshWindowMs;
              const estimatedDurationSec = entry.questionCount * entry.timePerQuestionSec;
              const isJoining = joiningSessionId === entry.sessionId && canJoinLobby;
              const updatedLabel = formatRelativeAge(entry.updatedAt, relativeNow);
              return (
                <li key={entry.sessionId}>
                  <KangurInfoCard
                    accent='indigo'
                    padding='md'
                    tone='accent'
                    className={cn(
                      'flex flex-col kangur-panel-gap',
                      lobbyEntryMotionClass,
                      lobbyEntryHoverClass,
                      isFresh && 'ring-2 ring-emerald-200/70'
                    )}
                    style={{ animationDelay: `${index * 70}ms` }}
                    role='group'
                    aria-label={`Prywatne zaproszenie od ${entry.host.displayName}. ${entry.questionCount} pytań, ${entry.timePerQuestionSec} sekund na pytanie.`}
                  >
                    <div className='flex flex-col sm:flex-row sm:items-start sm:justify-between kangur-panel-gap'>
                      <div className='flex items-center kangur-panel-gap'>
                        <div
                          className='flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-lg font-extrabold text-indigo-700'
                          aria-hidden='true'
                        >
                          {hostInitial}
                        </div>
                        <div>
                          <div className='text-sm font-semibold text-slate-800'>
                            {entry.host.displayName}
                          </div>
                          <div className='text-xs text-slate-500'>
                            Zaproszenie prywatne • {updatedLabel}
                          </div>
                        </div>
                      </div>
                      <KangurButton
                        onClick={() => {
                          if (!canJoinLobby) {
                            trackKangurClientEvent('kangur_duels_lobby_login_clicked', {
                              source: 'invite_join',
                              visibility: entry.visibility,
                              mode: entry.mode,
                              isGuest: true,
                            });
                            onRequireLogin();
                            return;
                          }
                          trackKangurClientEvent('kangur_duels_lobby_join_clicked', {
                            visibility: entry.visibility,
                            mode: entry.mode,
                            questionCount: entry.questionCount,
                            timePerQuestionSec: entry.timePerQuestionSec,
                            isGuest: false,
                          });
                          void handleJoinLobbySession(entry.sessionId);
                        }}
                        variant='primary'
                        disabled={isBusy || isJoining}
                        aria-busy={isJoining ? 'true' : undefined}
                        aria-label={
                          canJoinLobby
                            ? `Dołącz do prywatnego pojedynku z ${entry.host.displayName}`
                            : `Zaloguj się, aby dołączyć do prywatnego pojedynku z ${entry.host.displayName}`
                        }
                        className='w-full sm:w-auto'
                      >
                        {canJoinLobby ? (isJoining ? 'Łączymy…' : 'Dołącz') : 'Zaloguj się, aby dołączyć'}
                      </KangurButton>
                    </div>
                    <div className='flex flex-wrap gap-2'>
                      <KangurStatusChip accent={resolveSessionAccent(entry.status)} size='sm'>
                        {SESSION_STATUS_LABELS[entry.status]}
                      </KangurStatusChip>
                      {isFresh ? (
                        <KangurStatusChip accent='emerald' size='sm'>
                          Nowe
                        </KangurStatusChip>
                      ) : null}
                      <KangurStatusChip accent={LOBBY_MODE_ACCENTS[entry.mode]} size='sm'>
                        {LOBBY_MODE_LABELS[entry.mode]}
                      </KangurStatusChip>
                      <KangurStatusChip accent='indigo' size='sm'>
                        Prywatny
                      </KangurStatusChip>
                    </div>
                    <div className='flex flex-wrap gap-x-2 gap-y-1 text-xs text-slate-500'>
                      <span>{entry.questionCount} pytań</span>
                      <span>{entry.timePerQuestionSec}s / pytanie</span>
                      <span>≈ {formatDurationLabel(estimatedDurationSec)}</span>
                    </div>
                  </KangurInfoCard>
                </li>
              );
            })}
          </ul>
        </KangurGlassPanel>
      ) : null}

      <KangurGlassPanel
        className={cn('flex flex-col', KANGUR_PANEL_GAP_CLASSNAME)}
        padding='lg'
        surface='solid'
        role='region'
        aria-labelledby={lobbyHeadingId}
        aria-describedby={lobbyDescriptionId}
        aria-busy={isLobbyLoading}
      >
        <div className='flex flex-col sm:flex-row sm:items-center sm:justify-between kangur-panel-gap'>
          <div className='space-y-1'>
            <div className='flex flex-wrap items-center gap-2' aria-live='polite' aria-atomic='true'>
              <h3 id={lobbyHeadingId} className='text-xl font-semibold text-slate-900'>
                Lobby pojedynków
              </h3>
              <KangurStatusChip accent={lobbyEntries.length > 0 ? 'emerald' : 'slate'} size='sm'>
                {lobbyCountLabel}
              </KangurStatusChip>
            </div>
            <p id={lobbyDescriptionId} className='text-sm text-slate-600'>
              Wybierz ucznia, który czeka na pojedynek albo dodaj własne wyzwanie.
            </p>
          </div>
          <div className='flex flex-wrap items-center gap-2'>
            {showPausedChip ? (
              <KangurStatusChip accent='amber' size='sm'>
                Odświeżanie wstrzymane
              </KangurStatusChip>
            ) : null}
            {showOfflineChip ? (
              <KangurStatusChip accent='rose' size='sm'>
                Brak połączenia
              </KangurStatusChip>
            ) : null}
            {showErrorChip ? (
              <KangurStatusChip accent='rose' size='sm'>
                Problem z połączeniem
              </KangurStatusChip>
            ) : null}
            {showStaleChip ? (
              <KangurStatusChip accent='rose' size='sm'>
                Dane mogą być nieaktualne
              </KangurStatusChip>
            ) : null}
            {lobbyLastUpdatedAt ? (
              <KangurStatusChip accent='slate' size='sm'>
                Aktualizacja {formatRelativeAge(lobbyLastUpdatedAt, relativeNow)}
              </KangurStatusChip>
            ) : null}
            <KangurStatusChip accent='slate' size='sm'>
              Auto co {lobbyRefreshSeconds}s
            </KangurStatusChip>
            <KangurButton
              onClick={() => {
                trackKangurClientEvent('kangur_duels_lobby_refresh_clicked', {
                  isGuest,
                });
                void loadLobby({ showLoading: true });
              }}
              variant='ghost'
              disabled={isLobbyLoading || !isOnline}
              aria-label='Odśwież lobby pojedynków'
              aria-busy={isLobbyLoading}
              aria-live='polite'
              className='w-full sm:w-auto'
            >
              {isLobbyLoading ? 'Odświeżamy…' : 'Odśwież'}
            </KangurButton>
          </div>
        </div>

        {!canJoinLobby ? (
          <KangurInfoCard
            accent='slate'
            padding='md'
            tone='accent'
            role='status'
            aria-live='polite'
          >
            <div className='flex flex-col kangur-panel-gap sm:flex-row sm:items-center sm:justify-between'>
              <div className='text-sm text-slate-700'>
                Lobby jest widoczne dla gości. Zaloguj się, aby dołączać do pojedynków i tworzyć
                własne wyzwania.
              </div>
              <KangurButton
                onClick={() => {
                  trackKangurClientEvent('kangur_duels_lobby_login_clicked', {
                    source: 'banner',
                    isGuest: true,
                  });
                  onRequireLogin();
                }}
                variant='secondary'
                className='w-full sm:w-auto'
              >
                Zaloguj się, aby zagrać
              </KangurButton>
            </div>
          </KangurInfoCard>
        ) : null}

        <div className='flex flex-col sm:flex-row sm:flex-wrap items-end kangur-panel-gap rounded-2xl border border-slate-200/70 bg-white/70 p-3'>
          <div className='w-full sm:min-w-[180px] space-y-1'>
            <div className='text-xs font-semibold uppercase tracking-[0.08em] text-slate-500'>
              Tryb
            </div>
            <KangurSelectField
              value={lobbyModeFilter}
              onChange={(event) => {
                const nextValue = event.target.value as 'all' | KangurDuelMode;
                trackKangurClientEvent('kangur_duels_lobby_filter_changed', {
                  modeFilter: nextValue,
                  isGuest,
                });
                setLobbyModeFilter(nextValue);
              }}
              aria-label='Filtruj lobby po trybie pojedynku'
              size='sm'
              accent='slate'
            >
              <option value='all'>Wszystkie tryby</option>
              <option value='challenge'>Wyzwania</option>
              <option value='quick_match'>Szybkie pojedynki</option>
            </KangurSelectField>
          </div>
          <div className='w-full sm:min-w-[200px] space-y-1'>
            <div className='text-xs font-semibold uppercase tracking-[0.08em] text-slate-500'>
              Sortowanie
            </div>
            <KangurSelectField
              value={lobbySort}
              onChange={(event) => {
                const nextValue = event.target.value as
                  | 'recent'
                  | 'time_fast'
                  | 'time_slow'
                  | 'questions_low'
                  | 'questions_high';
                trackKangurClientEvent('kangur_duels_lobby_sort_changed', {
                  sort: nextValue,
                  isGuest,
                });
                setLobbySort(nextValue);
              }}
              aria-label='Sortuj publiczne pojedynki'
              size='sm'
              accent='slate'
            >
              <option value='recent'>Najświeższe</option>
              <option value='time_fast'>Najkrótszy czas</option>
              <option value='time_slow'>Najdłuższy czas</option>
              <option value='questions_low'>Najmniej pytań</option>
              <option value='questions_high'>Najwięcej pytań</option>
            </KangurSelectField>
          </div>
          {publicLobbyEntries.length > 0 ? (
            <div className='text-xs text-slate-500'>
              Widocznych: {filteredPublicLobbyEntries.length}
            </div>
          ) : null}
        </div>

        {lobbyError ? (
          <KangurInfoCard
            accent='rose'
            padding='md'
            tone='accent'
            role='alert'
            aria-live='assertive'
          >
            <div className='flex flex-col kangur-panel-gap sm:flex-row sm:items-center sm:justify-between'>
              <div className='text-sm text-rose-900'>{lobbyError}</div>
              <KangurButton
                onClick={() => {
                  trackKangurClientEvent('kangur_duels_lobby_refresh_clicked', {
                    isGuest,
                    source: 'error_state',
                  });
                  void loadLobby({ showLoading: true });
                }}
                variant='secondary'
                disabled={isLobbyLoading || !isOnline}
                aria-busy={isLobbyLoading}
                className='w-full sm:w-auto'
              >
                Spróbuj ponownie
              </KangurButton>
            </div>
          </KangurInfoCard>
        ) : null}

        {isLobbyLoading && !hasAnyPublicLobbyEntries ? (
          <div className='grid kangur-panel-gap sm:grid-cols-2' role='status' aria-live='polite'>
            <span className='sr-only'>Ładowanie lobby pojedynków…</span>
            {Array.from({ length: 4 }, (_, index) => (
              <div
                key={`lobby-skeleton-${index}`}
                className='flex flex-col kangur-panel-gap rounded-2xl border border-slate-200 bg-white/70 p-4 animate-pulse'
                aria-hidden='true'
              >
                <div className='flex items-center kangur-panel-gap'>
                  <div className='h-12 w-12 rounded-2xl bg-slate-200/70' />
                  <div className='flex-1 space-y-2'>
                    <div className='h-3 w-32 rounded-full bg-slate-200/70' />
                    <div className='h-2 w-24 rounded-full bg-slate-200/70' />
                  </div>
                </div>
                <div className='flex flex-wrap gap-2'>
                  <div className='h-5 w-16 rounded-full bg-slate-200/70' />
                  <div className='h-5 w-20 rounded-full bg-slate-200/70' />
                  <div className='h-5 w-24 rounded-full bg-slate-200/70' />
                </div>
              </div>
            ))}
          </div>
        ) : !hasAnyPublicLobbyEntries ? (
          <KangurInfoCard
            accent='slate'
            padding='md'
            tone='accent'
            role='status'
            aria-live='polite'
          >
            <div className='flex flex-col kangur-panel-gap'>
              <div className='text-sm text-slate-700'>
                Brak uczniów oczekujących na pojedynek.
              </div>
              <KangurButton
                onClick={() => {
                  if (!canJoinLobby) {
                    trackKangurClientEvent('kangur_duels_lobby_login_clicked', {
                      source: 'empty_state_create',
                      isGuest: true,
                    });
                    onRequireLogin();
                    return;
                  }
                  trackKangurClientEvent('kangur_duels_lobby_create_clicked', {
                    source: 'empty_state',
                    isGuest: false,
                  });
                  void handleCreateChallenge();
                }}
                variant='secondary'
                disabled={isBusy}
                className='w-full sm:w-auto'
              >
                {canJoinLobby ? 'Stwórz własne wyzwanie' : 'Zaloguj się, aby dodać wyzwanie'}
              </KangurButton>
            </div>
          </KangurInfoCard>
        ) : !hasVisiblePublicLobbyEntries ? (
          <KangurInfoCard
            accent='slate'
            padding='md'
            tone='accent'
            role='status'
            aria-live='polite'
          >
            <div className='flex flex-col kangur-panel-gap'>
              <div className='text-sm text-slate-700'>Brak wyzwań dla wybranego filtra.</div>
              <KangurButton
                onClick={() => {
                  setLobbyModeFilter('all');
                  setLobbySort('recent');
                }}
                variant='ghost'
                disabled={isBusy}
                className='w-full sm:w-auto'
              >
                Pokaż wszystkie
              </KangurButton>
            </div>
          </KangurInfoCard>
        ) : (
          <ul
            className='grid kangur-panel-gap sm:grid-cols-2'
            role='list'
            aria-label='Publiczne pojedynki'
            id={lobbyListId}
          >
            {filteredPublicLobbyEntries.map((entry, index) => {
              const hostInitial = resolveLobbyHostInitial(entry.host.displayName);
              const freshAt = lobbyFreshRef.current.get(entry.sessionId);
              const isFresh =
                typeof freshAt === 'number' && relativeNow - freshAt < lobbyFreshWindowMs;
              const estimatedDurationSec = entry.questionCount * entry.timePerQuestionSec;
              const isJoining = joiningSessionId === entry.sessionId && canJoinLobby;
              const updatedLabel = formatRelativeAge(entry.updatedAt, relativeNow);
              return (
                <li key={entry.sessionId}>
                  <KangurInfoCard
                    accent='slate'
                    padding='md'
                    tone='neutral'
                    className={cn(
                      'flex flex-col kangur-panel-gap',
                      lobbyEntryMotionClass,
                      lobbyEntryHoverClass,
                      isFresh && 'ring-2 ring-emerald-200/70'
                    )}
                    style={{ animationDelay: `${index * 70}ms` }}
                    role='group'
                    aria-label={`Publiczne wyzwanie od ${entry.host.displayName}. ${entry.questionCount} pytań, ${entry.timePerQuestionSec} sekund na pytanie.`}
                  >
                    <div className='flex flex-col sm:flex-row sm:items-start sm:justify-between kangur-panel-gap'>
                      <div className='flex items-center kangur-panel-gap'>
                        <div
                          className='flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 text-lg font-extrabold text-indigo-700'
                          aria-hidden='true'
                        >
                          {hostInitial}
                        </div>
                        <div>
                          <div className='text-sm font-semibold text-slate-800'>
                            {entry.host.displayName}
                          </div>
                          <div className='text-xs text-slate-500'>
                            Czeka na przeciwnika • {updatedLabel}
                          </div>
                        </div>
                      </div>
                      <KangurButton
                        onClick={() => {
                          if (!canJoinLobby) {
                            trackKangurClientEvent('kangur_duels_lobby_login_clicked', {
                              source: 'join',
                              visibility: entry.visibility,
                              mode: entry.mode,
                              isGuest: true,
                            });
                            onRequireLogin();
                            return;
                          }
                          trackKangurClientEvent('kangur_duels_lobby_join_clicked', {
                            visibility: entry.visibility,
                            mode: entry.mode,
                            questionCount: entry.questionCount,
                            timePerQuestionSec: entry.timePerQuestionSec,
                            isGuest: false,
                          });
                          void handleJoinLobbySession(entry.sessionId);
                        }}
                        variant='secondary'
                        disabled={isBusy || isJoining}
                        aria-busy={isJoining ? 'true' : undefined}
                        aria-label={
                          canJoinLobby
                            ? `Dołącz do pojedynku z ${entry.host.displayName}`
                            : `Zaloguj się, aby dołączyć do pojedynku z ${entry.host.displayName}`
                        }
                        className='w-full sm:w-auto'
                      >
                        {canJoinLobby ? (isJoining ? 'Łączymy…' : 'Dołącz') : 'Zaloguj się, aby dołączyć'}
                      </KangurButton>
                    </div>
                    <div className='flex flex-wrap gap-2'>
                      <KangurStatusChip accent={resolveSessionAccent(entry.status)} size='sm'>
                        {SESSION_STATUS_LABELS[entry.status]}
                      </KangurStatusChip>
                      {isFresh ? (
                        <KangurStatusChip accent='emerald' size='sm'>
                          Nowe
                        </KangurStatusChip>
                      ) : null}
                      <KangurStatusChip accent={LOBBY_MODE_ACCENTS[entry.mode]} size='sm'>
                        {LOBBY_MODE_LABELS[entry.mode]}
                      </KangurStatusChip>
                      <KangurStatusChip accent='slate' size='sm'>
                        Publiczny
                      </KangurStatusChip>
                    </div>
                    <div className='flex flex-wrap gap-x-2 gap-y-1 text-xs text-slate-500'>
                      <span>{entry.questionCount} pytań</span>
                      <span>{entry.timePerQuestionSec}s / pytanie</span>
                      <span>≈ {formatDurationLabel(estimatedDurationSec)}</span>
                    </div>
                  </KangurInfoCard>
                </li>
              );
            })}
          </ul>
        )}
      </KangurGlassPanel>
    </>
  );
}
