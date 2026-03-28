'use client';

import React from 'react';
import { Droppable } from '@hello-pangea/dnd';

import { KangurDragDropContext } from '@/features/kangur/ui/components/KangurDragDropContext';
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
import type { KangurMiniGameFinishProps } from '@/features/kangur/ui/types';
import { cn } from '@/features/kangur/shared/utils';

import { useEnglishAdverbsActionStudioGameState } from './EnglishAdverbsActionStudioGame.hooks';
import {
  ActionMotionStrip,
  DraggableAdverbToken,
  SummaryAdverbGuideCard,
} from './EnglishAdverbsActionStudioGame.components';
import {
  ACTION_META,
  ADVERB_TOKEN_META,
  buildEnglishAdverbSentence,
  buildEnglishAdverbSentenceTemplate,
  getActionLabel,
  getAdverbLabel,
  getRoundTranslation,
  getStyleChangeLabel,
  slotDroppableId,
  TOTAL_ACTIONS,
  TOTAL_ROUNDS,
  type EnglishAdverbId,
} from './EnglishAdverbsActionStudioGame.utils';

const ADVERB_GUIDE_ORDER: EnglishAdverbId[] = [
  'fast',
  'carefully',
  'beautifully',
  'happily',
  'well',
  'badly',
];

export default function EnglishAdverbsActionStudioGame({
  finishLabel,
  onFinish,
}: KangurMiniGameFinishProps): React.JSX.Element {
  const state = useEnglishAdverbsActionStudioGameState();
  const {
    translations,
    isCoarsePointer,
    roundIndex,
    roundState,
    selectedTokenId,
    setSelectedTokenId,
    checked,
    roundCorrect,
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
    const percent = Math.round((totalCorrect / TOTAL_ACTIONS) * 100);
    return (
      <KangurPracticeGameSummary dataTestId='english-adverbs-summary-shell'>
        <KangurPracticeGameSummaryEmoji
          dataTestId='english-adverbs-summary-emoji'
          emoji={percent === 100 ? '🎬' : percent >= 70 ? '✨' : '🎭'}
        />
        <KangurPracticeGameSummaryTitle
          accent='violet'
          title={
            <KangurHeadline data-testid='english-adverbs-summary-title'>
              {getKangurMiniGameScoreLabel(translations, totalCorrect, TOTAL_ACTIONS)}
            </KangurHeadline>
          }
        />
        <KangurPracticeGameSummaryXP accent='violet' xpEarned={xpEarned} />
        <KangurPracticeGameSummaryBreakdown
          breakdown={xpBreakdown}
          dataTestId='english-adverbs-summary-breakdown'
          itemDataTestIdPrefix='english-adverbs-summary-breakdown'
        />
        <KangurPracticeGameSummaryProgress accent='violet' percent={percent} />
        <div
          className='flex flex-wrap items-center justify-center gap-2'
          data-testid='english-adverbs-summary-badges'
        >
          <KangurStatusChip accent='violet' size='sm'>
            {translations('englishAdverbs.summary.badges.rounds', {
              current: TOTAL_ROUNDS,
              total: TOTAL_ROUNDS,
            })}
          </KangurStatusChip>
          <KangurStatusChip accent='emerald' size='sm'>
            {translations('englishAdverbs.summary.badges.actions', {
              current: totalCorrect,
              total: TOTAL_ACTIONS,
            })}
          </KangurStatusChip>
          <KangurStatusChip accent='amber' size='sm'>
            {translations('englishAdverbs.summary.badges.studio', {
              current: TOTAL_ROUNDS,
              total: TOTAL_ROUNDS,
            })}
          </KangurStatusChip>
        </div>
        <div
          className='w-full rounded-[24px] border border-violet-100 bg-white/80 px-4 py-4 shadow-sm'
          data-testid='english-adverbs-summary-guide'
        >
          <div className='flex flex-col items-center gap-1 text-center'>
            <p className='text-xs font-black uppercase tracking-[0.18em] text-violet-600'>
              {translations('englishAdverbs.summary.guideLabel')}
            </p>
            <p className='text-sm text-slate-600'>
              {translations('englishAdverbs.summary.guideHint')}
            </p>
          </div>
          <div className='mt-4 grid gap-3 sm:grid-cols-2'>
            {ADVERB_GUIDE_ORDER.map((adverb) => (
              <SummaryAdverbGuideCard
                key={`summary-guide-${adverb}`}
                adverb={adverb}
                dataTestId={`english-adverbs-summary-guide-${adverb}`}
                translate={translations}
              />
            ))}
          </div>
        </div>
        <div
          className='w-full rounded-[24px] border border-sky-100 bg-white/80 px-4 py-4 shadow-sm'
          data-testid='english-adverbs-summary-form-guide'
        >
          <div className='flex flex-col items-center gap-1 text-center'>
            <p className='text-xs font-black uppercase tracking-[0.18em] text-sky-600'>
              {translations('englishAdverbs.summary.formGuideLabel')}
            </p>
            <p className='text-sm text-slate-600'>
              {translations('englishAdverbs.summary.formGuideHint')}
            </p>
          </div>
          <div className='mt-4 grid gap-3 sm:grid-cols-2'>
            {(['careful', 'beautiful', 'good', 'fast'] as const).map((pairKey) => (
              <div
                key={`form-guide-${pairKey}`}
                className='rounded-[18px] border border-slate-200 bg-slate-50/90 px-3 py-3 text-left shadow-sm'
                data-testid={`english-adverbs-summary-form-${pairKey}`}
              >
                <p className='text-sm font-black text-slate-700'>
                  {translations(`englishAdverbs.summary.formPairs.${pairKey}.adjective`)} →{' '}
                  {translations(`englishAdverbs.summary.formPairs.${pairKey}.adverb`)}
                </p>
                <p className='mt-1 text-xs font-semibold text-slate-500'>
                  {translations(`englishAdverbs.summary.formPairs.${pairKey}.hint`)}
                </p>
              </div>
            ))}
          </div>
        </div>
        <div
          className='w-full rounded-[24px] border border-emerald-100 bg-white/80 px-4 py-4 shadow-sm'
          data-testid='english-adverbs-summary-starters'
        >
          <div className='flex flex-col items-center gap-1 text-center'>
            <p className='text-xs font-black uppercase tracking-[0.18em] text-emerald-600'>
              {translations('englishAdverbs.summary.starterLabel')}
            </p>
            <p className='text-sm text-slate-600'>
              {translations('englishAdverbs.summary.starterHint')}
            </p>
          </div>
          <div className='mt-4 grid gap-3 sm:grid-cols-3'>
            {(['carefully', 'happily', 'fast'] as const).map((starterKey) => (
              <div
                key={`starter-${starterKey}`}
                className='rounded-[18px] border border-emerald-100 bg-emerald-50/70 px-3 py-3 text-sm font-semibold text-slate-700 shadow-sm'
                data-testid={`english-adverbs-summary-starter-${starterKey}`}
              >
                {translations(`englishAdverbs.summary.starters.${starterKey}`)}
              </div>
            ))}
          </div>
        </div>
        <KangurPracticeGameSummaryMessage>
          {percent === 100
            ? translations('englishAdverbs.summary.perfect')
            : percent >= 70
              ? translations('englishAdverbs.summary.good')
              : translations('englishAdverbs.summary.retry')}
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
        dataTestId='english-adverbs-progress-bar'
        totalRounds={TOTAL_ROUNDS}
      />
      <KangurDragDropContext onDragEnd={handleDragEnd}>
        <KangurGlassPanel
          className={cn('w-full', KANGUR_PANEL_GAP_CLASSNAME)}
          padding='lg'
          surface='playField'
        >
          <div className='relative overflow-hidden rounded-[28px] border border-white/70 bg-[linear-gradient(160deg,#f5f3ff_0%,#f8fafc_48%,#eff6ff_100%)] p-4'>
            <div className={cn('relative z-10 flex flex-col', KANGUR_PANEL_GAP_CLASSNAME)}>
              <div className='flex items-center justify-between gap-2'>
                <KangurStatusChip accent={round.accent} className='text-[10px] uppercase tracking-[0.16em]'>
                  {translations('englishAdverbs.inRound.roundLabel', {
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
                  <p className='text-xs font-black uppercase tracking-[0.16em] text-slate-500'>
                    {translations('englishAdverbs.inRound.studio.targetLabel')}
                  </p>
                  <div className='mt-3 space-y-2'>
                    {round.actions.map((action) => (
                      <div
                        key={`target-${action.id}`}
                        className={cn(
                          'relative overflow-hidden rounded-[18px] border px-3 py-2 text-left shadow-sm',
                          KANGUR_ACCENT_STYLES[round.accent].activeCard
                        )}
                        data-testid={`english-adverbs-target-${action.id}`}
                      >
                        <div className='relative z-10'>
                          <p className='text-xs font-black uppercase tracking-[0.14em] text-slate-700'>
                            {ACTION_META[action.actionId].emoji} {getActionLabel(translations, action.actionId)}
                          </p>
                          <ActionMotionStrip
                            actionId={action.actionId}
                            actionLabel={getActionLabel(translations, action.actionId)}
                            adverb={action.answer}
                            dataTestId={`english-adverbs-target-strip-${action.id}`}
                            translate={translations}
                          />
                          <p className='mt-2 text-sm font-semibold text-slate-700'>
                            {buildEnglishAdverbSentence(action.actionId, action.answer)}
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
                const isCorrect = assigned?.adverb === action.answer;
                const sentencePreview = assigned
                  ? buildEnglishAdverbSentence(action.actionId, assigned.adverb)
                  : buildEnglishAdverbSentenceTemplate(action.actionId);
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
                          'relative overflow-hidden rounded-[22px] border p-3 transition touch-manipulation min-h-[18rem]',
                          surfaceClass
                        )}
                        data-testid={`english-adverbs-slot-${action.id}`}
                        onClick={() => handleAssignToken(action.id)}
                      >
                        <div className='relative z-10'>
                          <div className='flex items-center justify-between gap-2'>
                            <KangurStatusChip accent={round.accent} size='sm'>
                              {ACTION_META[action.actionId].emoji} {getActionLabel(translations, action.actionId)}
                            </KangurStatusChip>
                          </div>
                          <ActionMotionStrip
                            actionId={action.actionId}
                            actionLabel={getActionLabel(translations, action.actionId)}
                            adverb={assigned?.adverb ?? null}
                            dataTestId={`english-adverbs-strip-${action.id}`}
                            translate={translations}
                          />
                          <div className='mt-3 rounded-[16px] border border-slate-200 bg-white/90 px-3 py-2 text-left shadow-sm'>
                            <p
                              className='text-sm font-semibold text-slate-700'
                              data-testid={`english-adverbs-sentence-${action.id}`}
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
                              <DraggableAdverbToken
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
                                translate={translations}
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
                                data-testid={`english-adverbs-match-${action.id}`}
                              >
                                <p className='text-xs font-black uppercase tracking-[0.14em] text-emerald-700'>
                                  {translations('englishAdverbs.inRound.studio.matchedLabel')}
                                </p>
                                <p className='mt-2 text-sm font-semibold text-slate-700'>
                                  {buildEnglishAdverbSentence(action.actionId, action.answer)}
                                </p>
                              </div>
                            ) : assigned ? (
                              <div
                                className='mt-3 rounded-[16px] border border-rose-200 bg-rose-50/80 px-3 py-2 text-left shadow-sm'
                                data-testid={`english-adverbs-correction-${action.id}`}
                              >
                                <p className='text-xs font-black uppercase tracking-[0.14em] text-rose-700'>
                                  {translations('englishAdverbs.inRound.studio.correctionLabel')}
                                </p>
                                <p className='mt-2 text-xs font-semibold text-slate-500'>
                                  {translations('englishAdverbs.inRound.studio.yourAdverbLabel')}
                                </p>
                                <p className='text-sm font-semibold text-slate-700'>
                                  {getAdverbLabel(translations, assigned.adverb)}
                                </p>
                                <p className='mt-2 text-xs font-semibold text-slate-500'>
                                  {translations('englishAdverbs.inRound.studio.targetAdverbLabel')}
                                </p>
                                <p className='text-sm font-semibold text-slate-700'>
                                  {getAdverbLabel(translations, action.answer)}
                                </p>
                                <p className='mt-2 text-xs font-semibold text-slate-500'>
                                  {translations('englishAdverbs.inRound.studio.yourSentenceLabel')}
                                </p>
                                <p className='text-sm font-semibold text-slate-700'>
                                  {buildEnglishAdverbSentence(action.actionId, assigned.adverb)}
                                </p>
                                <p className='mt-2 text-xs font-semibold text-slate-500'>
                                  {translations('englishAdverbs.inRound.studio.targetSentenceLabel')}
                                </p>
                                <p className='text-sm font-semibold text-slate-700'>
                                  {buildEnglishAdverbSentence(action.actionId, action.answer)}
                                </p>
                                <p className='mt-2 text-xs font-semibold text-slate-500'>
                                  {translations('englishAdverbs.inRound.studio.styleChangeLabel')}
                                </p>
                                <p className='text-sm font-semibold text-slate-700'>
                                  {getStyleChangeLabel(translations, action.answer)}
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
              {translations(
                isCoarsePointer
                  ? 'englishAdverbs.inRound.studio.modeLabelTouch'
                  : 'englishAdverbs.inRound.studio.modeLabel'
              )}
            </p>
            <p
              className='mt-2 text-sm text-slate-600'
              data-testid='english-adverbs-selection-hint'
            >
              {selectedTokenId
                ? translations('englishAdverbs.inRound.studio.touchSelected', {
                    adverb: selectedToken
                      ? getAdverbLabel(translations, selectedToken.adverb)
                      : '',
                  })
                : translations('englishAdverbs.inRound.studio.touchIdle')}
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
                  data-testid='english-adverbs-pool-zone'
                  onClick={handleReturnToPool}
                >
                  {roundState.pool.map((token, index) => (
                    <DraggableAdverbToken
                      key={token.id}
                      token={token}
                      index={index}
                      isCoarsePointer={isCoarsePointer}
                      isDragDisabled={checked}
                      isSelected={selectedTokenId === token.id}
                      onClick={() =>
                        setSelectedTokenId((current) => (current === token.id ? null : token.id))
                      }
                      translate={translations}
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
              {translations('englishAdverbs.inRound.studio.clearRound')}
            </KangurButton>
            <KangurButton
              size='sm'
              variant='primary'
              onClick={checked ? handleNext : handleCheck}
              disabled={!isRoundComplete && !checked}
            >
              {checked
                ? roundIndex + 1 >= TOTAL_ROUNDS
                  ? translations('englishAdverbs.inRound.seeResult')
                  : translations('englishAdverbs.inRound.next')
                : translations('englishAdverbs.inRound.check')}
            </KangurButton>
          </div>
        </KangurGlassPanel>
      </KangurDragDropContext>
    </KangurPracticeGameShell>
  );
}
