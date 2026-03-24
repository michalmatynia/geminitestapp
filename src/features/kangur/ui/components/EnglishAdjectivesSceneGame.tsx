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
  KANGUR_WRAP_ROW_CLASSNAME,
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
  ENGLISH_ADJECTIVES_SCENE_ROUNDS,
  type EnglishAdjectivePhraseId,
  type EnglishAdjectiveSceneObjectId,
  type EnglishAdjectivesSceneRound,
} from './EnglishAdjectivesSceneGame.data';

type AdjectiveToken = {
  id: string;
  adjective: EnglishAdjectivePhraseId;
};

type RoundState = {
  pool: AdjectiveToken[];
  slots: Record<string, AdjectiveToken | null>;
};

type AdjectiveTokenMeta = {
  accent: KangurAccent;
  emoji: string;
  fill?: string;
  scale?: number;
  stretchY?: number;
  sparkle?: boolean;
  soft?: boolean;
};

const ADJECTIVE_TOKEN_META: Record<EnglishAdjectivePhraseId, AdjectiveTokenMeta> = {
  big_yellow: {
    accent: 'amber',
    emoji: '🌞',
    fill: '#facc15',
    scale: 1.2,
    stretchY: 1.08,
  },
  soft: {
    accent: 'emerald',
    emoji: '☁️',
    fill: '#cbd5e1',
    soft: true,
  },
  long_blue: {
    accent: 'sky',
    emoji: '🪟',
    fill: '#60a5fa',
    stretchY: 1.28,
  },
  red: {
    accent: 'rose',
    emoji: '🚂',
    fill: '#ef4444',
  },
  small_blue: {
    accent: 'sky',
    emoji: '🧸',
    fill: '#60a5fa',
    scale: 0.84,
  },
  new: {
    accent: 'violet',
    emoji: '✨',
    sparkle: true,
  },
  brown: {
    accent: 'amber',
    emoji: '🤎',
    fill: '#8b5e3c',
  },
  long_black: {
    accent: 'slate',
    emoji: '🖤',
    fill: '#111827',
    stretchY: 1.24,
  },
  beautiful: {
    accent: 'violet',
    emoji: '🌟',
    fill: '#c084fc',
    sparkle: true,
  },
};

const shuffle = <T,>(items: readonly T[]): T[] => [...items].sort(() => Math.random() - 0.5);

const buildRoundState = (round: EnglishAdjectivesSceneRound): RoundState => ({
  pool: shuffle(
    round.tokens.map((adjective, index) => ({
      id: `token-${round.id}-${index}-${adjective}`,
      adjective,
    }))
  ),
  slots: Object.fromEntries(round.objects.map((object) => [object.id, null])),
});

const TOTAL_ROUNDS = ENGLISH_ADJECTIVES_SCENE_ROUNDS.length;
const TOTAL_TARGETS = ENGLISH_ADJECTIVES_SCENE_ROUNDS.reduce(
  (sum, round) => sum + round.objects.length,
  0
);

const getRoundTranslation = (
  translate: KangurMiniGameTranslate,
  roundId: EnglishAdjectivesSceneRound['id'],
  field: 'title' | 'prompt' | 'hint'
): string => translate(`englishAdjectives.inRound.scene.rounds.${roundId}.${field}`);

const getTokenLabel = (
  translate: KangurMiniGameTranslate,
  adjective: EnglishAdjectivePhraseId
): string => translate(`englishAdjectives.inRound.scene.tokens.${adjective}`);

const getObjectLabel = (
  translate: KangurMiniGameTranslate,
  objectId: EnglishAdjectiveSceneObjectId
): string => translate(`englishAdjectives.inRound.scene.objects.${objectId}`);

const slotDroppableId = (slotId: string): string => `slot-${slotId}`;
const isSlotDroppable = (value: string): boolean => value.startsWith('slot-');
const getSlotIdFromDroppable = (value: string): string => value.replace('slot-', '');

const takeTokenFromState = (
  state: RoundState,
  tokenId: string
): {
  token?: AdjectiveToken;
  pool: AdjectiveToken[];
  slots: Record<string, AdjectiveToken | null>;
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

const countRoundCorrect = (round: EnglishAdjectivesSceneRound, state: RoundState): number =>
  round.objects.reduce((sum, object) => {
    return sum + (state.slots[object.id]?.adjective === object.answer ? 1 : 0);
  }, 0);

export default function EnglishAdjectivesSceneGame({
  finishLabel,
  onFinish,
}: KangurMiniGameFinishProps): React.JSX.Element {
  const translations = useTranslations('KangurMiniGames');
  const isCoarsePointer = useKangurCoarsePointer();
  const resolvedFinishLabel = finishLabel ?? getKangurMiniGameFinishLabel(translations, 'topics');
  const [roundIndex, setRoundIndex] = useState(0);
  const [roundState, setRoundState] = useState<RoundState>(() =>
    buildRoundState(ENGLISH_ADJECTIVES_SCENE_ROUNDS[0])
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

  const round = ENGLISH_ADJECTIVES_SCENE_ROUNDS[roundIndex] ?? ENGLISH_ADJECTIVES_SCENE_ROUNDS[0];
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

  const isRoundComplete = round.objects.every((object) => Boolean(roundState.slots[object.id]));

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
          sourcePool.splice(destination.index, 0, token);
          return {
            pool: sourcePool,
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
    const isPerfect = correct === round.objects.length;
    setRoundCorrect(correct);
    setFeedback({
      kind: isPerfect ? 'success' : 'error',
      text: isPerfect
        ? translations('englishAdjectives.inRound.scene.feedback.perfect')
        : translations('englishAdjectives.inRound.scene.feedback.retry'),
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
        activityKey: 'english_adjectives_scene_studio',
        lessonKey: 'english_adjectives',
        correctAnswers: nextTotal,
        totalQuestions: TOTAL_TARGETS,
        strongThresholdPercent: 75,
      });
      addXp(reward.xp, reward.progressUpdates);
      void persistKangurSessionScore({
        operation: 'english_adjectives',
        score: nextTotal,
        totalQuestions: TOTAL_TARGETS,
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
    setRoundState(buildRoundState(ENGLISH_ADJECTIVES_SCENE_ROUNDS[0]));
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
    const percent = Math.round((totalCorrect / TOTAL_TARGETS) * 100);
    return (
      <KangurPracticeGameSummary dataTestId='english-adjectives-scene-summary-shell'>
        <KangurPracticeGameSummaryEmoji
          dataTestId='english-adjectives-scene-summary-emoji'
          emoji={percent === 100 ? '🎨' : percent >= 70 ? '✨' : '🛠️'}
        />
        <KangurPracticeGameSummaryTitle
          accent='indigo'
          title={
            <KangurHeadline data-testid='english-adjectives-scene-summary-title'>
              {getKangurMiniGameScoreLabel(translations, totalCorrect, TOTAL_TARGETS)}
            </KangurHeadline>
          }
        />
        <KangurPracticeGameSummaryXP accent='indigo' xpEarned={xpEarned} />
        <KangurPracticeGameSummaryBreakdown
          breakdown={xpBreakdown}
          dataTestId='english-adjectives-scene-summary-breakdown'
          itemDataTestIdPrefix='english-adjectives-scene-summary-breakdown'
        />
        <KangurPracticeGameSummaryProgress accent='indigo' percent={percent} />
        <KangurPracticeGameSummaryMessage>
          {percent === 100
            ? translations('englishAdjectives.summary.perfect')
            : percent >= 70
              ? translations('englishAdjectives.summary.good')
              : translations('englishAdjectives.summary.retry')}
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
        dataTestId='english-adjectives-scene-progress-bar'
        totalRounds={TOTAL_ROUNDS}
      />
      <KangurDragDropContext onDragEnd={handleDragEnd}>
        <KangurGlassPanel
          className={cn('w-full', KANGUR_PANEL_GAP_CLASSNAME)}
          padding='lg'
          surface='playField'
        >
          <div className='relative overflow-hidden rounded-[28px] border border-white/70 bg-[linear-gradient(150deg,#eef2ff_0%,#f8fafc_42%,#fff7ed_100%)] p-4'>
            <div className='pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_14%_24%,rgba(96,165,250,0.16),transparent_38%),radial-gradient(circle_at_80%_18%,rgba(168,85,247,0.14),transparent_36%),radial-gradient(circle_at_48%_96%,rgba(251,191,36,0.13),transparent_40%)]' />
            <div className={cn('relative z-10 flex flex-col', KANGUR_PANEL_GAP_CLASSNAME)}>
              <div className='flex items-center justify-between gap-2'>
                <KangurStatusChip accent={round.accent} className='text-[10px] uppercase tracking-[0.16em]'>
                  {translations('englishAdjectives.inRound.roundLabel', {
                    current: roundIndex + 1,
                    total: TOTAL_ROUNDS,
                  })}
                </KangurStatusChip>
                <KangurStatusChip accent='slate' className='text-[10px] uppercase tracking-[0.16em]'>
                  {translations(
                    isCoarsePointer
                      ? 'englishAdjectives.inRound.scene.modeLabelTouch'
                      : 'englishAdjectives.inRound.scene.modeLabel'
                  )}
                </KangurStatusChip>
              </div>
              <div className={cn(KANGUR_GRID_SPACED_CLASSNAME, 'sm:grid-cols-[1.08fr_0.92fr] sm:items-start')}>
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
                  <p className='text-xs font-semibold uppercase tracking-[0.16em] text-slate-500'>
                    {translations('englishAdjectives.inRound.scene.ideaLabel')}
                  </p>
                  <div className={cn('mt-3', KANGUR_WRAP_ROW_CLASSNAME)}>
                    {round.objects.map((object) => (
                      <div
                        key={`idea-${object.id}`}
                        className={cn(
                          'rounded-[16px] border px-3 py-2 text-xs shadow-sm',
                          KANGUR_ACCENT_STYLES[round.accent].activeCard
                        )}
                      >
                        <p className='font-black uppercase tracking-[0.14em] text-slate-700'>
                          {getObjectLabel(translations, object.objectId)}
                        </p>
                        <p className='mt-1 text-slate-600'>
                          {getTokenLabel(translations, object.answer)}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <KangurInfoCard accent='indigo' className='w-full' padding='md' tone='accent'>
            <div className='space-y-3'>
              <div className='flex items-center justify-between gap-2'>
                <p className='text-xs font-semibold uppercase tracking-[0.16em] text-indigo-700'>
                  {translations('englishAdjectives.inRound.scene.studioLabel')}
                </p>
                <KangurStatusChip accent='indigo' size='sm'>
                  {translations('englishAdjectives.inRound.scene.watchLabel')}
                </KangurStatusChip>
              </div>
              <AdjectiveStudioScene
                round={round}
                slots={roundState.slots}
                translate={translations}
              />
            </div>
          </KangurInfoCard>

          <KangurInfoCard accent='slate' className='w-full' padding='md' tone='neutral'>
            <p className='text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 text-center'>
              {translations('englishAdjectives.inRound.scene.poolLabel')}
            </p>
            <Droppable droppableId='pool' direction='horizontal'>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  data-testid='english-adjectives-scene-pool-zone'
                  className={cn(
                    'mt-3 flex flex-wrap items-center justify-center gap-2 rounded-[20px] border-2 border-dashed px-3 py-3 transition touch-manipulation',
                    isCoarsePointer ? 'min-h-[96px]' : 'min-h-[72px]',
                    snapshot.isDraggingOver
                      ? 'border-indigo-300 bg-indigo-50/70'
                      : selectedToken && !checked && isCoarsePointer
                        ? 'border-indigo-200 bg-indigo-50/40'
                        : 'border-slate-200'
                  )}
                  onClick={handleReturnToPool}
                  role='button'
                  tabIndex={checked ? -1 : 0}
                  aria-disabled={checked}
                  aria-label={translations('englishAdjectives.inRound.scene.poolAria')}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      handleReturnToPool();
                    }
                  }}
                >
                  {roundState.pool.map((token, index) => (
                    <DraggableAdjectiveToken
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

          <div className={cn(KANGUR_GRID_SPACED_CLASSNAME, 'sm:grid-cols-3')}>
            {round.objects.map((object) => {
              const assigned = roundState.slots[object.id];
              const isCorrect = assigned?.adjective === object.answer;
              const surfaceClass = checked
                ? isCorrect
                  ? 'border-emerald-300 bg-emerald-50/70'
                  : 'border-rose-300 bg-rose-50/70'
                : 'border-slate-200 bg-white/75';
              return (
                <Droppable key={object.id} droppableId={slotDroppableId(object.id)}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      data-testid={`english-adjectives-scene-slot-${object.id}`}
                      className={cn(
                        'rounded-[22px] border p-3 transition touch-manipulation',
                        isCoarsePointer ? 'min-h-[148px]' : 'min-h-[132px]',
                        surfaceClass,
                        selectedToken && !checked && isCoarsePointer
                          ? 'border-indigo-200 bg-indigo-50/35'
                          : undefined,
                        snapshot.isDraggingOver && !checked
                          ? KANGUR_ACCENT_STYLES[round.accent].activeCard
                          : undefined
                      )}
                      onClick={() => handleAssignToken(object.id)}
                      role='button'
                      tabIndex={checked ? -1 : 0}
                      aria-disabled={checked}
                      aria-label={translations('englishAdjectives.inRound.scene.objectSlotAria', {
                        object: getObjectLabel(translations, object.objectId),
                      })}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          handleAssignToken(object.id);
                        }
                      }}
                    >
                      <div className='flex items-center justify-between gap-2'>
                        <KangurStatusChip accent={round.accent} size='sm'>
                          {getObjectLabel(translations, object.objectId)}
                        </KangurStatusChip>
                        {checked ? (
                          <KangurStatusChip accent={isCorrect ? 'emerald' : 'rose'} size='sm'>
                            {assigned ? getTokenLabel(translations, assigned.adjective) : '—'}
                          </KangurStatusChip>
                        ) : null}
                      </div>
                      <p className='mt-3 text-sm text-slate-600'>
                        {translations('englishAdjectives.inRound.scene.dropLabel')}
                      </p>
                      <div
                        className={cn(
                          'mt-3 flex min-h-[4rem] items-center justify-center rounded-[18px] border-2 border-dashed bg-white/85 px-3 py-3',
                          checked
                            ? isCorrect
                              ? 'border-emerald-300'
                              : 'border-rose-300'
                            : 'border-slate-200'
                        )}
                      >
                        {assigned ? (
                          <DraggableAdjectiveToken
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

          {isCoarsePointer || selectedToken ? (
            <KangurInfoCard accent='slate' className='w-full' padding='sm' tone='neutral'>
              <p
                className='text-xs font-semibold uppercase tracking-[0.16em] text-slate-500'
                role='status'
                aria-live='polite'
                aria-atomic='true'
                data-testid='english-adjectives-scene-selection-hint'
              >
                {selectedToken
                  ? translations('englishAdjectives.inRound.scene.touchSelected', {
                      adjective: getTokenLabel(translations, selectedToken.adjective),
                    })
                  : translations('englishAdjectives.inRound.scene.touchIdle')}
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
                {translations('englishAdjectives.inRound.scene.clearRound')}
              </KangurButton>
              {checked ? (
                <KangurStatusChip accent={feedbackAccent}>
                  {translations('englishAdjectives.inRound.hitsLabel', {
                    hits: roundCorrect,
                    total: round.objects.length,
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
                {translations('englishAdjectives.inRound.check')}
              </KangurButton>
            ) : (
              <KangurButton size='sm' type='button' variant='primary' onClick={handleNext}>
                {roundIndex + 1 >= TOTAL_ROUNDS
                  ? translations('englishAdjectives.inRound.seeResult')
                  : translations('englishAdjectives.inRound.next')}
              </KangurButton>
            )}
          </div>
        </KangurGlassPanel>
      </KangurDragDropContext>
    </KangurPracticeGameStage>
  );
}

function DraggableAdjectiveToken({
  token,
  index,
  isDragDisabled,
  isSelected = false,
  isCoarsePointer = false,
  onClick,
  translate,
}: {
  token: AdjectiveToken;
  index: number;
  isDragDisabled: boolean;
  isSelected?: boolean;
  isCoarsePointer?: boolean;
  onClick?: () => void;
  translate: KangurMiniGameTranslate;
}): React.JSX.Element | React.ReactPortal {
  const meta = ADJECTIVE_TOKEN_META[token.adjective];
  const selectedClass = isSelected ? 'ring-2 ring-indigo-400/80 ring-offset-1 ring-offset-white' : '';

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
              'rounded-[18px] border px-3 py-2 text-sm font-black shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-300/70 focus-visible:ring-offset-2 ring-offset-white',
              isCoarsePointer
                ? 'min-h-[3.75rem] min-w-[5.5rem] px-4 py-3 touch-manipulation'
                : 'min-w-[5rem]',
              KANGUR_ACCENT_STYLES[meta.accent].badge,
              snapshot.isDragging && 'scale-[1.02] shadow-lg',
              selectedClass
            )}
            aria-label={getTokenLabel(translate, token.adjective)}
            aria-disabled={isDragDisabled}
            aria-pressed={isSelected}
            title={getTokenLabel(translate, token.adjective)}
            onClick={(event) => {
              event.stopPropagation();
              if (snapshot.isDragging || isDragDisabled) return;
              onClick?.();
            }}
          >
            <span className='flex items-center gap-1.5'>
              <span aria-hidden='true'>{meta.emoji}</span>
              <span>{getTokenLabel(translate, token.adjective)}</span>
            </span>
          </button>
        );

        return renderKangurDragPreview(content, snapshot.isDragging);
      }}
    </Draggable>
  );
}

function AdjectiveStudioScene({
  round,
  slots,
  translate,
}: {
  round: EnglishAdjectivesSceneRound;
  slots: Record<string, AdjectiveToken | null>;
  translate: KangurMiniGameTranslate;
}): React.JSX.Element {
  const assignedByObject = Object.fromEntries(
    round.objects.map((object) => [object.objectId, slots[object.id]?.adjective ?? null])
  ) as Record<EnglishAdjectiveSceneObjectId, EnglishAdjectivePhraseId | null>;

  if (round.scene === 'toy_shelf') {
    return <ToyShelfScene assignedByObject={assignedByObject} translate={translate} />;
  }
  if (round.scene === 'portrait') {
    return <PortraitScene assignedByObject={assignedByObject} translate={translate} />;
  }
  return <BedroomScene assignedByObject={assignedByObject} translate={translate} />;
}

function BedroomScene({
  assignedByObject,
  translate,
}: {
  assignedByObject: Record<EnglishAdjectiveSceneObjectId, EnglishAdjectivePhraseId | null>;
  translate: KangurMiniGameTranslate;
}): React.JSX.Element {
  const cupboardMeta = assignedByObject.cupboard ? ADJECTIVE_TOKEN_META[assignedByObject.cupboard] : null;
  const curtainsMeta = assignedByObject.curtains ? ADJECTIVE_TOKEN_META[assignedByObject.curtains] : null;
  const rugMeta = assignedByObject.rug ? ADJECTIVE_TOKEN_META[assignedByObject.rug] : null;
  const cupboardScale = cupboardMeta?.scale ?? 1;
  const curtainsStretch = curtainsMeta?.stretchY ?? 1;
  const rugSoft = Boolean(rugMeta?.soft);

  return (
    <svg
      aria-label={translate('englishAdjectives.inRound.scene.sceneAria.bedroom')}
      className='h-auto w-full'
      data-testid='english-adjectives-scene-svg'
      role='img'
      viewBox='0 0 440 250'
    >
      <style>{`
        .wall { fill: #f8fafc; }
        .floor { fill: #e2e8f0; }
        .outline { stroke: #cbd5e1; stroke-width: 2; }
        .label { font: 700 11px/1.1 "Space Grotesk", "IBM Plex Sans", sans-serif; fill: #0f172a; }
        .badge { font: 700 10px/1.1 "Space Grotesk", "IBM Plex Sans", sans-serif; fill: #1e293b; }
        .sparkle { animation: twinkle 2.8s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
        .curtain-sway { animation: sway 4.4s ease-in-out infinite; transform-origin: top center; }
        .rug-wave { animation: wave 3.4s ease-in-out infinite; transform-origin: center; }
        @keyframes twinkle {
          0%, 100% { opacity: 0.35; transform: scale(0.9); }
          50% { opacity: 1; transform: scale(1); }
        }
        @keyframes sway {
          0%, 100% { transform: skewX(0deg); }
          50% { transform: skewX(2deg); }
        }
        @keyframes wave {
          0%, 100% { transform: scaleX(1); }
          50% { transform: scaleX(1.03); }
        }
        @media (prefers-reduced-motion: reduce) {
          .sparkle, .curtain-sway, .rug-wave { animation: none; }
        }
      `}</style>
      <rect className='wall outline' x='20' y='18' width='400' height='180' rx='24' />
      <rect className='floor' x='20' y='170' width='400' height='58' rx='20' />

      <g transform={`translate(62,${122 - (cupboardScale - 1) * 22}) scale(${cupboardScale},${cupboardScale})`}>
        <rect
          x='0'
          y='0'
          width='66'
          height='74'
          rx='14'
          fill={cupboardMeta?.fill ?? '#d6b89b'}
          stroke='#8b5e3c'
          strokeWidth='2'
        />
        <line x1='33' y1='10' x2='33' y2='64' stroke='#78350f' strokeWidth='2' />
      </g>
      <ObjectSceneBadge
        label={getObjectLabel(translate, 'cupboard')}
        value={assignedByObject.cupboard ? getTokenLabel(translate, assignedByObject.cupboard) : null}
        x={52}
        y={36}
      />

      <g transform='translate(250,42)'>
        <rect x='0' y='0' width='120' height='12' rx='6' fill='#94a3b8' />
        <g className='curtain-sway'>
          <rect
            x='8'
            y='12'
            width='34'
            height={68 * curtainsStretch}
            rx='10'
            fill={curtainsMeta?.fill ?? '#cbd5f5'}
          />
          <rect
            x='78'
            y='12'
            width='34'
            height={68 * curtainsStretch}
            rx='10'
            fill={curtainsMeta?.fill ?? '#cbd5f5'}
          />
        </g>
      </g>
      <ObjectSceneBadge
        label={getObjectLabel(translate, 'curtains')}
        value={assignedByObject.curtains ? getTokenLabel(translate, assignedByObject.curtains) : null}
        x={258}
        y={24}
      />

      <g className={rugSoft ? 'rug-wave' : undefined} transform='translate(172,172)'>
        {rugSoft ? (
          <ellipse cx='48' cy='18' rx='70' ry='24' fill='#e2e8f0' opacity='0.48' />
        ) : null}
        <ellipse
          cx='48'
          cy='16'
          rx='66'
          ry='22'
          fill={rugMeta?.fill ?? '#fed7aa'}
          stroke='#fb923c'
          strokeWidth='2'
        />
      </g>
      <ObjectSceneBadge
        label={getObjectLabel(translate, 'rug')}
        value={assignedByObject.rug ? getTokenLabel(translate, assignedByObject.rug) : null}
        x={166}
        y={202}
      />
    </svg>
  );
}

function ToyShelfScene({
  assignedByObject,
  translate,
}: {
  assignedByObject: Record<EnglishAdjectiveSceneObjectId, EnglishAdjectivePhraseId | null>;
  translate: KangurMiniGameTranslate;
}): React.JSX.Element {
  const trainMeta = assignedByObject.train ? ADJECTIVE_TOKEN_META[assignedByObject.train] : null;
  const teddyMeta = assignedByObject.teddy ? ADJECTIVE_TOKEN_META[assignedByObject.teddy] : null;
  const gamesMeta = assignedByObject.games ? ADJECTIVE_TOKEN_META[assignedByObject.games] : null;

  return (
    <svg
      aria-label={translate('englishAdjectives.inRound.scene.sceneAria.toyShelf')}
      className='h-auto w-full'
      data-testid='english-adjectives-scene-svg'
      role='img'
      viewBox='0 0 440 250'
    >
      <style>{`
        .wall { fill: #f8fafc; }
        .shelf { fill: #cbd5e1; }
        .label { font: 700 11px/1.1 "Space Grotesk", "IBM Plex Sans", sans-serif; fill: #0f172a; }
        .sparkle { animation: twinkle 2.8s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
        @keyframes twinkle {
          0%, 100% { opacity: 0.35; transform: scale(0.9); }
          50% { opacity: 1; transform: scale(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          .sparkle { animation: none; }
        }
      `}</style>
      <rect className='wall' x='20' y='18' width='400' height='200' rx='24' stroke='#cbd5e1' strokeWidth='2' />
      <rect className='shelf' x='34' y='96' width='372' height='14' rx='7' />

      <g transform='translate(58,108)'>
        <rect
          x='0'
          y='16'
          width='86'
          height='26'
          rx='10'
          fill={trainMeta?.fill ?? '#fca5a5'}
        />
        <rect x='16' y='0' width='36' height='24' rx='8' fill={trainMeta?.fill ?? '#fca5a5'} />
        <circle cx='20' cy='50' r='10' fill='#334155' />
        <circle cx='68' cy='50' r='10' fill='#334155' />
      </g>
      <ObjectSceneBadge
        label={getObjectLabel(translate, 'train')}
        value={assignedByObject.train ? getTokenLabel(translate, assignedByObject.train) : null}
        x={56}
        y={46}
      />

      <g transform={`translate(192,${118 - ((teddyMeta?.scale ?? 1) < 1 ? 10 : 0)}) scale(${teddyMeta?.scale ?? 1})`}>
        <circle cx='36' cy='20' r='22' fill={teddyMeta?.fill ?? '#d6d3d1'} />
        <circle cx='18' cy='6' r='10' fill={teddyMeta?.fill ?? '#d6d3d1'} />
        <circle cx='54' cy='6' r='10' fill={teddyMeta?.fill ?? '#d6d3d1'} />
        <rect x='16' y='34' width='40' height='42' rx='18' fill={teddyMeta?.fill ?? '#d6d3d1'} />
      </g>
      <ObjectSceneBadge
        label={getObjectLabel(translate, 'teddy')}
        value={assignedByObject.teddy ? getTokenLabel(translate, assignedByObject.teddy) : null}
        x={188}
        y={38}
      />

      <g transform='translate(314,86)'>
        <rect x='0' y='0' width='70' height='24' rx='10' fill={gamesMeta?.fill ?? '#c4b5fd'} />
        <rect x='6' y='-18' width='70' height='24' rx='10' fill={gamesMeta?.fill ?? '#ddd6fe'} />
        {gamesMeta?.sparkle ? (
          <g className='sparkle'>
            <circle cx='80' cy='-6' r='5' fill='#f59e0b' />
            <circle cx='88' cy='18' r='4' fill='#fbbf24' />
          </g>
        ) : null}
      </g>
      <ObjectSceneBadge
        label={getObjectLabel(translate, 'games')}
        value={assignedByObject.games ? getTokenLabel(translate, assignedByObject.games) : null}
        x={300}
        y={36}
      />
    </svg>
  );
}

function PortraitScene({
  assignedByObject,
  translate,
}: {
  assignedByObject: Record<EnglishAdjectiveSceneObjectId, EnglishAdjectivePhraseId | null>;
  translate: KangurMiniGameTranslate;
}): React.JSX.Element {
  const eyesMeta = assignedByObject.eyes ? ADJECTIVE_TOKEN_META[assignedByObject.eyes] : null;
  const hairMeta = assignedByObject.hair ? ADJECTIVE_TOKEN_META[assignedByObject.hair] : null;
  const pictureMeta = assignedByObject.picture ? ADJECTIVE_TOKEN_META[assignedByObject.picture] : null;
  const hairLength = 64 * (hairMeta?.stretchY ?? 1);

  return (
    <svg
      aria-label={translate('englishAdjectives.inRound.scene.sceneAria.portrait')}
      className='h-auto w-full'
      data-testid='english-adjectives-scene-svg'
      role='img'
      viewBox='0 0 440 250'
    >
      <style>{`
        .wall { fill: #f8fafc; }
        .sparkle { animation: twinkle 2.8s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
        @keyframes twinkle {
          0%, 100% { opacity: 0.35; transform: scale(0.9); }
          50% { opacity: 1; transform: scale(1); }
        }
        @media (prefers-reduced-motion: reduce) {
          .sparkle { animation: none; }
        }
      `}</style>
      <rect className='wall' x='20' y='18' width='400' height='200' rx='24' stroke='#cbd5e1' strokeWidth='2' />

      <g transform='translate(126,52)'>
        <ellipse cx='86' cy='88' rx='56' ry='68' fill='#fde68a' />
        <path
          d={`M42 42 Q86 -8 130 42 V ${40 + hairLength} H 42 Z`}
          fill={hairMeta?.fill ?? '#a16207'}
        />
        <circle cx='68' cy='92' r='10' fill='white' />
        <circle cx='104' cy='92' r='10' fill='white' />
        <circle cx='68' cy='92' r='5' fill={eyesMeta?.fill ?? '#0f172a'} />
        <circle cx='104' cy='92' r='5' fill={eyesMeta?.fill ?? '#0f172a'} />
        <path d='M78 126 Q86 132 94 126' stroke='#7c2d12' strokeWidth='3' fill='none' strokeLinecap='round' />
      </g>
      <ObjectSceneBadge
        label={getObjectLabel(translate, 'eyes')}
        value={assignedByObject.eyes ? getTokenLabel(translate, assignedByObject.eyes) : null}
        x={136}
        y={34}
      />
      <ObjectSceneBadge
        label={getObjectLabel(translate, 'hair')}
        value={assignedByObject.hair ? getTokenLabel(translate, assignedByObject.hair) : null}
        x={246}
        y={34}
      />

      <g transform='translate(320,72)'>
        <rect
          x='0'
          y='0'
          width='74'
          height='96'
          rx='16'
          fill={pictureMeta?.fill ?? '#e9d5ff'}
          stroke='#8b5cf6'
          strokeWidth='3'
        />
        <path d='M16 58 C24 34, 48 34, 58 58 C48 72, 28 72, 16 58 Z' fill='#f8fafc' />
        <circle cx='30' cy='48' r='8' fill='#fde68a' />
        <circle cx='44' cy='48' r='8' fill='#f9a8d4' />
        {pictureMeta?.sparkle ? (
          <g className='sparkle'>
            <circle cx='10' cy='18' r='4' fill='#f59e0b' />
            <circle cx='66' cy='18' r='4' fill='#fbbf24' />
            <circle cx='36' cy='86' r='4' fill='#fde68a' />
          </g>
        ) : null}
      </g>
      <ObjectSceneBadge
        label={getObjectLabel(translate, 'picture')}
        value={assignedByObject.picture ? getTokenLabel(translate, assignedByObject.picture) : null}
        x={308}
        y={176}
      />
    </svg>
  );
}

function ObjectSceneBadge({
  label,
  value,
  x,
  y,
}: {
  label: string;
  value: string | null;
  x: number;
  y: number;
}): React.JSX.Element {
  return (
    <g transform={`translate(${x},${y})`}>
      <rect x='0' y='0' width='96' height={value ? 34 : 22} rx='11' fill='rgba(255,255,255,0.88)' stroke='#cbd5e1' />
      <text x='10' y='14' fontSize='10' fontWeight='700' fontFamily='"Space Grotesk", "IBM Plex Sans", sans-serif' fill='#334155'>
        {label}
      </text>
      {value ? (
        <text x='10' y='28' fontSize='10' fontWeight='700' fontFamily='"Space Grotesk", "IBM Plex Sans", sans-serif' fill='#1e293b'>
          {value}
        </text>
      ) : null}
    </g>
  );
}
