'use client';

import { Droppable } from '@hello-pangea/dnd';
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
  KangurGlassPanel,
  KangurHeadline,
  KangurInfoCard,
  KangurStatusChip,
} from '@/features/kangur/ui/design/primitives';
import {
  KANGUR_ACCENT_STYLES,
  KANGUR_GRID_SPACED_CLASSNAME,
  KANGUR_PANEL_GAP_CLASSNAME,
  type KangurAccent,
} from '@/features/kangur/ui/design/tokens';
import type {
  KangurMiniGameFinishProps,
} from '@/features/kangur/ui/types';
import { cn } from '@/features/kangur/shared/utils';

import {
  TOTAL_ROUNDS,
  TOTAL_ACTIONS,
  getRoundTranslation,
  getFrequencyLabel,
  getActionLabel,
  slotDroppableId,
  FREQUENCY_META,
  ACTION_META,
} from './EnglishAdverbsFrequencyRoutineGame.utils';
import { useEnglishAdverbsFrequencyRoutineGameState } from './EnglishAdverbsFrequencyRoutineGame.hooks';
import {
  DraggableFrequencyToken,
  RoutineWeekStrip,
  SummaryFrequencyGuideCard,
} from './EnglishAdverbsFrequencyRoutineGame.components';
import {
  buildEnglishAdverbsFrequencySentence,
  buildEnglishAdverbsFrequencySentenceParts,
  buildEnglishAdverbsFrequencySentenceTemplate,
  buildEnglishAdverbsFrequencySentenceTemplateParts,
} from './EnglishAdverbsFrequencyRoutineGame.sentences';
import type { EnglishAdverbFrequencyId } from './EnglishAdverbsFrequencyRoutineGame.data';

export default function EnglishAdverbsFrequencyRoutineGame({
  finishLabel,
  onFinish,
}: KangurMiniGameFinishProps): React.JSX.Element {
  const state = useEnglishAdverbsFrequencyRoutineGameState();
  const {
    translations,
    roundIndex,
    roundState,
    selectedTokenId,
    setSelectedTokenId,
    checked,
    totalCorrect,
    feedback,
    done,
    xpEarned,
    xpBreakdown,
    round,
    isRoundComplete,
    handleAssignToken,
    handleReturnToPool,
    handleDragEnd,
    handleReset,
    handleCheck,
    handleNext,
    handleRestart,
  } = state;

  const resolvedFinishLabel = finishLabel ?? getKangurMiniGameFinishLabel(translations, 'topics');

  if (done) {
    const percent = Math.round((totalCorrect / TOTAL_ACTIONS) * 100);
    return (
      <KangurPracticeGameSummary dataTestId='english-adverbs-frequency-summary-shell'>
        <KangurPracticeGameSummaryEmoji
          dataTestId='english-adverbs-frequency-summary-emoji'
          emoji={percent === 100 ? '🔁' : percent >= 70 ? '📆' : '🗓️'}
        />
        <KangurPracticeGameSummaryTitle
          accent='sky'
          title={
            <KangurHeadline data-testid='english-adverbs-frequency-summary-title'>
              {getKangurMiniGameScoreLabel(translations, totalCorrect, TOTAL_ACTIONS)}
            </KangurHeadline>
          }
        />
        <KangurPracticeGameSummaryXP accent='sky' xpEarned={xpEarned} />
        <KangurPracticeGameSummaryBreakdown
          breakdown={xpBreakdown}
          dataTestId='english-adverbs-frequency-summary-breakdown'
          itemDataTestIdPrefix='english-adverbs-frequency-summary-breakdown'
        />
        <KangurPracticeGameSummaryProgress accent='sky' percent={percent} />
        <div
          className='flex flex-wrap items-center justify-center gap-2'
          data-testid='english-adverbs-frequency-summary-badges'
        >
          <KangurStatusChip accent='sky' size='sm'>
            {translations('englishAdverbsFrequency.summary.badges.rounds', {
              current: TOTAL_ROUNDS,
              total: TOTAL_ROUNDS,
            })}
          </KangurStatusChip>
          <KangurStatusChip accent='emerald' size='sm'>
            {translations('englishAdverbsFrequency.summary.badges.patterns', {
              current: totalCorrect,
              total: TOTAL_ACTIONS,
            })}
          </KangurStatusChip>
          <KangurStatusChip accent='amber' size='sm'>
            {translations('englishAdverbsFrequency.summary.badges.studio', {
              current: TOTAL_ROUNDS,
              total: TOTAL_ROUNDS,
            })}
          </KangurStatusChip>
        </div>
        <div
          className='w-full rounded-[24px] border border-sky-100 bg-white/80 px-4 py-4 shadow-sm'
          data-testid='english-adverbs-frequency-summary-guide'
        >
          <div className='flex flex-col items-center gap-1 text-center'>
            <p className='text-xs font-black uppercase tracking-[0.18em] text-sky-600'>
              {translations('englishAdverbsFrequency.summary.guideLabel')}
            </p>
            <p className='text-sm text-slate-600'>
              {translations('englishAdverbsFrequency.summary.guideHint')}
            </p>
          </div>
          <div
            className='mt-4 flex flex-wrap items-center justify-center gap-2'
            data-testid='english-adverbs-frequency-summary-order'
          >
            {(Object.keys(FREQUENCY_META) as EnglishAdverbFrequencyId[]).map((frequency, index) => (
              <span
                key={`summary-order-${frequency}`}
                className='contents'
              >
                <KangurStatusChip accent={FREQUENCY_META[frequency].accent} size='sm'>
                  {getFrequencyLabel(translations, frequency)}
                </KangurStatusChip>
                {index < Object.keys(FREQUENCY_META).length - 1 ? (
                  <span aria-hidden='true' className='text-sm font-black text-slate-400'>
                    →
                  </span>
                ) : null}
              </span>
            ))}
          </div>
          <div className='mt-4 grid gap-3 sm:grid-cols-2'>
            {(Object.keys(FREQUENCY_META) as EnglishAdverbFrequencyId[]).map((frequency) => (
              <SummaryFrequencyGuideCard
                key={`summary-guide-${frequency}`}
                dataTestId={`english-adverbs-frequency-summary-guide-${frequency}`}
                frequency={frequency}
                translate={translations}
              />
            ))}
          </div>
        </div>
        <KangurPracticeGameSummaryMessage>
          {percent === 100
            ? translations('englishAdverbsFrequency.summary.perfect')
            : percent >= 70
              ? translations('englishAdverbsFrequency.summary.good')
              : translations('englishAdverbsFrequency.summary.retry')}
        </KangurPracticeGameSummaryMessage>
        <KangurPracticeGameSummaryActions
          finishLabel={resolvedFinishLabel}
          onFinish={onFinish}
          onRestart={handleRestart}
          restartLabel={translations('shared.restart')}
        />
      </KangurPracticeGameSummary>
    );
  }

  const feedbackAccent: KangurAccent = feedback?.kind === 'success' ? 'emerald' : 'rose';

  return (
    <KangurPracticeGameShell className='mx-auto max-w-4xl'>
      <KangurPracticeGameProgress
        accent={round.accent}
        currentRound={roundIndex}
        dataTestId='english-adverbs-frequency-progress-bar'
        totalRounds={TOTAL_ROUNDS}
      />
      <KangurDragDropContext onDragEnd={handleDragEnd}>
        <KangurGlassPanel
          className={cn('w-full', KANGUR_PANEL_GAP_CLASSNAME)}
          padding='lg'
          surface='playField'
        >
          <div className='relative overflow-hidden rounded-[28px] border border-white/70 bg-[linear-gradient(160deg,#eff6ff_0%,#f8fafc_48%,#fefce8_100%)] p-4'>
            <div className={cn('relative z-10 flex flex-col', KANGUR_PANEL_GAP_CLASSNAME)}>
              <div className='flex items-center justify-between gap-2'>
                <KangurStatusChip accent={round.accent} className='text-[10px] uppercase tracking-[0.16em]'>
                  {translations('englishAdverbsFrequency.inRound.roundLabel', {
                    current: roundIndex + 1,
                    total: TOTAL_ROUNDS,
                  })}
                </KangurStatusChip>
              </div>
              <div className={cn(KANGUR_GRID_SPACED_CLASSNAME, 'sm:grid-cols-[1.02fr_0.98fr] sm:items-start')}>
                <div className='space-y-2'>
                  <p className='text-lg font-bold text-slate-800'>
                    {getRoundTranslation(translations, round.id, 'title')}
                  </p>
                  <p className='text-sm text-slate-600'>
                    {getRoundTranslation(translations, round.id, 'prompt')}
                  </p>
                </div>
                <div className='rounded-[20px] border border-white/70 bg-white/80 p-3'>
                  <div className='mt-1 space-y-2'>
                    {round.actions.map((action) => {
                      return (
                        <div
                          key={`target-${action.id}`}
                          className={cn(
                            'relative overflow-hidden rounded-[18px] border px-3 py-2 text-left shadow-sm',
                            KANGUR_ACCENT_STYLES[round.accent].activeCard
                          )}
                        >
                          <div className='relative z-10'>
                            <p className='text-xs font-black uppercase tracking-[0.14em] text-slate-700'>
                              {ACTION_META[action.actionId].emoji} {getActionLabel(translations, action.actionId)}
                            </p>
                            <RoutineWeekStrip
                              actionId={action.actionId}
                              actionLabel={getActionLabel(translations, action.actionId)}
                              dataTestId={`english-adverbs-frequency-target-week-${action.id}`}
                              frequency={action.answer}
                              translate={translations}
                            />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <KangurInfoCard accent='sky' className='w-full' padding='md' tone='accent'>
            <div className={cn('mt-3', KANGUR_GRID_SPACED_CLASSNAME, 'sm:grid-cols-3')}>
              {round.actions.map((action) => {
                const assigned = roundState.slots[action.id];
                const isCorrect = assigned?.frequency === action.answer;
                const sentencePreview = assigned
                  ? buildEnglishAdverbsFrequencySentence(action.actionId, assigned.frequency)
                  : buildEnglishAdverbsFrequencySentenceTemplate(action.actionId);
                const sentenceParts = assigned
                  ? buildEnglishAdverbsFrequencySentenceParts(action.actionId, assigned.frequency)
                  : buildEnglishAdverbsFrequencySentenceTemplateParts(action.actionId);
                const surfaceClass = checked
                  ? isCorrect
                    ? 'border-emerald-300 bg-emerald-50/80'
                    : 'border-rose-300 bg-rose-50/80'
                  : 'border-slate-200 bg-white/80';
                return (
                  <Droppable key={action.id} droppableId={slotDroppableId(action.id)}>
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={cn(
                          'relative overflow-hidden rounded-[22px] border p-3 transition touch-manipulation min-h-[15.5rem]',
                          surfaceClass
                        )}
                        onClick={() => handleAssignToken(action.id)}
                      >
                        <div className='relative z-10'>
                          <div className='flex items-center justify-between gap-2'>
                            <KangurStatusChip accent={round.accent} size='sm'>
                              {ACTION_META[action.actionId].emoji} {getActionLabel(translations, action.actionId)}
                            </KangurStatusChip>
                          </div>
                          <RoutineWeekStrip
                            actionId={action.actionId}
                            actionLabel={getActionLabel(translations, action.actionId)}
                            dataTestId={`english-adverbs-frequency-week-${action.id}`}
                            frequency={assigned?.frequency ?? null}
                            translate={translations}
                          />
                          <div
                            className={cn(
                              'mt-3 rounded-[16px] border px-3 py-2 text-left shadow-sm transition',
                              assigned
                                ? KANGUR_ACCENT_STYLES[FREQUENCY_META[assigned.frequency].accent].activeCard
                                : 'border-slate-200 bg-white/85'
                            )}
                          >
                            <p className='mt-1 text-sm font-semibold text-slate-700'>
                              {sentencePreview}
                            </p>
                            <div className='mt-3 flex flex-wrap items-center gap-2'>
                              {sentenceParts.parts.map((part, index) => (
                                <span
                                  key={`${action.id}-part-${index}-${part}`}
                                  className={cn(
                                    'rounded-full border px-2.5 py-1 text-xs font-bold shadow-sm',
                                    index === 1
                                      ? assigned
                                        ? KANGUR_ACCENT_STYLES[FREQUENCY_META[assigned.frequency].accent].badge
                                        : 'border-sky-200 bg-sky-50 text-sky-700'
                                      : 'border-slate-200 bg-white/90 text-slate-700'
                                  )}
                                >
                                  {part}
                                </span>
                              ))}
                            </div>
                          </div>
                          <div
                            className={cn(
                              'mt-3 flex min-h-[4rem] items-center justify-center rounded-[18px] border-2 border-dashed bg-white/90 px-3 py-3',
                              checked
                                ? isCorrect
                                  ? 'border-emerald-300'
                                  : 'border-rose-300'
                                : 'border-slate-200'
                            )}
                          >
                            {assigned ? (
                              <DraggableFrequencyToken
                                token={assigned}
                                index={0}
                                isDragDisabled={checked}
                                isSelected={selectedTokenId === assigned.id}
                                translate={translations}
                                onClick={() => setSelectedTokenId((curr) => (curr === assigned.id ? null : assigned.id))}
                              />
                            ) : (
                              <span className='text-base font-black tracking-[0.22em] text-slate-300'>...</span>
                            )}
                            {provided.placeholder}
                          </div>
                        </div>
                      </div>
                    )}
                  </Droppable>
                );
              })}
            </div>
          </KangurInfoCard>

          <KangurInfoCard accent='slate' className='w-full' padding='md' tone='neutral'>
            <Droppable droppableId='pool' direction='horizontal'>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={cn(
                    'mt-3 flex flex-wrap items-center justify-center gap-2 rounded-[20px] border-2 border-dashed px-3 py-3 transition',
                    snapshot.isDraggingOver ? 'border-sky-300 bg-sky-50/70' : 'border-slate-200'
                  )}
                  onClick={handleReturnToPool}
                >
                  {roundState.pool.map((token, index) => (
                    <DraggableFrequencyToken
                      key={token.id}
                      token={token}
                      index={index}
                      isDragDisabled={checked}
                      isSelected={selectedTokenId === token.id}
                      translate={translations}
                      onClick={() => setSelectedTokenId((curr) => (curr === token.id ? null : token.id))}
                    />
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </KangurInfoCard>

          {feedback ? (
            <KangurInfoCard accent={feedbackAccent} tone='accent' padding='sm' className='text-sm'>
              {feedback.text}
            </KangurInfoCard>
          ) : null}

          <div className='flex w-full flex-wrap items-center justify-between gap-3'>
            <KangurButton size='sm' variant='surface' onClick={handleReset} disabled={checked}>
              {translations('englishAdverbsFrequency.inRound.studio.clearRound')}
            </KangurButton>
            <KangurButton size='sm' variant='primary' onClick={checked ? handleNext : handleCheck} disabled={!isRoundComplete && !checked}>
              {checked ? (roundIndex + 1 >= TOTAL_ROUNDS ? translations('englishAdverbsFrequency.inRound.seeResult') : translations('englishAdverbsFrequency.inRound.next')) : translations('englishAdverbsFrequency.inRound.check')}
            </KangurButton>
          </div>
        </KangurGlassPanel>
      </KangurDragDropContext>
    </KangurPracticeGameShell>
  );
}
