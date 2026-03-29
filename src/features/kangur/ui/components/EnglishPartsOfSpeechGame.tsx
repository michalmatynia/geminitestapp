'use client';

import { Draggable, Droppable } from '@hello-pangea/dnd';
import React from 'react';
import {
  KangurDragDropContext,
  getKangurMobileDragHandleStyle,
  renderKangurDragPreview,
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
  translateKangurMiniGameWithFallback,
} from '@/features/kangur/ui/constants/mini-game-i18n';
import {
  KangurButton,
  KangurGlassPanel,
  KangurHeadline,
  KangurInfoCard,
  KangurStatusChip,
} from '@/features/kangur/ui/design/primitives';
import {
  KANGUR_CENTER_ROW_CLASSNAME,
  KANGUR_GRID_SPACED_CLASSNAME,
  KANGUR_PANEL_GAP_CLASSNAME,
  KANGUR_WRAP_CENTER_ROW_CLASSNAME,
} from '@/features/kangur/ui/design/tokens';
import { getKangurCheckButtonClassName } from '@/features/kangur/ui/components/KangurCheckButton';
import { cn } from '@/features/kangur/shared/utils';

import {
  PartsOfSpeechCardPulseAnimation,
  PartsOfSpeechGraphAnimation,
  PartsOfSpeechPrepositionAnimation,
} from './EnglishPartsOfSpeechAnimations';

import { useEnglishPartsOfSpeechGameState } from './EnglishPartsOfSpeechGame.hooks';
import { PART_META, TOTAL_ROUNDS } from './EnglishPartsOfSpeechGame.constants';
import {
  binIdForDroppable,
  buildTokenClassName,
  getPartsOfSpeechPartMessage,
  getPartsOfSpeechRoundMessage,
} from './EnglishPartsOfSpeechGame.utils';
import type { SpeechToken } from './EnglishPartsOfSpeechGame.types';

function PartsOfSpeechToken({
  token,
  index,
  isLocked,
  isSelected,
  isCoarsePointer,
  onSelect,
  showStatus,
}: {
  token: SpeechToken;
  index: number;
  isLocked: boolean;
  isSelected: boolean;
  isCoarsePointer: boolean;
  onSelect: () => void;
  showStatus?: boolean;
}): React.JSX.Element {
  const isCorrect = showStatus ? true : false; // Simplified logic for display
  return (
    <Draggable draggableId={token.id} index={index} isDragDisabled={isLocked}>
      {(provided, snapshot) => {
        const content = (
          <div
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            style={getKangurMobileDragHandleStyle(
              provided.draggableProps.style,
              isCoarsePointer
            )}
            className={buildTokenClassName({
              isDragging: snapshot.isDragging,
              showStatus: Boolean(showStatus),
              isCorrect,
              isSelected,
              isCoarsePointer,
            })}
            onClick={(e) => {
              e.stopPropagation();
              if (!isLocked) onSelect();
            }}
            role='button'
            aria-label={token.label}
            aria-pressed={isSelected}
            aria-disabled={isLocked}
            tabIndex={isLocked ? -1 : 0}
            onKeyDown={(event) => {
              if (isLocked) return;
              if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                onSelect();
              }
            }}
          >
            <span className='mr-2 select-none'>{token.emoji}</span>
            <span>{token.label}</span>
          </div>
        );

        return renderKangurDragPreview(content, snapshot.isDragging);
      }}
    </Draggable>
  );
}

export function EnglishPartsOfSpeechGame({
  finishLabel,
  finishLabelVariant = 'lesson',
  onFinish,
}: {
  finishLabel?: string;
  finishLabelVariant?: 'lesson' | 'topics';
  onFinish: () => void;
}): React.JSX.Element {
  const state = useEnglishPartsOfSpeechGameState();
  const {
    translations,
    isCoarsePointer,
    roundIndex,
    score,
    roundState,
    checked,
    feedback,
    done,
    xpEarned,
    xpBreakdown,
    selectedTokenId,
    setSelectedTokenId,
    round,
    isLocked,
    handleDragEnd,
    moveSelectedTokenTo,
    handleCheck,
    handleNext,
    handleRestart,
  } = state;

  if (done) {
    const percent = Math.round((score / TOTAL_ROUNDS) * 100);
    return (
      <KangurPracticeGameSummary dataTestId='english-parts-summary-shell'>
        <KangurPracticeGameSummaryEmoji
          dataTestId='english-parts-summary-emoji'
          emoji={percent === 100 ? '🏆' : percent >= 70 ? '🌟' : '💪'}
        />
        <KangurPracticeGameSummaryTitle
          accent='sky'
          title={
            <KangurHeadline data-testid='english-parts-summary-title'>
              {getKangurMiniGameScoreLabel(translations, score, TOTAL_ROUNDS)}
            </KangurHeadline>
          }
        />
        <KangurPracticeGameSummaryXP accent='sky' xpEarned={xpEarned} />
        <KangurPracticeGameSummaryBreakdown
          breakdown={xpBreakdown}
          dataTestId='english-parts-summary-breakdown'
          itemDataTestIdPrefix='english-parts-summary-breakdown'
        />
        <KangurPracticeGameSummaryProgress accent='sky' percent={percent} />
        <KangurPracticeGameSummaryMessage>
          {percent === 100 ? 'Perfect score!' : percent >= 70 ? 'Great job!' : 'Keep practicing!'}
        </KangurPracticeGameSummaryMessage>
        <KangurPracticeGameSummaryActions
          finishLabel={finishLabel ?? getKangurMiniGameFinishLabel(translations, finishLabelVariant)}
          onFinish={onFinish}
          onRestart={handleRestart}
          restartLabel={translations('shared.restart')}
        />
      </KangurPracticeGameSummary>
    );
  }

  const roundTitle = getPartsOfSpeechRoundMessage(translations, round.id, 'title', round.title);
  const roundPrompt = getPartsOfSpeechRoundMessage(translations, round.id, 'prompt', round.prompt);
  const roundHint = getPartsOfSpeechRoundMessage(translations, round.id, 'hint', round.hint);
  const modeLabel = translations(
    isCoarsePointer
      ? 'englishPartsOfSpeech.inRound.modeLabelTouch'
      : 'englishPartsOfSpeech.inRound.modeLabel'
  );
  const selectedToken = roundState.pool
    .concat(...Object.values(roundState.bins).flat())
    .find((token) => token.id === selectedTokenId);
  const finishActionLabel = finishLabel ?? getKangurMiniGameFinishLabel(translations, finishLabelVariant);

  return (
    <KangurPracticeGameShell className='w-full max-w-4xl'>
      <KangurPracticeGameProgress
        accent={round.accent}
        currentRound={roundIndex}
        totalRounds={TOTAL_ROUNDS}
      />

      <div className={KANGUR_PANEL_GAP_CLASSNAME}>
        <div className='flex flex-col gap-4 lg:flex-row'>
          <div className='flex flex-1 flex-col gap-4'>
            <KangurInfoCard accent={round.accent} tone='accent' padding='md'>
              <div className='flex flex-col gap-2'>
                <div className='flex items-center justify-between'>
                  <KangurStatusChip accent={round.accent} size='sm'>
                    {translations('englishPartsOfSpeech.inRound.roundLabel', {
                      current: roundIndex + 1,
                      total: TOTAL_ROUNDS,
                    })}
                  </KangurStatusChip>
                  <span className='text-xs font-black uppercase tracking-[0.16em] text-slate-500'>
                    {modeLabel}
                  </span>
                </div>
                <h3 className='text-lg font-black text-slate-900'>{roundTitle}</h3>
                <p className='text-sm font-medium text-slate-600'>{roundPrompt}</p>
              </div>
            </KangurInfoCard>

            <div className='flex flex-col gap-3'>
              <div className='flex items-center justify-between'>
                <span className='text-xs font-bold uppercase tracking-widest text-slate-400'>
                  {translations('englishPartsOfSpeech.inRound.poolLabel')}
                </span>
                {isCoarsePointer && selectedTokenId && (
                  <KangurButton
                    size='sm'
                    variant='surface'
                    onClick={() => moveSelectedTokenTo('pool')}
                  >
                    Move here
                  </KangurButton>
                )}
              </div>
              <KangurDragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId='pool' direction='horizontal'>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      role='button'
                      tabIndex={isLocked ? -1 : 0}
                      aria-disabled={isLocked}
                      aria-label={translations('englishPartsOfSpeech.inRound.poolAria')}
                      className={cn(
                        'flex min-h-[100px] flex-wrap items-center justify-center gap-2 rounded-[28px] border-2 border-dashed p-4 transition-all',
                        snapshot.isDraggingOver ? 'border-sky-300 bg-sky-50/50' : 'border-slate-200 bg-white/40'
                      )}
                      onClick={() => moveSelectedTokenTo('pool')}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          moveSelectedTokenTo('pool');
                        }
                      }}
                    >
                      {roundState.pool.map((token, i) => (
                        <PartsOfSpeechToken
                          key={token.id}
                          token={token}
                          index={i}
                          isLocked={isLocked}
                          isSelected={selectedTokenId === token.id}
                          isCoarsePointer={isCoarsePointer}
                          onSelect={() => setSelectedTokenId(curr => curr === token.id ? null : token.id)}
                        />
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>

                <div className={cn(KANGUR_GRID_SPACED_CLASSNAME, 'grid-cols-1 md:grid-cols-3')}>
                  {round.parts.map((partId) => {
                    const meta = PART_META[partId];
                    const label = getPartsOfSpeechPartMessage(translations, partId, 'label', meta.label);
                    const desc = getPartsOfSpeechPartMessage(translations, partId, 'description', meta.description);
                    const tokens = roundState.bins[partId] ?? [];
                    const droppableId = binIdForDroppable(partId);

                    return (
                      <div key={partId} className='flex flex-col gap-2'>
                        <div className='flex items-center justify-between'>
                          <div className={KANGUR_CENTER_ROW_CLASSNAME}>
                            <span className='text-lg'>{meta.emoji}</span>
                            <div className='flex flex-col'>
                              <span className='text-sm font-bold text-slate-900'>{label}</span>
                              <span className='text-[10px] font-medium text-slate-500'>{desc}</span>
                            </div>
                          </div>
                          {isCoarsePointer && selectedTokenId && (
                            <KangurButton
                              size='sm'
                              variant='surface'
                              onClick={() => moveSelectedTokenTo(droppableId)}
                            >
                              Add
                            </KangurButton>
                          )}
                        </div>
                        <Droppable droppableId={droppableId}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.droppableProps}
                              role='button'
                              tabIndex={isLocked ? -1 : 0}
                              aria-disabled={isLocked}
                              aria-label={translations('englishPartsOfSpeech.inRound.binAria', {
                                label,
                              })}
                              className={cn(
                                'flex min-h-[140px] flex-col gap-2 rounded-[24px] border-2 border-dashed p-3 transition-all',
                                snapshot.isDraggingOver
                                  ? `border-${meta.accent}-400 bg-${meta.accent}-50/50`
                                  : 'border-slate-200 bg-white/60'
                              )}
                              onClick={() => moveSelectedTokenTo(droppableId)}
                              onKeyDown={(event) => {
                                if (event.key === 'Enter' || event.key === ' ') {
                                  event.preventDefault();
                                  moveSelectedTokenTo(droppableId);
                                }
                              }}
                            >
                              {tokens.map((token, i) => (
                                <PartsOfSpeechToken
                                  key={token.id}
                                  token={token}
                                  index={i}
                                  isLocked={isLocked}
                                  isSelected={selectedTokenId === token.id}
                                  isCoarsePointer={isCoarsePointer}
                                  onSelect={() => setSelectedTokenId(curr => curr === token.id ? null : token.id)}
                                  showStatus={checked}
                                />
                              ))}
                              {provided.placeholder}
                            </div>
                          )}
                        </Droppable>
                      </div>
                    );
                  })}
                </div>
              </KangurDragDropContext>
            </div>
          </div>

          <div className='hidden w-full shrink-0 lg:block lg:w-72'>
            <KangurGlassPanel className='h-full min-h-[300px] overflow-hidden rounded-[32px]' surface='playField'>
              <div className='flex h-full flex-col items-center justify-center p-6'>
                {round.visual === 'cards' && <PartsOfSpeechCardPulseAnimation />}
                {round.visual === 'graph' && <PartsOfSpeechGraphAnimation />}
                {round.visual === 'preposition' && <PartsOfSpeechPrepositionAnimation />}
                <p className='mt-6 text-center text-xs font-bold leading-relaxed text-slate-500 opacity-80'>
                  {roundHint}
                </p>
              </div>
            </KangurGlassPanel>
          </div>
        </div>

        {(isCoarsePointer || selectedToken) && (
          <KangurInfoCard accent='slate' className='w-full' padding='sm' tone='neutral'>
            <p
              className='text-xs font-semibold uppercase tracking-[0.16em] text-slate-500'
              role='status'
              aria-live='polite'
              aria-atomic='true'
              data-testid='english-parts-of-speech-selection-hint'
            >
              {selectedToken
                ? translations('englishPartsOfSpeech.inRound.touchSelected', {
                    label: selectedToken.label,
                  })
                : translations('englishPartsOfSpeech.inRound.touchIdle')}
            </p>
          </KangurInfoCard>
        )}

        {feedback?.kind === 'info' && (
          <KangurInfoCard
            accent='amber'
            tone='accent'
            padding='sm'
            className='text-sm'
          >
            {feedback.text}
          </KangurInfoCard>
        )}

        <div className={KANGUR_WRAP_CENTER_ROW_CLASSNAME}>
          <KangurButton
            variant='primary'
            size='lg'
            onClick={handleCheck}
            disabled={isLocked || roundState.pool.length > 0}
            className={getKangurCheckButtonClassName(
              undefined,
              feedback?.kind === 'info' ? null : feedback?.kind ?? null
            )}
          >
            {translateKangurMiniGameWithFallback(
              translations,
              'shared.check',
              translations('englishPartsOfSpeech.inRound.check')
            )}
          </KangurButton>
          {isLocked ? (
            <KangurButton variant='primary' size='lg' onClick={handleNext}>
              {roundIndex + 1 >= TOTAL_ROUNDS
                ? finishActionLabel
                : translateKangurMiniGameWithFallback(
                    translations,
                    'shared.next',
                    translations('englishPartsOfSpeech.inRound.next')
                )}
            </KangurButton>
          ) : null}
        </div>
      </div>
    </KangurPracticeGameShell>
  );
}

export default EnglishPartsOfSpeechGame;
