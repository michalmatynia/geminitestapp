'use client';

import { Draggable, Droppable } from '@hello-pangea/dnd';
import type { DropResult } from '@hello-pangea/dnd';
import { useTranslations } from 'next-intl';
import { useEffect, useMemo, useRef, useState } from 'react';

import {
  KangurDragDropContext,
  getKangurMobileDragHandleStyle,
  renderKangurDragPreview,
} from '@/features/kangur/ui/components/KangurDragDropContext';
import {
  KangurPracticeGameProgress,
  KangurPracticeGameStage,
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
  type KangurMiniGameTranslate,
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
import { useKangurCoarsePointer } from '@/features/kangur/ui/hooks/useKangurCoarsePointer';
import {
  addXp,
  createLessonPracticeReward,
  loadProgress,
} from '@/features/kangur/ui/services/progress';
import { persistKangurSessionScore } from '@/features/kangur/ui/services/session-score';
import type {
  KangurMiniGameFeedbackState,
  KangurMiniGameFinishProps,
  KangurRewardBreakdownEntry,
} from '@/features/kangur/ui/types';
import { cn } from '@/features/kangur/shared/utils';

import {
  ENGLISH_ADVERBS_FREQUENCY_ROUTINE_ROUNDS,
  type EnglishAdverbFrequencyActionId,
  type EnglishAdverbFrequencyId,
  type EnglishAdverbsFrequencyRoutineRound,
} from './EnglishAdverbsFrequencyRoutineGame.data';

type FrequencyToken = {
  id: string;
  frequency: EnglishAdverbFrequencyId;
};

type RoundState = {
  pool: FrequencyToken[];
  slots: Record<string, FrequencyToken | null>;
};

type FrequencyMeta = {
  accent: KangurAccent;
  emoji: string;
  activeDays: boolean[];
  fill: string;
};

const FREQUENCY_META: Record<EnglishAdverbFrequencyId, FrequencyMeta> = {
  always: {
    accent: 'emerald',
    emoji: '🟢',
    activeDays: [true, true, true, true, true, true, true],
    fill: '#22c55e',
  },
  usually: {
    accent: 'sky',
    emoji: '🔵',
    activeDays: [true, true, true, false, true, true, true],
    fill: '#38bdf8',
  },
  sometimes: {
    accent: 'amber',
    emoji: '🟡',
    activeDays: [true, false, false, true, false, false, true],
    fill: '#f59e0b',
  },
  never: {
    accent: 'rose',
    emoji: '⚪',
    activeDays: [false, false, false, false, false, false, false],
    fill: '#fda4af',
  },
};

const ACTION_META: Record<EnglishAdverbFrequencyActionId, { emoji: string }> = {
  go_to_cinema: { emoji: '🎬' },
  go_with_friends: { emoji: '🧑‍🤝‍🧑' },
  eat_popcorn: { emoji: '🍿' },
  do_homework: { emoji: '📚' },
  get_up_at_seven: { emoji: '⏰' },
  be_late_for_school: { emoji: '🏫' },
  go_to_park: { emoji: '🌳' },
  watch_tv: { emoji: '📺' },
  go_swimming: { emoji: '🏊' },
};

const WEEKDAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'] as const;

const shuffle = <T,>(items: readonly T[]): T[] => [...items].sort(() => Math.random() - 0.5);

const buildRoundState = (round: EnglishAdverbsFrequencyRoutineRound): RoundState => ({
  pool: shuffle(
    (Object.keys(FREQUENCY_META) as EnglishAdverbFrequencyId[]).map((frequency) => ({
      id: `token-${round.id}-${frequency}`,
      frequency,
    }))
  ),
  slots: Object.fromEntries(round.actions.map((action) => [action.id, null])),
});

const TOTAL_ROUNDS = ENGLISH_ADVERBS_FREQUENCY_ROUTINE_ROUNDS.length;
const TOTAL_ACTIONS = ENGLISH_ADVERBS_FREQUENCY_ROUTINE_ROUNDS.reduce(
  (sum, round) => sum + round.actions.length,
  0
);

const getRoundTranslation = (
  translate: KangurMiniGameTranslate,
  roundId: EnglishAdverbsFrequencyRoutineRound['id'],
  field: 'title' | 'prompt' | 'hint'
): string => translate(`englishAdverbsFrequency.inRound.studio.rounds.${roundId}.${field}`);

const getFrequencyLabel = (
  translate: KangurMiniGameTranslate,
  frequency: EnglishAdverbFrequencyId
): string => translate(`englishAdverbsFrequency.inRound.studio.frequencies.${frequency}.label`);

const getFrequencyDescription = (
  translate: KangurMiniGameTranslate,
  frequency: EnglishAdverbFrequencyId
): string =>
  translate(`englishAdverbsFrequency.inRound.studio.frequencies.${frequency}.description`);

const getActionLabel = (
  translate: KangurMiniGameTranslate,
  actionId: EnglishAdverbFrequencyActionId
): string => translate(`englishAdverbsFrequency.inRound.studio.actions.${actionId}`);

const slotDroppableId = (slotId: string): string => `slot-${slotId}`;
const isSlotDroppable = (value: string): boolean => value.startsWith('slot-');
const getSlotIdFromDroppable = (value: string): string => value.replace('slot-', '');

const moveWithinList = <T,>(items: T[], from: number, to: number): T[] => {
  const updated = [...items];
  const [moved] = updated.splice(from, 1);
  if (moved === undefined) return updated;
  updated.splice(to, 0, moved);
  return updated;
};

const takeTokenFromState = (
  state: RoundState,
  tokenId: string
): {
  token?: FrequencyToken;
  pool: FrequencyToken[];
  slots: Record<string, FrequencyToken | null>;
} => {
  const poolIndex = state.pool.findIndex((token) => token.id === tokenId);
  if (poolIndex !== -1) {
    const nextPool = [...state.pool];
    const [token] = nextPool.splice(poolIndex, 1);
    return {
      token,
      pool: nextPool,
      slots: { ...state.slots },
    };
  }

  const nextSlots = { ...state.slots };
  for (const [slotId, token] of Object.entries(nextSlots)) {
    if (token?.id === tokenId) {
      nextSlots[slotId] = null;
      return {
        token,
        pool: [...state.pool],
        slots: nextSlots,
      };
    }
  }

  return {
    pool: [...state.pool],
    slots: { ...state.slots },
  };
};

const countRoundCorrect = (
  round: EnglishAdverbsFrequencyRoutineRound,
  state: RoundState
): number =>
  round.actions.reduce((sum, action) => {
    return sum + (state.slots[action.id]?.frequency === action.answer ? 1 : 0);
  }, 0);

export default function EnglishAdverbsFrequencyRoutineGame({
  finishLabel,
  onFinish,
}: KangurMiniGameFinishProps): React.JSX.Element {
  const translations = useTranslations('KangurMiniGames');
  const isCoarsePointer = useKangurCoarsePointer();
  const resolvedFinishLabel = finishLabel ?? getKangurMiniGameFinishLabel(translations, 'topics');
  const [roundIndex, setRoundIndex] = useState(0);
  const [roundState, setRoundState] = useState<RoundState>(() =>
    buildRoundState(ENGLISH_ADVERBS_FREQUENCY_ROUTINE_ROUNDS[0])
  );
  const [selectedTokenId, setSelectedTokenId] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [roundCorrect, setRoundCorrect] = useState(0);
  const [totalCorrect, setTotalCorrect] = useState(0);
  const [feedback, setFeedback] = useState<KangurMiniGameFeedbackState>(null);
  const [done, setDone] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);
  const [xpBreakdown, setXpBreakdown] = useState<KangurRewardBreakdownEntry[]>([]);
  const sessionStartedAtRef = useRef(Date.now());

  const round =
    ENGLISH_ADVERBS_FREQUENCY_ROUTINE_ROUNDS[roundIndex] ??
    ENGLISH_ADVERBS_FREQUENCY_ROUTINE_ROUNDS[0];
  const selectedToken = useMemo(() => {
    if (!selectedTokenId) return null;
    return (
      roundState.pool.find((token) => token.id === selectedTokenId) ??
      Object.values(roundState.slots).find((token) => token?.id === selectedTokenId) ??
      null
    );
  }, [roundState.pool, roundState.slots, selectedTokenId]);

  useEffect(() => {
    setRoundState(buildRoundState(round));
    setChecked(false);
    setRoundCorrect(0);
    setFeedback(null);
    setSelectedTokenId(null);
  }, [round]);

  const isRoundComplete = round.actions.every((action) => Boolean(roundState.slots[action.id]));

  const handleAssignToken = (slotId: string): void => {
    if (checked || !selectedTokenId) return;
    setRoundState((prev) => {
      const extracted = takeTokenFromState(prev, selectedTokenId);
      if (!extracted.token) return prev;
      const nextPool = [...extracted.pool];
      const nextSlots = { ...extracted.slots };
      const displaced = nextSlots[slotId];
      if (displaced && displaced.id !== extracted.token.id) {
        nextPool.push(displaced);
      }
      nextSlots[slotId] = extracted.token;
      return {
        pool: nextPool,
        slots: nextSlots,
      };
    });
    setSelectedTokenId(null);
  };

  const handleReturnToPool = (): void => {
    if (checked || !selectedTokenId) return;
    setRoundState((prev) => {
      const extracted = takeTokenFromState(prev, selectedTokenId);
      if (!extracted.token) return prev;
      return {
        pool: [...extracted.pool, extracted.token],
        slots: extracted.slots,
      };
    });
    setSelectedTokenId(null);
  };

  const handleDragEnd = (result: DropResult): void => {
    const { source, destination } = result;
    if (!destination || checked) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) {
      return;
    }

    setRoundState((prev) => {
      if (source.droppableId === 'pool') {
        const sourcePool = [...prev.pool];
        const [token] = sourcePool.splice(source.index, 1);
        if (!token) return prev;

        if (destination.droppableId === 'pool') {
          return {
            pool: moveWithinList(prev.pool, source.index, destination.index),
            slots: { ...prev.slots },
          };
        }

        if (!isSlotDroppable(destination.droppableId)) return prev;
        const slotId = getSlotIdFromDroppable(destination.droppableId);
        const nextSlots = { ...prev.slots };
        const displaced = nextSlots[slotId];
        if (displaced) {
          sourcePool.splice(destination.index, 0, displaced);
        }
        nextSlots[slotId] = token;
        return {
          pool: sourcePool,
          slots: nextSlots,
        };
      }

      if (!isSlotDroppable(source.droppableId)) return prev;
      const sourceSlotId = getSlotIdFromDroppable(source.droppableId);
      const sourceToken = prev.slots[sourceSlotId];
      if (!sourceToken) return prev;

      const nextSlots = { ...prev.slots };
      nextSlots[sourceSlotId] = null;

      if (destination.droppableId === 'pool') {
        const nextPool = [...prev.pool];
        nextPool.splice(destination.index, 0, sourceToken);
        return {
          pool: nextPool,
          slots: nextSlots,
        };
      }

      if (!isSlotDroppable(destination.droppableId)) return prev;
      const destinationSlotId = getSlotIdFromDroppable(destination.droppableId);
      const displaced = prev.slots[destinationSlotId];
      nextSlots[destinationSlotId] = sourceToken;
      nextSlots[sourceSlotId] = displaced ?? null;
      return {
        pool: [...prev.pool],
        slots: nextSlots,
      };
    });

    setSelectedTokenId(null);
  };

  const handleReset = (): void => {
    setRoundState(buildRoundState(round));
    setChecked(false);
    setRoundCorrect(0);
    setFeedback(null);
    setSelectedTokenId(null);
  };

  const handleCheck = (): void => {
    if (!isRoundComplete || checked) return;
    const correct = countRoundCorrect(round, roundState);
    const isPerfect = correct === round.actions.length;
    setRoundCorrect(correct);
    setFeedback({
      kind: isPerfect ? 'success' : 'error',
      text: isPerfect
        ? translations('englishAdverbsFrequency.inRound.studio.feedback.perfect')
        : translations('englishAdverbsFrequency.inRound.studio.feedback.retry'),
    });
    setSelectedTokenId(null);
    setChecked(true);
  };

  const handleNext = (): void => {
    if (!checked) return;
    const nextTotal = totalCorrect + roundCorrect;
    setTotalCorrect(nextTotal);

    if (roundIndex + 1 >= TOTAL_ROUNDS) {
      const progress = loadProgress();
      const reward = createLessonPracticeReward(progress, {
        activityKey: 'english_adverbs_frequency_routine_studio',
        lessonKey: 'english_adverbs_frequency',
        correctAnswers: nextTotal,
        totalQuestions: TOTAL_ACTIONS,
        strongThresholdPercent: 75,
      });
      addXp(reward.xp, reward.progressUpdates);
      void persistKangurSessionScore({
        operation: 'english_adverbs_frequency',
        score: nextTotal,
        totalQuestions: TOTAL_ACTIONS,
        correctAnswers: nextTotal,
        timeTakenSeconds: Math.round((Date.now() - sessionStartedAtRef.current) / 1000),
        xpEarned: reward.xp,
      });
      setXpEarned(reward.xp);
      setXpBreakdown(reward.breakdown ?? []);
      setDone(true);
      return;
    }

    setRoundIndex((current) => current + 1);
  };

  const handleRestart = (): void => {
    setRoundIndex(0);
    setRoundState(buildRoundState(ENGLISH_ADVERBS_FREQUENCY_ROUTINE_ROUNDS[0]));
    setChecked(false);
    setRoundCorrect(0);
    setTotalCorrect(0);
    setFeedback(null);
    setDone(false);
    setXpEarned(0);
    setXpBreakdown([]);
    setSelectedTokenId(null);
    sessionStartedAtRef.current = Date.now();
  };

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
    <KangurPracticeGameStage className='mx-auto max-w-4xl'>
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
            <div className='pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_12%_18%,rgba(56,189,248,0.16),transparent_36%),radial-gradient(circle_at_84%_20%,rgba(250,204,21,0.16),transparent_34%),radial-gradient(circle_at_44%_100%,rgba(34,197,94,0.12),transparent_40%)]' />
            <div className={cn('relative z-10 flex flex-col', KANGUR_PANEL_GAP_CLASSNAME)}>
              <div className='flex items-center justify-between gap-2'>
                <KangurStatusChip accent={round.accent} className='text-[10px] uppercase tracking-[0.16em]'>
                  {translations('englishAdverbsFrequency.inRound.roundLabel', {
                    current: roundIndex + 1,
                    total: TOTAL_ROUNDS,
                  })}
                </KangurStatusChip>
                <KangurStatusChip accent='slate' className='text-[10px] uppercase tracking-[0.16em]'>
                  {translations(
                    isCoarsePointer
                      ? 'englishAdverbsFrequency.inRound.studio.modeLabelTouch'
                      : 'englishAdverbsFrequency.inRound.studio.modeLabel'
                  )}
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
                    {round.actions.map((action) => (
                      <div
                        key={`target-${action.id}`}
                        className={cn(
                          'rounded-[16px] border px-3 py-2 text-left shadow-sm',
                          KANGUR_ACCENT_STYLES[round.accent].activeCard
                        )}
                      >
                        <p className='text-xs font-black uppercase tracking-[0.14em] text-slate-700'>
                          {ACTION_META[action.actionId].emoji} {getActionLabel(translations, action.actionId)}
                        </p>
                        <p className='mt-1 text-sm text-slate-600'>
                          {getFrequencyLabel(translations, action.answer)}
                        </p>
                      </div>
                    ))}
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
                        data-testid={`english-adverbs-frequency-slot-${action.id}`}
                        className={cn(
                          'rounded-[22px] border p-3 transition touch-manipulation',
                          isCoarsePointer ? 'min-h-[17rem]' : 'min-h-[15.5rem]',
                          surfaceClass,
                          selectedToken && !checked && isCoarsePointer
                            ? 'border-sky-200 bg-sky-50/35'
                            : undefined,
                          snapshot.isDraggingOver && !checked
                            ? KANGUR_ACCENT_STYLES[round.accent].activeCard
                            : undefined
                        )}
                        onClick={() => handleAssignToken(action.id)}
                        role='button'
                        tabIndex={checked ? -1 : 0}
                        aria-disabled={checked}
                        aria-label={translations('englishAdverbsFrequency.inRound.studio.laneAria', {
                          action: getActionLabel(translations, action.actionId),
                        })}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            handleAssignToken(action.id);
                          }
                        }}
                      >
                        <div className='flex items-center justify-between gap-2'>
                          <KangurStatusChip accent={round.accent} size='sm'>
                            {ACTION_META[action.actionId].emoji} {getActionLabel(translations, action.actionId)}
                          </KangurStatusChip>
                          {assigned ? (
                            <KangurStatusChip accent={FREQUENCY_META[assigned.frequency].accent} size='sm'>
                              {getFrequencyLabel(translations, assigned.frequency)}
                            </KangurStatusChip>
                          ) : null}
                        </div>
                        <p className='mt-3 text-sm text-slate-600'>
                          {translations('englishAdverbsFrequency.inRound.studio.dropLabel')}
                        </p>
                        <RoutineWeekStrip
                          actionLabel={getActionLabel(translations, action.actionId)}
                          dataTestId={`english-adverbs-frequency-week-${action.id}`}
                          frequency={assigned?.frequency ?? null}
                          translate={translations}
                        />
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
                              isCoarsePointer={isCoarsePointer}
                              translate={translations}
                              onClick={() =>
                                setSelectedTokenId((current) =>
                                  current === assigned.id ? null : assigned.id
                                )
                              }
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
                    )}
                  </Droppable>
                );
              })}
            </div>
          </KangurInfoCard>

          <KangurInfoCard accent='slate' className='w-full' padding='md' tone='neutral'>
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
            <Droppable droppableId='pool' direction='horizontal'>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  data-testid='english-adverbs-frequency-pool-zone'
                  className={cn(
                    'mt-3 flex flex-wrap items-center justify-center gap-2 rounded-[20px] border-2 border-dashed px-3 py-3 transition touch-manipulation',
                    isCoarsePointer ? 'min-h-[96px]' : 'min-h-[72px]',
                    snapshot.isDraggingOver
                      ? 'border-sky-300 bg-sky-50/70'
                      : selectedToken && !checked && isCoarsePointer
                        ? 'border-sky-200 bg-sky-50/40'
                        : 'border-slate-200'
                  )}
                  onClick={handleReturnToPool}
                  role='button'
                  tabIndex={checked ? -1 : 0}
                  aria-disabled={checked}
                  aria-label={translations('englishAdverbsFrequency.inRound.studio.poolAria')}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      handleReturnToPool();
                    }
                  }}
                >
                  {roundState.pool.map((token, index) => (
                    <DraggableFrequencyToken
                      key={token.id}
                      token={token}
                      index={index}
                      isDragDisabled={checked}
                      isSelected={selectedTokenId === token.id}
                      isCoarsePointer={isCoarsePointer}
                      translate={translations}
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

          {isCoarsePointer || selectedToken ? (
            <KangurInfoCard accent='slate' className='w-full' padding='sm' tone='neutral'>
              <p
                className='text-xs font-semibold uppercase tracking-[0.16em] text-slate-500'
                role='status'
                aria-live='polite'
                aria-atomic='true'
                data-testid='english-adverbs-frequency-selection-hint'
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
            <KangurInfoCard accent={feedbackAccent} tone='accent' padding='sm' className='text-sm'>
              {feedback.text}
            </KangurInfoCard>
          ) : null}

          <div className='flex w-full flex-wrap items-center justify-between gap-3'>
            <div className={KANGUR_WRAP_CENTER_ROW_CLASSNAME}>
              <KangurButton
                size='sm'
                type='button'
                variant='surface'
                onClick={handleReset}
                disabled={checked}
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
            {!checked ? (
              <KangurButton
                size='sm'
                type='button'
                variant='primary'
                onClick={handleCheck}
                disabled={!isRoundComplete}
              >
                {translations('englishAdverbsFrequency.inRound.check')}
              </KangurButton>
            ) : (
              <KangurButton size='sm' type='button' variant='primary' onClick={handleNext}>
                {roundIndex + 1 >= TOTAL_ROUNDS
                  ? translations('englishAdverbsFrequency.inRound.seeResult')
                  : translations('englishAdverbsFrequency.inRound.next')}
              </KangurButton>
            )}
          </div>
        </KangurGlassPanel>
      </KangurDragDropContext>
    </KangurPracticeGameStage>
  );
}

function DraggableFrequencyToken({
  token,
  index,
  isDragDisabled,
  isSelected = false,
  isCoarsePointer = false,
  onClick,
  translate,
}: {
  token: FrequencyToken;
  index: number;
  isDragDisabled: boolean;
  isSelected?: boolean;
  isCoarsePointer?: boolean;
  onClick?: () => void;
  translate: KangurMiniGameTranslate;
}): React.JSX.Element | React.ReactPortal {
  const meta = FREQUENCY_META[token.frequency];
  const selectedClass = isSelected ? 'ring-2 ring-sky-400/80 ring-offset-1 ring-offset-white' : '';

  return (
    <Draggable
      draggableId={token.id}
      index={index}
      isDragDisabled={isDragDisabled}
      disableInteractiveElementBlocking
    >
      {(provided, snapshot) => {
        const content = (
          <button
            ref={provided.innerRef}
            {...provided.draggableProps}
            {...provided.dragHandleProps}
            style={getKangurMobileDragHandleStyle(
              provided.draggableProps.style,
              isCoarsePointer
            )}
            type='button'
            className={cn(
              'rounded-[18px] border px-3 py-2 text-sm font-black shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-300/70 focus-visible:ring-offset-2 ring-offset-white',
              isCoarsePointer
                ? 'min-h-[3.75rem] min-w-[6.5rem] px-4 py-3 touch-manipulation'
                : 'min-w-[5.75rem]',
              KANGUR_ACCENT_STYLES[meta.accent].badge,
              snapshot.isDragging && 'scale-[1.02] shadow-lg',
              selectedClass
            )}
            aria-label={getFrequencyLabel(translate, token.frequency)}
            aria-disabled={isDragDisabled}
            aria-pressed={isSelected}
            title={getFrequencyDescription(translate, token.frequency)}
            onClick={(event) => {
              event.stopPropagation();
              if (snapshot.isDragging || isDragDisabled) return;
              onClick?.();
            }}
          >
            <span className='flex items-center gap-1.5'>
              <span aria-hidden='true'>{meta.emoji}</span>
              <span>{getFrequencyLabel(translate, token.frequency)}</span>
            </span>
          </button>
        );

        return renderKangurDragPreview(content, snapshot.isDragging);
      }}
    </Draggable>
  );
}

function RoutineWeekStrip({
  actionLabel,
  dataTestId,
  frequency,
  translate,
}: {
  actionLabel: string;
  dataTestId: string;
  frequency: EnglishAdverbFrequencyId | null;
  translate: KangurMiniGameTranslate;
}): React.JSX.Element {
  const meta = frequency ? FREQUENCY_META[frequency] : null;
  const activePointXs = WEEKDAY_LABELS.map((_, index) => ({
    active: meta?.activeDays[index] ?? false,
    x: 28 + index * 28,
  }))
    .filter((point) => point.active)
    .map((point) => point.x);
  const activePath =
    activePointXs.length > 1
      ? `M ${activePointXs
          .map((x, index) => `${index === 0 ? x : `L ${x}`} 48`)
          .join(' ')}`
      : null;

  return (
    <svg
      aria-label={translate('englishAdverbsFrequency.inRound.studio.weekAria', {
        action: actionLabel,
        frequency: frequency ? getFrequencyLabel(translate, frequency) : 'empty',
      })}
      className='mt-4 h-auto w-full'
      data-testid={dataTestId}
      role='img'
      viewBox='0 0 240 94'
    >
      <style>{`
        .panel { fill: #ffffff; stroke: #dbeafe; stroke-width: 2; }
        .day-label {
          font: 700 10px/1 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #64748b;
        }
        .day-bar {
          fill: #e2e8f0;
          opacity: 0.82;
        }
        .day-bar-active {
          animation: frequencyBarPulse 2.8s ease-in-out infinite;
        }
        .day-dot {
          fill: #e2e8f0;
          stroke: #cbd5e1;
          stroke-width: 2;
        }
        .day-dot-active {
          animation: frequencyPulse 2.8s ease-in-out infinite;
          transform-box: fill-box;
          transform-origin: center;
        }
        .week-path {
          fill: none;
          stroke-width: 4;
          stroke-linecap: round;
          stroke-linejoin: round;
          opacity: 0.45;
          stroke-dasharray: 8 6;
          animation: frequencyFlow 3.8s linear infinite;
        }
        .meter-label {
          font: 700 12px/1.2 "Space Grotesk", "IBM Plex Sans", sans-serif;
          fill: #0f172a;
        }
        @keyframes frequencyPulse {
          0%, 100% { opacity: 0.82; transform: scale(0.94); }
          50% { opacity: 1; transform: scale(1); }
        }
        @keyframes frequencyBarPulse {
          0%, 100% { opacity: 0.74; transform: scaleX(0.92); }
          50% { opacity: 1; transform: scaleX(1); }
        }
        @keyframes frequencyFlow {
          from { stroke-dashoffset: 28; }
          to { stroke-dashoffset: 0; }
        }
        @media (prefers-reduced-motion: reduce) {
          .day-dot-active { animation: none; }
          .day-bar-active { animation: none; }
          .week-path { animation: none; }
        }
      `}</style>
      <rect className='panel' x='6' y='8' width='228' height='78' rx='22' />
      <text className='meter-label' x='20' y='28'>
        {frequency ? getFrequencyLabel(translate, frequency) : '...'}
      </text>
      {activePath ? <path className='week-path' d={activePath} stroke={meta?.fill} /> : null}
      {WEEKDAY_LABELS.map((label, index) => {
        const isActive = meta?.activeDays[index] ?? false;
        const x = 28 + index * 28;
        return (
          <g key={`${label}-${index}`} transform={`translate(${x}, 48)`}>
            <rect
              className={cn('day-bar', isActive && 'day-bar-active')}
              x='-10'
              y='-24'
              width='20'
              height='6'
              rx='3'
              fill={isActive ? meta?.fill : undefined}
              style={
                isActive
                  ? { animationDelay: `${index * 0.12}s` }
                  : undefined
              }
            />
            <text className='day-label' x='0' y='-14' textAnchor='middle'>
              {label}
            </text>
            <circle
              className={cn('day-dot', isActive && 'day-dot-active')}
              cx='0'
              cy='0'
              r='10'
              fill={isActive ? meta?.fill : undefined}
              style={
                isActive
                  ? { animationDelay: `${index * 0.12}s` }
                  : undefined
              }
            />
          </g>
        );
      })}
    </svg>
  );
}
