'use client';

import { Droppable } from '@hello-pangea/dnd';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import React from 'react';
import {
  KangurDragDropContext,
} from '@/features/kangur/ui/components/KangurDragDropContext';

import {
  KangurPracticeGameProgress,
  KangurPracticeGameShell,
  KangurPracticeGameSummary,
  KangurPracticeGameSummaryActions,
  KangurPracticeGameSummaryBreakdown,
  KangurPracticeGameSummaryEmoji,
  KangurPracticeGameSummaryMessage,
  KangurPracticeGameSummaryProgress,
  KangurPracticeGameSummaryTitle,
  KangurPracticeGameSummaryXP,
} from '@/features/kangur/ui/components/KangurPracticeGameChrome';
import {
  getKangurMiniGameFinishLabel,
  getKangurMiniGameScoreLabel,
} from '@/features/kangur/ui/constants/mini-game-i18n';
import {
  KangurButton,
  KangurEquationDisplay,
  KangurHeadline,
  KangurInfoCard,
  KangurPanelRow,
  KangurStatusChip,
} from '@/features/kangur/ui/design/primitives';
import { getKangurCheckButtonClassName } from '@/features/kangur/ui/components/KangurCheckButton';
import {
  KANGUR_PANEL_GAP_CLASSNAME,
  KANGUR_STACK_TIGHT_CLASSNAME,
} from '@/features/kangur/ui/design/tokens';
import { createKangurPageTransitionMotionProps } from '@/features/kangur/ui/motion/page-transition';
import { cn } from '@/features/kangur/shared/utils';

import type { DivisionGroupsGameProps, GroupZoneId } from './DivisionGroupsGame.types';
import { useDivisionGroupsGameState } from './DivisionGroupsGame.hooks';
import { DraggableToken } from './DivisionGroupsGame.components';
import { TOTAL_ROUNDS } from './DivisionGroupsGame.utils';

export default function DivisionGroupsGame(
  props: DivisionGroupsGameProps
): React.JSX.Element {
  const state = useDivisionGroupsGameState(props);
  const {
    translations,
    isCoarsePointer,
    roundIndex,
    score,
    done,
    xpEarned,
    xpBreakdown,
    round,
    pool,
    groups,
    remainder,
    selectedTokenId,
    setSelectedTokenId,
    status,
    isLocked,
    handleCheck,
    handleRestart,
    handleDragEnd,
  } = state;

  const { finishLabelVariant = 'lesson', onFinish } = props;
  const finishLabel = getKangurMiniGameFinishLabel(
    translations,
    finishLabelVariant === 'topics' ? 'topics' : 'lesson'
  );
  const prefersReducedMotion = useReducedMotion();
  const roundMotionProps = createKangurPageTransitionMotionProps(prefersReducedMotion);

  if (done) {
    const percent = Math.round((score / TOTAL_ROUNDS) * 100);
    return (
      <KangurPracticeGameSummary dataTestId='division-groups-summary-shell'>
        <KangurPracticeGameSummaryEmoji
          dataTestId='division-groups-summary-emoji'
          emoji={percent === 100 ? '🥇' : percent >= 70 ? '🥈' : '🥉'}
        />
        <KangurPracticeGameSummaryTitle
          accent='sky'
          title={
            <KangurHeadline data-testid='division-groups-summary-title'>
              {getKangurMiniGameScoreLabel(translations, score, TOTAL_ROUNDS)}
            </KangurHeadline>
          }
        />
        <KangurPracticeGameSummaryXP accent='sky' xpEarned={xpEarned} />
        <KangurPracticeGameSummaryBreakdown
          breakdown={xpBreakdown}
          dataTestId='division-groups-summary-breakdown'
          itemDataTestIdPrefix='division-groups-summary-breakdown'
        />
        <KangurPracticeGameSummaryProgress accent='sky' percent={percent} />
        <KangurPracticeGameSummaryMessage>
          {percent === 100
            ? translations('division.summary.perfect')
            : percent >= 70
              ? translations('division.summary.good')
              : translations('division.summary.retry')}
        </KangurPracticeGameSummaryMessage>
        <KangurPracticeGameSummaryActions
          finishLabel={finishLabel}
          onFinish={onFinish}
          onRestart={handleRestart}
          restartLabel={translations('shared.restart')}
        />
      </KangurPracticeGameSummary>
    );
  }

  const selectToken = (tokenId: string): void => {
    if (isLocked) return;
    setSelectedTokenId((prev) => (prev === tokenId ? null : tokenId));
  };

  const moveToZone = (destId: GroupZoneId | 'pool' | 'remainder'): void => {
    if (isLocked || !selectedTokenId) return;
    // Simulate drag end result for click-to-move
    const sourceToken = [...pool, ...remainder, ...groups.flat()].find(t => t.id === selectedTokenId);
    if (!sourceToken) return;
    
    let sourceId: string = 'pool';
    let sourceIndex: number = pool.findIndex(t => t.id === selectedTokenId);
    
    if (sourceIndex === -1) {
      sourceId = 'remainder';
      sourceIndex = remainder.findIndex(t => t.id === selectedTokenId);
    }
    
    if (sourceIndex === -1) {
      const gIdx = groups.findIndex(g => g.some(t => t.id === selectedTokenId));
      sourceId = `group-${gIdx}`;
      sourceIndex = groups[gIdx]?.findIndex(t => t.id === selectedTokenId) ?? -1;
    }

    if (sourceIndex === -1) return;

    handleDragEnd({
      source: { droppableId: sourceId, index: sourceIndex },
      destination: { droppableId: destId, index: 0 },
      combine: null,
      draggableId: selectedTokenId,
      mode: 'FLUID',
      reason: 'DROP',
      type: 'DEFAULT',
    });
  };

  const selectedToken = [...pool, ...remainder, ...groups.flat()].find(
    (token) => token.id === selectedTokenId
  );
  const selectionHint = selectedToken
    ? translations(
        isCoarsePointer
          ? 'divisionGroups.feedback.touchSelected'
          : 'divisionGroups.feedback.keyboardSelected',
        { emoji: selectedToken.emoji }
      )
    : translations(
        isCoarsePointer
          ? 'divisionGroups.feedback.touchIdle'
          : 'divisionGroups.feedback.keyboardIdle'
      );
  const handleZoneKeyDown = (
    event: React.KeyboardEvent<HTMLElement>,
    destination: GroupZoneId | 'pool' | 'remainder'
  ): void => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      moveToZone(destination);
    }
  };

  return (
    <KangurPracticeGameShell className='mx-auto max-w-4xl'>
      <KangurPracticeGameProgress
        accent='sky'
        currentRound={roundIndex}
        dataTestId='division-groups-progress-bar'
        totalRounds={TOTAL_ROUNDS}
      />
      <KangurDragDropContext onDragEnd={handleDragEnd}>
        <div className={cn('flex w-full flex-col', KANGUR_PANEL_GAP_CLASSNAME)}>
          <AnimatePresence mode='wait'>
            <motion.div
              key={roundIndex}
              {...roundMotionProps}
              className={cn('flex w-full flex-col', KANGUR_PANEL_GAP_CLASSNAME)}
            >
              <div className='flex w-full flex-col gap-4 sm:flex-row'>
                <KangurInfoCard accent='sky' className='flex-1' padding='md' tone='accent'>
                  <div className={KANGUR_STACK_TIGHT_CLASSNAME}>
                    <p className='text-sm font-bold text-sky-800'>
                      {translations('division.inRound.prompt')}
                    </p>
                    <KangurEquationDisplay accent='sky' size='md'>
                      {round.dividend} ÷ {round.divisor} = ?
                    </KangurEquationDisplay>
                  </div>
                </KangurInfoCard>
                <div className='flex shrink-0 flex-wrap items-center gap-2 sm:flex-col sm:items-end'>
                  <KangurStatusChip accent='sky' className='px-3 py-1 font-bold' size='sm'>
                    {translations('division.inRound.roundLabel', {
                      current: roundIndex + 1,
                      total: TOTAL_ROUNDS,
                    })}
                  </KangurStatusChip>
                </div>
              </div>

              <div className='grid gap-4 lg:grid-cols-[minmax(0,1fr)_240px]'>
                <div className='grid grid-cols-1 gap-4 sm:grid-cols-2'>
                  {groups.map((group, idx) => {
                    const zoneId: GroupZoneId = `group-${idx}`;
                    return (
                      <Droppable key={zoneId} droppableId={zoneId} direction='horizontal'>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.droppableProps}
                            data-testid={`division-groups-group-zone-${idx}`}
                            role='button'
                            tabIndex={isLocked ? -1 : 0}
                            aria-disabled={isLocked}
                            aria-label={translations('divisionGroups.aria.group', {
                              group: idx + 1,
                            })}
                            className={cn(
                              'relative flex min-h-[140px] flex-col rounded-[28px] border-2 border-dashed p-4 transition-all touch-manipulation',
                              snapshot.isDraggingOver
                                ? 'border-sky-400 bg-sky-50 shadow-inner'
                                : 'border-slate-200 bg-white/60',
                              isCoarsePointer && selectedTokenId && 'ring-2 ring-sky-300 ring-offset-2'
                            )}
                            onClick={() => moveToZone(zoneId)}
                            onKeyDown={(event) => handleZoneKeyDown(event, zoneId)}
                          >
                            <span className='mb-3 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400'>
                              {translations('division.inRound.groupLabel', { index: idx + 1 })}
                            </span>
                            <div className='flex flex-wrap items-start justify-center gap-2'>
                              {group.map((token, tIdx) => (
                                <DraggableToken
                                  key={token.id}
                                  ariaLabel={translations('division.inRound.tokenAria', { emoji: token.emoji })}
                                  index={tIdx}
                                  isCoarsePointer={isCoarsePointer}
                                  isDragDisabled={isLocked}
                                  isSelected={selectedTokenId === token.id}
                                  onClick={() => selectToken(token.id)}
                                  onSelect={() => selectToken(token.id)}
                                  token={token}
                                />
                              ))}
                              {provided.placeholder}
                            </div>
                          </div>
                        )}
                      </Droppable>
                    );
                  })}
                </div>

                <div className='flex flex-col gap-4'>
                  <Droppable droppableId='remainder' direction='horizontal'>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        data-testid='division-groups-remainder-zone'
                        role='button'
                        tabIndex={isLocked ? -1 : 0}
                        aria-disabled={isLocked}
                        aria-label={translations('divisionGroups.aria.remainder')}
                        className={cn(
                          'relative flex min-h-[120px] flex-col rounded-[28px] border-2 border-dashed p-4 transition-all touch-manipulation',
                          snapshot.isDraggingOver
                            ? 'border-amber-400 bg-amber-50 shadow-inner'
                            : 'border-slate-200 bg-white/60',
                          isCoarsePointer && selectedTokenId && 'ring-2 ring-amber-300 ring-offset-2'
                        )}
                        onClick={() => moveToZone('remainder')}
                        onKeyDown={(event) => handleZoneKeyDown(event, 'remainder')}
                      >
                        <span className='mb-3 text-[10px] font-black uppercase tracking-[0.18em] text-slate-400'>
                          {translations('division.inRound.remainderLabel')}
                        </span>
                        <div className='flex flex-wrap items-start justify-center gap-2'>
                          {remainder.map((token, tIdx) => (
                            <DraggableToken
                              key={token.id}
                              ariaLabel={translations('division.inRound.tokenAria', { emoji: token.emoji })}
                              index={tIdx}
                              isCoarsePointer={isCoarsePointer}
                              isDragDisabled={isLocked}
                              isSelected={selectedTokenId === token.id}
                              onClick={() => selectToken(token.id)}
                              onSelect={() => selectToken(token.id)}
                              token={token}
                            />
                          ))}
                          {provided.placeholder}
                        </div>
                      </div>
                    )}
                  </Droppable>
                </div>
              </div>

              <div className='flex flex-col gap-3'>
                <p className='text-center text-xs font-bold uppercase tracking-[0.14em] text-slate-400'>
                  {translations('division.inRound.poolLabel')}
                </p>
                <Droppable droppableId='pool' direction='horizontal'>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      data-testid='division-groups-pool-zone'
                      role='button'
                      tabIndex={isLocked ? -1 : 0}
                      aria-disabled={isLocked}
                      aria-label={translations('divisionGroups.aria.pool')}
                      className={cn(
                        'flex min-h-[100px] flex-wrap items-center justify-center gap-2 rounded-[32px] border-2 border-dashed p-4 transition-all touch-manipulation',
                        snapshot.isDraggingOver ? 'border-sky-300 bg-sky-50/80' : 'border-slate-200 bg-white/40',
                        isCoarsePointer && selectedTokenId && 'ring-2 ring-slate-300 ring-offset-2'
                      )}
                      onClick={() => moveToZone('pool')}
                      onKeyDown={(event) => handleZoneKeyDown(event, 'pool')}
                    >
                      {pool.map((token, tIdx) => (
                        <DraggableToken
                          key={token.id}
                          ariaLabel={translations('division.inRound.tokenAria', { emoji: token.emoji })}
                          index={tIdx}
                          isCoarsePointer={isCoarsePointer}
                          isDragDisabled={isLocked}
                          isSelected={selectedTokenId === token.id}
                          onClick={() => selectToken(token.id)}
                          onSelect={() => selectToken(token.id)}
                          token={token}
                        />
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>

              <KangurInfoCard accent='slate' className='w-full' padding='sm' tone='neutral'>
                <p
                  className='text-xs font-semibold uppercase tracking-[0.16em] text-slate-500'
                  role='status'
                  aria-live='polite'
                  aria-atomic='true'
                  data-testid='division-groups-selection-hint'
                >
                  {selectionHint}
                </p>
              </KangurInfoCard>
            </motion.div>
          </AnimatePresence>

          <KangurPanelRow className='justify-center py-2'>
            <KangurButton
              onClick={handleCheck}
              disabled={pool.length > 0 || isLocked}
              variant='primary'
              size='lg'
              className={getKangurCheckButtonClassName(undefined, status === 'correct' ? 'success' : status === 'wrong' ? 'error' : null)}
            >
              {translations('shared.check')}
            </KangurButton>
          </KangurPanelRow>
        </div>
      </KangurDragDropContext>
    </KangurPracticeGameShell>
  );
}
