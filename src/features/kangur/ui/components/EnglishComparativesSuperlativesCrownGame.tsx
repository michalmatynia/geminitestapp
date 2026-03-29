'use client';

import React from 'react';
import { Droppable } from '@hello-pangea/dnd';

import { KangurDragDropContext } from '@/features/kangur/ui/components/KangurDragDropContext';
import { getKangurCheckButtonClassName } from '@/features/kangur/ui/components/KangurCheckButton';
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
} from '@/features/kangur/ui/design/tokens';
import type { KangurMiniGameFinishProps } from '@/features/kangur/ui/types';
import { cn } from '@/features/kangur/shared/utils';

import { useEnglishComparativesSuperlativesCrownGameState } from './EnglishComparativesSuperlativesCrownGame.hooks';
import {
  ComparisonSceneStrip,
  DraggableComparisonToken,
  SummaryComparisonGuideCard,
} from './EnglishComparativesSuperlativesCrownGame.components';
import {
  ACTION_META,
  COMPARISON_GUIDES,
  getActionLabel,
  getDegreeCueLabel,
  getFormLabel,
  getQuestionLabel,
  getRoundPrompt,
  getRoundTitle,
  slotDroppableId,
  TOTAL_ROUNDS,
  TOTAL_TARGETS,
  buildEnglishComparisonSentence,
  buildEnglishComparisonSentenceTemplate,
} from './EnglishComparativesSuperlativesCrownGame.utils';

export default function EnglishComparativesSuperlativesCrownGame({
  finishLabel,
  onFinish,
}: KangurMiniGameFinishProps): React.JSX.Element {
  const state = useEnglishComparativesSuperlativesCrownGameState();
  const {
    translations,
    isCoarsePointer,
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
    selectedToken,
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
    const percent = Math.round((totalCorrect / TOTAL_TARGETS) * 100);
    return (
      <KangurPracticeGameSummary dataTestId='english-comparatives-summary-shell'>
        <KangurPracticeGameSummaryEmoji
          dataTestId='english-comparatives-summary-emoji'
          emoji={percent === 100 ? '👑' : percent >= 70 ? '✨' : '🪄'}
        />
        <KangurPracticeGameSummaryTitle
          accent='violet'
          title={
            <KangurHeadline data-testid='english-comparatives-summary-title'>
              {getKangurMiniGameScoreLabel(translations, totalCorrect, TOTAL_TARGETS)}
            </KangurHeadline>
          }
        />
        <KangurPracticeGameSummaryXP accent='violet' xpEarned={xpEarned} />
        <KangurPracticeGameSummaryBreakdown
          breakdown={xpBreakdown}
          dataTestId='english-comparatives-summary-breakdown'
          itemDataTestIdPrefix='english-comparatives-summary-breakdown'
        />
        <KangurPracticeGameSummaryProgress accent='violet' percent={percent} />
        <div
          className='flex flex-wrap items-center justify-center gap-2'
          data-testid='english-comparatives-summary-badges'
        >
          <KangurStatusChip accent='violet' size='sm'>
            {`Rounds ${TOTAL_ROUNDS}/${TOTAL_ROUNDS}`}
          </KangurStatusChip>
          <KangurStatusChip accent='emerald' size='sm'>
            {`Targets ${totalCorrect}/${TOTAL_TARGETS}`}
          </KangurStatusChip>
          <KangurStatusChip accent='amber' size='sm'>
            {`Crown studio ${TOTAL_ROUNDS}/${TOTAL_ROUNDS}`}
          </KangurStatusChip>
        </div>
        <div
          className='w-full rounded-[24px] border border-violet-100 bg-white/80 px-4 py-4 shadow-sm'
          data-testid='english-comparatives-summary-guide'
        >
          <div className='flex flex-col items-center gap-1 text-center'>
            <p className='text-xs font-black uppercase tracking-[0.18em] text-violet-600'>
              Form guide
            </p>
            <p className='text-sm text-slate-600'>
              Watch how the adjective changes from the base form to the comparative and the superlative.
            </p>
          </div>
          <div className='mt-4 grid gap-3 sm:grid-cols-2'>
            {COMPARISON_GUIDES.map((guide) => (
              <SummaryComparisonGuideCard
                key={guide.key}
                base={guide.base}
                comparative={guide.comparative}
                superlative={guide.superlative}
                hint={guide.hint}
                dataTestId={`english-comparatives-summary-guide-${guide.key}`}
              />
            ))}
          </div>
        </div>
        <div
          className='w-full rounded-[24px] border border-emerald-100 bg-white/80 px-4 py-4 shadow-sm'
          data-testid='english-comparatives-summary-starters'
        >
          <div className='flex flex-col items-center gap-1 text-center'>
            <p className='text-xs font-black uppercase tracking-[0.18em] text-emerald-600'>
              Say it about your world
            </p>
            <p className='text-sm text-slate-600'>
              Use one comparative sentence and one superlative sentence of your own.
            </p>
          </div>
          <div className='mt-4 grid gap-3 sm:grid-cols-3'>
            {[
              'My bike is faster than my scooter.',
              'Math is easier than science today.',
              'This is the most beautiful picture in my room.',
            ].map((sentence, index) => (
              <div
                key={sentence}
                className='rounded-[18px] border border-emerald-100 bg-emerald-50/70 px-3 py-3 text-sm font-semibold text-slate-700 shadow-sm'
                data-testid={`english-comparatives-summary-starter-${index}`}
              >
                {sentence}
              </div>
            ))}
          </div>
        </div>
        <KangurPracticeGameSummaryMessage>
          {percent === 100
            ? 'Perfect! You can compare and crown with confidence.'
            : percent >= 70
              ? 'Good job! Most of the comparative and superlative forms already fit.'
              : 'Try one more studio round and watch how the winner changes.'}
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

  return (
    <KangurPracticeGameShell className='mx-auto max-w-4xl'>
      <KangurPracticeGameProgress
        accent={round.accent}
        currentRound={roundIndex}
        dataTestId='english-comparatives-progress-bar'
        totalRounds={TOTAL_ROUNDS}
      />
      <KangurDragDropContext onDragEnd={handleDragEnd}>
        <KangurGlassPanel
          className={cn('w-full', KANGUR_PANEL_GAP_CLASSNAME)}
          padding='lg'
          surface='playField'
        >
          <div className='relative overflow-hidden rounded-[28px] border border-white/70 bg-[linear-gradient(160deg,#faf5ff_0%,#f8fafc_48%,#eff6ff_100%)] p-4'>
            <div className={cn('relative z-10 flex flex-col', KANGUR_PANEL_GAP_CLASSNAME)}>
              <div className='flex items-center justify-between gap-2'>
                <KangurStatusChip accent={round.accent} className='text-[10px] uppercase tracking-[0.16em]'>
                  {`Round ${roundIndex + 1}/${TOTAL_ROUNDS}`}
                </KangurStatusChip>
              </div>
              <div className={cn(KANGUR_GRID_SPACED_CLASSNAME, 'sm:grid-cols-[1.02fr_0.98fr] sm:items-start')}>
                <div className='space-y-2'>
                  <p className='text-lg font-bold text-slate-800'>{getRoundTitle(round.id)}</p>
                  <p className='text-sm text-slate-600'>{getRoundPrompt(round.id)}</p>
                </div>
                <div className='rounded-[20px] border border-white/70 bg-white/80 p-3'>
                  <p className='text-xs font-black uppercase tracking-[0.16em] text-slate-500'>
                    Target scenes
                  </p>
                  <div className='mt-3 space-y-2'>
                    {round.actions.map((action) => (
                      <div
                        key={`target-${action.id}`}
                        className={cn(
                          'relative overflow-hidden rounded-[18px] border px-3 py-2 text-left shadow-sm',
                          KANGUR_ACCENT_STYLES[round.accent].activeCard
                        )}
                        data-testid={`english-comparatives-target-${action.id}`}
                      >
                        <div className='relative z-10'>
                          <p className='text-xs font-black uppercase tracking-[0.14em] text-slate-700'>
                            {ACTION_META[action.actionId].emoji} {getActionLabel(action.actionId)}
                          </p>
                          <ComparisonSceneStrip
                            actionId={action.actionId}
                            form={action.answer}
                            dataTestId={`english-comparatives-target-strip-${action.id}`}
                          />
                          <p className='mt-2 text-sm font-semibold text-slate-700'>
                            {buildEnglishComparisonSentence(action.actionId, action.answer)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <KangurInfoCard accent='violet' className='w-full' padding='md' tone='accent'>
            <div className={cn('mt-3', KANGUR_GRID_SPACED_CLASSNAME, 'sm:grid-cols-3')}>
              {round.actions.map((action) => {
                const assigned = roundState.slots[action.id];
                const isCorrect = assigned?.form === action.answer;
                const sentencePreview = assigned
                  ? buildEnglishComparisonSentence(action.actionId, assigned.form)
                  : buildEnglishComparisonSentenceTemplate(action.actionId);
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
                          'relative overflow-hidden rounded-[22px] border p-3 transition touch-manipulation min-h-[19rem]',
                          surfaceClass
                        )}
                        data-testid={`english-comparatives-slot-${action.id}`}
                        onClick={() => handleAssignToken(action.id)}
                      >
                        <div className='relative z-10'>
                          <div className='flex items-center justify-between gap-2'>
                            <KangurStatusChip accent={round.accent} size='sm'>
                              {ACTION_META[action.actionId].emoji} {getActionLabel(action.actionId)}
                            </KangurStatusChip>
                          </div>
                          <p className='mt-3 text-xs font-black uppercase tracking-[0.14em] text-slate-500'>
                            {getQuestionLabel(action.actionId)}
                          </p>
                          <ComparisonSceneStrip
                            actionId={action.actionId}
                            form={assigned?.form ?? null}
                            dataTestId={`english-comparatives-strip-${action.id}`}
                          />
                          <div className='mt-3 rounded-[16px] border border-slate-200 bg-white/90 px-3 py-2 text-left shadow-sm'>
                            <p
                              className='text-sm font-semibold text-slate-700'
                              data-testid={`english-comparatives-sentence-${action.id}`}
                            >
                              {sentencePreview}
                            </p>
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
                              <DraggableComparisonToken
                                token={assigned}
                                index={0}
                                isCoarsePointer={isCoarsePointer}
                                isDragDisabled={checked}
                                isSelected={selectedTokenId === assigned.id}
                                onClick={() =>
                                  setSelectedTokenId((current) =>
                                    current === assigned.id ? null : assigned.id
                                  )
                                }
                              />
                            ) : (
                              <span className='text-base font-black tracking-[0.22em] text-slate-300'>...</span>
                            )}
                            {provided.placeholder}
                          </div>
                          {checked ? (
                            isCorrect ? (
                              <div
                                className='mt-3 rounded-[16px] border border-emerald-200 bg-emerald-50/80 px-3 py-2 text-left shadow-sm'
                                data-testid={`english-comparatives-match-${action.id}`}
                              >
                                <p className='text-xs font-black uppercase tracking-[0.14em] text-emerald-700'>
                                  Matched
                                </p>
                                <p className='mt-2 text-sm font-semibold text-slate-700'>
                                  {buildEnglishComparisonSentence(action.actionId, action.answer)}
                                </p>
                              </div>
                            ) : assigned ? (
                              <div
                                className='mt-3 rounded-[16px] border border-rose-200 bg-rose-50/80 px-3 py-2 text-left shadow-sm'
                                data-testid={`english-comparatives-correction-${action.id}`}
                              >
                                <p className='text-xs font-black uppercase tracking-[0.14em] text-rose-700'>
                                  Fix this lane
                                </p>
                                <p className='mt-2 text-xs font-semibold text-slate-500'>Your form</p>
                                <p className='text-sm font-semibold text-slate-700'>
                                  {getFormLabel(assigned.form)}
                                </p>
                                <p className='mt-2 text-xs font-semibold text-slate-500'>Target form</p>
                                <p className='text-sm font-semibold text-slate-700'>
                                  {getFormLabel(action.answer)}
                                </p>
                                <p className='mt-2 text-xs font-semibold text-slate-500'>Your sentence</p>
                                <p className='text-sm font-semibold text-slate-700'>
                                  {buildEnglishComparisonSentence(action.actionId, assigned.form)}
                                </p>
                                <p className='mt-2 text-xs font-semibold text-slate-500'>Target sentence</p>
                                <p className='text-sm font-semibold text-slate-700'>
                                  {buildEnglishComparisonSentence(action.actionId, action.answer)}
                                </p>
                                <p className='mt-2 text-xs font-semibold text-slate-500'>Degree cue</p>
                                <p className='text-sm font-semibold text-slate-700'>
                                  {getDegreeCueLabel(action.answer)}
                                </p>
                              </div>
                            ) : null
                          ) : null}
                        </div>
                      </div>
                    )}
                  </Droppable>
                );
              })}
            </div>
          </KangurInfoCard>

          <KangurInfoCard accent='sky' className='w-full' padding='md' tone='neutral'>
            <p className='text-sm font-black text-slate-700'>
              {isCoarsePointer ? 'Tap or drag cards' : 'Drag degree cards'}
            </p>
            <p
              className='mt-2 text-sm text-slate-600'
              data-testid='english-comparatives-selection-hint'
            >
              {selectedToken
                ? `Selected form: ${getFormLabel(selectedToken.form)}. Tap a scene lane or the bank.`
                : 'Tap a form card, then tap a scene lane or the bank.'}
            </p>
            <Droppable droppableId='pool' direction='horizontal'>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={cn(
                    'mt-3 flex flex-wrap items-center justify-center gap-2 rounded-[20px] border-2 border-dashed px-3 py-3 transition',
                    snapshot.isDraggingOver ? 'border-sky-300 bg-sky-50/70' : 'border-slate-200'
                  )}
                  data-testid='english-comparatives-pool-zone'
                  onClick={handleReturnToPool}
                >
                  {roundState.pool.map((token, index) => (
                    <DraggableComparisonToken
                      key={token.id}
                      token={token}
                      index={index}
                      isCoarsePointer={isCoarsePointer}
                      isDragDisabled={checked}
                      isSelected={selectedTokenId === token.id}
                      onClick={() =>
                        setSelectedTokenId((current) => (current === token.id ? null : token.id))
                      }
                    />
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </KangurInfoCard>

          <div className='flex w-full flex-wrap items-center justify-between gap-3'>
            <KangurButton size='sm' variant='surface' onClick={handleReset} disabled={checked}>
              Clear round
            </KangurButton>
            <KangurButton
              size='sm'
              variant='primary'
              onClick={handleCheck}
              disabled={checked || !isRoundComplete}
              className={getKangurCheckButtonClassName(
                undefined,
                feedback?.kind === 'success' ? 'success' : feedback?.kind === 'error' ? 'error' : null
              )}
            >
              Check
            </KangurButton>
            {checked ? (
              <KangurButton
                size='sm'
                variant='primary'
                onClick={handleNext}
              >
                {roundIndex + 1 >= TOTAL_ROUNDS
                  ? 'See result'
                  : 'Next'}
              </KangurButton>
            ) : null}
          </div>
        </KangurGlassPanel>
      </KangurDragDropContext>
    </KangurPracticeGameShell>
  );
}
