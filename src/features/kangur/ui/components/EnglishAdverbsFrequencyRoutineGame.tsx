'use client';

import { useKangurProgressOwnerKey } from '@/features/kangur/ui/hooks/useKangurProgressOwnerKey';
import { Draggable, Droppable } from '@hello-pangea/dnd';
import type { DropResult } from '@hello-pangea/dnd';
import { useTranslations } from 'next-intl';
import { useEffect, useId, useMemo, useRef, useState } from 'react';

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
import {
  buildEnglishAdverbsFrequencySentence,
  buildEnglishAdverbsFrequencySentenceParts,
  buildEnglishAdverbsFrequencySentenceTemplate,
  buildEnglishAdverbsFrequencySentenceTemplateParts,
} from './EnglishAdverbsFrequencyRoutineGame.sentences';

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

const getFrequencyDaysLitLabel = (
  translate: KangurMiniGameTranslate,
  frequency: EnglishAdverbFrequencyId
): string =>
  `${translate('englishAdverbsFrequency.inRound.studio.daysLitLabel')}: ${countFrequencyActiveDays(
    frequency
  )}/7`;

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

const countFrequencyActiveDays = (frequency: EnglishAdverbFrequencyId): number =>
  FREQUENCY_META[frequency].activeDays.filter(Boolean).length;

const countFrequencyChangedDays = (
  from: EnglishAdverbFrequencyId,
  to: EnglishAdverbFrequencyId
): number =>
  FREQUENCY_META[from].activeDays.reduce((sum, active, index) => {
    return sum + (active !== FREQUENCY_META[to].activeDays[index] ? 1 : 0);
  }, 0);

const countFrequencyTurnedOnDays = (
  from: EnglishAdverbFrequencyId,
  to: EnglishAdverbFrequencyId
): number =>
  FREQUENCY_META[from].activeDays.reduce((sum, active, index) => {
    return sum + (!active && FREQUENCY_META[to].activeDays[index] ? 1 : 0);
  }, 0);

const countFrequencyTurnedOffDays = (
  from: EnglishAdverbFrequencyId,
  to: EnglishAdverbFrequencyId
): number =>
  FREQUENCY_META[from].activeDays.reduce((sum, active, index) => {
    return sum + (active && !FREQUENCY_META[to].activeDays[index] ? 1 : 0);
  }, 0);

export default function EnglishAdverbsFrequencyRoutineGame({
  finishLabel,
  onFinish,
}: KangurMiniGameFinishProps): React.JSX.Element {
  const ownerKey = useKangurProgressOwnerKey();
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
      const progress = loadProgress({ ownerKey });
      const reward = createLessonPracticeReward(progress, {
        activityKey: 'english_adverbs_frequency_routine_studio',
        lessonKey: 'english_adverbs_frequency',
        correctAnswers: nextTotal,
        totalQuestions: TOTAL_ACTIONS,
        strongThresholdPercent: 75,
      });
      addXp(reward.xp, reward.progressUpdates, { ownerKey });
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
              dataTestId='english-adverbs-frequency-summary-rule-main-verb'
              accent='sky'
              label={translations('englishAdverbsFrequency.summary.mainVerbLabel')}
              sentence={buildEnglishAdverbsFrequencySentence('do_homework', 'always')}
              parts={buildEnglishAdverbsFrequencySentenceParts('do_homework', 'always').parts}
              pattern={buildEnglishAdverbsFrequencySentenceParts('do_homework', 'always').pattern}
              translate={translations}
            />
            <SummaryPatternGuideCard
              dataTestId='english-adverbs-frequency-summary-rule-be-verb'
              accent='amber'
              label={translations('englishAdverbsFrequency.summary.beVerbLabel')}
              sentence={buildEnglishAdverbsFrequencySentence('be_late_for_school', 'never')}
              parts={buildEnglishAdverbsFrequencySentenceParts('be_late_for_school', 'never').parts}
              pattern={buildEnglishAdverbsFrequencySentenceParts('be_late_for_school', 'never').pattern}
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
              dataTestId='english-adverbs-frequency-summary-starter-always'
              accent='emerald'
              emoji='🟢'
              text={translations('englishAdverbsFrequency.summary.starters.alwaysHabit')}
            />
            <SummaryStarterCard
              dataTestId='english-adverbs-frequency-summary-starter-sometimes'
              accent='amber'
              emoji='🟡'
              text={translations('englishAdverbsFrequency.summary.starters.sometimesPlace')}
            />
            <SummaryStarterCard
              dataTestId='english-adverbs-frequency-summary-starter-never'
              accent='rose'
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
                            {ACTION_META[action.actionId].emoji} {getActionLabel(translations, action.actionId)}
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
                        data-testid={`english-adverbs-frequency-slot-${action.id}`}
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
                              {translations('englishAdverbsFrequency.inRound.studio.previewEmpty')}
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
                                        ? KANGUR_ACCENT_STYLES[FREQUENCY_META[assigned.frequency].accent]
                                            .badge
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
                                <KangurStatusChip accent={FREQUENCY_META[assigned.frequency].accent} size='sm'>
                                  {translations(
                                    'englishAdverbsFrequency.inRound.studio.yourFrequencyLabel'
                                  )}
                                  : {getFrequencyLabel(translations, assigned.frequency)}
                                </KangurStatusChip>
                                <span aria-hidden='true' className='text-sm font-black text-rose-400'>
                                  →
                                </span>
                                <KangurStatusChip accent={FREQUENCY_META[action.answer].accent} size='sm'>
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
                                  dataTestId={`english-adverbs-frequency-correction-current-week-${action.id}`}
                                  frequency={assigned.frequency}
                                  label={translations(
                                    'englishAdverbsFrequency.inRound.studio.yourWeekLabel'
                                  )}
                                  compareAgainst={action.answer}
                                />
                                <CompactFrequencyDots
                                  dataTestId={`english-adverbs-frequency-correction-target-week-${action.id}`}
                                  frequency={action.answer}
                                  label={translations(
                                    'englishAdverbsFrequency.inRound.studio.targetWeekLabel'
                                  )}
                                  compareAgainst={assigned.frequency}
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
                                {translations('englishAdverbsFrequency.inRound.studio.matchedLabel')}
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
            <span className='mt-1.5 block text-[10px] font-semibold tracking-[0.08em] opacity-80'>
              {getFrequencyDaysLitLabel(translate, token.frequency)}
            </span>
            <span className='mt-1.5 flex items-center justify-center gap-1'>
              {meta.activeDays.map((isActive, index) => (
                <span
                  key={`${token.id}-preview-${index}`}
                  aria-hidden='true'
                  className={cn(
                    'h-1.5 w-1.5 rounded-full border border-white/70 transition',
                    isActive ? 'bg-current opacity-95' : 'bg-white/45 opacity-60'
                  )}
                  data-active={isActive ? 'true' : 'false'}
                />
              ))}
            </span>
          </button>
        );

        return renderKangurDragPreview(content, snapshot.isDragging);
      }}
    </Draggable>
  );
}

function RoutineWeekStrip({
  actionId,
  actionLabel,
  dataTestId,
  frequency,
  translate,
}: {
  actionId: EnglishAdverbFrequencyActionId;
  actionLabel: string;
  dataTestId: string;
  frequency: EnglishAdverbFrequencyId | null;
  translate: KangurMiniGameTranslate;
}): React.JSX.Element {
  const stripId = useId().replace(/:/g, '-');
  const meta = frequency ? FREQUENCY_META[frequency] : null;
  const actionEmoji = ACTION_META[actionId].emoji;
  const clipId = `${stripId}-clip`;
  const panelGradientId = `${stripId}-panel-gradient`;
  const accentGradientId = `${stripId}-accent-gradient`;
  const atmosphereGradientId = `${stripId}-atmosphere-gradient`;
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
      <defs>
        <clipPath id={clipId}>
          <rect data-testid={`${dataTestId}-clip`} x='6' y='8' width='228' height='78' rx='22' />
        </clipPath>
        <linearGradient id={panelGradientId} x1='0%' x2='100%' y1='0%' y2='100%'>
          <stop offset='0%' stopColor='rgba(255,255,255,0.98)' />
          <stop offset='55%' stopColor='rgba(248,250,252,0.96)' />
          <stop offset='100%' stopColor='rgba(226,232,240,0.92)' />
        </linearGradient>
        <linearGradient id={accentGradientId} x1='0%' x2='100%' y1='0%' y2='100%'>
          <stop offset='0%' stopColor='rgba(255,255,255,0.58)' />
          <stop offset='100%' stopColor={meta ? `${meta.fill}66` : 'rgba(148,163,184,0.28)'} />
        </linearGradient>
        <radialGradient id={atmosphereGradientId} cx='80%' cy='20%' r='76%'>
          <stop offset='0%' stopColor={meta ? `${meta.fill}30` : 'rgba(148,163,184,0.14)'} />
          <stop offset='100%' stopColor='rgba(255,255,255,0)' />
        </radialGradient>
      </defs>
      <style>{`
        .panel { fill: url(#${panelGradientId}); stroke: #dbeafe; stroke-width: 2; }
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
        .day-icon {
          font: 700 11px/1 "Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif;
          opacity: 0.95;
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
      <g clipPath={`url(#${clipId})`}>
        <rect className='panel' x='6' y='8' width='228' height='78' rx='22' />
        <g data-testid={`${dataTestId}-atmosphere`}>
          <ellipse cx='186' cy='24' rx='82' ry='34' fill={`url(#${atmosphereGradientId})`} />
          <ellipse cx='74' cy='74' rx='92' ry='18' fill={meta ? `${meta.fill}12` : 'rgba(148,163,184,0.08)'} />
          <path d='M16 72 C 48 52, 104 52, 224 78' fill='none' stroke='rgba(255,255,255,0.2)' strokeWidth='10' strokeLinecap='round' />
        </g>
        <rect x='12' y='14' width='216' height='66' rx='18' fill='none' stroke='rgba(255,255,255,0.46)' strokeWidth='1.6' data-testid={`${dataTestId}-frame`} />
      </g>
      <rect x='16' y='16' width='62' height='18' rx='9' fill={`url(#${accentGradientId})`} opacity='0.92' />
      <text className='meter-label' x='20' y='28'>
        {frequency ? getFrequencyLabel(translate, frequency) : '...'}
      </text>
      {activePath ? <path className='week-path' d={activePath} stroke={meta?.fill} /> : null}
      {WEEKDAY_LABELS.map((label, index) => {
        const isActive = meta?.activeDays[index] ?? false;
        const x = 28 + index * 28;
        return (
          <g
            key={`${label}-${index}`}
            transform={`translate(${x}, 48)`}
            data-testid={`${dataTestId}-day-${index}`}
            data-active={isActive ? 'true' : 'false'}
          >
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
            {isActive ? (
              <text
                aria-hidden='true'
                className='day-icon'
                textAnchor='middle'
                dominantBaseline='middle'
                x='0'
                y='1'
              >
                {actionEmoji}
              </text>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}

function CompactFrequencyDots({
  dataTestId,
  frequency,
  label,
  compareAgainst,
}: {
  dataTestId: string;
  frequency: EnglishAdverbFrequencyId;
  label: string;
  compareAgainst?: EnglishAdverbFrequencyId;
}): React.JSX.Element {
  const meta = FREQUENCY_META[frequency];
  const compareMeta = compareAgainst ? FREQUENCY_META[compareAgainst] : null;

  return (
    <div className='space-y-1' data-testid={dataTestId}>
      <p className='text-[10px] font-black uppercase tracking-[0.16em] text-rose-500'>{label}</p>
      <div className='flex items-center gap-1.5'>
        {meta.activeDays.map((isActive, index) => {
          const isChanged = compareMeta ? compareMeta.activeDays[index] !== isActive : false;
          return (
            <span
              key={`${dataTestId}-${index}`}
              className={cn(
                'h-2.5 w-2.5 rounded-full border border-rose-200 transition',
                isActive ? 'bg-rose-400' : 'bg-white/90',
                isChanged ? 'ring-2 ring-rose-300/80 ring-offset-1 ring-offset-rose-50' : undefined
              )}
              data-testid={`${dataTestId}-day-${index}`}
              data-active={isActive ? 'true' : 'false'}
              data-changed={isChanged ? 'true' : 'false'}
            />
          );
        })}
      </div>
    </div>
  );
}

function SummaryFrequencyGuideCard({
  dataTestId,
  frequency,
  translate,
}: {
  dataTestId: string;
  frequency: EnglishAdverbFrequencyId;
  translate: KangurMiniGameTranslate;
}): React.JSX.Element {
  const meta = FREQUENCY_META[frequency];

  return (
    <div
      className={cn(
        'rounded-[18px] border px-3 py-3 text-left shadow-sm',
        KANGUR_ACCENT_STYLES[meta.accent].activeCard
      )}
      data-testid={dataTestId}
    >
      <div className='flex items-center justify-between gap-2'>
        <p className='text-sm font-black text-slate-800'>
          <span aria-hidden='true' className='mr-1'>
            {meta.emoji}
          </span>
          {getFrequencyLabel(translate, frequency)}
        </p>
        <KangurStatusChip accent={meta.accent} size='sm'>
          {countFrequencyActiveDays(frequency)}/7
        </KangurStatusChip>
      </div>
      <p className='mt-1 text-xs text-slate-600'>{getFrequencyDescription(translate, frequency)}</p>
      <p className='mt-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500'>
        {getFrequencyDaysLitLabel(translate, frequency)}
      </p>
      <div className='mt-2 flex items-center gap-1.5'>
        {meta.activeDays.map((isActive, index) => (
          <span
            key={`${dataTestId}-day-${index}`}
            className={cn(
              'h-2.5 w-2.5 rounded-full border border-white/80 shadow-sm transition',
              isActive ? 'opacity-100' : 'bg-white/70 opacity-60'
            )}
            data-testid={`${dataTestId}-day-${index}`}
            data-active={isActive ? 'true' : 'false'}
            style={isActive ? { backgroundColor: meta.fill } : undefined}
          />
        ))}
      </div>
    </div>
  );
}

function SummaryPatternGuideCard({
  accent,
  dataTestId,
  label,
  sentence,
  parts,
  pattern,
  translate,
}: {
  accent: KangurAccent;
  dataTestId: string;
  label: string;
  sentence: string;
  parts: readonly string[];
  pattern: 'mainVerb' | 'beVerb';
  translate: KangurMiniGameTranslate;
}): React.JSX.Element {
  return (
    <div
      className={cn(
        'rounded-[18px] border px-3 py-3 text-left shadow-sm',
        KANGUR_ACCENT_STYLES[accent].activeCard
      )}
      data-testid={dataTestId}
    >
      <p className='text-[10px] font-black uppercase tracking-[0.16em] text-slate-500'>{label}</p>
      <p className='mt-1 text-sm font-semibold text-slate-700'>{sentence}</p>
      <div className='mt-3 flex flex-wrap items-center gap-2'>
        {parts.map((part, index) => (
          <span
            key={`${dataTestId}-part-${index}-${part}`}
            className={cn(
              'rounded-full border px-2.5 py-1 text-xs font-bold shadow-sm',
              index === 1
                ? KANGUR_ACCENT_STYLES[accent].badge
                : 'border-slate-200 bg-white/90 text-slate-700'
            )}
          >
            {part}
          </span>
        ))}
      </div>
      <p className='mt-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500'>
        {translate('englishAdverbsFrequency.inRound.studio.patternLabel')}{' '}
        <span className='text-slate-700'>
          {translate(`englishAdverbsFrequency.inRound.studio.patterns.${pattern}`)}
        </span>
      </p>
    </div>
  );
}

function SummaryStarterCard({
  accent,
  dataTestId,
  emoji,
  text,
}: {
  accent: KangurAccent;
  dataTestId: string;
  emoji: string;
  text: string;
}): React.JSX.Element {
  return (
    <div
      className={cn(
        'rounded-[18px] border px-3 py-3 text-left shadow-sm',
        KANGUR_ACCENT_STYLES[accent].activeCard
      )}
      data-testid={dataTestId}
    >
      <p className='text-sm font-semibold text-slate-700'>
        <span aria-hidden='true' className='mr-1.5'>
          {emoji}
        </span>
        {text}
      </p>
    </div>
  );
}

function SummaryQuestionCard({
  accent,
  dataTestId,
  emoji,
  prompt,
  starter,
}: {
  accent: KangurAccent;
  dataTestId: string;
  emoji: string;
  prompt: string;
  starter: string;
}): React.JSX.Element {
  return (
    <div
      className={cn(
        'rounded-[18px] border px-3 py-3 text-left shadow-sm',
        KANGUR_ACCENT_STYLES[accent].activeCard
      )}
      data-testid={dataTestId}
    >
      <p className='text-sm font-semibold text-slate-700'>
        <span aria-hidden='true' className='mr-1.5'>
          {emoji}
        </span>
        {prompt}
      </p>
      <p className='mt-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500'>
        {starter}
      </p>
    </div>
  );
}
