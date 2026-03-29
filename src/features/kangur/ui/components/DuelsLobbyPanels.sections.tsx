'use client';

import type { MutableRefObject } from 'react';
import React from 'react';

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
} from '@/features/kangur/ui/design/tokens';
import {
  formatDuelDifficultyLabel,
  formatDuelOperationLabel,
} from '@/features/kangur/ui/pages/duels/duels-helpers';

import {
  DUEL_DIFFICULTY_FILTER_OPTIONS,
  DUEL_OPERATION_FILTER_OPTIONS,
  type LobbyJoinClickSource,
  type LobbySortValue,
  type LobbyTranslations,
  resolveLobbyStatusChips,
} from './DuelsLobbyPanels.shared';
import { DuelsLobbyPublicList } from './DuelsLobbyPanels.entry-cards';

function DuelsLobbyStatusChips(props: {
  showPausedChip: boolean;
  showOfflineChip: boolean;
  showErrorChip: boolean;
  showConnectingChip: boolean;
  showLiveChip: boolean;
  showStaleChip: boolean;
  lobbyLastUpdatedAt: string | null;
  relativeNow: number;
  lobbyRefreshSeconds: number;
  commonTranslations: LobbyTranslations;
  lobbyTranslations: LobbyTranslations;
}): React.JSX.Element {
  const chips = resolveLobbyStatusChips(props);

  return (
    <div className={KANGUR_WRAP_CENTER_ROW_CLASSNAME}>
      {chips.map((chip) => (
        <KangurStatusChip key={`${chip.accent}-${chip.label}`} accent={chip.accent} size='sm'>
          {chip.label}
        </KangurStatusChip>
      ))}
    </div>
  );
}

function DuelsLobbyMainHeader(props: {
  lobbyHeadingId: string;
  lobbyDescriptionId: string;
  lobbyCountLabel: string;
  hasLobbyEntries: boolean;
  showPausedChip: boolean;
  showOfflineChip: boolean;
  showErrorChip: boolean;
  showConnectingChip: boolean;
  showLiveChip: boolean;
  showStaleChip: boolean;
  lobbyLastUpdatedAt: string | null;
  relativeNow: number;
  lobbyRefreshSeconds: number;
  isLobbyLoading: boolean;
  isOnline: boolean;
  compactActionClassName: string;
  commonTranslations: LobbyTranslations;
  lobbyTranslations: LobbyTranslations;
  onRefresh: () => void;
}): React.JSX.Element {
  const {
    lobbyHeadingId,
    lobbyDescriptionId,
    lobbyCountLabel,
    hasLobbyEntries,
    showPausedChip,
    showOfflineChip,
    showErrorChip,
    showConnectingChip,
    showLiveChip,
    showStaleChip,
    lobbyLastUpdatedAt,
    relativeNow,
    lobbyRefreshSeconds,
    isLobbyLoading,
    isOnline,
    compactActionClassName,
    commonTranslations,
    lobbyTranslations,
    onRefresh,
  } = props;

  return (
    <KangurPanelRow className='sm:items-center sm:justify-between'>
      <div className='space-y-1 min-w-0'>
        <div className={KANGUR_WRAP_CENTER_ROW_CLASSNAME} aria-live='polite' aria-atomic='true'>
          <h3 id={lobbyHeadingId} className='text-lg font-semibold text-slate-900 sm:text-xl'>
            {lobbyTranslations('heading')}
          </h3>
          <KangurStatusChip accent={hasLobbyEntries ? 'emerald' : 'slate'} size='sm'>
            {lobbyCountLabel}
          </KangurStatusChip>
        </div>
        <p id={lobbyDescriptionId} className='text-sm leading-relaxed text-slate-600 max-w-2xl'>
          {lobbyTranslations('description')}
        </p>
      </div>
      <div
        className={`w-full ${KANGUR_TIGHT_ROW_CLASSNAME} sm:w-auto sm:items-center sm:justify-end`}
      >
        <DuelsLobbyStatusChips
          showPausedChip={showPausedChip}
          showOfflineChip={showOfflineChip}
          showErrorChip={showErrorChip}
          showConnectingChip={showConnectingChip}
          showLiveChip={showLiveChip}
          showStaleChip={showStaleChip}
          lobbyLastUpdatedAt={lobbyLastUpdatedAt}
          relativeNow={relativeNow}
          lobbyRefreshSeconds={lobbyRefreshSeconds}
          commonTranslations={commonTranslations}
          lobbyTranslations={lobbyTranslations}
        />
        <KangurButton
          onClick={onRefresh}
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
  );
}

function DuelsLobbyGuestBanner(props: {
  lobbyTranslations: LobbyTranslations;
  compactActionClassName: string;
  onRequireLogin: () => void;
}): React.JSX.Element {
  const { lobbyTranslations, compactActionClassName, onRequireLogin } = props;

  return (
    <KangurInfoCard accent='slate' padding='md' tone='accent' role='status' aria-live='polite'>
      <KangurPanelRow className='sm:items-center sm:justify-between'>
        <div className='text-sm text-slate-700'>{lobbyTranslations('guestBanner.description')}</div>
        <KangurButton
          onClick={onRequireLogin}
          variant='secondary'
          className={compactActionClassName}
        >
          {lobbyTranslations('buttons.loginToPlay')}
        </KangurButton>
      </KangurPanelRow>
    </KangurInfoCard>
  );
}

function DuelsLobbyFilters(props: {
  lobbyTranslations: LobbyTranslations;
  commonTranslations: LobbyTranslations;
  lobbyModeFilter: 'all' | KangurDuelMode;
  lobbyOperationFilter: 'all' | KangurDuelOperation;
  lobbyDifficultyFilter: 'all' | KangurDuelDifficulty;
  lobbySort: LobbySortValue;
  publicLobbyEntriesCount: number;
  filteredPublicLobbyEntriesCount: number;
  onModeChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  onOperationChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  onDifficultyChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  onSortChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
}): React.JSX.Element {
  const {
    lobbyTranslations,
    commonTranslations,
    lobbyModeFilter,
    lobbyOperationFilter,
    lobbyDifficultyFilter,
    lobbySort,
    publicLobbyEntriesCount,
    filteredPublicLobbyEntriesCount,
    onModeChange,
    onOperationChange,
    onDifficultyChange,
    onSortChange,
  } = props;

  return (
    <div className='grid w-full kangur-panel-gap rounded-2xl border border-slate-200/70 bg-white/70 p-3 sm:grid-cols-2 sm:p-4 lg:grid-cols-4'>
      <div className='min-w-0 space-y-1'>
        <div className='text-xs font-semibold uppercase tracking-[0.08em] text-slate-500'>
          {lobbyTranslations('filters.mode.label')}
        </div>
        <KangurSelectField
          value={lobbyModeFilter}
          onChange={onModeChange}
          aria-label={lobbyTranslations('filters.mode.aria')}
          size='sm'
          accent='slate'
        >
          <option value='all'>{lobbyTranslations('filters.mode.all')}</option>
          <option value='challenge'>{lobbyTranslations('filters.mode.challenge')}</option>
          <option value='quick_match'>{lobbyTranslations('filters.mode.quickMatch')}</option>
        </KangurSelectField>
      </div>
      <div className='min-w-0 space-y-1'>
        <div className='text-xs font-semibold uppercase tracking-[0.08em] text-slate-500'>
          {lobbyTranslations('filters.operation.label')}
        </div>
        <KangurSelectField
          value={lobbyOperationFilter}
          onChange={onOperationChange}
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
          onChange={onDifficultyChange}
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
          onChange={onSortChange}
          aria-label={lobbyTranslations('filters.sort.aria')}
          size='sm'
          accent='slate'
        >
          <option value='recent'>{lobbyTranslations('filters.sort.recent')}</option>
          <option value='time_fast'>{lobbyTranslations('filters.sort.timeFast')}</option>
          <option value='time_slow'>{lobbyTranslations('filters.sort.timeSlow')}</option>
          <option value='questions_low'>{lobbyTranslations('filters.sort.questionsLow')}</option>
          <option value='questions_high'>{lobbyTranslations('filters.sort.questionsHigh')}</option>
        </KangurSelectField>
      </div>
      {publicLobbyEntriesCount > 0 ? (
        <div className='text-xs text-slate-500 sm:col-span-2 sm:text-right lg:col-span-4'>
          {lobbyTranslations('meta.visibleCount', { count: filteredPublicLobbyEntriesCount })}
        </div>
      ) : null}
    </div>
  );
}

function DuelsLobbyErrorCard(props: {
  lobbyError: string;
  lobbyTranslations: LobbyTranslations;
  isLobbyLoading: boolean;
  isOnline: boolean;
  compactActionClassName: string;
  onRetry: () => void;
}): React.JSX.Element {
  const {
    lobbyError,
    lobbyTranslations,
    isLobbyLoading,
    isOnline,
    compactActionClassName,
    onRetry,
  } = props;

  return (
    <KangurInfoCard accent='rose' padding='md' tone='accent' role='alert' aria-live='assertive'>
      <KangurPanelRow className='sm:items-center sm:justify-between'>
        <div className='text-sm text-rose-900'>{lobbyError}</div>
        <KangurButton
          onClick={onRetry}
          variant='secondary'
          disabled={isLobbyLoading || !isOnline}
          aria-busy={isLobbyLoading}
          className={compactActionClassName}
        >
          {lobbyTranslations('buttons.retry')}
        </KangurButton>
      </KangurPanelRow>
    </KangurInfoCard>
  );
}

function DuelsLobbyLoadingState(props: {
  lobbyTranslations: LobbyTranslations;
}): React.JSX.Element {
  const { lobbyTranslations } = props;

  return (
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
  );
}

function DuelsLobbyNoEntriesState(props: {
  canJoinLobby: boolean;
  isBusy: boolean;
  lobbyTranslations: LobbyTranslations;
  compactActionClassName: string;
  onCreateChallenge: () => void;
}): React.JSX.Element {
  const { canJoinLobby, isBusy, lobbyTranslations, compactActionClassName, onCreateChallenge } =
    props;

  return (
    <KangurInfoCard accent='slate' padding='md' tone='accent' role='status' aria-live='polite'>
      <div className='flex flex-col kangur-panel-gap'>
        <div className='text-sm text-slate-700'>{lobbyTranslations('empty.noEntries')}</div>
        <KangurButton
          onClick={onCreateChallenge}
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
  );
}

function DuelsLobbyNoMatchesState(props: {
  lobbyTranslations: LobbyTranslations;
  isBusy: boolean;
  compactActionClassName: string;
  onResetFilters: () => void;
}): React.JSX.Element {
  const { lobbyTranslations, isBusy, compactActionClassName, onResetFilters } = props;

  return (
    <KangurInfoCard accent='slate' padding='md' tone='accent' role='status' aria-live='polite'>
      <div className='flex flex-col kangur-panel-gap'>
        <div className='text-sm text-slate-700'>{lobbyTranslations('empty.noMatches')}</div>
        <KangurButton
          onClick={onResetFilters}
          variant='ghost'
          disabled={isBusy}
          className={compactActionClassName}
        >
          {lobbyTranslations('buttons.showAll')}
        </KangurButton>
      </div>
    </KangurInfoCard>
  );
}

function DuelsLobbyPublicState(props: {
  isLobbyLoading: boolean;
  hasAnyPublicLobbyEntries: boolean;
  hasVisiblePublicLobbyEntries: boolean;
  canJoinLobby: boolean;
  isBusy: boolean;
  joiningSessionId: string | null;
  filteredPublicLobbyEntries: KangurDuelLobbyEntry[];
  relativeNow: number;
  lobbyFreshRef: MutableRefObject<Map<string, number>>;
  lobbyFreshWindowMs: number;
  commonTranslations: LobbyTranslations;
  lobbyTranslations: LobbyTranslations;
  compactActionClassName: string;
  lobbyListId: string;
  onJoinLobby: (entry: KangurDuelLobbyEntry, source: LobbyJoinClickSource) => void;
  onCreateChallenge: () => void;
  onResetFilters: () => void;
}): React.JSX.Element {
  const {
    isLobbyLoading,
    hasAnyPublicLobbyEntries,
    hasVisiblePublicLobbyEntries,
    canJoinLobby,
    isBusy,
    joiningSessionId,
    filteredPublicLobbyEntries,
    relativeNow,
    lobbyFreshRef,
    lobbyFreshWindowMs,
    commonTranslations,
    lobbyTranslations,
    compactActionClassName,
    lobbyListId,
    onJoinLobby,
    onCreateChallenge,
    onResetFilters,
  } = props;

  if (isLobbyLoading && !hasAnyPublicLobbyEntries) {
    return <DuelsLobbyLoadingState lobbyTranslations={lobbyTranslations} />;
  }
  if (!hasAnyPublicLobbyEntries) {
    return (
      <DuelsLobbyNoEntriesState
        canJoinLobby={canJoinLobby}
        isBusy={isBusy}
        lobbyTranslations={lobbyTranslations}
        compactActionClassName={compactActionClassName}
        onCreateChallenge={onCreateChallenge}
      />
    );
  }
  if (!hasVisiblePublicLobbyEntries) {
    return (
      <DuelsLobbyNoMatchesState
        lobbyTranslations={lobbyTranslations}
        isBusy={isBusy}
        compactActionClassName={compactActionClassName}
        onResetFilters={onResetFilters}
      />
    );
  }
  return (
    <DuelsLobbyPublicList
      filteredPublicLobbyEntries={filteredPublicLobbyEntries}
      canJoinLobby={canJoinLobby}
      isBusy={isBusy}
      joiningSessionId={joiningSessionId}
      relativeNow={relativeNow}
      lobbyFreshRef={lobbyFreshRef}
      lobbyFreshWindowMs={lobbyFreshWindowMs}
      commonTranslations={commonTranslations}
      lobbyTranslations={lobbyTranslations}
      compactActionClassName={compactActionClassName}
      lobbyListId={lobbyListId}
      onJoinLobby={onJoinLobby}
    />
  );
}

export function DuelsLobbyMainSection(props: {
  lobbyHeadingId: string;
  lobbyDescriptionId: string;
  lobbyListId: string;
  lobbyEntries: KangurDuelLobbyEntry[];
  lobbyCountLabel: string;
  lobbyLastUpdatedAt: string | null;
  relativeNow: number;
  lobbyRefreshSeconds: number;
  lobbyStreamStatus: 'idle' | 'connecting' | 'connected' | 'fallback';
  isLobbyLoading: boolean;
  lobbyModeFilter: 'all' | KangurDuelMode;
  lobbyOperationFilter: 'all' | KangurDuelOperation;
  lobbyDifficultyFilter: 'all' | KangurDuelDifficulty;
  lobbySort: LobbySortValue;
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
  compactActionClassName: string;
  commonTranslations: LobbyTranslations;
  lobbyTranslations: LobbyTranslations;
  lobbyFreshRef: MutableRefObject<Map<string, number>>;
  lobbyFreshWindowMs: number;
  onRefresh: () => void;
  onGuestLogin: () => void;
  onModeChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  onOperationChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  onDifficultyChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  onSortChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
  onRetry: () => void;
  onJoinLobby: (entry: KangurDuelLobbyEntry, source: LobbyJoinClickSource) => void;
  onCreateChallenge: () => void;
  onResetFilters: () => void;
}): React.JSX.Element {
  const {
    lobbyHeadingId,
    lobbyDescriptionId,
    lobbyListId,
    lobbyEntries,
    lobbyCountLabel,
    lobbyLastUpdatedAt,
    relativeNow,
    lobbyRefreshSeconds,
    lobbyStreamStatus,
    isLobbyLoading,
    lobbyModeFilter,
    lobbyOperationFilter,
    lobbyDifficultyFilter,
    lobbySort,
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
    compactActionClassName,
    commonTranslations,
    lobbyTranslations,
    lobbyFreshRef,
    lobbyFreshWindowMs,
    onRefresh,
    onGuestLogin,
    onModeChange,
    onOperationChange,
    onDifficultyChange,
    onSortChange,
    onRetry,
    onJoinLobby,
    onCreateChallenge,
    onResetFilters,
  } = props;
  const showPausedChip = !isPageActive;
  const showOfflineChip = !isOnline;
  const showStaleChip = isLobbyStale && !lobbyError && isPageActive && isOnline;
  const showErrorChip = Boolean(lobbyError) && !showOfflineChip;
  const showLiveChip = lobbyStreamStatus === 'connected';
  const showConnectingChip = lobbyStreamStatus === 'connecting';

  return (
    <KangurGlassPanel
      className={cn('flex flex-col', KANGUR_PANEL_GAP_CLASSNAME)}
      padding='lg'
      surface='solid'
      role='region'
      aria-labelledby={lobbyHeadingId}
      aria-describedby={lobbyDescriptionId}
      aria-busy={isLobbyLoading}
    >
      <DuelsLobbyMainHeader
        lobbyHeadingId={lobbyHeadingId}
        lobbyDescriptionId={lobbyDescriptionId}
        lobbyCountLabel={lobbyCountLabel}
        hasLobbyEntries={lobbyEntries.length > 0}
        showPausedChip={showPausedChip}
        showOfflineChip={showOfflineChip}
        showErrorChip={showErrorChip}
        showConnectingChip={showConnectingChip}
        showLiveChip={showLiveChip}
        showStaleChip={showStaleChip}
        lobbyLastUpdatedAt={lobbyLastUpdatedAt}
        relativeNow={relativeNow}
        lobbyRefreshSeconds={lobbyRefreshSeconds}
        isLobbyLoading={isLobbyLoading}
        isOnline={isOnline}
        compactActionClassName={compactActionClassName}
        commonTranslations={commonTranslations}
        lobbyTranslations={lobbyTranslations}
        onRefresh={onRefresh}
      />

      {!canJoinLobby ? (
        <DuelsLobbyGuestBanner
          lobbyTranslations={lobbyTranslations}
          compactActionClassName={compactActionClassName}
          onRequireLogin={onGuestLogin}
        />
      ) : null}

      <DuelsLobbyFilters
        lobbyTranslations={lobbyTranslations}
        commonTranslations={commonTranslations}
        lobbyModeFilter={lobbyModeFilter}
        lobbyOperationFilter={lobbyOperationFilter}
        lobbyDifficultyFilter={lobbyDifficultyFilter}
        lobbySort={lobbySort}
        publicLobbyEntriesCount={publicLobbyEntries.length}
        filteredPublicLobbyEntriesCount={filteredPublicLobbyEntries.length}
        onModeChange={onModeChange}
        onOperationChange={onOperationChange}
        onDifficultyChange={onDifficultyChange}
        onSortChange={onSortChange}
      />

      {lobbyError ? (
        <DuelsLobbyErrorCard
          lobbyError={lobbyError}
          lobbyTranslations={lobbyTranslations}
          isLobbyLoading={isLobbyLoading}
          isOnline={isOnline}
          compactActionClassName={compactActionClassName}
          onRetry={onRetry}
        />
      ) : null}

      <DuelsLobbyPublicState
        isLobbyLoading={isLobbyLoading}
        hasAnyPublicLobbyEntries={hasAnyPublicLobbyEntries}
        hasVisiblePublicLobbyEntries={hasVisiblePublicLobbyEntries}
        canJoinLobby={canJoinLobby}
        isBusy={isBusy}
        joiningSessionId={joiningSessionId}
        filteredPublicLobbyEntries={filteredPublicLobbyEntries}
        relativeNow={relativeNow}
        lobbyFreshRef={lobbyFreshRef}
        lobbyFreshWindowMs={lobbyFreshWindowMs}
        commonTranslations={commonTranslations}
        lobbyTranslations={lobbyTranslations}
        compactActionClassName={compactActionClassName}
        lobbyListId={lobbyListId}
        onJoinLobby={onJoinLobby}
        onCreateChallenge={onCreateChallenge}
        onResetFilters={onResetFilters}
      />
    </KangurGlassPanel>
  );
}
