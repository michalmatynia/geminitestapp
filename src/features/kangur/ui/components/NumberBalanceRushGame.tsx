'use client';

import { Droppable } from '@hello-pangea/dnd';
import React from 'react';
import {
  KangurDragDropContext,
} from '@/features/kangur/ui/components/KangurDragDropContext';

import {
  KangurPracticeGameShell,
  KangurPracticeGameSummary,
  KangurPracticeGameSummaryActions,
  KangurPracticeGameSummaryEmoji,
  KangurPracticeGameSummaryMessage,
  KangurPracticeGameSummaryTitle,
} from '@/features/kangur/ui/components/KangurPracticeGameChrome';
import {
  KangurButton,
  KangurGlassPanel,
  KangurStatusChip,
} from '@/features/kangur/ui/design/primitives';
import {
  getKangurMiniGameFinishLabel,
  getKangurMiniGameScorePointsLabel,
} from '@/features/kangur/ui/constants/mini-game-i18n';
import {
  KANGUR_CENTER_ROW_CLASSNAME,
  KANGUR_GRID_TIGHT_CLASSNAME,
  KANGUR_STACK_ROOMY_CLASSNAME,
  KANGUR_WRAP_CENTER_ROW_CLASSNAME,
} from '@/features/kangur/ui/design/tokens';
import { cn } from '@/features/kangur/shared/utils';

import type { NumberBalanceRushGameProps } from './NumberBalanceRushGame.types';
import { useNumberBalanceRushGameState } from './NumberBalanceRushGame.hooks';
import { NumberTile } from './NumberBalanceRushGame.components';

export default function NumberBalanceRushGame(
  props: NumberBalanceRushGameProps
): React.JSX.Element {
  const state = useNumberBalanceRushGameState(props);
  const {
    translations,
    isCoarsePointer,
    match,
    player,
    puzzle,
    trayTiles,
    leftTiles,
    rightTiles,
    selectedTileId,
    setSelectedTileId,
    score,
    solves,
    celebrating,
    isLoading,
    error,
    copyStatus,
    timeLeftMs,
    countdownLeftMs,
    phase,
    opponentLabel,
    opponentScore,
    hasOpponent,
    playerRank,
    scoreGap,
    leaderboardEntries,
    avgSolve,
    handleRetryMatch,
    handleCopyMatchId,
    handleDragEnd,
    moveSelectedTileTo,
    touchHint,
    canInteract,
  } = state;

  const matchDurationMs = match?.roundDurationMs ?? props.durationMs ?? 15_000;
  const timePercent = Math.max(0, Math.min(1, timeLeftMs / matchDurationMs));
  const timerLabel =
    phase === 'countdown'
      ? Math.max(0, Math.ceil(countdownLeftMs / 1000))
      : Math.max(0, Math.ceil(timeLeftMs / 1000));

  if (phase === 'waiting' && match && player) {
    return (
      <KangurPracticeGameShell className='w-full max-w-xl'>
        <KangurGlassPanel className='w-full rounded-[28px] p-6 text-center' surface='playField'>
          <div className='text-sm font-semibold text-amber-900'>
            {translations('numberBalance.inRound.waiting.title')}
          </div>
          <div className='mt-2 text-xs font-semibold text-amber-900/80'>
            {translations('numberBalance.inRound.waiting.matchCode', { matchId: match.matchId })}
          </div>
          <div className='mt-3 flex flex-wrap justify-center gap-2'>
            <KangurButton size='sm' variant='ghost' onClick={() => void handleCopyMatchId()}>
              {copyStatus === 'success'
                ? translations('numberBalance.inRound.waiting.copy.success')
                : copyStatus === 'error'
                  ? translations('numberBalance.inRound.waiting.copy.error')
                  : translations('numberBalance.inRound.waiting.copy.idle')}
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

  if (phase === 'loading' || !match || !player || !puzzle) {
    return (
      <KangurPracticeGameShell className='w-full max-w-xl'>
        <KangurGlassPanel className='w-full rounded-[28px] p-6 text-center' surface='playField'>
          <div className='text-sm font-semibold text-amber-900'>
            {translations('numberBalance.inRound.loading')}
          </div>
          {error && (
            <div className='mt-3 text-xs font-semibold text-rose-600'>
              {error}
              <div className='mt-2'>
                <KangurButton size='sm' variant='primary' onClick={handleRetryMatch}>
                  {translations('shared.restart')}
                </KangurButton>
              </div>
            </div>
          )}
        </KangurGlassPanel>
      </KangurPracticeGameShell>
    );
  }

  if (phase === 'finished') {
    const summaryEmoji = score >= 12 ? '🏆' : score >= 6 ? '🌟' : '💪';
    const avgSolveLabel = avgSolve ? `${(avgSolve / 1000).toFixed(1)} s` : '—';
    const safeOpponentScore = opponentScore ?? 0;
    const outcomeLabel = hasOpponent
      ? score > safeOpponentScore
        ? translations('numberBalance.summary.outcome.win')
        : score === safeOpponentScore
          ? translations('numberBalance.summary.outcome.draw')
          : translations('numberBalance.summary.outcome.loss')
      : null;

    return (
      <KangurPracticeGameSummary dataTestId='number-balance-summary-shell'>
        <KangurPracticeGameSummaryEmoji dataTestId='number-balance-summary-emoji' emoji={summaryEmoji} />
        <KangurPracticeGameSummaryTitle dataTestId='number-balance-summary-title' title={getKangurMiniGameScorePointsLabel(translations, score)} />
        <KangurPracticeGameSummaryMessage>
          {translations('numberBalance.summary.solvedLabel')}: {solves} •{' '}
          {translations('numberBalance.summary.averageTimeLabel')}: {avgSolveLabel}
          {hasOpponent ? ` • ${translations('numberBalance.summary.opponentLabel')}: ${safeOpponentScore} ${translations('shared.pointsShort')}` : ''}
          {playerRank ? ` • ${translations('numberBalance.summary.placeLabel')}: ${playerRank}/${leaderboardEntries.length}` : ''}
          {outcomeLabel ? ` • ${outcomeLabel}` : ''}
        </KangurPracticeGameSummaryMessage>
        <KangurPracticeGameSummaryActions
          finishLabel={getKangurMiniGameFinishLabel(translations, 'end')}
          onFinish={() => props.onFinish?.()}
          onRestart={handleRetryMatch}
          restartLabel={translations('shared.restart')}
        />
      </KangurPracticeGameSummary>
    );
  }

  const leftSum = leftTiles.reduce((sum, tile) => sum + tile.value, 0);
  const rightSum = rightTiles.reduce((sum, tile) => sum + tile.value, 0);

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
          <KangurGlassPanel className='relative flex h-14 w-14 items-center justify-center rounded-full' surface='mistSoft'>
            <div aria-hidden='true' className='absolute inset-1 rounded-full' style={{ background: `conic-gradient(#f59e0b ${timePercent * 360}deg, rgba(251,191,36,0.2) 0deg)` }} />
            <div className='relative z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white text-sm font-bold text-amber-900'>{timerLabel}</div>
          </KangurGlassPanel>
        </div>

        {leaderboardEntries.length > 1 && (
          <div className={`${KANGUR_GRID_TIGHT_CLASSNAME} sm:grid-cols-2`}>
            {leaderboardEntries.map((entry) => (
              <div key={entry.playerId} className={cn('flex items-center justify-between rounded-2xl border border-amber-200/70 bg-white/70 px-4 py-2 text-xs font-semibold text-amber-900/90', entry.isSelf && 'ring-2 ring-amber-200')}>
                <div className={KANGUR_CENTER_ROW_CLASSNAME}>
                  <span className='text-amber-900/70'>{entry.rank}.</span>
                  <span>{entry.label}</span>
                  {entry.isLeader && <span className='rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800'>{translations('numberBalance.inRound.leaderBadge')}</span>}
                </div>
                <span>{entry.score} {translations('shared.pointsShort')}</span>
              </div>
            ))}
          </div>
        )}

        {isCoarsePointer && <div className='rounded-2xl border border-amber-200/80 bg-white/80 px-4 py-3 text-sm font-semibold text-amber-950 shadow-sm' aria-live='polite'>{touchHint}</div>}

        <KangurGlassPanel className={cn('w-full rounded-[32px] p-6 transition', celebrating && 'ring-2 ring-amber-300 shadow-[0_0_0_4px_rgba(251,191,36,0.25)]')} surface='playField'>
          <div className={`${KANGUR_STACK_ROOMY_CLASSNAME} w-full`}>
            <div className='flex flex-col items-center justify-center gap-6 md:flex-row md:items-end'>
              <div className='flex w-full max-w-xs flex-col items-center kangur-panel-gap'>
                <div className='text-sm font-semibold text-amber-900'>{translations('numberBalance.inRound.targetLabel', { target: puzzle.targets.left })}</div>
                <Droppable droppableId='left'>
                  {(provided, snapshot) => (
                    <div ref={provided.innerRef} {...provided.droppableProps} className={cn('flex min-h-[120px] w-full flex-wrap items-center justify-center gap-2 rounded-3xl border-2 border-dashed p-3 transition touch-manipulation', snapshot.isDraggingOver ? 'border-amber-300 bg-amber-50/80' : 'border-amber-200', isCoarsePointer && selectedTileId && 'ring-2 ring-amber-200/80 ring-offset-2 ring-offset-white')} onClick={() => moveSelectedTileTo('left')} role='button' tabIndex={canInteract ? 0 : -1} aria-disabled={!canInteract} aria-label={translations('numberBalance.inRound.aria.leftSide')}>
                      {leftTiles.map((tile, index) => <NumberTile key={tile.id} tile={tile} index={index} isDragDisabled={!canInteract} isSelected={selectedTileId === tile.id} isCoarsePointer={isCoarsePointer} onClick={() => canInteract && setSelectedTileId(curr => curr === tile.id ? null : tile.id)} />)}
                      {Array.from({ length: Math.max(0, puzzle.slots.left - leftTiles.length) }).map((_, i) => <div key={i} className='h-14 w-14 rounded-2xl border border-dashed border-amber-200/70' aria-hidden='true' />)}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
                <div className='text-xs font-semibold text-amber-900/80'>{translations('numberBalance.inRound.sumLabel', { sum: leftSum })}</div>
              </div>
              <div className='hidden h-1 w-12 rounded-full bg-amber-200/80 md:block' aria-hidden='true' />
              <div className='flex w-full max-w-xs flex-col items-center kangur-panel-gap'>
                <div className='text-sm font-semibold text-amber-900'>{translations('numberBalance.inRound.targetLabel', { target: puzzle.targets.right })}</div>
                <Droppable droppableId='right'>
                  {(provided, snapshot) => (
                    <div ref={provided.innerRef} {...provided.droppableProps} className={cn('flex min-h-[120px] w-full flex-wrap items-center justify-center gap-2 rounded-3xl border-2 border-dashed p-3 transition touch-manipulation', snapshot.isDraggingOver ? 'border-amber-300 bg-amber-50/80' : 'border-amber-200', isCoarsePointer && selectedTileId && 'ring-2 ring-amber-200/80 ring-offset-2 ring-offset-white')} onClick={() => moveSelectedTileTo('right')} role='button' tabIndex={canInteract ? 0 : -1} aria-disabled={!canInteract} aria-label={translations('numberBalance.inRound.aria.rightSide')}>
                      {rightTiles.map((tile, index) => <NumberTile key={tile.id} tile={tile} index={index} isDragDisabled={!canInteract} isSelected={selectedTileId === tile.id} isCoarsePointer={isCoarsePointer} onClick={() => canInteract && setSelectedTileId(curr => curr === tile.id ? null : tile.id)} />)}
                      {Array.from({ length: Math.max(0, puzzle.slots.right - rightTiles.length) }).map((_, i) => <div key={i} className='h-14 w-14 rounded-2xl border border-dashed border-amber-200/70' aria-hidden='true' />)}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
                <div className='text-xs font-semibold text-amber-900/80'>{translations('numberBalance.inRound.sumLabel', { sum: rightSum })}</div>
              </div>
            </div>
            <div className='flex flex-col kangur-panel-gap'>
              <div className='text-xs font-semibold text-amber-900/80'>{translations('numberBalance.inRound.instruction')}</div>
              <Droppable droppableId='tray' direction='horizontal'>
                {(provided, snapshot) => (
                  <div ref={provided.innerRef} {...provided.droppableProps} className={cn('flex min-h-[88px] flex-wrap items-center justify-center kangur-panel-gap rounded-[28px] border-2 border-dashed p-3 transition touch-manipulation', snapshot.isDraggingOver ? 'border-amber-300 bg-amber-50/80' : 'border-amber-200', isCoarsePointer && selectedTileId && 'ring-2 ring-amber-200/80 ring-offset-2 ring-offset-white')} onClick={() => moveSelectedTileTo('tray')} role='button' tabIndex={canInteract ? 0 : -1} aria-disabled={!canInteract} aria-label={translations('numberBalance.inRound.aria.tray')}>
                    {trayTiles.map((tile, index) => <NumberTile key={tile.id} tile={tile} index={index} isDragDisabled={!canInteract} isSelected={selectedTileId === tile.id} isCoarsePointer={isCoarsePointer} onClick={() => canInteract && setSelectedTileId(curr => curr === tile.id ? null : tile.id)} />)}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          </div>
        </KangurGlassPanel>
      </KangurPracticeGameShell>
    </KangurDragDropContext>
  );
}
