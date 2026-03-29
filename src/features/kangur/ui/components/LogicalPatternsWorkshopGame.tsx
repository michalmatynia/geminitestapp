'use client';

import { Draggable, Droppable } from '@hello-pangea/dnd';
import React from 'react';
import { createPortal } from 'react-dom';
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
  KangurInfoCard,
  KangurStatusChip,
} from '@/features/kangur/ui/design/primitives';
import {
  KANGUR_STACK_ROW_CLASSNAME,
  KANGUR_WRAP_CENTER_ROW_CLASSNAME,
} from '@/features/kangur/ui/design/tokens';
import type {
  KangurMiniGameFinishProps,
} from '@/features/kangur/ui/types';
import { cn } from '@/features/kangur/shared/utils';

import type {
  LogicalPatternSetId,
  LogicalPatternTile,
} from './logical-patterns-workshop-data';
import {
  buildTileClassName,
  getSlotSurface,
  slotIdForBlank,
} from './logical-patterns/LogicalPatternsGame.utils';
import { useLogicalPatternsGameState } from './logical-patterns/LogicalPatternsGame.hooks';

const dragPortal = typeof document === 'undefined' ? null : document.body;

const getTileNoun = (tile: LogicalPatternTile): string => {
  if (tile.kind === 'number') {
    return 'liczba';
  }
  if (tile.kind === 'letter') {
    return 'litera';
  }
  return 'symbol';
};

export default function LogicalPatternsWorkshopGame({
  finishLabel = 'Wróć do tematów',
  onFinish,
  patternSetId = 'logical_patterns_workshop',
}: KangurMiniGameFinishProps & {
  patternSetId?: LogicalPatternSetId;
}): React.JSX.Element {
  const state = useLogicalPatternsGameState(patternSetId);
  const {
    translations, isCoarsePointer, roundIndex, roundState, selectedTokenId, setSelectedTokenId, checked,
    showHint, setShowHint, setUsedHint, score, done, xpEarned, xpBreakdown,
    round, blanks, tiles, selectedToken, isRoundComplete,
    handleCheck, goToNextRound, restart, onDragEnd, handleSlotClick,
  } = state;

  const summaryFinishLabel = finishLabel === 'Wróć do tematów' ? getKangurMiniGameFinishLabel(translations, 'topics') : finishLabel;

  if (done) {
    const totalTargets = state.totalTargets;
    const percent = totalTargets ? Math.round((score / totalTargets) * 100) : 0;
    return (
      <KangurPracticeGameSummary dataTestId='logical-patterns-summary-shell'>
        <KangurPracticeGameSummaryEmoji
          dataTestId='logical-patterns-summary-emoji'
          emoji={percent === 100 ? '🏆' : percent >= 70 ? '🌟' : '💪'}
        />
        <KangurPracticeGameSummaryTitle accent='violet' title={getKangurMiniGameScoreLabel(translations, score, totalTargets)} />
        <KangurPracticeGameSummaryXP accent='violet' xpEarned={xpEarned} />
        <KangurPracticeGameSummaryBreakdown
          breakdown={xpBreakdown}
          dataTestId='logical-patterns-summary-breakdown'
          itemDataTestIdPrefix='logical-patterns-summary-breakdown'
        />
        <KangurPracticeGameSummaryProgress accent='violet' percent={percent} />
        <KangurPracticeGameSummaryMessage>{percent === 100 ? translations('logicalPatterns.summary.perfect') : percent >= 70 ? translations('logicalPatterns.summary.good') : translations('logicalPatterns.summary.retry')}</KangurPracticeGameSummaryMessage>
        <KangurPracticeGameSummaryActions className={KANGUR_STACK_ROW_CLASSNAME} finishLabel={summaryFinishLabel} onFinish={onFinish} onRestart={restart} restartLabel={translations('shared.restart')} />
      </KangurPracticeGameSummary>
    );
  }

  const touchHint = selectedToken ? `Wybrany kafelek: ${selectedToken.label}. Dotknij pustego pola.` : 'Dotknij kafelka, a potem pustego pola.';

  return (
    <KangurDragDropContext onDragEnd={onDragEnd} onDragStart={() => setSelectedTokenId(null)}>
      <KangurPracticeGameShell className='mx-auto max-w-3xl'>
        <KangurPracticeGameProgress accent='violet' currentRound={roundIndex} totalRounds={state.totalRounds} />

        <KangurInfoCard accent='violet' className='w-full' padding='sm' tone='accent'>
          <div className='flex flex-wrap items-center justify-between gap-2'>
            <div>
              <p className='text-sm font-bold'>Warsztat wzorców</p>
              <p className='text-xs font-semibold text-violet-700'>{round.title}</p>
              <p className='text-xs text-slate-500'>{round.prompt}</p>
            </div>
            <KangurStatusChip accent='violet' size='sm'>Runda {roundIndex + 1}/{state.totalRounds}</KangurStatusChip>
          </div>
          <p className='mt-2 text-[11px] text-slate-500'>{isCoarsePointer ? 'Dotknij kafelka, a potem pustego pola. Możesz też przeciągać.' : 'Przeciągnij kafelki do pustych pól.'}</p>
          {isCoarsePointer && !checked && (
            <div
              aria-live='polite'
              className='mt-3 rounded-2xl border border-violet-200 bg-white/80 px-4 py-3 text-sm font-semibold text-violet-950 shadow-sm'
              data-testid='logical-patterns-touch-hint'
            >
              {touchHint}
            </div>
          )}
          <div className={`mt-2 ${KANGUR_WRAP_CENTER_ROW_CLASSNAME}`}>
            <KangurButton size='sm' variant='surface' onClick={() => { setShowHint(!showHint); setUsedHint(true); }} disabled={checked}>{showHint ? 'Ukryj podpowiedź' : 'Pokaż podpowiedź'}</KangurButton>
            {showHint && !checked && <span className='text-[11px] font-semibold text-violet-700'>{round.ruleHint}</span>}
          </div>
        </KangurInfoCard>

        <div className='flex w-full flex-col gap-4'>
          <div className='flex items-center justify-between'><p className='text-xs font-semibold uppercase tracking-[0.16em] text-violet-700'>Sekwencja</p><KangurStatusChip accent='slate' size='sm'>{blanks.length} brakujące</KangurStatusChip></div>
          <div className='flex flex-wrap items-center justify-center gap-2'>
            {round.sequence.map((cell, idx) => {
              if (cell.type === 'fixed') {
                const tile = tiles[cell.tileId];
                if (!tile) return null;
                return <div key={idx} className={buildTileClassName({ accent: tile.accent ?? 'violet', isSelected: false, isDragging: false, isCompact: false, isDisabled: true, isCoarsePointer: false, isMuted: false })}>{tile.label}</div>;
              }
              const slotted = roundState.slots[cell.id]?.[0];
              return (
                <Droppable key={cell.id} droppableId={slotIdForBlank(cell.id)} isDropDisabled={checked}>
                  {(provided, snapshot) => {
                    const surface = getSlotSurface({ checked, isDraggingOver: snapshot.isDraggingOver, isCorrect: slotted?.value === cell.correctValue, hasToken: !!slotted });
                    return (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        aria-disabled={checked}
                        aria-label={slotted ? `Pole sekwencji: ${slotted.label}` : 'Puste pole sekwencji'}
                        className={surface.className}
                        data-testid={`logical-patterns-slot-${cell.id}`}
                        onClick={() => handleSlotClick(cell.id)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            handleSlotClick(cell.id);
                          }
                        }}
                        role='button'
                        tabIndex={checked ? -1 : 0}
                      >
                        {slotted ? (
                          <Draggable draggableId={`slotted-${slotted.id}`} index={0} isDragDisabled={checked}>
                            {(p, s) => (
                              <div ref={p.innerRef} {...p.draggableProps} {...p.dragHandleProps} className={buildTileClassName({ accent: slotted.accent ?? 'violet', isSelected: false, isDragging: s.isDragging, isCompact: true, isDisabled: checked, isCoarsePointer, isMuted: false })}>
                                {slotted.label}
                              </div>
                            )}
                          </Draggable>
                        ) : '?'}
                        {provided.placeholder}
                      </div>
                    );
                  }}
                </Droppable>
              );
            })}
          </div>
        </div>

        <div className='flex w-full flex-col gap-4'>
          <p className='text-xs font-semibold uppercase tracking-[0.16em] text-violet-700'>Twoje kafelki</p>
          <Droppable droppableId='pool' direction='horizontal' isDropDisabled={checked}>
            {(provided, snapshot) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className={cn('flex flex-wrap items-center justify-center gap-2 rounded-[24px] border border-dashed border-slate-200 p-6 transition-colors', snapshot.isDraggingOver && 'bg-slate-50 border-slate-300')}
                data-testid='logical-patterns-pool'
              >
                {roundState.pool.map((tile, idx) => (
                  <Draggable key={tile.id} draggableId={tile.id} index={idx} isDragDisabled={checked}>
                    {(p, s) => {
                      const element = (
                        <button
                          ref={p.innerRef}
                          {...p.draggableProps}
                          {...p.dragHandleProps}
                          aria-label={`Kafelek: ${getTileNoun(tile)} ${tile.label}`}
                          aria-pressed={selectedTokenId === tile.id}
                          className={buildTileClassName({ accent: tile.accent ?? 'violet', isSelected: tile.id === selectedTokenId, isDragging: s.isDragging, isCompact: false, isDisabled: checked, isCoarsePointer, isMuted: !!selectedTokenId && tile.id !== selectedTokenId })}
                          onClick={() => !checked && setSelectedTokenId(tile.id === selectedTokenId ? null : tile.id)}
                          style={isCoarsePointer ? { touchAction: 'none' } : undefined}
                          type='button'
                        >
                          {tile.label}
                        </button>
                      );
                      return s.isDragging ? createPortal(element, dragPortal!) : element;
                    }}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </div>

        <div className='flex items-center justify-center'>
          {checked ? (
            <div className='flex flex-col items-center gap-4'>
              <KangurStatusChip accent={state.roundCorrect === blanks.length ? 'emerald' : 'amber'} size='lg'>Trafienia: {state.roundCorrect}/{blanks.length}</KangurStatusChip>
              <KangurButton onClick={goToNextRound} variant='primary' size='lg' className='min-w-[200px]'>Dalej</KangurButton>
            </div>
          ) : (
            <KangurButton onClick={handleCheck} disabled={!isRoundComplete} variant='primary' size='lg' className='min-w-[200px]'>Sprawdź</KangurButton>
          )}
        </div>
      </KangurPracticeGameShell>
    </KangurDragDropContext>
  );
}
