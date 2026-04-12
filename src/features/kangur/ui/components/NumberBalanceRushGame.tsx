'use client';

import { Droppable } from '@hello-pangea/dnd';
import React from 'react';

import type {
  NumberBalanceTile,
} from '@/features/kangur/games/number-balance/number-balance-generator';
import { KangurDragDropContext } from '@/features/kangur/ui/components/KangurDragDropContext';
import {
  KangurPracticeGameShell,
  KangurPracticeGameSummary,
  KangurPracticeGameSummaryActions,
  KangurPracticeGameSummaryEmoji,
  KangurPracticeGameSummaryMessage,
  KangurPracticeGameSummaryTitle,
} from '@/features/kangur/ui/components/KangurPracticeGameChrome';
import {
  getKangurMiniGameFinishLabel,
  getKangurMiniGameScorePointsLabel,
} from '@/features/kangur/ui/constants/mini-game-i18n';
import {
  KangurButton,
  KangurGlassPanel,
  KangurStatusChip,
} from '@/features/kangur/ui/design/primitives';
import {
  KANGUR_CENTER_ROW_CLASSNAME,
  KANGUR_GRID_TIGHT_CLASSNAME,
  KANGUR_STACK_ROOMY_CLASSNAME,
  KANGUR_WRAP_CENTER_ROW_CLASSNAME,
} from '@/features/kangur/ui/design/tokens';
import { cn } from '@/features/kangur/shared/utils';

import { useNumberBalanceRushGameState } from './NumberBalanceRushGame.hooks';
import { NumberTile } from './NumberBalanceRushGame.components';
import { type NumberBalanceRushGameProps, type ZoneId } from './NumberBalanceRushGame.types';

type NumberBalanceRushState = ReturnType<typeof useNumberBalanceRushGameState>;
type NumberBalanceRushTranslations = NumberBalanceRushState['translations'];

import {
  type NumberBalanceLeaderboardEntry,
} from './NumberBalanceRushGame.runtime';
import { NumberBalanceRushGameProvider, useNumberBalanceRushGame } from './NumberBalanceRushGameContext';

const NUMBER_BALANCE_DROP_ZONE_CLASSNAME =
  'flex min-h-[120px] w-full flex-wrap items-center justify-center gap-2 rounded-3xl border-2 border-dashed p-3 transition touch-manipulation';
const NUMBER_BALANCE_TRAY_CLASSNAME =
  'flex min-h-[88px] flex-wrap items-center justify-center kangur-panel-gap rounded-[28px] border-2 border-dashed p-3 transition touch-manipulation';

const resolveNumberBalanceCopyStatusLabel = ({
  copyStatus,
  translations,
}: {
  copyStatus: NumberBalanceRushState['copyStatus'];
  translations: NumberBalanceRushTranslations;
}): string => {
  if (copyStatus === 'success') {
    return translations('numberBalance.inRound.waiting.copy.success');
  }

  if (copyStatus === 'error') {
    return translations('numberBalance.inRound.waiting.copy.error');
  }

  return translations('numberBalance.inRound.waiting.copy.idle');
};

const resolveNumberBalanceTimerLabel = ({
  countdownLeftMs,
  phase,
  timeLeftMs,
}: {
  countdownLeftMs: number;
  phase: NumberBalanceRushState['phase'];
  timeLeftMs: number;
}): number =>
  phase === 'countdown'
    ? Math.max(0, Math.ceil(countdownLeftMs / 1000))
    : Math.max(0, Math.ceil(timeLeftMs / 1000));

const resolveNumberBalanceSummaryEmoji = (score: number): string => {
  if (score >= 12) {
    return '🏆';
  }

  if (score >= 6) {
    return '🌟';
  }

  return '💪';
};

const resolveNumberBalanceSummaryOutcomeLabel = ({
  hasOpponent,
  opponentScore,
  score,
  translations,
}: {
  hasOpponent: boolean;
  opponentScore: number | null;
  score: number;
  translations: NumberBalanceRushTranslations;
}): string | null => {
  if (!hasOpponent) {
    return null;
  }

  const safeOpponentScore = opponentScore ?? 0;
  if (score > safeOpponentScore) {
    return translations('numberBalance.summary.outcome.win');
  }

  if (score === safeOpponentScore) {
    return translations('numberBalance.summary.outcome.draw');
  }

  return translations('numberBalance.summary.outcome.loss');
};

const resolveNumberBalanceSummaryMessage = ({
  avgSolve,
  hasOpponent,
  leaderboardEntriesLength,
  opponentScore,
  outcomeLabel,
  playerRank,
  solves,
  translations,
}: {
  avgSolve: number | null;
  hasOpponent: boolean;
  leaderboardEntriesLength: number;
  opponentScore: number | null;
  outcomeLabel: string | null;
  playerRank: number | null;
  solves: number;
  translations: NumberBalanceRushTranslations;
}): string => {
  const segments = [
    `${translations('numberBalance.summary.solvedLabel')}: ${solves}`,
    `${translations('numberBalance.summary.averageTimeLabel')}: ${
      avgSolve ? `${(avgSolve / 1000).toFixed(1)} s` : '—'
    }`,
  ];

  if (hasOpponent) {
    segments.push(
      `${translations('numberBalance.summary.opponentLabel')}: ${opponentScore ?? 0} ${translations('shared.pointsShort')}`
    );
  }

  if (playerRank) {
    segments.push(
      `${translations('numberBalance.summary.placeLabel')}: ${playerRank}/${leaderboardEntriesLength}`
    );
  }

  if (outcomeLabel) {
    segments.push(outcomeLabel);
  }

  return segments.join(' • ');
};

const hasNumberBalanceWaitingRuntime = ({
  match,
  phase,
  player,
}: {
  match: NumberBalanceRushState['match'];
  phase: NumberBalanceRushState['phase'];
  player: NumberBalanceRushState['player'];
}): boolean => phase === 'waiting' && Boolean(match) && Boolean(player);

const hasNumberBalanceActiveRuntime = ({
  match,
  player,
  puzzle,
}: {
  match: NumberBalanceRushState['match'];
  player: NumberBalanceRushState['player'];
  puzzle: NumberBalanceRushState['puzzle'];
}): boolean => Boolean(match && player && puzzle);

const renderNumberBalanceEmptySlots = (count: number): React.JSX.Element[] =>
  Array.from({ length: Math.max(0, count) }, (_, index) => (
    <div
      key={index}
      className='h-14 w-14 rounded-2xl border border-dashed border-amber-200/70'
      aria-hidden='true'
    />
  ));

function NumberBalanceRushTimer({
  countdownLeftMs,
  phase,
  timeLeftMs,
  timePercent,
}: {
  countdownLeftMs: number;
  phase: NumberBalanceRushState['phase'];
  timeLeftMs: number;
  timePercent: number;
}): React.JSX.Element {
  return (
    <KangurGlassPanel
      className='relative flex h-14 w-14 items-center justify-center rounded-full'
      surface='mistSoft'
    >
      <div
        aria-hidden='true'
        className='absolute inset-1 rounded-full'
        style={{
          background: `conic-gradient(#f59e0b ${timePercent * 360}deg, rgba(251,191,36,0.2) 0deg)`,
        }}
      />
      <div className='relative z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white text-sm font-bold text-amber-900'>
        {resolveNumberBalanceTimerLabel({ countdownLeftMs, phase, timeLeftMs })}
      </div>
    </KangurGlassPanel>
  );
}

function NumberBalanceRushWaitingView({
  copyStatus,
  handleCopyMatchId,
  matchId,
  opponentLabel,
  score,
  translations,
}: {
  copyStatus: NumberBalanceRushState['copyStatus'];
  handleCopyMatchId: NumberBalanceRushState['handleCopyMatchId'];
  matchId: string;
  opponentLabel: string;
  score: number;
  translations: NumberBalanceRushTranslations;
}): React.JSX.Element {
  return (
    <KangurPracticeGameShell className='w-full max-w-xl'>
      <KangurGlassPanel className='w-full rounded-[28px] p-6 text-center' surface='playField'>
        <div className='text-sm font-semibold text-amber-900'>
          {translations('numberBalance.inRound.waiting.title')}
        </div>
        <div className='mt-2 text-xs font-semibold text-amber-900/80'>
          {translations('numberBalance.inRound.waiting.matchCode', { matchId })}
        </div>
        <div className='mt-3 flex flex-wrap justify-center gap-2'>
          <KangurButton size='sm' variant='ghost' onClick={() => void handleCopyMatchId()}>
            {resolveNumberBalanceCopyStatusLabel({ copyStatus, translations })}
          </KangurButton>
        </div>
        <div className='mt-4 flex flex-wrap justify-center gap-2'>
          <KangurStatusChip className='px-3 py-1 text-xs font-bold' accent='amber'>
            {translations('numberBalance.inRound.selfLabel', { score })}
          </KangurStatusChip>
          <KangurStatusChip className='px-3 py-1 text-xs font-bold' accent='sky'>
            {opponentLabel}
          </KangurStatusChip>
        </div>
      </KangurGlassPanel>
    </KangurPracticeGameShell>
  );
}

function NumberBalanceRushLoadingView({
  error,
  handleRetryMatch,
  translations,
}: {
  error: string | null;
  handleRetryMatch: NumberBalanceRushState['handleRetryMatch'];
  translations: NumberBalanceRushTranslations;
}): React.JSX.Element {
  return (
    <KangurPracticeGameShell className='w-full max-w-xl'>
      <KangurGlassPanel className='w-full rounded-[28px] p-6 text-center' surface='playField'>
        <div className='text-sm font-semibold text-amber-900'>
          {translations('numberBalance.inRound.loading')}
        </div>
        {error ? (
          <div className='mt-3 text-xs font-semibold text-rose-600'>
            {error}
            <div className='mt-2'>
              <KangurButton size='sm' variant='primary' onClick={handleRetryMatch}>
                {translations('shared.restart')}
              </KangurButton>
            </div>
          </div>
        ) : null}
      </KangurGlassPanel>
    </KangurPracticeGameShell>
  );
}

function NumberBalanceRushSummaryView({
  avgSolve,
  handleRetryMatch,
  hasOpponent,
  leaderboardEntriesLength,
  onFinish,
  opponentScore,
  playerRank,
  score,
  solves,
  translations,
}: {
  avgSolve: number | null;
  handleRetryMatch: NumberBalanceRushState['handleRetryMatch'];
  hasOpponent: boolean;
  leaderboardEntriesLength: number;
  onFinish: (() => void) | undefined;
  opponentScore: number | null;
  playerRank: number | null;
  score: number;
  solves: number;
  translations: NumberBalanceRushTranslations;
}): React.JSX.Element {
  const outcomeLabel = resolveNumberBalanceSummaryOutcomeLabel({
    hasOpponent,
    opponentScore,
    score,
    translations,
  });

  return (
    <KangurPracticeGameSummary dataTestId='number-balance-summary-shell'>
      <KangurPracticeGameSummaryEmoji
        dataTestId='number-balance-summary-emoji'
        emoji={resolveNumberBalanceSummaryEmoji(score)}
      />
      <KangurPracticeGameSummaryTitle
        dataTestId='number-balance-summary-title'
        title={getKangurMiniGameScorePointsLabel(translations, score)}
      />
      <KangurPracticeGameSummaryMessage>
        {resolveNumberBalanceSummaryMessage({
          avgSolve,
          hasOpponent,
          leaderboardEntriesLength,
          opponentScore,
          outcomeLabel,
          playerRank,
          solves,
          translations,
        })}
      </KangurPracticeGameSummaryMessage>
      <KangurPracticeGameSummaryActions
        finishLabel={getKangurMiniGameFinishLabel(translations, 'end')}
        onFinish={() => onFinish?.()}
        onRestart={handleRetryMatch}
        restartLabel={translations('shared.restart')}
      />
    </KangurPracticeGameSummary>
  );
}

function NumberBalanceRushLeaderboard({
  entries,
  translations,
}: {
  entries: NumberBalanceRushState['leaderboardEntries'];
  translations: NumberBalanceRushTranslations;
}): React.JSX.Element | null {
  if (entries.length <= 1) {
    return null;
  }

  return (
    <div className={`${KANGUR_GRID_TIGHT_CLASSNAME} sm:grid-cols-2`}>
      {entries.map((entry: NumberBalanceLeaderboardEntry) => (
        <div
          key={entry.playerId}
          className={cn(
            'flex items-center justify-between rounded-2xl border border-amber-200/70 bg-white/70 px-4 py-2 text-xs font-semibold text-amber-900/90',
            entry.isSelf && 'ring-2 ring-amber-200'
          )}
        >
          <div className={KANGUR_CENTER_ROW_CLASSNAME}>
            <span className='text-amber-900/70'>{entry.rank}.</span>
            <span>{entry.label}</span>
            {entry.isLeader ? (
              <span className='rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800'>
                {translations('numberBalance.inRound.leaderBadge')}
              </span>
            ) : null}
          </div>
          <span>
            {entry.score} {translations('shared.pointsShort')}
          </span>
        </div>
      ))}
    </div>
  );
}

function NumberBalanceRushTouchHint({
  isCoarsePointer,
  touchHint,
}: {
  isCoarsePointer: boolean;
  touchHint: string;
}): React.JSX.Element | null {
  if (!isCoarsePointer) {
    return null;
  }

  return (
    <div
      data-testid='number-balance-touch-hint'
      className='rounded-2xl border border-amber-200/80 bg-white/80 px-4 py-3 text-sm font-semibold text-amber-950 shadow-sm'
      aria-live='polite'
    >
      {touchHint}
    </div>
  );
}

function NumberBalanceRushTileZone({
  ariaLabel,
  dataTestId,
  droppableId,
  snapshotClassName,
  tiles,
}: {
  ariaLabel: string;
  dataTestId: string;
  droppableId: ZoneId;
  snapshotClassName: string;
  tiles: NumberBalanceTile[];
}): React.JSX.Element {
  const {
    canInteract,
    isCoarsePointer,
    moveSelectedTileTo,
    selectedTileId,
    setSelectedTileId,
  } = useNumberBalanceRushGame();

  return (
    <Droppable droppableId={droppableId} direction='horizontal'>
      {(provided, snapshot) => (
        <div
          data-testid={dataTestId}
          ref={provided.innerRef}
          {...provided.droppableProps}
          className={cn(
            snapshotClassName,
            snapshot.isDraggingOver ? 'border-amber-300 bg-amber-50/80' : 'border-amber-200',
            isCoarsePointer && selectedTileId && 'ring-2 ring-amber-200/80 ring-offset-2 ring-offset-white'
          )}
          onClick={() => moveSelectedTileTo(droppableId)}
          role='button'
          tabIndex={canInteract ? 0 : -1}
          aria-disabled={!canInteract}
          aria-label={ariaLabel}
        >
          {tiles.map((tile, index) => (
            <NumberTile
              key={tile.id}
              tile={tile}
              index={index}
              isDragDisabled={!canInteract}
              isSelected={selectedTileId === tile.id}
              isCoarsePointer={isCoarsePointer}
              onClick={() => canInteract && setSelectedTileId((current) => (current === tile.id ? null : tile.id))}
            />
          ))}
          {provided.placeholder}
        </div>
      )}
    </Droppable>
  );
}

function NumberBalanceRushBoardSide({
  ariaLabel,
  currentTiles,
  dataTestId,
  droppableId,
  sum,
  target,
  totalSlots,
}: {
  ariaLabel: string;
  currentTiles: NumberBalanceTile[];
  dataTestId: string;
  droppableId: 'left' | 'right';
  sum: number;
  target: number;
  totalSlots: number;
}): React.JSX.Element {
  const { translations } = useNumberBalanceRushGame();

  return (
    <div className='flex w-full max-w-xs flex-col items-center kangur-panel-gap'>
      <div className='text-sm font-semibold text-amber-900'>
        {translations('numberBalance.inRound.targetLabel', { target })}
      </div>
      <NumberBalanceRushTileZone
        ariaLabel={ariaLabel}
        dataTestId={dataTestId}
        droppableId={droppableId}
        snapshotClassName={NUMBER_BALANCE_DROP_ZONE_CLASSNAME}
        tiles={currentTiles}
      />
      <div className='-mt-[72px] flex min-h-[56px] w-full items-center justify-center gap-2 pointer-events-none'>
        {renderNumberBalanceEmptySlots(totalSlots - currentTiles.length)}
      </div>
      <div className='text-xs font-semibold text-amber-900/80'>
        {translations('numberBalance.inRound.sumLabel', { sum })}
      </div>
    </div>
  );
}

function NumberBalanceRushTray(): React.JSX.Element {
  const { translations, trayTiles } = useNumberBalanceRushGame();

  return (
    <div className='flex flex-col kangur-panel-gap'>
      <div className='text-xs font-semibold text-amber-900/80'>
        {translations('numberBalance.inRound.instruction')}
      </div>
      <NumberBalanceRushTileZone
        ariaLabel={translations('numberBalance.inRound.aria.tray')}
        dataTestId='number-balance-tray-zone'
        droppableId='tray'
        snapshotClassName={NUMBER_BALANCE_TRAY_CLASSNAME}
        tiles={trayTiles}
      />
    </div>
  );
}

function NumberBalanceRushActiveRound({
  durationMs,
  state,
}: {
  durationMs: number;
  state: NumberBalanceRushState;
}): React.JSX.Element {
  const {
    translations,
    isCoarsePointer,
    puzzle,
    leftTiles,
    rightTiles,
    score,
    celebrating,
    timeLeftMs,
    countdownLeftMs,
    phase,
    opponentLabel,
    leaderboardEntries,
    handleDragEnd,
    touchHint,
    match,
  } = state;
  const matchDurationMs = match?.roundDurationMs ?? durationMs;
  const timePercent = Math.max(0, Math.min(1, timeLeftMs / matchDurationMs));
  const leftSum = leftTiles.reduce((sum, tile) => sum + tile.value, 0);
  const rightSum = rightTiles.reduce((sum, tile) => sum + tile.value, 0);

  if (!puzzle) {
    return <></>;
  }

  return (
    <KangurDragDropContext onDragEnd={handleDragEnd}>
      <KangurPracticeGameShell className='w-full max-w-2xl'>
        <div className='flex w-full flex-wrap items-center justify-between kangur-panel-gap'>
          <div className={KANGUR_WRAP_CENTER_ROW_CLASSNAME}>
            <KangurStatusChip className='px-4 py-2 text-sm font-bold' accent='amber'>
              {translations('numberBalance.inRound.selfLabel', { score })}
            </KangurStatusChip>
            <KangurStatusChip className='px-4 py-2 text-sm font-bold' accent='sky'>
              {opponentLabel}
            </KangurStatusChip>
          </div>
          <NumberBalanceRushTimer
            countdownLeftMs={countdownLeftMs}
            phase={phase}
            timeLeftMs={timeLeftMs}
            timePercent={timePercent}
          />
        </div>

        <NumberBalanceRushLeaderboard entries={leaderboardEntries} translations={translations} />
        <NumberBalanceRushTouchHint
          isCoarsePointer={isCoarsePointer}
          touchHint={touchHint}
        />

        <KangurGlassPanel
          className={cn(
            'w-full rounded-[32px] p-6 transition',
            celebrating && 'ring-2 ring-amber-300 shadow-[0_0_0_4px_rgba(251,191,36,0.25)]'
          )}
          surface='playField'
        >
          <div className={`${KANGUR_STACK_ROOMY_CLASSNAME} w-full`}>
            <div className='flex flex-col items-center justify-center gap-6 md:flex-row md:items-end'>
              <NumberBalanceRushBoardSide
                ariaLabel={translations('numberBalance.inRound.aria.leftSide')}
                currentTiles={leftTiles}
                dataTestId='number-balance-left-zone'
                droppableId='left'
                sum={leftSum}
                target={puzzle.targets.left}
                totalSlots={puzzle.slots.left}
              />
              <div className='hidden h-1 w-12 rounded-full bg-amber-200/80 md:block' aria-hidden='true' />
              <NumberBalanceRushBoardSide
                ariaLabel={translations('numberBalance.inRound.aria.rightSide')}
                currentTiles={rightTiles}
                dataTestId='number-balance-right-zone'
                droppableId='right'
                sum={rightSum}
                target={puzzle.targets.right}
                totalSlots={puzzle.slots.right}
              />
            </div>
            <NumberBalanceRushTray />
          </div>
        </KangurGlassPanel>
      </KangurPracticeGameShell>
    </KangurDragDropContext>
  );
}

const resolveNumberBalanceRushViewKind = ({
  match,
  phase,
  player,
  puzzle,
}: {
  match: NumberBalanceRushState['match'];
  phase: NumberBalanceRushState['phase'];
  player: NumberBalanceRushState['player'];
  puzzle: NumberBalanceRushState['puzzle'];
}): 'active' | 'finished' | 'loading' | 'waiting' => {
  if (hasNumberBalanceWaitingRuntime({ match, phase, player })) {
    return 'waiting';
  }

  if (phase === 'loading' || !hasNumberBalanceActiveRuntime({ match, player, puzzle })) {
    return 'loading';
  }

  if (phase === 'finished') {
    return 'finished';
  }

  return 'active';
};

function renderNumberBalanceRushPhaseView({
  props,
  state,
}: {
  props: NumberBalanceRushGameProps;
  state: NumberBalanceRushState;
}): React.JSX.Element {
  const {
    translations,
    match,
    player,
    puzzle,
    score,
    solves,
    error,
    copyStatus,
    phase,
    opponentLabel,
    opponentScore,
    hasOpponent,
    playerRank,
    leaderboardEntries,
    avgSolve,
    handleRetryMatch,
    handleCopyMatchId,
  } = state;
  const viewKind = resolveNumberBalanceRushViewKind({
    match,
    phase,
    player,
    puzzle,
  });

  if (viewKind === 'waiting') {
    return match && player ? (
      <NumberBalanceRushWaitingView
        copyStatus={copyStatus}
        handleCopyMatchId={handleCopyMatchId}
        matchId={match.matchId}
        opponentLabel={opponentLabel}
        score={score}
        translations={translations}
      />
    ) : (
      <></>
    );
  }

  if (viewKind === 'loading') {
    return (
      <NumberBalanceRushLoadingView
        error={error}
        handleRetryMatch={handleRetryMatch}
        translations={translations}
      />
    );
  }

  if (viewKind === 'finished') {
    return (
      <NumberBalanceRushSummaryView
        avgSolve={avgSolve}
        handleRetryMatch={handleRetryMatch}
        hasOpponent={hasOpponent}
        leaderboardEntriesLength={leaderboardEntries.length}
        onFinish={props.onFinish}
        opponentScore={opponentScore}
        playerRank={playerRank}
        score={score}
        solves={solves}
        translations={translations}
      />
    );
  }

  return puzzle ? (
    <NumberBalanceRushActiveRound
      durationMs={props.durationMs ?? 15_000}
      state={state}
    />
  ) : (
    <></>
  );
}

export default function NumberBalanceRushGame(
  props: NumberBalanceRushGameProps
): React.JSX.Element {
  const state = useNumberBalanceRushGameState(props);
  return (
    <NumberBalanceRushGameProvider state={state}>
      {renderNumberBalanceRushPhaseView({ props, state })}
    </NumberBalanceRushGameProvider>
  );
}
