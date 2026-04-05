'use client';

import { useLocale, useTranslations } from 'next-intl';

import { KangurDuelsWordmark } from '@/features/kangur/ui/components/wordmarks/KangurDuelsWordmark';
import {
  KangurButton,
  KangurGlassPanel,
  KangurInfoCard,
  KangurPanelRow,
  KangurSelectField,
  KangurStatusChip,
} from '@/features/kangur/ui/design/primitives';
import {
  KANGUR_SPACED_ROW_CLASSNAME,
  KANGUR_TIGHT_ROW_CLASSNAME,
  KANGUR_WRAP_CENTER_ROW_CLASSNAME,
  KANGUR_WRAP_ROW_CLASSNAME,
} from '@/features/kangur/ui/design/tokens';
import type { KangurDuelLobbyEntry, KangurDuelMode } from '@/features/kangur/shared/contracts/kangur-duels';
import { cn } from '@/features/kangur/shared/utils';

import {
  LOBBY_MODE_ACCENTS,
  formatDuelDifficultyLabel,
  formatLobbyModeLabel,
  formatDuelOperationLabel,
  formatRelativeAge,
  formatSessionStatusLabel,
  resolveLobbyHostInitial,
  resolveSessionAccent,
} from './duels-helpers';

type DuelsLobbyPanelProps = {
  lobbyHeadingId: string;
  lobbyDescriptionId: string;
  lobbyListId: string;
  lobbyModeFilter: 'all' | KangurDuelMode;
  lobbySort: 'recent' | 'time_fast' | 'time_slow' | 'questions_low' | 'questions_high';
  lobbyLastUpdatedAt: string | null;
  lobbyRefreshSeconds: number;
  lobbyCountLabel: string;
  lobbyEntriesCount: number;
  publicLobbyCount: number;
  visibleLobbyCount: number;
  filteredPublicLobbyEntries: KangurDuelLobbyEntry[];
  hasAnyPublicLobbyEntries: boolean;
  hasVisiblePublicLobbyEntries: boolean;
  lobbyError: string | null;
  isLobbyLoading: boolean;
  isBusy: boolean;
  relativeNow: number;
  lobbyFresh: Map<string, number>;
  freshWindowMs: number;
  onRefresh: () => void;
  onModeFilterChange: (value: 'all' | KangurDuelMode) => void;
  onSortChange: (
    value: 'recent' | 'time_fast' | 'time_slow' | 'questions_low' | 'questions_high'
  ) => void;
  onJoin: (sessionId: string) => void;
  onCreateChallenge: () => void;
  onResetFilters: () => void;
};

type DuelsLobbyTranslations = ReturnType<typeof useTranslations>;

function DuelsLobbyHeader(props: {
  commonTranslations: DuelsLobbyTranslations;
  isLobbyLoading: boolean;
  lobbyCountLabel: string;
  lobbyDescriptionId: string;
  lobbyEntriesCount: number;
  lobbyHeadingId: string;
  lobbyLastUpdatedAt: string | null;
  lobbyRefreshSeconds: number;
  locale: string;
  lobbyTranslations: DuelsLobbyTranslations;
  onRefresh: () => void;
  relativeNow: number;
}): React.JSX.Element {
  const {
    commonTranslations,
    isLobbyLoading,
    lobbyCountLabel,
    lobbyDescriptionId,
    lobbyEntriesCount,
    lobbyHeadingId,
    lobbyLastUpdatedAt,
    lobbyRefreshSeconds,
    locale,
    lobbyTranslations,
    onRefresh,
    relativeNow,
  } = props;
  const lobbyHeadingLabel = lobbyTranslations('heading');

  return (
    <KangurPanelRow className='sm:items-center sm:justify-between'>
      <div className='space-y-1 min-w-0'>
        <div className={KANGUR_WRAP_CENTER_ROW_CLASSNAME} aria-live='polite' aria-atomic='true'>
          <h3 id={lobbyHeadingId} className='min-w-0'>
            <span className='sr-only'>{lobbyHeadingLabel}</span>
            <KangurDuelsWordmark
              className='max-w-[228px] sm:max-w-[260px]'
              data-testid='kangur-duels-heading-art'
              idPrefix='kangur-duels-heading'
              label={lobbyHeadingLabel}
              locale={locale}
            />
          </h3>
          <KangurStatusChip accent={lobbyEntriesCount > 0 ? 'emerald' : 'slate'} size='sm'>
            {lobbyCountLabel}
          </KangurStatusChip>
        </div>
        <p id={lobbyDescriptionId} className='text-sm leading-relaxed text-slate-600 max-w-2xl'>
          {lobbyTranslations('description')}
        </p>
      </div>
      <div className={cn(KANGUR_TIGHT_ROW_CLASSNAME, 'w-full sm:w-auto sm:items-center sm:justify-end')}>
        <div className={KANGUR_WRAP_CENTER_ROW_CLASSNAME}>
          {lobbyLastUpdatedAt ? (
            <KangurStatusChip accent='slate' size='sm'>
              {lobbyTranslations('meta.updated', {
                value: formatRelativeAge(lobbyLastUpdatedAt, relativeNow, commonTranslations),
              })}
            </KangurStatusChip>
          ) : null}
          <KangurStatusChip accent='slate' size='sm'>
            {lobbyTranslations('meta.autoEvery', { seconds: lobbyRefreshSeconds })}
          </KangurStatusChip>
        </div>
        <KangurButton
          onClick={onRefresh}
          variant='ghost'
          disabled={isLobbyLoading}
          aria-label={lobbyTranslations('buttons.refreshAria')}
          aria-busy={isLobbyLoading}
          aria-live='polite'
          className='w-full sm:w-auto'
        >
          {isLobbyLoading
            ? lobbyTranslations('buttons.refreshing')
            : lobbyTranslations('buttons.refresh')}
        </KangurButton>
      </div>
    </KangurPanelRow>
  );
}

function DuelsLobbyFilters(props: {
  lobbyModeFilter: 'all' | KangurDuelMode;
  lobbySort: 'recent' | 'time_fast' | 'time_slow' | 'questions_low' | 'questions_high';
  lobbyTranslations: DuelsLobbyTranslations;
  onModeFilterChange: (value: 'all' | KangurDuelMode) => void;
  onSortChange: (
    value: 'recent' | 'time_fast' | 'time_slow' | 'questions_low' | 'questions_high'
  ) => void;
  publicLobbyCount: number;
  visibleLobbyCount: number;
}): React.JSX.Element {
  const {
    lobbyModeFilter,
    lobbySort,
    lobbyTranslations,
    onModeFilterChange,
    onSortChange,
    publicLobbyCount,
    visibleLobbyCount,
  } = props;

  return (
    <div className='grid w-full kangur-panel-gap rounded-2xl border border-slate-200/70 bg-white/70 p-3 sm:grid-cols-2 sm:p-4'>
      <div className='min-w-0 space-y-1'>
        <div className='text-xs font-semibold uppercase tracking-[0.08em] text-slate-500'>
          {lobbyTranslations('filters.mode.label')}
        </div>
        <KangurSelectField
          value={lobbyModeFilter}
          onChange={(event: React.ChangeEvent<HTMLSelectElement>) =>
            onModeFilterChange(event.target.value as 'all' | KangurDuelMode)
          }
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
          {lobbyTranslations('filters.sort.label')}
        </div>
        <KangurSelectField
          value={lobbySort}
          onChange={(event: React.ChangeEvent<HTMLSelectElement>) =>
            onSortChange(
              event.target.value as
                | 'recent'
                | 'time_fast'
                | 'time_slow'
                | 'questions_low'
                | 'questions_high'
            )
          }
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
      {publicLobbyCount > 0 ? (
        <div className='text-xs text-slate-500 sm:col-span-2 sm:text-right'>
          {lobbyTranslations('meta.visibleCount', { count: visibleLobbyCount })}
        </div>
      ) : null}
    </div>
  );
}

function DuelsLobbyLoadingState(props: {
  lobbyTranslations: DuelsLobbyTranslations;
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
            <div className='space-y-2'>
              <div className='h-4 w-28 rounded-full bg-slate-200/70' />
              <div className='h-3 w-36 rounded-full bg-slate-200/60' />
            </div>
          </div>
          <div className={KANGUR_WRAP_ROW_CLASSNAME}>
            <div className='h-6 w-20 rounded-full bg-slate-200/60' />
            <div className='h-6 w-24 rounded-full bg-slate-200/60' />
            <div className='h-6 w-16 rounded-full bg-slate-200/60' />
          </div>
        </div>
      ))}
    </div>
  );
}

function DuelsLobbyEmptyState(props: {
  description: string;
  actionLabel: string;
  actionVariant: 'ghost' | 'secondary';
  disabled: boolean;
  onAction: () => void;
}): React.JSX.Element {
  const { actionLabel, actionVariant, description, disabled, onAction } = props;

  return (
    <KangurInfoCard accent='slate' padding='md' tone='accent' role='status' aria-live='polite'>
      <div className='flex flex-col kangur-panel-gap'>
        <div className='text-sm text-slate-700'>{description}</div>
        <KangurButton
          onClick={onAction}
          variant={actionVariant}
          disabled={disabled}
          className='w-full sm:w-auto'
        >
          {actionLabel}
        </KangurButton>
      </div>
    </KangurInfoCard>
  );
}

function DuelsLobbyEntryList(props: {
  commonTranslations: DuelsLobbyTranslations;
  filteredPublicLobbyEntries: KangurDuelLobbyEntry[];
  freshWindowMs: number;
  isBusy: boolean;
  lobbyFresh: Map<string, number>;
  lobbyListId: string;
  lobbyTranslations: DuelsLobbyTranslations;
  onJoin: (sessionId: string) => void;
  relativeNow: number;
}): React.JSX.Element {
  const {
    commonTranslations,
    filteredPublicLobbyEntries,
    freshWindowMs,
    isBusy,
    lobbyFresh,
    lobbyListId,
    lobbyTranslations,
    onJoin,
    relativeNow,
  } = props;

  return (
    <ul
      className='grid kangur-panel-gap sm:grid-cols-2'
      role='list'
      aria-label={lobbyTranslations('publicListAria')}
      id={lobbyListId}
    >
      {filteredPublicLobbyEntries.map((entry) => {
        const hostInitial = resolveLobbyHostInitial(entry.host.displayName);
        const freshAt = lobbyFresh.get(entry.sessionId);
        const isFresh = typeof freshAt === 'number' && relativeNow - freshAt < freshWindowMs;
        const updatedLabel = formatRelativeAge(entry.updatedAt, relativeNow, commonTranslations);
        const operationLabel = formatDuelOperationLabel(entry.operation, commonTranslations);
        const difficultyLabel = formatDuelDifficultyLabel(entry.difficulty, commonTranslations);

        return (
          <li key={entry.sessionId}>
            <KangurInfoCard
              accent='slate'
              padding='md'
              tone='neutral'
              className={cn('flex flex-col kangur-panel-gap', isFresh && 'ring-2 ring-emerald-200/70')}
              role='group'
              aria-label={lobbyTranslations('publicCardAria', {
                name: entry.host.displayName,
                operation: operationLabel,
                difficulty: difficultyLabel,
                questionCount: entry.questionCount,
                seconds: entry.timePerQuestionSec,
              })}
            >
              <div className={cn(KANGUR_SPACED_ROW_CLASSNAME, 'sm:items-start sm:justify-between')}>
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
                      {lobbyTranslations('meta.waitingForOpponent', {
                        updated: updatedLabel,
                      })}
                    </div>
                  </div>
                </div>
                <KangurButton
                  onClick={() => onJoin(entry.sessionId)}
                  variant='secondary'
                  disabled={isBusy}
                  aria-label={lobbyTranslations('publicJoinAria', {
                    name: entry.host.displayName,
                  })}
                  className='w-full sm:w-auto'
                >
                  {lobbyTranslations('buttons.join')}
                </KangurButton>
              </div>
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
                <KangurStatusChip accent='slate' size='sm'>
                  {lobbyTranslations('chips.public')}
                </KangurStatusChip>
                <KangurStatusChip accent='slate' size='sm'>
                  {lobbyTranslations('meta.questionCount', { count: entry.questionCount })}
                </KangurStatusChip>
                <KangurStatusChip accent='slate' size='sm'>
                  {lobbyTranslations('meta.secondsCompact', {
                    seconds: entry.timePerQuestionSec,
                  })}
                </KangurStatusChip>
              </div>
            </KangurInfoCard>
          </li>
        );
      })}
    </ul>
  );
}

function DuelsLobbyBody(props: {
  commonTranslations: DuelsLobbyTranslations;
  filteredPublicLobbyEntries: KangurDuelLobbyEntry[];
  freshWindowMs: number;
  hasAnyPublicLobbyEntries: boolean;
  hasVisiblePublicLobbyEntries: boolean;
  isBusy: boolean;
  isLobbyLoading: boolean;
  lobbyFresh: Map<string, number>;
  lobbyListId: string;
  lobbyTranslations: DuelsLobbyTranslations;
  onCreateChallenge: () => void;
  onJoin: (sessionId: string) => void;
  onResetFilters: () => void;
  relativeNow: number;
}): React.JSX.Element {
  const {
    commonTranslations,
    filteredPublicLobbyEntries,
    freshWindowMs,
    hasAnyPublicLobbyEntries,
    hasVisiblePublicLobbyEntries,
    isBusy,
    isLobbyLoading,
    lobbyFresh,
    lobbyListId,
    lobbyTranslations,
    onCreateChallenge,
    onJoin,
    onResetFilters,
    relativeNow,
  } = props;

  if (isLobbyLoading && !hasAnyPublicLobbyEntries) {
    return <DuelsLobbyLoadingState lobbyTranslations={lobbyTranslations} />;
  }

  if (!hasAnyPublicLobbyEntries) {
    return (
      <DuelsLobbyEmptyState
        description={lobbyTranslations('empty.noEntries')}
        actionLabel={lobbyTranslations('buttons.createChallenge')}
        actionVariant='secondary'
        disabled={isBusy}
        onAction={onCreateChallenge}
      />
    );
  }

  if (!hasVisiblePublicLobbyEntries) {
    return (
      <DuelsLobbyEmptyState
        description={lobbyTranslations('empty.noMatches')}
        actionLabel={lobbyTranslations('buttons.showAll')}
        actionVariant='ghost'
        disabled={isBusy}
        onAction={onResetFilters}
      />
    );
  }

  return (
    <DuelsLobbyEntryList
      commonTranslations={commonTranslations}
      filteredPublicLobbyEntries={filteredPublicLobbyEntries}
      freshWindowMs={freshWindowMs}
      isBusy={isBusy}
      lobbyFresh={lobbyFresh}
      lobbyListId={lobbyListId}
      lobbyTranslations={lobbyTranslations}
      onJoin={onJoin}
      relativeNow={relativeNow}
    />
  );
}

export function DuelsLobbyPanel(props: DuelsLobbyPanelProps): React.JSX.Element {
  const locale = useLocale();
  const lobbyTranslations = useTranslations('KangurDuels.lobby');
  const commonTranslations = useTranslations('KangurDuels.common');
  const {
    lobbyHeadingId,
    lobbyDescriptionId,
    lobbyListId,
    lobbyModeFilter,
    lobbySort,
    lobbyLastUpdatedAt,
    lobbyRefreshSeconds,
    lobbyCountLabel,
    lobbyEntriesCount,
    publicLobbyCount,
    visibleLobbyCount,
    filteredPublicLobbyEntries,
    hasAnyPublicLobbyEntries,
    hasVisiblePublicLobbyEntries,
    lobbyError,
    isLobbyLoading,
    isBusy,
    relativeNow,
    lobbyFresh,
    freshWindowMs,
    onRefresh,
    onModeFilterChange,
    onSortChange,
    onJoin,
    onCreateChallenge,
    onResetFilters,
  } = props;

  return (
    <KangurGlassPanel
      className='flex flex-col kangur-panel-gap'
      padding='lg'
      surface='solid'
      role='region'
      aria-labelledby={lobbyHeadingId}
      aria-describedby={lobbyDescriptionId}
      aria-busy={isLobbyLoading}
    >
      <DuelsLobbyHeader
        commonTranslations={commonTranslations}
        isLobbyLoading={isLobbyLoading}
        lobbyCountLabel={lobbyCountLabel}
        lobbyDescriptionId={lobbyDescriptionId}
        lobbyEntriesCount={lobbyEntriesCount}
        lobbyHeadingId={lobbyHeadingId}
        lobbyLastUpdatedAt={lobbyLastUpdatedAt}
        lobbyRefreshSeconds={lobbyRefreshSeconds}
        locale={locale}
        lobbyTranslations={lobbyTranslations}
        onRefresh={onRefresh}
        relativeNow={relativeNow}
      />

      <DuelsLobbyFilters
        lobbyModeFilter={lobbyModeFilter}
        lobbySort={lobbySort}
        lobbyTranslations={lobbyTranslations}
        onModeFilterChange={onModeFilterChange}
        onSortChange={onSortChange}
        publicLobbyCount={publicLobbyCount}
        visibleLobbyCount={visibleLobbyCount}
      />

      {lobbyError ? (
        <KangurInfoCard
          accent='rose'
          padding='md'
          tone='accent'
          role='alert'
          aria-live='assertive'
        >
          {lobbyError}
        </KangurInfoCard>
      ) : null}

      <DuelsLobbyBody
        commonTranslations={commonTranslations}
        filteredPublicLobbyEntries={filteredPublicLobbyEntries}
        freshWindowMs={freshWindowMs}
        hasAnyPublicLobbyEntries={hasAnyPublicLobbyEntries}
        hasVisiblePublicLobbyEntries={hasVisiblePublicLobbyEntries}
        isBusy={isBusy}
        isLobbyLoading={isLobbyLoading}
        lobbyFresh={lobbyFresh}
        lobbyListId={lobbyListId}
        lobbyTranslations={lobbyTranslations}
        onCreateChallenge={onCreateChallenge}
        onJoin={onJoin}
        onResetFilters={onResetFilters}
        relativeNow={relativeNow}
      />
    </KangurGlassPanel>
  );
}
