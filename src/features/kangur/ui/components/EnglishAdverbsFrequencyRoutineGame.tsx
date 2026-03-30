'use client';

import { Droppable } from '@hello-pangea/dnd';
import React from 'react';

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
  KANGUR_WRAP_CENTER_ROW_CLASSNAME,
  type KangurAccent,
} from '@/features/kangur/ui/design/tokens';
import type { KangurMiniGameFinishProps } from '@/features/kangur/ui/types';
import { cn } from '@/features/kangur/shared/utils';

import {
  CompactFrequencyDots,
  DraggableFrequencyToken,
  RoutineWeekStrip,
  SummaryFrequencyGuideCard,
  SummaryPatternGuideCard,
  SummaryQuestionCard,
  SummaryStarterCard,
} from './EnglishAdverbsFrequencyRoutineGame.components';
import { useEnglishAdverbsFrequencyRoutineGameState } from './EnglishAdverbsFrequencyRoutineGame.hooks';
import {
  buildEnglishAdverbsFrequencySentence,
  buildEnglishAdverbsFrequencySentenceParts,
  buildEnglishAdverbsFrequencySentenceTemplate,
  buildEnglishAdverbsFrequencySentenceTemplateParts,
} from './EnglishAdverbsFrequencyRoutineGame.sentences';
import type { EnglishAdverbFrequencyId } from './EnglishAdverbsFrequencyRoutineGame.data';
import {
  ACTION_META,
  FREQUENCY_META,
  TOTAL_ACTIONS,
  TOTAL_ROUNDS,
  countFrequencyActiveDays,
  countFrequencyChangedDays,
  countFrequencyTurnedOffDays,
  countFrequencyTurnedOnDays,
  getActionLabel,
  getFrequencyDaysLitLabel,
  getFrequencyDescription,
  getFrequencyLabel,
  getRoundTranslation,
  slotDroppableId,
} from './EnglishAdverbsFrequencyRoutineGame.utils';

export default function EnglishAdverbsFrequencyRoutineGame({
  finishLabel,
  onFinish,
}: KangurMiniGameFinishProps): React.JSX.Element {
  const state = useEnglishAdverbsFrequencyRoutineGameState();
  const {
    checked,
    done,
    feedback,
    handleAssignToken,
    handleCheck,
    handleDragEnd,
    handleNext,
    handleReset,
    handleRestart,
    handleReturnToPool,
    isCoarsePointer,
    isRoundComplete,
    round,
    roundCorrect,
    roundIndex,
    roundState,
    selectedToken,
    selectedTokenId,
    setSelectedTokenId,
    totalCorrect,
    translations,
    xpBreakdown,
    xpEarned,
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
            <span className='text-[11px] font-black uppercase tracking-[0.16em] text-slate-500'>
              {translations('englishAdverbsFrequency.summary.orderLabel')}
            </span>
            {(Object.keys(FREQUENCY_META) as EnglishAdverbFrequencyId[]).map((frequency, index) => (
              <span key={`summary-order-${frequency}`} className='contents'>
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
        <div
          className='w-full rounded-[24px] border border-emerald-100 bg-white/80 px-4 py-4 shadow-sm'
          data-testid='english-adverbs-frequency-summary-rules'
        >
          <div className='flex flex-col items-center gap-1 text-center'>
            <p className='text-xs font-black uppercase tracking-[0.18em] text-emerald-600'>
              {translations('englishAdverbsFrequency.summary.ruleGuideLabel')}
            </p>
            <p className='text-sm text-slate-600'>
              {translations('englishAdverbsFrequency.summary.ruleGuideHint')}
            </p>
          </div>
          <div className='mt-4 grid gap-3 sm:grid-cols-2'>
            <SummaryPatternGuideCard
              accent='sky'
              dataTestId='english-adverbs-frequency-summary-rule-main-verb'
              label={translations('englishAdverbsFrequency.summary.mainVerbLabel')}
              parts={buildEnglishAdverbsFrequencySentenceParts('do_homework', 'always').parts}
              pattern={buildEnglishAdverbsFrequencySentenceParts('do_homework', 'always').pattern}
              sentence={buildEnglishAdverbsFrequencySentence('do_homework', 'always')}
              translate={translations}
            />
            <SummaryPatternGuideCard
              accent='amber'
              dataTestId='english-adverbs-frequency-summary-rule-be-verb'
              label={translations('englishAdverbsFrequency.summary.beVerbLabel')}
              parts={buildEnglishAdverbsFrequencySentenceParts('be_late_for_school', 'never').parts}
              pattern={buildEnglishAdverbsFrequencySentenceParts('be_late_for_school', 'never').pattern}
              sentence={buildEnglishAdverbsFrequencySentence('be_late_for_school', 'never')}
              translate={translations}
            />
          </div>
        </div>
        <div
          className='w-full rounded-[24px] border border-amber-100 bg-white/80 px-4 py-4 shadow-sm'
          data-testid='english-adverbs-frequency-summary-starters'
        >
          <div className='flex flex-col items-center gap-1 text-center'>
            <p className='text-xs font-black uppercase tracking-[0.18em] text-amber-600'>
              {translations('englishAdverbsFrequency.summary.starterLabel')}
            </p>
            <p className='text-sm text-slate-600'>
              {translations('englishAdverbsFrequency.summary.starterHint')}
            </p>
          </div>
          <div className='mt-4 grid gap-3 sm:grid-cols-3'>
            <SummaryStarterCard
              accent='emerald'
              dataTestId='english-adverbs-frequency-summary-starter-always'
              emoji='🟢'
              text={translations('englishAdverbsFrequency.summary.starters.alwaysHabit')}
            />
            <SummaryStarterCard
              accent='amber'
              dataTestId='english-adverbs-frequency-summary-starter-sometimes'
              emoji='🟡'
              text={translations('englishAdverbsFrequency.summary.starters.sometimesPlace')}
            />
            <SummaryStarterCard
              accent='rose'
              dataTestId='english-adverbs-frequency-summary-starter-never'
              emoji='⚪'
              text={translations('englishAdverbsFrequency.summary.starters.neverLate')}
            />
          </div>
        </div>
        <div
          className='w-full rounded-[24px] border border-violet-100 bg-white/80 px-4 py-4 shadow-sm'
          data-testid='english-adverbs-frequency-summary-questions'
        >
          <div className='flex flex-col items-center gap-1 text-center'>
            <p className='text-xs font-black uppercase tracking-[0.18em] text-violet-600'>
              {translations('englishAdverbsFrequency.summary.questionLabel')}
            </p>
            <p className='text-sm text-slate-600'>
              {translations('englishAdverbsFrequency.summary.questionHint')}
            </p>
          </div>
          <div className='mt-4 grid gap-3 sm:grid-cols-3'>
            <SummaryQuestionCard
              accent='sky'
              dataTestId='english-adverbs-frequency-summary-question-homework'
              emoji='📚'
              prompt={translations('englishAdverbsFrequency.summary.questions.homework.prompt')}
              starter={translations('englishAdverbsFrequency.summary.questions.homework.starter')}
            />
            <SummaryQuestionCard
              accent='emerald'
              dataTestId='english-adverbs-frequency-summary-question-park'
              emoji='🌳'
              prompt={translations('englishAdverbsFrequency.summary.questions.park.prompt')}
              starter={translations('englishAdverbsFrequency.summary.questions.park.starter')}
            />
            <SummaryQuestionCard
              accent='rose'
              dataTestId='english-adverbs-frequency-summary-question-late'
              emoji='🏫'
              prompt={translations('englishAdverbsFrequency.summary.questions.late.prompt')}
              starter={translations('englishAdverbsFrequency.summary.questions.late.starter')}
            />
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
                <KangurStatusChip
                  accent={round.accent}
                  className='text-[10px] uppercase tracking-[0.16em]'
                >
                  {translations('englishAdverbsFrequency.inRound.roundLabel', {
                    current: roundIndex + 1,
                    total: TOTAL_ROUNDS,
                  })}
                </KangurStatusChip>
              </div>
              <div
                className={cn(
                  KANGUR_GRID_SPACED_CLASSNAME,
                  'sm:grid-cols-[1.02fr_0.98fr] sm:items-start'
                )}
              >
                <div className='space-y-2'>
                  <p className='text-lg font-bold text-slate-800'>
                    {getRoundTranslation(translations, round.id, 'title')}
                  </p>
                  <p className='text-sm text-slate-600'>
                    {getRoundTranslation(translations, round.id, 'prompt')}
                  </p>
                  <p className='text-xs font-semibold text-slate-500'>
                    {getRoundTranslation(translations, round.id, 'hint')}
                  </p>
                </div>
                <div className='rounded-[20px] border border-white/70 bg-white/80 p-3'>
                  <div className='flex items-center justify-between gap-2'>
                    <p className='text-xs font-semibold uppercase tracking-[0.16em] text-slate-500'>
                      {translations('englishAdverbsFrequency.inRound.studio.targetLabel')}
                    </p>
                    <KangurStatusChip accent='sky' size='sm'>
                      {translations('englishAdverbsFrequency.inRound.studio.watchLabel')}
                    </KangurStatusChip>
                  </div>
                  <div className='mt-3 space-y-2'>
                    {round.actions.map((action) => {
                      const targetMeta = FREQUENCY_META[action.answer];
                      const targetSentence = buildEnglishAdverbsFrequencySentence(
                        action.actionId,
                        action.answer
                      );
                      const targetParts = buildEnglishAdverbsFrequencySentenceParts(
                        action.actionId,
                        action.answer
                      );

                      return (
                        <div
                          key={`target-${action.id}`}
                          className={cn(
                            'relative overflow-hidden rounded-[18px] border px-3 py-2 text-left shadow-sm',
                            KANGUR_ACCENT_STYLES[round.accent].activeCard
                          )}
                          data-testid={`english-adverbs-frequency-target-${action.id}`}
                        >
                          <div
                            aria-hidden='true'
                            className='pointer-events-none absolute inset-0 opacity-90'
                            style={{
                              background: `radial-gradient(circle at 14% 18%, ${targetMeta.fill}22, transparent 34%), radial-gradient(circle at 86% 22%, rgba(255,255,255,0.7), transparent 28%), linear-gradient(180deg, rgba(255,255,255,0.42), rgba(255,255,255,0.08))`,
                            }}
                          />
                          <div className='relative z-10'>
                            <p className='text-xs font-black uppercase tracking-[0.14em] text-slate-700'>
                              {ACTION_META[action.actionId].emoji}{' '}
                              {getActionLabel(translations, action.actionId)}
                            </p>
                            <p className='mt-1 text-sm text-slate-600'>
                              {getFrequencyLabel(translations, action.answer)}
                            </p>
                            <p className='mt-1 text-xs font-semibold text-slate-500'>
                              {getFrequencyDaysLitLabel(translations, action.answer)}
                            </p>
                            <RoutineWeekStrip
                              actionId={action.actionId}
                              actionLabel={getActionLabel(translations, action.actionId)}
                              dataTestId={`english-adverbs-frequency-target-week-${action.id}`}
                              frequency={action.answer}
                              translate={translations}
                            />
                            <p className='mt-2 text-sm font-semibold text-slate-700'>
                              {targetSentence}
                            </p>
                            <p className='mt-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500'>
                              {translations('englishAdverbsFrequency.inRound.studio.patternLabel')}{' '}
                              <span className='text-slate-700'>
                                {translations(
                                  `englishAdverbsFrequency.inRound.studio.patterns.${targetParts.pattern}`
                                )}
                              </span>
                            </p>
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
            <div className='flex items-center justify-between gap-3'>
              <p className='text-xs font-semibold uppercase tracking-[0.16em] text-sky-700'>
                {translations('englishAdverbsFrequency.inRound.studio.plannerLabel')}
              </p>
              <KangurStatusChip accent='sky' size='sm'>
                {translations('englishAdverbsFrequency.inRound.studio.watchLabel')}
              </KangurStatusChip>
            </div>
            <div className={cn('mt-3', KANGUR_GRID_SPACED_CLASSNAME, 'sm:grid-cols-3')}>
              {round.actions.map((action) => {
                const assigned = roundState.slots[action.id];
                const isCorrect = assigned?.frequency === action.answer;
                const targetSentence = buildEnglishAdverbsFrequencySentence(
                  action.actionId,
                  action.answer
                );
                const sentencePreview = assigned
                  ? buildEnglishAdverbsFrequencySentence(action.actionId, assigned.frequency)
                  : buildEnglishAdverbsFrequencySentenceTemplate(action.actionId);
                const sentenceParts = assigned
                  ? buildEnglishAdverbsFrequencySentenceParts(action.actionId, assigned.frequency)
                  : buildEnglishAdverbsFrequencySentenceTemplateParts(action.actionId);
                const laneFill = assigned ? FREQUENCY_META[assigned.frequency].fill : '#cbd5e1';
                const surfaceClass = checked
                  ? isCorrect
                    ? 'border-emerald-300 bg-emerald-50/80'
                    : 'border-rose-300 bg-rose-50/80'
                  : 'border-slate-200 bg-white/80';

                return (
                  <Droppable key={action.id} droppableId={slotDroppableId(action.id)}>
                    {(provided, snapshot) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        aria-disabled={checked}
                        aria-label={translations('englishAdverbsFrequency.inRound.studio.laneAria', {
                          action: getActionLabel(translations, action.actionId),
                        })}
                        className={cn(
                          'relative overflow-hidden rounded-[22px] border p-3 transition touch-manipulation',
                          isCoarsePointer ? 'min-h-[17rem]' : 'min-h-[15.5rem]',
                          surfaceClass,
                          selectedToken && !checked && isCoarsePointer
                            ? 'border-sky-200 bg-sky-50/35'
                            : undefined,
                          snapshot.isDraggingOver && !checked
                            ? KANGUR_ACCENT_STYLES[round.accent].activeCard
                            : undefined
                        )}
                        data-testid={`english-adverbs-frequency-slot-${action.id}`}
                        onClick={() => handleAssignToken(action.id)}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            handleAssignToken(action.id);
                          }
                        }}
                        role='button'
                        tabIndex={checked ? -1 : 0}
                      >
                        <div
                          aria-hidden='true'
                          className='pointer-events-none absolute inset-0 opacity-90'
                          style={{
                            background: `radial-gradient(circle at 12% 18%, ${laneFill}1f, transparent 36%), radial-gradient(circle at 86% 20%, rgba(255,255,255,0.8), transparent 26%), linear-gradient(180deg, rgba(255,255,255,0.46), rgba(255,255,255,0.08))`,
                          }}
                        />
                        <div className='relative z-10'>
                          <div className='flex items-center justify-between gap-2'>
                            <KangurStatusChip accent={round.accent} size='sm'>
                              {ACTION_META[action.actionId].emoji}{' '}
                              {getActionLabel(translations, action.actionId)}
                            </KangurStatusChip>
                            {assigned ? (
                              <KangurStatusChip
                                accent={FREQUENCY_META[assigned.frequency].accent}
                                size='sm'
                              >
                                {getFrequencyLabel(translations, assigned.frequency)}
                              </KangurStatusChip>
                            ) : null}
                          </div>
                          <p className='mt-3 text-sm text-slate-600'>
                            {translations('englishAdverbsFrequency.inRound.studio.dropLabel')}
                          </p>
                          <RoutineWeekStrip
                            actionId={action.actionId}
                            actionLabel={getActionLabel(translations, action.actionId)}
                            dataTestId={`english-adverbs-frequency-week-${action.id}`}
                            frequency={assigned?.frequency ?? null}
                            translate={translations}
                          />
                          {assigned ? (
                            <p className='mt-2 text-xs font-semibold text-slate-500'>
                              {getFrequencyDaysLitLabel(translations, assigned.frequency)}
                            </p>
                          ) : null}
                          <div
                            className={cn(
                              'mt-3 rounded-[16px] border px-3 py-2 text-left shadow-sm transition',
                              assigned
                                ? KANGUR_ACCENT_STYLES[FREQUENCY_META[assigned.frequency].accent].activeCard
                                : 'border-slate-200 bg-white/85'
                            )}
                            data-testid={`english-adverbs-frequency-sentence-${action.id}`}
                          >
                            <p className='text-[10px] font-black uppercase tracking-[0.16em] text-slate-500'>
                              {translations('englishAdverbsFrequency.inRound.studio.sentenceLabel')}
                            </p>
                            <p className='mt-1 text-sm font-semibold text-slate-700'>
                              {sentencePreview}
                            </p>
                            {!assigned ? (
                              <p className='mt-2 text-xs text-slate-500'>
                                {translations(
                                  'englishAdverbsFrequency.inRound.studio.previewEmpty'
                                )}
                              </p>
                            ) : null}
                            <div className='mt-3 space-y-2'>
                              <div className='flex flex-wrap items-center gap-2'>
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
                              <p className='text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500'>
                                {translations('englishAdverbsFrequency.inRound.studio.patternLabel')}{' '}
                                <span className='text-slate-700'>
                                  {translations(
                                    `englishAdverbsFrequency.inRound.studio.patterns.${sentenceParts.pattern}`
                                  )}
                                </span>
                              </p>
                            </div>
                            {checked && assigned && !isCorrect ? (
                              <div
                                className='mt-3 rounded-[14px] border border-rose-200 bg-rose-50/80 px-3 py-2 text-left'
                                data-testid={`english-adverbs-frequency-correction-${action.id}`}
                              >
                                <p className='text-[10px] font-black uppercase tracking-[0.16em] text-rose-500'>
                                  {translations(
                                    'englishAdverbsFrequency.inRound.studio.currentSentenceLabel'
                                  )}
                                </p>
                                <p className='mt-1 text-sm font-semibold text-rose-700'>
                                  {sentencePreview}
                                </p>
                                <div className='mt-2 flex flex-wrap items-center gap-2'>
                                  <KangurStatusChip
                                    accent={FREQUENCY_META[assigned.frequency].accent}
                                    size='sm'
                                  >
                                    {translations(
                                      'englishAdverbsFrequency.inRound.studio.yourFrequencyLabel'
                                    )}
                                    : {getFrequencyLabel(translations, assigned.frequency)}
                                  </KangurStatusChip>
                                  <span aria-hidden='true' className='text-sm font-black text-rose-400'>
                                    →
                                  </span>
                                  <KangurStatusChip
                                    accent={FREQUENCY_META[action.answer].accent}
                                    size='sm'
                                  >
                                    {translations(
                                      'englishAdverbsFrequency.inRound.studio.targetFrequencyLabel'
                                    )}
                                    : {getFrequencyLabel(translations, action.answer)}
                                  </KangurStatusChip>
                                </div>
                                <p className='mt-2 text-xs font-semibold text-rose-600'>
                                  {translations('englishAdverbsFrequency.inRound.studio.daysLitLabel')}:{' '}
                                  {countFrequencyActiveDays(assigned.frequency)}/7 →{' '}
                                  {countFrequencyActiveDays(action.answer)}/7
                                </p>
                                <div className='mt-3 space-y-2'>
                                  <CompactFrequencyDots
                                    compareAgainst={action.answer}
                                    dataTestId={`english-adverbs-frequency-correction-current-week-${action.id}`}
                                    frequency={assigned.frequency}
                                    label={translations(
                                      'englishAdverbsFrequency.inRound.studio.yourWeekLabel'
                                    )}
                                  />
                                  <CompactFrequencyDots
                                    compareAgainst={assigned.frequency}
                                    dataTestId={`english-adverbs-frequency-correction-target-week-${action.id}`}
                                    frequency={action.answer}
                                    label={translations(
                                      'englishAdverbsFrequency.inRound.studio.targetWeekLabel'
                                    )}
                                  />
                                </div>
                                <p className='mt-2 text-xs font-semibold text-rose-600'>
                                  {translations('englishAdverbsFrequency.inRound.studio.changeDaysLabel')}:{' '}
                                  {countFrequencyChangedDays(assigned.frequency, action.answer)}/7
                                </p>
                                <div className='mt-2 flex flex-wrap items-center gap-2'>
                                  <KangurStatusChip accent='emerald' size='sm'>
                                    {translations('englishAdverbsFrequency.inRound.studio.turnOnLabel')}:{' '}
                                    {countFrequencyTurnedOnDays(assigned.frequency, action.answer)}
                                  </KangurStatusChip>
                                  <KangurStatusChip accent='slate' size='sm'>
                                    {translations('englishAdverbsFrequency.inRound.studio.turnOffLabel')}:{' '}
                                    {countFrequencyTurnedOffDays(assigned.frequency, action.answer)}
                                  </KangurStatusChip>
                                </div>
                                <p className='text-[10px] font-black uppercase tracking-[0.16em] text-rose-500'>
                                  {translations(
                                    'englishAdverbsFrequency.inRound.studio.targetFrequencyLabel'
                                  )}
                                </p>
                                <p className='mt-1 text-xs font-semibold text-rose-700'>
                                  {getFrequencyLabel(translations, action.answer)}
                                </p>
                                <p className='mt-2 text-[10px] font-black uppercase tracking-[0.16em] text-rose-500'>
                                  {translations(
                                    'englishAdverbsFrequency.inRound.studio.targetSentenceLabel'
                                  )}
                                </p>
                                <p className='mt-1 text-sm font-semibold text-rose-700'>
                                  {targetSentence}
                                </p>
                              </div>
                            ) : null}
                            {checked && assigned && isCorrect ? (
                              <div
                                className='mt-3 rounded-[14px] border border-emerald-200 bg-emerald-50/80 px-3 py-2 text-left'
                                data-testid={`english-adverbs-frequency-match-${action.id}`}
                              >
                                <p className='text-[10px] font-black uppercase tracking-[0.16em] text-emerald-600'>
                                  {translations(
                                    'englishAdverbsFrequency.inRound.studio.matchedLabel'
                                  )}
                                </p>
                                <p className='mt-1 text-sm font-semibold text-emerald-700'>
                                  {sentencePreview}
                                </p>
                                <p className='mt-2 text-xs font-semibold text-emerald-600'>
                                  {getFrequencyDaysLitLabel(translations, assigned.frequency)}
                                </p>
                              </div>
                            ) : null}
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
                                index={0}
                                isCoarsePointer={isCoarsePointer}
                                isDragDisabled={checked}
                                isSelected={selectedTokenId === assigned.id}
                                onClick={() =>
                                  setSelectedTokenId((current) =>
                                    current === assigned.id ? null : assigned.id
                                  )
                                }
                                token={assigned}
                                translate={translations}
                              />
                            ) : (
                              <span
                                aria-hidden='true'
                                className='text-base font-black tracking-[0.22em] text-slate-300'
                              >
                                ...
                              </span>
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
            <div className='space-y-2'>
              <p className='text-sm font-black text-slate-700'>
                {isCoarsePointer
                  ? translations('englishAdverbsFrequency.inRound.studio.modeLabelTouch')
                  : translations('englishAdverbsFrequency.inRound.studio.modeLabel')}
              </p>
              <div className='flex items-center justify-between gap-2'>
                <p className='text-xs font-semibold uppercase tracking-[0.16em] text-slate-500'>
                  {translations('englishAdverbsFrequency.inRound.studio.poolLabel')}
                </p>
                <p className='text-xs text-slate-500'>
                  {selectedToken
                    ? getFrequencyDescription(translations, selectedToken.frequency)
                    : translations('englishAdverbsFrequency.inRound.studio.poolHint')}
                </p>
              </div>
            </div>
            <Droppable droppableId='pool' direction='horizontal'>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  aria-disabled={checked}
                  aria-label={translations('englishAdverbsFrequency.inRound.studio.poolAria')}
                  className={cn(
                    'mt-3 flex flex-wrap items-center justify-center gap-2 rounded-[20px] border-2 border-dashed px-3 py-3 transition touch-manipulation',
                    isCoarsePointer ? 'min-h-[96px]' : 'min-h-[72px]',
                    snapshot.isDraggingOver
                      ? 'border-sky-300 bg-sky-50/70'
                      : selectedToken && !checked && isCoarsePointer
                        ? 'border-sky-200 bg-sky-50/40'
                        : 'border-slate-200'
                  )}
                  data-testid='english-adverbs-frequency-pool-zone'
                  onClick={handleReturnToPool}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      handleReturnToPool();
                    }
                  }}
                  role='button'
                  tabIndex={checked ? -1 : 0}
                >
                  {roundState.pool.map((token, index) => (
                    <DraggableFrequencyToken
                      key={token.id}
                      index={index}
                      isCoarsePointer={isCoarsePointer}
                      isDragDisabled={checked}
                      isSelected={selectedTokenId === token.id}
                      onClick={() =>
                        setSelectedTokenId((current) => (current === token.id ? null : token.id))
                      }
                      token={token}
                      translate={translations}
                    />
                  ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </KangurInfoCard>

          {isCoarsePointer || selectedToken ? (
            <KangurInfoCard accent='slate' className='w-full' padding='sm' tone='neutral'>
              <p
                aria-atomic='true'
                aria-live='polite'
                className='text-xs font-semibold uppercase tracking-[0.16em] text-slate-500'
                data-testid='english-adverbs-frequency-selection-hint'
                role='status'
              >
                {selectedToken
                  ? translations('englishAdverbsFrequency.inRound.studio.touchSelected', {
                      frequency: getFrequencyLabel(translations, selectedToken.frequency),
                    })
                  : translations('englishAdverbsFrequency.inRound.studio.touchIdle')}
              </p>
            </KangurInfoCard>
          ) : null}
          {feedback ? (
            <KangurInfoCard
              accent={feedbackAccent}
              className='w-full'
              padding='sm'
              tone='accent'
            >
              <p
                aria-atomic='true'
                aria-live='polite'
                className='text-sm font-semibold'
                data-testid='english-adverbs-frequency-feedback'
                role='status'
              >
                {feedback.text}
              </p>
            </KangurInfoCard>
          ) : null}

          <div className='flex w-full flex-wrap items-center justify-between gap-3'>
            <div className={KANGUR_WRAP_CENTER_ROW_CLASSNAME}>
              <KangurButton
                disabled={checked}
                onClick={handleReset}
                size='sm'
                type='button'
                variant='surface'
              >
                {translations('englishAdverbsFrequency.inRound.studio.clearRound')}
              </KangurButton>
              {checked ? (
                <KangurStatusChip accent={feedbackAccent}>
                  {translations('englishAdverbsFrequency.inRound.hitsLabel', {
                    hits: roundCorrect,
                    total: round.actions.length,
                  })}
                </KangurStatusChip>
              ) : null}
            </div>
            <KangurButton
              disabled={checked || !isRoundComplete}
              onClick={handleCheck}
              size='sm'
              type='button'
              variant='primary'
              className={getKangurCheckButtonClassName(
                undefined,
                feedback?.kind === 'success' ? 'success' : feedback?.kind === 'error' ? 'error' : null
              )}
            >
              {translations('englishAdverbsFrequency.inRound.check')}
            </KangurButton>
            {checked ? (
              <KangurButton onClick={handleNext} size='sm' type='button' variant='primary'>
                {roundIndex + 1 >= TOTAL_ROUNDS
                  ? translations('englishAdverbsFrequency.inRound.seeResult')
                  : translations('englishAdverbsFrequency.inRound.next')}
              </KangurButton>
            ) : null}
          </div>
        </KangurGlassPanel>
      </KangurDragDropContext>
    </KangurPracticeGameShell>
  );
}
