'use client';

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
  LOBBY_MODE_LABELS,
  SESSION_STATUS_LABELS,
  formatDuelDifficultyLabel,
  formatDuelOperationLabel,
  formatRelativeAge,
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

export function DuelsLobbyPanel(props: DuelsLobbyPanelProps): React.JSX.Element {
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
      <KangurPanelRow className='sm:items-center sm:justify-between'>
        <div className='space-y-1 min-w-0'>
          <div className={KANGUR_WRAP_CENTER_ROW_CLASSNAME} aria-live='polite' aria-atomic='true'>
            <h3 id={lobbyHeadingId} className='text-lg font-semibold text-slate-900 sm:text-xl'>
              Lobby pojedynków
            </h3>
            <KangurStatusChip
              accent={lobbyEntriesCount > 0 ? 'emerald' : 'slate'}
              size='sm'
            >
              {lobbyCountLabel}
            </KangurStatusChip>
          </div>
          <p id={lobbyDescriptionId} className='text-sm leading-relaxed text-slate-600 max-w-2xl'>
            Wybierz ucznia, który czeka na pojedynek albo dodaj własne wyzwanie.
          </p>
        </div>
        <div className={cn(KANGUR_TIGHT_ROW_CLASSNAME, 'w-full sm:w-auto sm:items-center sm:justify-end')}>
          <div className={KANGUR_WRAP_CENTER_ROW_CLASSNAME}>
            {lobbyLastUpdatedAt ? (
              <KangurStatusChip accent='slate' size='sm'>
                Aktualizacja {formatRelativeAge(lobbyLastUpdatedAt, relativeNow)}
              </KangurStatusChip>
            ) : null}
            <KangurStatusChip accent='slate' size='sm'>
              Auto co {lobbyRefreshSeconds}s
            </KangurStatusChip>
          </div>
          <KangurButton
            onClick={onRefresh}
            variant='ghost'
            disabled={isLobbyLoading}
            aria-label='Odśwież lobby pojedynków'
            aria-busy={isLobbyLoading}
            aria-live='polite'
            className='w-full sm:w-auto'
          >
            {isLobbyLoading ? 'Odświeżamy…' : 'Odśwież'}
          </KangurButton>
        </div>
      </KangurPanelRow>

      <div className='grid w-full kangur-panel-gap rounded-2xl border border-slate-200/70 bg-white/70 p-3 sm:grid-cols-2 sm:p-4'>
        <div className='min-w-0 space-y-1'>
          <div className='text-xs font-semibold uppercase tracking-[0.08em] text-slate-500'>
            Tryb
          </div>
          <KangurSelectField
            value={lobbyModeFilter}
            onChange={(event: React.ChangeEvent<HTMLSelectElement>) => onModeFilterChange(event.target.value as 'all' | KangurDuelMode)}
            aria-label='Filtruj lobby po trybie pojedynku'
            size='sm'
            accent='slate'
          >
            <option value='all'>Wszystkie tryby</option>
            <option value='challenge'>Wyzwania</option>
            <option value='quick_match'>Szybkie pojedynki</option>
          </KangurSelectField>
        </div>
        <div className='min-w-0 space-y-1'>
          <div className='text-xs font-semibold uppercase tracking-[0.08em] text-slate-500'>
            Sortowanie
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
        {publicLobbyCount > 0 ? (
          <div className='text-xs text-slate-500 sm:col-span-2 sm:text-right'>
            Widocznych: {visibleLobbyCount}
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
          {lobbyError}
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
      ) : !hasAnyPublicLobbyEntries ? (
        <KangurInfoCard accent='slate' padding='md' tone='accent' role='status' aria-live='polite'>
          <div className='flex flex-col kangur-panel-gap'>
            <div className='text-sm text-slate-700'>Brak uczniów oczekujących na pojedynek.</div>
            <KangurButton
              onClick={onCreateChallenge}
              variant='secondary'
              disabled={isBusy}
              className='w-full sm:w-auto'
            >
              Stwórz własne wyzwanie
            </KangurButton>
          </div>
        </KangurInfoCard>
      ) : !hasVisiblePublicLobbyEntries ? (
        <KangurInfoCard accent='slate' padding='md' tone='accent' role='status' aria-live='polite'>
          <div className='flex flex-col kangur-panel-gap'>
            <div className='text-sm text-slate-700'>
              Brak wyzwań dla wybranego filtra.
            </div>
            <KangurButton
              onClick={onResetFilters}
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
          {filteredPublicLobbyEntries.map((entry) => {
            const hostInitial = resolveLobbyHostInitial(entry.host.displayName);
            const freshAt = lobbyFresh.get(entry.sessionId);
            const isFresh =
              typeof freshAt === 'number' && relativeNow - freshAt < freshWindowMs;
            const updatedLabel = formatRelativeAge(entry.updatedAt, relativeNow);
            const operationLabel = formatDuelOperationLabel(entry.operation);
            const difficultyLabel = formatDuelDifficultyLabel(entry.difficulty);
            return (
              <li key={entry.sessionId}>
                <KangurInfoCard
                  accent='slate'
                  padding='md'
                  tone='neutral'
                  className={cn('flex flex-col kangur-panel-gap', isFresh && 'ring-2 ring-emerald-200/70')}
                  role='group'
                  aria-label={`Publiczne wyzwanie od ${entry.host.displayName}. ${operationLabel}, ${difficultyLabel}. ${entry.questionCount} pytań, ${entry.timePerQuestionSec} sekund na pytanie.`}
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
                          Czeka na przeciwnika • {updatedLabel}
                        </div>
                      </div>
                    </div>
                    <KangurButton
                      onClick={() => onJoin(entry.sessionId)}
                      variant='secondary'
                      disabled={isBusy}
                      aria-label={`Dołącz do pojedynku z ${entry.host.displayName}`}
                      className='w-full sm:w-auto'
                    >
                      Dołącz
                    </KangurButton>
                  </div>
                  <div className={KANGUR_WRAP_ROW_CLASSNAME}>
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
                      {operationLabel}
                    </KangurStatusChip>
                    <KangurStatusChip accent='slate' size='sm'>
                      {difficultyLabel}
                    </KangurStatusChip>
                    <KangurStatusChip accent='slate' size='sm'>
                      Publiczny
                    </KangurStatusChip>
                    <KangurStatusChip accent='slate' size='sm'>
                      {entry.questionCount} pytań
                    </KangurStatusChip>
                    <KangurStatusChip accent='slate' size='sm'>
                      {entry.timePerQuestionSec}s
                    </KangurStatusChip>
                  </div>
                </KangurInfoCard>
              </li>
            );
          })}
        </ul>
      )}
    </KangurGlassPanel>
  );
}
