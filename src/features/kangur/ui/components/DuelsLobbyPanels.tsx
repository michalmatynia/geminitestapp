'use client';

import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import { useTranslations } from 'next-intl';

import { trackKangurClientEvent } from '@/features/kangur/observability/client';
import type {
  KangurDuelDifficulty,
  KangurDuelLobbyEntry,
  KangurDuelMode,
  KangurDuelOperation,
} from '@/features/kangur/shared/contracts/kangur-duels';
import { cn } from '@/features/kangur/shared/utils';
import {
  KangurButton,
  KangurGlassPanel,
  KangurInfoCard,
  KangurPanelRow,
  KangurSelectField,
  KangurStatusChip,
} from '@/features/kangur/ui/design/primitives';
import {
  KANGUR_PANEL_GAP_CLASSNAME,
  KANGUR_TIGHT_ROW_CLASSNAME,
  KANGUR_WRAP_CENTER_ROW_CLASSNAME,
  KANGUR_WRAP_ROW_CLASSNAME,
  KANGUR_WRAP_ROW_TIGHT_CLASSNAME,
} from '@/features/kangur/ui/design/tokens';
import { useKangurCoarsePointer } from '@/features/kangur/ui/hooks/useKangurCoarsePointer';
import {
  LOBBY_MODE_ACCENTS,
  formatDurationLabel,
  formatDuelDifficultyLabel,
  formatLobbyModeLabel,
  formatDuelOperationLabel,
  formatRelativeAge,
  formatSessionStatusLabel,
  resolveLobbyHostInitial,
  resolveSessionAccent,
} from '@/features/kangur/ui/pages/duels/duels-helpers';

type LobbySortValue =
  | 'recent'
  | 'time_fast'
  | 'time_slow'
  | 'questions_low'
  | 'questions_high';

const DUEL_OPERATION_FILTER_OPTIONS: KangurDuelOperation[] = [
  'addition',
  'subtraction',
  'multiplication',
  'division',
];
const DUEL_DIFFICULTY_FILTER_OPTIONS: KangurDuelDifficulty[] = ['easy', 'medium', 'hard'];

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
  lobbyStreamStatus: 'idle' | 'connecting' | 'connected' | 'fallback';
  loadLobby: (options?: { showLoading?: boolean }) => Promise<void>;
  isLobbyLoading: boolean;
  lobbyModeFilter: 'all' | KangurDuelMode;
  setLobbyModeFilter: Dispatch<SetStateAction<'all' | KangurDuelMode>>;
  lobbyOperationFilter: 'all' | KangurDuelOperation;
  setLobbyOperationFilter: Dispatch<SetStateAction<'all' | KangurDuelOperation>>;
  lobbyDifficultyFilter: 'all' | KangurDuelDifficulty;
  setLobbyDifficultyFilter: Dispatch<SetStateAction<'all' | KangurDuelDifficulty>>;
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
  const lobbyTranslations = useTranslations('KangurDuels.lobby');
  const commonTranslations = useTranslations('KangurDuels.common');
  const isCoarsePointer = useKangurCoarsePointer();
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
    lobbyStreamStatus,
    loadLobby,
    isLobbyLoading,
    lobbyModeFilter,
    setLobbyModeFilter,
    lobbyOperationFilter,
    setLobbyOperationFilter,
    lobbyDifficultyFilter,
    setLobbyDifficultyFilter,
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
  const compactActionClassName = isCoarsePointer
    ? 'w-full min-h-12 px-4 touch-manipulation select-none active:scale-[0.985] sm:w-auto'
    : 'w-full sm:w-auto';
  const showPausedChip = !isPageActive;
  const showOfflineChip = !isOnline;
  const showStaleChip = isLobbyStale && !lobbyError && isPageActive && isOnline;
  const showErrorChip = Boolean(lobbyError) && !showOfflineChip;
  const showLiveChip = lobbyStreamStatus === 'connected';
  const showConnectingChip = lobbyStreamStatus === 'connecting';
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
          <KangurPanelRow className='sm:flex-wrap sm:items-center sm:justify-between'>
            <div className='space-y-1'>
              <div className={KANGUR_WRAP_CENTER_ROW_CLASSNAME}>
                <h3 id={inviteHeadingId} className='text-lg font-semibold text-slate-900 sm:text-xl'>
                  {lobbyTranslations('invite.heading')}
                </h3>
                <KangurStatusChip accent='indigo' size='sm'>
                  {inviteLobbyEntries.length}
                </KangurStatusChip>
              </div>
              <p className='text-sm leading-relaxed text-slate-600'>
                {lobbyTranslations('invite.description')}
              </p>
            </div>
          </KangurPanelRow>

          <ul
            className='grid kangur-panel-gap sm:grid-cols-2'
            role='list'
            aria-label={lobbyTranslations('invite.listAria')}
            id={inviteListId}
          >
            {inviteLobbyEntries.map((entry, index) => {
              const hostInitial = resolveLobbyHostInitial(entry.host.displayName);
              const freshAt = lobbyFreshRef.current.get(entry.sessionId);
              const isFresh =
                typeof freshAt === 'number' && relativeNow - freshAt < lobbyFreshWindowMs;
              const estimatedDurationSec = entry.questionCount * entry.timePerQuestionSec;
              const isJoining = joiningSessionId === entry.sessionId && canJoinLobby;
              const updatedLabel = formatRelativeAge(
                entry.updatedAt,
                relativeNow,
                commonTranslations
              );
              const operationLabel = formatDuelOperationLabel(entry.operation, commonTranslations);
              const difficultyLabel = formatDuelDifficultyLabel(
                entry.difficulty,
                commonTranslations
              );
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
                    aria-label={lobbyTranslations('invite.cardAria', {
                      name: entry.host.displayName,
                      operation: operationLabel,
                      difficulty: difficultyLabel,
                      questionCount: entry.questionCount,
                      seconds: entry.timePerQuestionSec,
                    })}
                  >
                    <KangurPanelRow className='sm:items-start sm:justify-between'>
                      <div className='flex items-center kangur-panel-gap min-w-0'>
                        <div
                          className='flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-100 text-base font-extrabold text-indigo-700 sm:h-12 sm:w-12 sm:text-lg'
                          aria-hidden='true'
                        >
                          {hostInitial}
                        </div>
                        <div className='min-w-0'>
                          <div className='text-sm font-semibold text-slate-800 truncate'>
                            {entry.host.displayName}
                          </div>
                          <div className='text-xs text-slate-500 leading-tight'>
                            {lobbyTranslations('invite.meta', { updated: updatedLabel })}
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
                            operation: entry.operation,
                            difficulty: entry.difficulty,
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
                            ? lobbyTranslations('invite.joinAria', {
                                name: entry.host.displayName,
                              })
                            : lobbyTranslations('invite.loginToJoinAria', {
                                name: entry.host.displayName,
                              })
                        }
                        className={compactActionClassName}
                      >
                        {canJoinLobby
                          ? isJoining
                            ? lobbyTranslations('buttons.connecting')
                            : lobbyTranslations('buttons.join')
                          : lobbyTranslations('buttons.loginToJoin')}
                      </KangurButton>
                    </KangurPanelRow>
                    <div className={KANGUR_WRAP_ROW_CLASSNAME}>
                      <KangurStatusChip accent={resolveSessionAccent(entry.status)} size='sm'>
                        {formatSessionStatusLabel(entry.status, commonTranslations)}
                      </KangurStatusChip>
                      {isFresh ? (
                        <KangurStatusChip accent='emerald' size='sm'>
                          {lobbyTranslations('chips.fresh')}
                        </KangurStatusChip>
                      ) : null}
                      <KangurStatusChip accent={LOBBY_MODE_ACCENTS[entry.mode]} size='sm'>
                        {formatLobbyModeLabel(entry.mode, commonTranslations)}
                      </KangurStatusChip>
                      <KangurStatusChip accent='slate' size='sm'>
                        {operationLabel}
                      </KangurStatusChip>
                      <KangurStatusChip accent='slate' size='sm'>
                        {difficultyLabel}
                      </KangurStatusChip>
                      {entry.series ? (
                        <KangurStatusChip accent='slate' size='sm'>
                          BO{entry.series.bestOf}
                        </KangurStatusChip>
                      ) : null}
                      <KangurStatusChip accent='indigo' size='sm'>
                        {lobbyTranslations('chips.private')}
                      </KangurStatusChip>
                    </div>
                    <div className={`${KANGUR_WRAP_ROW_TIGHT_CLASSNAME} text-xs text-slate-500`}>
                      <span>
                        {lobbyTranslations('meta.questionCount', { count: entry.questionCount })}
                      </span>
                      <span>
                        {lobbyTranslations('meta.secondsPerQuestion', {
                          seconds: entry.timePerQuestionSec,
                        })}
                      </span>
                      <span>
                        {lobbyTranslations('meta.estimatedDuration', {
                          duration: formatDurationLabel(estimatedDurationSec),
                        })}
                      </span>
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
        <KangurPanelRow className='sm:items-center sm:justify-between'>
          <div className='space-y-1 min-w-0'>
            <div className={KANGUR_WRAP_CENTER_ROW_CLASSNAME} aria-live='polite' aria-atomic='true'>
              <h3 id={lobbyHeadingId} className='text-lg font-semibold text-slate-900 sm:text-xl'>
                {lobbyTranslations('heading')}
              </h3>
              <KangurStatusChip accent={lobbyEntries.length > 0 ? 'emerald' : 'slate'} size='sm'>
                {lobbyCountLabel}
              </KangurStatusChip>
            </div>
            <p
              id={lobbyDescriptionId}
              className='text-sm leading-relaxed text-slate-600 max-w-2xl'
            >
              {lobbyTranslations('description')}
            </p>
          </div>
          <div className={`w-full ${KANGUR_TIGHT_ROW_CLASSNAME} sm:w-auto sm:items-center sm:justify-end`}>
            <div className={KANGUR_WRAP_CENTER_ROW_CLASSNAME}>
              {showPausedChip ? (
                <KangurStatusChip accent='amber' size='sm'>
                  {lobbyTranslations('chips.refreshPaused')}
                </KangurStatusChip>
              ) : null}
              {showOfflineChip ? (
                <KangurStatusChip accent='rose' size='sm'>
                  {lobbyTranslations('chips.offline')}
                </KangurStatusChip>
              ) : null}
              {showErrorChip ? (
                <KangurStatusChip accent='rose' size='sm'>
                  {lobbyTranslations('chips.connectionProblem')}
                </KangurStatusChip>
              ) : null}
              {showConnectingChip ? (
                <KangurStatusChip accent='slate' size='sm'>
                  {lobbyTranslations('chips.connectingLive')}
                </KangurStatusChip>
              ) : null}
              {showLiveChip ? (
                <KangurStatusChip accent='emerald' size='sm'>
                  {lobbyTranslations('chips.live')}
                </KangurStatusChip>
              ) : null}
              {showStaleChip ? (
                <KangurStatusChip accent='rose' size='sm'>
                  {lobbyTranslations('chips.stale')}
                </KangurStatusChip>
              ) : null}
              {lobbyLastUpdatedAt ? (
                <KangurStatusChip accent='slate' size='sm'>
                  {lobbyTranslations('meta.updated', {
                    value: formatRelativeAge(lobbyLastUpdatedAt, relativeNow, commonTranslations),
                  })}
                </KangurStatusChip>
              ) : null}
              <KangurStatusChip accent='slate' size='sm'>
                {showLiveChip
                  ? lobbyTranslations('meta.fallbackEvery', { seconds: lobbyRefreshSeconds })
                  : lobbyTranslations('meta.autoEvery', { seconds: lobbyRefreshSeconds })}
              </KangurStatusChip>
            </div>
            <KangurButton
              onClick={() => {
                trackKangurClientEvent('kangur_duels_lobby_refresh_clicked', {
                  isGuest,
                });
                void loadLobby({ showLoading: true });
              }}
              variant='ghost'
              disabled={isLobbyLoading || !isOnline}
              aria-label={lobbyTranslations('buttons.refreshAria')}
              aria-busy={isLobbyLoading}
              aria-live='polite'
              className={compactActionClassName}
            >
              {isLobbyLoading
                ? lobbyTranslations('buttons.refreshing')
                : lobbyTranslations('buttons.refresh')}
            </KangurButton>
          </div>
        </KangurPanelRow>

        {!canJoinLobby ? (
          <KangurInfoCard
            accent='slate'
            padding='md'
            tone='accent'
            role='status'
            aria-live='polite'
          >
            <KangurPanelRow className='sm:items-center sm:justify-between'>
              <div className='text-sm text-slate-700'>
                {lobbyTranslations('guestBanner.description')}
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
                className={compactActionClassName}
              >
                {lobbyTranslations('buttons.loginToPlay')}
              </KangurButton>
            </KangurPanelRow>
          </KangurInfoCard>
        ) : null}

        <div className='grid w-full kangur-panel-gap rounded-2xl border border-slate-200/70 bg-white/70 p-3 sm:grid-cols-2 sm:p-4 lg:grid-cols-4'>
          <div className='min-w-0 space-y-1'>
            <div className='text-xs font-semibold uppercase tracking-[0.08em] text-slate-500'>
              {lobbyTranslations('filters.mode.label')}
            </div>
            <KangurSelectField
              value={lobbyModeFilter}
              onChange={(event: React.ChangeEvent<HTMLSelectElement>) => {
                const nextValue = event.target.value as 'all' | KangurDuelMode;
                trackKangurClientEvent('kangur_duels_lobby_filter_changed', {
                  modeFilter: nextValue,
                  operationFilter: lobbyOperationFilter,
                  difficultyFilter: lobbyDifficultyFilter,
                  isGuest,
                });
                setLobbyModeFilter(nextValue);
              }}
              aria-label={lobbyTranslations('filters.mode.aria')}
              size='sm'
              accent='slate'
            >
              <option value='all'>{lobbyTranslations('filters.mode.all')}</option>
              <option value='challenge'>
                {lobbyTranslations('filters.mode.challenge')}
              </option>
              <option value='quick_match'>
                {lobbyTranslations('filters.mode.quickMatch')}
              </option>
            </KangurSelectField>
          </div>
          <div className='min-w-0 space-y-1'>
            <div className='text-xs font-semibold uppercase tracking-[0.08em] text-slate-500'>
              {lobbyTranslations('filters.operation.label')}
            </div>
            <KangurSelectField
              value={lobbyOperationFilter}
              onChange={(event: React.ChangeEvent<HTMLSelectElement>) => {
                const nextValue = event.target.value as 'all' | KangurDuelOperation;
                trackKangurClientEvent('kangur_duels_lobby_filter_changed', {
                  modeFilter: lobbyModeFilter,
                  operationFilter: nextValue,
                  difficultyFilter: lobbyDifficultyFilter,
                  isGuest,
                });
                setLobbyOperationFilter(nextValue);
              }}
              aria-label={lobbyTranslations('filters.operation.aria')}
              size='sm'
              accent='slate'
            >
              <option value='all'>{lobbyTranslations('filters.operation.all')}</option>
              {DUEL_OPERATION_FILTER_OPTIONS.map((value) => (
                <option key={value} value={value}>
                  {formatDuelOperationLabel(value, commonTranslations)}
                </option>
              ))}
            </KangurSelectField>
          </div>
          <div className='min-w-0 space-y-1'>
            <div className='text-xs font-semibold uppercase tracking-[0.08em] text-slate-500'>
              {lobbyTranslations('filters.difficulty.label')}
            </div>
            <KangurSelectField
              value={lobbyDifficultyFilter}
              onChange={(event: React.ChangeEvent<HTMLSelectElement>) => {
                const nextValue = event.target.value as 'all' | KangurDuelDifficulty;
                trackKangurClientEvent('kangur_duels_lobby_filter_changed', {
                  modeFilter: lobbyModeFilter,
                  operationFilter: lobbyOperationFilter,
                  difficultyFilter: nextValue,
                  isGuest,
                });
                setLobbyDifficultyFilter(nextValue);
              }}
              aria-label={lobbyTranslations('filters.difficulty.aria')}
              size='sm'
              accent='slate'
            >
              <option value='all'>{lobbyTranslations('filters.difficulty.all')}</option>
              {DUEL_DIFFICULTY_FILTER_OPTIONS.map((value) => (
                <option key={value} value={value}>
                  {formatDuelDifficultyLabel(value, commonTranslations)}
                </option>
              ))}
            </KangurSelectField>
          </div>
          <div className='min-w-0 space-y-1'>
            <div className='text-xs font-semibold uppercase tracking-[0.08em] text-slate-500'>
              {lobbyTranslations('filters.sort.label')}
            </div>
            <KangurSelectField
              value={lobbySort}
              onChange={(event: React.ChangeEvent<HTMLSelectElement>) => {
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
              aria-label={lobbyTranslations('filters.sort.aria')}
              size='sm'
              accent='slate'
            >
              <option value='recent'>{lobbyTranslations('filters.sort.recent')}</option>
              <option value='time_fast'>
                {lobbyTranslations('filters.sort.timeFast')}
              </option>
              <option value='time_slow'>
                {lobbyTranslations('filters.sort.timeSlow')}
              </option>
              <option value='questions_low'>
                {lobbyTranslations('filters.sort.questionsLow')}
              </option>
              <option value='questions_high'>
                {lobbyTranslations('filters.sort.questionsHigh')}
              </option>
            </KangurSelectField>
          </div>
          {publicLobbyEntries.length > 0 ? (
            <div className='text-xs text-slate-500 sm:col-span-2 sm:text-right lg:col-span-4'>
              {lobbyTranslations('meta.visibleCount', {
                count: filteredPublicLobbyEntries.length,
              })}
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
            <KangurPanelRow className='sm:items-center sm:justify-between'>
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
                className={compactActionClassName}
              >
                {lobbyTranslations('buttons.retry')}
              </KangurButton>
            </KangurPanelRow>
          </KangurInfoCard>
        ) : null}

        {isLobbyLoading && !hasAnyPublicLobbyEntries ? (
          <div className='grid kangur-panel-gap sm:grid-cols-2' role='status' aria-live='polite'>
            <span className='sr-only'>{lobbyTranslations('loading')}</span>
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
                <div className={KANGUR_WRAP_ROW_CLASSNAME}>
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
                {lobbyTranslations('empty.noEntries')}
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
                className={compactActionClassName}
              >
                {canJoinLobby
                  ? lobbyTranslations('buttons.createChallenge')
                  : lobbyTranslations('buttons.loginToCreate')}
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
              <div className='text-sm text-slate-700'>
                {lobbyTranslations('empty.noMatches')}
              </div>
              <KangurButton
                onClick={() => {
                  setLobbyModeFilter('all');
                  setLobbyOperationFilter('all');
                  setLobbyDifficultyFilter('all');
                  setLobbySort('recent');
                }}
                variant='ghost'
                disabled={isBusy}
                className={compactActionClassName}
              >
                {lobbyTranslations('buttons.showAll')}
              </KangurButton>
            </div>
          </KangurInfoCard>
        ) : (
          <ul
            className='grid kangur-panel-gap sm:grid-cols-2'
            role='list'
            aria-label={lobbyTranslations('publicListAria')}
            id={lobbyListId}
          >
            {filteredPublicLobbyEntries.map((entry, index) => {
              const hostInitial = resolveLobbyHostInitial(entry.host.displayName);
              const freshAt = lobbyFreshRef.current.get(entry.sessionId);
              const isFresh =
                typeof freshAt === 'number' && relativeNow - freshAt < lobbyFreshWindowMs;
              const estimatedDurationSec = entry.questionCount * entry.timePerQuestionSec;
              const isJoining = joiningSessionId === entry.sessionId && canJoinLobby;
              const updatedLabel = formatRelativeAge(
                entry.updatedAt,
                relativeNow,
                commonTranslations
              );
              const operationLabel = formatDuelOperationLabel(entry.operation, commonTranslations);
              const difficultyLabel = formatDuelDifficultyLabel(
                entry.difficulty,
                commonTranslations
              );
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
                    aria-label={lobbyTranslations('publicCardAria', {
                      name: entry.host.displayName,
                      operation: operationLabel,
                      difficulty: difficultyLabel,
                      questionCount: entry.questionCount,
                      seconds: entry.timePerQuestionSec,
                    })}
                  >
                    <KangurPanelRow className='sm:items-start sm:justify-between'>
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
                            {lobbyTranslations('meta.waitingForOpponent', {
                              updated: updatedLabel,
                            })}
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
                            operation: entry.operation,
                            difficulty: entry.difficulty,
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
                            ? lobbyTranslations('publicJoinAria', {
                                name: entry.host.displayName,
                              })
                            : lobbyTranslations('publicLoginToJoinAria', {
                                name: entry.host.displayName,
                              })
                        }
                        className={compactActionClassName}
                      >
                        {canJoinLobby
                          ? isJoining
                            ? lobbyTranslations('buttons.connecting')
                            : lobbyTranslations('buttons.join')
                          : lobbyTranslations('buttons.loginToJoin')}
                      </KangurButton>
                    </KangurPanelRow>
                    <div className={KANGUR_WRAP_ROW_CLASSNAME}>
                      <KangurStatusChip accent={resolveSessionAccent(entry.status)} size='sm'>
                        {formatSessionStatusLabel(entry.status, commonTranslations)}
                      </KangurStatusChip>
                      {isFresh ? (
                        <KangurStatusChip accent='emerald' size='sm'>
                          {lobbyTranslations('chips.fresh')}
                        </KangurStatusChip>
                      ) : null}
                      <KangurStatusChip accent={LOBBY_MODE_ACCENTS[entry.mode]} size='sm'>
                        {formatLobbyModeLabel(entry.mode, commonTranslations)}
                      </KangurStatusChip>
                      <KangurStatusChip accent='slate' size='sm'>
                        {operationLabel}
                      </KangurStatusChip>
                      <KangurStatusChip accent='slate' size='sm'>
                        {difficultyLabel}
                      </KangurStatusChip>
                      {entry.series ? (
                        <KangurStatusChip accent='slate' size='sm'>
                          BO{entry.series.bestOf}
                        </KangurStatusChip>
                      ) : null}
                      <KangurStatusChip accent='slate' size='sm'>
                        {lobbyTranslations('chips.public')}
                      </KangurStatusChip>
                    </div>
                    <div className={`${KANGUR_WRAP_ROW_TIGHT_CLASSNAME} text-xs text-slate-500`}>
                      <span>
                        {lobbyTranslations('meta.questionCount', { count: entry.questionCount })}
                      </span>
                      <span>
                        {lobbyTranslations('meta.secondsPerQuestion', {
                          seconds: entry.timePerQuestionSec,
                        })}
                      </span>
                      <span>
                        {lobbyTranslations('meta.estimatedDuration', {
                          duration: formatDurationLabel(estimatedDurationSec),
                        })}
                      </span>
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
