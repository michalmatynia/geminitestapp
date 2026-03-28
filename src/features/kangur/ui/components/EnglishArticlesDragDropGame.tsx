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
import { useKangurSubjectFocus } from '@/features/kangur/ui/context/KangurSubjectFocusContext';
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
  ENGLISH_ARTICLES_DRAG_DROP_ROUNDS,
  type EnglishArticleId,
  type EnglishArticlesDragDropRound,
} from './EnglishArticlesDragDropGame.data';

type ArticleToken = {
  id: string;
  article: EnglishArticleId;
};

type RoundState = {
  pool: ArticleToken[];
  slots: Record<string, ArticleToken | null>;
};

const ARTICLE_META: Record<
  EnglishArticleId,
  { accent: KangurAccent; label: string; emoji: string }
> = {
  a: {
    accent: 'amber',
    label: 'a',
    emoji: '🅰️',
  },
  an: {
    accent: 'sky',
    label: 'an',
    emoji: '🫧',
  },
  the: {
    accent: 'violet',
    label: 'the',
    emoji: '👀',
  },
};

const shuffle = <T,>(items: readonly T[]): T[] => [...items].sort(() => Math.random() - 0.5);

const buildRoundState = (round: EnglishArticlesDragDropRound): RoundState => ({
  pool: shuffle(
    round.sentences.map((sentence) => ({
      id: `token-${sentence.id}`,
      article: sentence.answer,
    }))
  ),
  slots: Object.fromEntries(round.sentences.map((sentence) => [sentence.id, null])),
});

const TOTAL_ROUNDS = ENGLISH_ARTICLES_DRAG_DROP_ROUNDS.length;
const TOTAL_SENTENCES = ENGLISH_ARTICLES_DRAG_DROP_ROUNDS.reduce(
  (sum, round) => sum + round.sentences.length,
  0
);

const getArticlesRoundTitle = (
  translate: KangurMiniGameTranslate,
  roundId: EnglishArticlesDragDropRound['id']
): string => translate(`englishArticles.inRound.drag.rounds.${roundId}.title`);

const getArticlesRoundPrompt = (
  translate: KangurMiniGameTranslate,
  roundId: EnglishArticlesDragDropRound['id']
): string => translate(`englishArticles.inRound.drag.rounds.${roundId}.prompt`);

const getArticlesRoundHint = (
  translate: KangurMiniGameTranslate,
  roundId: EnglishArticlesDragDropRound['id']
): string => translate(`englishArticles.inRound.drag.rounds.${roundId}.hint`);

const getArticleDescription = (
  translate: KangurMiniGameTranslate,
  article: EnglishArticleId
): string => translate(`englishArticles.inRound.drag.articles.${article}.description`);

const slotDroppableId = (slotId: string): string => `slot-${slotId}`;
const isSlotDroppable = (value: string): boolean => value.startsWith('slot-');
const getSlotIdFromDroppable = (value: string): string => value.replace('slot-', '');

const takeTokenFromState = (
  state: RoundState,
  tokenId: string
): {
  token?: ArticleToken;
  pool: ArticleToken[];
  slots: Record<string, ArticleToken | null>;
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
  round: EnglishArticlesDragDropRound,
  state: RoundState
): number =>
  round.sentences.reduce((sum, sentence) => {
    return sum + (state.slots[sentence.id]?.article === sentence.answer ? 1 : 0);
  }, 0);

export default function EnglishArticlesDragDropGame({
  finishLabel,
  onFinish,
}: KangurMiniGameFinishProps): React.JSX.Element {
  const translations = useTranslations('KangurMiniGames');
  const { subjectKey } = useKangurSubjectFocus();
  const isCoarsePointer = useKangurCoarsePointer();
  const resolvedFinishLabel = finishLabel ?? getKangurMiniGameFinishLabel(translations, 'topics');
  const [roundIndex, setRoundIndex] = useState(0);
  const [roundState, setRoundState] = useState<RoundState>(() =>
    buildRoundState(ENGLISH_ARTICLES_DRAG_DROP_ROUNDS[0])
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

  const round = ENGLISH_ARTICLES_DRAG_DROP_ROUNDS[roundIndex] ?? ENGLISH_ARTICLES_DRAG_DROP_ROUNDS[0];
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

  const isRoundComplete = round.sentences.every((sentence) => Boolean(roundState.slots[sentence.id]));

  const handleAssignToken = (slotId: string): void => {
    if (checked || !selectedTokenId) return;
    setRoundState((prev) => {
      const extracted = takeTokenFromState(prev, selectedTokenId);
      if (!extracted.token) {
        return prev;
      }
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
      if (!extracted.token) {
        return prev;
      }
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
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

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

      if (!isSlotDroppable(source.droppableId)) {
        return prev;
      }

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

      if (!isSlotDroppable(destination.droppableId)) {
        return prev;
      }

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
    setRoundCorrect(correct);
    const isPerfect = correct === round.sentences.length;
    setFeedback({
      kind: isPerfect ? 'success' : 'error',
      text: isPerfect
        ? translations('englishArticles.inRound.drag.feedback.perfect')
        : translations('englishArticles.inRound.drag.feedback.retry'),
    });
    setSelectedTokenId(null);
    setChecked(true);
  };

  const handleNext = (): void => {
    if (!checked) return;
    const nextTotal = totalCorrect + roundCorrect;
    setTotalCorrect(nextTotal);

    if (roundIndex + 1 >= TOTAL_ROUNDS) {
      const progress = loadProgress({ ownerKey: subjectKey });
      const reward = createLessonPracticeReward(progress, {
        activityKey: 'english_articles_drag_drop',
        lessonKey: 'english_articles',
        correctAnswers: nextTotal,
        totalQuestions: TOTAL_SENTENCES,
        strongThresholdPercent: 75,
      });
      addXp(reward.xp, reward.progressUpdates, { ownerKey: subjectKey });
      void persistKangurSessionScore({
        operation: 'english_articles',
        score: nextTotal,
        totalQuestions: TOTAL_SENTENCES,
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
    setRoundState(buildRoundState(ENGLISH_ARTICLES_DRAG_DROP_ROUNDS[0]));
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
    const percent = Math.round((totalCorrect / TOTAL_SENTENCES) * 100);
    return (
      <KangurPracticeGameSummary dataTestId='english-articles-drag-summary-shell'>
        <KangurPracticeGameSummaryEmoji
          dataTestId='english-articles-drag-summary-emoji'
          emoji={percent === 100 ? '🏆' : percent >= 70 ? '🌟' : '💪'}
        />
        <KangurPracticeGameSummaryTitle
          accent='amber'
          title={
            <KangurHeadline data-testid='english-articles-drag-summary-title'>
              {getKangurMiniGameScoreLabel(translations, totalCorrect, TOTAL_SENTENCES)}
            </KangurHeadline>
          }
        />
        <KangurPracticeGameSummaryXP accent='amber' xpEarned={xpEarned} />
        <KangurPracticeGameSummaryBreakdown
          breakdown={xpBreakdown}
          dataTestId='english-articles-drag-summary-breakdown'
          itemDataTestIdPrefix='english-articles-drag-summary-breakdown'
        />
        <KangurPracticeGameSummaryProgress accent='amber' percent={percent} />
        <KangurPracticeGameSummaryMessage>
          {percent === 100
            ? translations('englishArticles.summary.perfect')
            : percent >= 70
              ? translations('englishArticles.summary.good')
              : translations('englishArticles.summary.retry')}
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
    <KangurPracticeGameShell className='mx-auto max-w-3xl'>
      <KangurPracticeGameProgress
        accent={round.accent}
        currentRound={roundIndex}
        dataTestId='english-articles-drag-progress-bar'
        totalRounds={TOTAL_ROUNDS}
      />
      <KangurDragDropContext onDragEnd={handleDragEnd}>
        <KangurGlassPanel
          className={cn('w-full', KANGUR_PANEL_GAP_CLASSNAME)}
          padding='lg'
          surface='playField'
        >
          <div className='relative overflow-hidden rounded-[28px] border border-white/70 bg-[linear-gradient(145deg,#fffbeb_0%,#fff7ed_45%,#eef2ff_100%)] p-4'>
            <div className='pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(251,191,36,0.16),transparent_42%),radial-gradient(circle_at_82%_18%,rgba(59,130,246,0.14),transparent_40%),radial-gradient(circle_at_50%_100%,rgba(139,92,246,0.12),transparent_46%)]' />
            <div className={cn('relative z-10 flex flex-col', KANGUR_PANEL_GAP_CLASSNAME)}>
              <div className='flex items-center justify-between gap-2'>
                <KangurStatusChip accent={round.accent} className='text-[10px] uppercase tracking-[0.16em]'>
                  {translations('englishArticles.inRound.roundLabel', {
                    current: roundIndex + 1,
                    total: TOTAL_ROUNDS,
                  })}
                </KangurStatusChip>
                <KangurStatusChip accent='slate' className='text-[10px] uppercase tracking-[0.16em]'>
                  {translations(
                    isCoarsePointer
                      ? 'englishArticles.inRound.drag.modeLabelTouch'
                      : 'englishArticles.inRound.drag.modeLabel'
                  )}
                </KangurStatusChip>
              </div>
              <div className={cn(KANGUR_GRID_SPACED_CLASSNAME, 'sm:grid-cols-[1.05fr_0.95fr] sm:items-start')}>
                <div className='space-y-2'>
                  <p className='text-lg font-bold text-slate-800'>
                    {getArticlesRoundTitle(translations, round.id)}
                  </p>
                  <p className='text-sm text-slate-600'>
                    {getArticlesRoundPrompt(translations, round.id)}
                  </p>
                  <p className='text-xs font-semibold text-slate-500'>
                    {getArticlesRoundHint(translations, round.id)}
                  </p>
                </div>
                <div className='rounded-[20px] border border-white/70 bg-white/80 p-3'>
                  <p className='text-xs font-semibold uppercase tracking-[0.16em] text-slate-500'>
                    {translations('englishArticles.inRound.drag.topicLabel')}
                  </p>
                  <div className={cn('mt-3', KANGUR_WRAP_ROW_CLASSNAME)}>
                    {(['a', 'an', 'the'] as const).map((article) => (
                      <div
                        key={article}
                        data-testid={`english-articles-drag-topic-${article}`}
                        className={cn(
                          'relative overflow-hidden rounded-[16px] border px-3 py-2 text-xs shadow-sm',
                          KANGUR_ACCENT_STYLES[ARTICLE_META[article].accent].activeCard
                        )}
                      >
                        <div
                          aria-hidden='true'
                          className='pointer-events-none absolute inset-0 opacity-90'
                          style={{
                            background:
                              article === 'a'
                                ? 'radial-gradient(circle_at_14%_20%,rgba(251,191,36,0.2),transparent_36%), linear-gradient(180deg,rgba(255,255,255,0.42),rgba(255,255,255,0.08))'
                                : article === 'an'
                                  ? 'radial-gradient(circle_at_14%_20%,rgba(56,189,248,0.18),transparent_36%), linear-gradient(180deg,rgba(255,255,255,0.42),rgba(255,255,255,0.08))'
                                  : 'radial-gradient(circle_at_14%_20%,rgba(139,92,246,0.18),transparent_36%), linear-gradient(180deg,rgba(255,255,255,0.42),rgba(255,255,255,0.08))',
                          }}
                        />
                        <div className='relative z-10'>
                        <p className='font-black uppercase tracking-[0.16em] text-slate-700'>
                          {ARTICLE_META[article].label}
                        </p>
                        <p className='mt-1 text-slate-600'>
                          {getArticleDescription(translations, article)}
                        </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>

          <KangurInfoCard accent='slate' className='w-full' padding='md' tone='neutral'>
            <p className='text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 text-center'>
              {translations('englishArticles.inRound.drag.poolLabel')}
            </p>
            <Droppable droppableId='pool' direction='horizontal'>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  data-testid='english-articles-drag-pool-zone'
                  className={cn(
                    'relative mt-3 flex flex-wrap items-center justify-center gap-2 overflow-hidden rounded-[20px] border-2 border-dashed px-3 py-3 transition touch-manipulation',
                    isCoarsePointer ? 'min-h-[92px]' : 'min-h-[72px]',
                    snapshot.isDraggingOver
                      ? 'border-amber-300 bg-amber-50/70'
                      : selectedToken && !checked && isCoarsePointer
                        ? 'border-amber-200 bg-amber-50/40'
                        : 'border-slate-200'
                  )}
                  onClick={handleReturnToPool}
                  role='button'
                  tabIndex={checked ? -1 : 0}
                  aria-disabled={checked}
                  aria-label={translations('englishArticles.inRound.drag.poolAria')}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      handleReturnToPool();
                    }
                  }}
                >
                  <div
                    aria-hidden='true'
                    className='pointer-events-none absolute inset-0'
                    data-testid='english-articles-drag-pool-atmosphere'
                    style={{
                      background:
                        'radial-gradient(circle_at_12%_18%,rgba(251,191,36,0.16),transparent_34%), radial-gradient(circle_at_84%_20%,rgba(59,130,246,0.14),transparent_28%), linear-gradient(180deg,rgba(255,255,255,0.32),rgba(255,255,255,0.06))',
                    }}
                  />
                  <div className='pointer-events-none absolute inset-[10px] rounded-[16px] border border-white/40' />
                  {roundState.pool.map((token, index) => (
                    <DraggableArticleToken
                      key={token.id}
                      token={token}
                      index={index}
                      isDragDisabled={checked}
                      isSelected={selectedTokenId === token.id}
                      isCoarsePointer={isCoarsePointer}
                      onClick={() =>
                        setSelectedTokenId((current) => (current === token.id ? null : token.id))
                      }
                    />
                  ))}
                  {provided.placeholder}
                  {roundState.pool.length === 0 ? (
                    <p className='text-xs font-semibold text-slate-400'>
                      {translations('englishArticles.inRound.drag.poolEmpty')}
                    </p>
                  ) : null}
                </div>
              )}
            </Droppable>
          </KangurInfoCard>

          <div className='grid w-full grid-cols-1 gap-3'>
            {round.sentences.map((sentence, index) => {
              const assigned = roundState.slots[sentence.id];
              const isCorrect = assigned?.article === sentence.answer;
              const surfaceClass = checked
                ? isCorrect
                  ? 'border-emerald-300 bg-emerald-50/70'
                  : 'border-rose-300 bg-rose-50/70'
                : 'border-slate-200 bg-white/75';
              return (
                <Droppable key={sentence.id} droppableId={slotDroppableId(sentence.id)}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      data-testid={`english-articles-drag-slot-${sentence.id}`}
                      className={cn(
                        'rounded-[22px] border p-3 transition touch-manipulation',
                        isCoarsePointer ? 'min-h-[132px]' : 'min-h-[118px]',
                        surfaceClass,
                        selectedToken && !checked && isCoarsePointer
                          ? 'border-amber-200 bg-amber-50/35'
                          : undefined,
                        snapshot.isDraggingOver && !checked
                          ? KANGUR_ACCENT_STYLES[round.accent].activeCard
                          : undefined
                      )}
                      onClick={() => handleAssignToken(sentence.id)}
                      role='button'
                      tabIndex={checked ? -1 : 0}
                      aria-disabled={checked}
                      aria-label={translations('englishArticles.inRound.drag.slotAria', {
                        index: index + 1,
                      })}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter' || event.key === ' ') {
                          event.preventDefault();
                          handleAssignToken(sentence.id);
                        }
                      }}
                    >
                      <div
                        aria-hidden='true'
                        className='pointer-events-none absolute inset-0 opacity-90'
                        style={{
                          background: assigned
                            ? assigned.article === 'a'
                              ? 'radial-gradient(circle_at_14%_18%,rgba(251,191,36,0.16),transparent_34%), linear-gradient(180deg,rgba(255,255,255,0.34),rgba(255,255,255,0.08))'
                              : assigned.article === 'an'
                                ? 'radial-gradient(circle_at_14%_18%,rgba(56,189,248,0.16),transparent_34%), linear-gradient(180deg,rgba(255,255,255,0.34),rgba(255,255,255,0.08))'
                                : 'radial-gradient(circle_at_14%_18%,rgba(139,92,246,0.16),transparent_34%), linear-gradient(180deg,rgba(255,255,255,0.34),rgba(255,255,255,0.08))'
                            : 'radial-gradient(circle_at_84%_20%,rgba(255,255,255,0.72),transparent_24%), linear-gradient(180deg,rgba(255,255,255,0.38),rgba(255,255,255,0.08))',
                        }}
                      />
                      <div
                        aria-hidden='true'
                        className='pointer-events-none absolute inset-[10px] rounded-[16px] border border-white/40'
                        data-testid={`english-articles-drag-slot-frame-${sentence.id}`}
                      />
                      <div className='relative z-10'>
                      <div className='flex items-center justify-between gap-2'>
                        <KangurStatusChip accent={round.accent} size='sm'>
                          {translations('englishArticles.inRound.drag.sentenceLabel', {
                            current: index + 1,
                          })}
                        </KangurStatusChip>
                        {checked ? (
                          <KangurStatusChip accent={isCorrect ? 'emerald' : 'rose'} size='sm'>
                            {assigned?.article ?? '—'}
                          </KangurStatusChip>
                        ) : null}
                      </div>
                      <div className='mt-3 flex flex-wrap items-center gap-2 text-left text-sm font-semibold leading-relaxed text-slate-700'>
                        <span>{sentence.before}</span>
                        <div
                          className={cn(
                            'inline-flex min-h-[3.25rem] min-w-[5.75rem] items-center justify-center rounded-[16px] border-2 border-dashed bg-white/85 px-2 py-2',
                            checked
                              ? isCorrect
                                ? 'border-emerald-300'
                                : 'border-rose-300'
                              : 'border-slate-200'
                          )}
                        >
                          {assigned ? (
                            <DraggableArticleToken
                              token={assigned}
                              index={0}
                              isDragDisabled={checked}
                              isSelected={selectedTokenId === assigned.id}
                              isCoarsePointer={isCoarsePointer}
                              onClick={() =>
                                setSelectedTokenId((current) =>
                                  current === assigned.id ? null : assigned.id
                                )
                              }
                            />
                          ) : (
                            <span
                              aria-hidden='true'
                              className='text-base font-black tracking-[0.28em] text-slate-300'
                            >
                              ___
                            </span>
                          )}
                          {provided.placeholder}
                        </div>
                        <span>{sentence.after}</span>
                      </div>
                      {checked && !assigned ? (
                        <p className='mt-2 text-xs font-semibold text-rose-600'>
                          {translations('englishArticles.inRound.drag.missingArticle')}
                        </p>
                      ) : null}
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
                data-testid='english-articles-drag-selection-hint'
              >
                {selectedToken
                  ? translations('englishArticles.inRound.drag.touchSelected', {
                      article: selectedToken.article,
                    })
                  : translations('englishArticles.inRound.drag.touchIdle')}
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
                {translations('englishArticles.inRound.drag.clearRound')}
              </KangurButton>
              {checked ? (
                <KangurStatusChip accent={feedbackAccent}>
                  {translations('englishArticles.inRound.hitsLabel', {
                    hits: roundCorrect,
                    total: round.sentences.length,
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
                {translations('englishArticles.inRound.check')}
              </KangurButton>
            ) : (
              <KangurButton size='sm' type='button' variant='primary' onClick={handleNext}>
                {roundIndex + 1 >= TOTAL_ROUNDS
                  ? translations('englishArticles.inRound.seeResult')
                  : translations('englishArticles.inRound.next')}
              </KangurButton>
            )}
          </div>
        </KangurGlassPanel>
      </KangurDragDropContext>
    </KangurPracticeGameShell>
  );
}

function DraggableArticleToken({
  token,
  index,
  isDragDisabled,
  isSelected = false,
  isCoarsePointer = false,
  onClick,
}: {
  token: ArticleToken;
  index: number;
  isDragDisabled: boolean;
  isSelected?: boolean;
  isCoarsePointer?: boolean;
  onClick?: () => void;
}): React.JSX.Element | React.ReactPortal {
  const articleMeta = ARTICLE_META[token.article];
  const selectedClass = isSelected ? 'ring-2 ring-amber-400/80 ring-offset-1 ring-offset-white' : '';

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
              'rounded-[16px] border px-3 py-2 text-sm font-black uppercase tracking-[0.18em] shadow-sm transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70 focus-visible:ring-offset-2 ring-offset-white',
              isCoarsePointer
                ? 'min-h-[3.75rem] min-w-[4.5rem] px-4 py-3 touch-manipulation'
                : 'min-w-[4rem]',
              KANGUR_ACCENT_STYLES[articleMeta.accent].badge,
              snapshot.isDragging && 'scale-[1.02] shadow-lg',
              selectedClass
            )}
            aria-label={articleMeta.label}
            aria-disabled={isDragDisabled}
            aria-pressed={isSelected}
            title={articleMeta.label}
            onClick={(event) => {
              event.stopPropagation();
              if (snapshot.isDragging || isDragDisabled) return;
              onClick?.();
            }}
          >
            {articleMeta.label}
          </button>
        );

        return renderKangurDragPreview(content, snapshot.isDragging);
      }}
    </Draggable>
  );
}
