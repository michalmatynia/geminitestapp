'use client';

import { Draggable, Droppable } from '@hello-pangea/dnd';
import { useTranslations } from 'next-intl';
import { useMemo, useRef, useState } from 'react';
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
  KANGUR_ACCENT_STYLES,
  KANGUR_CENTER_ROW_CLASSNAME,
  KANGUR_GRID_SPACED_CLASSNAME,
  KANGUR_INLINE_CENTER_ROW_CLASSNAME,
  KANGUR_PANEL_GAP_CLASSNAME,
  KANGUR_WRAP_CENTER_ROW_CLASSNAME,
  KANGUR_WRAP_ROW_CLASSNAME,
  type KangurAccent,
} from '@/features/kangur/ui/design/tokens';
import {
  addXp,
  createLessonPracticeReward,
  getProgressOwnerKey,
  loadProgress,
} from '@/features/kangur/ui/services/progress';
import { persistKangurSessionScore } from '@/features/kangur/ui/services/session-score';
import { useKangurCoarsePointer } from '@/features/kangur/ui/hooks/useKangurCoarsePointer';
import type {
  KangurIntlTranslate,
  KangurMiniGameFeedbackState,
  KangurMiniGameFinishProps,
  KangurRewardBreakdownEntry,
} from '@/features/kangur/ui/types';
import { cn } from '@/features/kangur/shared/utils';

import {
  PartsOfSpeechCardPulseAnimation,
  PartsOfSpeechGraphAnimation,
  PartsOfSpeechPrepositionAnimation,
} from './EnglishPartsOfSpeechAnimations';

import type { DropResult } from '@hello-pangea/dnd';

type PartOfSpeech = 'noun' | 'verb' | 'adjective' | 'preposition' | 'adverb';

type SpeechToken = {
  id: string;
  label: string;
  part: PartOfSpeech;
  emoji: string;
};

type SpeechBin = {
  id: PartOfSpeech;
  label: string;
  description: string;
  accent: KangurAccent;
  emoji: string;
};

type Round = {
  id: string;
  title: string;
  prompt: string;
  hint: string;
  accent: KangurAccent;
  parts: PartOfSpeech[];
  tokens: SpeechToken[];
  visual: 'cards' | 'graph' | 'preposition';
};

type RoundState = {
  pool: SpeechToken[];
  bins: Partial<Record<PartOfSpeech, SpeechToken[]>>;
};

const getPartsOfSpeechRoundMessage = (
  translate: KangurIntlTranslate,
  roundId: string,
  field: 'title' | 'prompt' | 'hint',
  fallback: string
): string =>
  translateKangurMiniGameWithFallback(
    translate,
    `englishPartsOfSpeech.inRound.rounds.${roundId}.${field}`,
    fallback
  );

const getPartsOfSpeechPartMessage = (
  translate: KangurIntlTranslate,
  part: PartOfSpeech,
  field: 'label' | 'description',
  fallback: string
): string =>
  translateKangurMiniGameWithFallback(
    translate,
    `englishPartsOfSpeech.inRound.parts.${part}.${field}`,
    fallback
  );

const PART_META: Record<PartOfSpeech, Omit<SpeechBin, 'id'>> = {
  noun: {
    label: 'Noun',
    description: 'Person, thing, idea',
    accent: 'sky',
    emoji: '🔷',
  },
  verb: {
    label: 'Verb',
    description: 'Action or movement',
    accent: 'emerald',
    emoji: '⚡',
  },
  adjective: {
    label: 'Adjective',
    description: 'Describes a quality',
    accent: 'amber',
    emoji: '✨',
  },
  preposition: {
    label: 'Preposition',
    description: 'Place or relation',
    accent: 'violet',
    emoji: '📍',
  },
  adverb: {
    label: 'Adverb',
    description: 'How? when? how often?',
    accent: 'indigo',
    emoji: '💫',
  },
};

const ROUNDS: Round[] = [
  {
    id: 'math-core',
    title: 'Math starter pack',
    prompt: 'Sort the words into the correct part of speech.',
    hint: 'Noun = thing, Verb = action, Adjective = quality.',
    accent: 'sky',
    parts: ['noun', 'verb', 'adjective'],
    tokens: [
      { id: 'core-equation', label: 'equation', part: 'noun', emoji: '📘' },
      { id: 'core-triangle', label: 'triangle', part: 'noun', emoji: '🔺' },
      { id: 'core-solve', label: 'solve', part: 'verb', emoji: '⚡' },
      { id: 'core-calculate', label: 'calculate', part: 'verb', emoji: '🧮' },
      { id: 'core-linear', label: 'linear', part: 'adjective', emoji: '📈' },
      { id: 'core-precise', label: 'precise', part: 'adjective', emoji: '🎯' },
    ],
    visual: 'cards',
  },
  {
    id: 'positions',
    title: 'Geometry positions',
    prompt: 'Sort the words about place and action.',
    hint: 'Prepositions show relations: between, above.',
    accent: 'violet',
    parts: ['noun', 'verb', 'preposition'],
    tokens: [
      { id: 'pos-angle', label: 'angle', part: 'noun', emoji: '📐' },
      { id: 'pos-variable', label: 'variable', part: 'noun', emoji: '🔣' },
      { id: 'pos-measure', label: 'measure', part: 'verb', emoji: '📏' },
      { id: 'pos-compare', label: 'compare', part: 'verb', emoji: '⚖️' },
      { id: 'pos-between', label: 'between', part: 'preposition', emoji: '↔️' },
      { id: 'pos-above', label: 'above', part: 'preposition', emoji: '⬆️' },
    ],
    visual: 'preposition',
  },
  {
    id: 'speed',
    title: 'Adverbs in action',
    prompt: 'Add tempo and style to the action.',
    hint: 'Adverbs describe how: quickly, carefully.',
    accent: 'amber',
    parts: ['verb', 'adverb', 'adjective'],
    tokens: [
      { id: 'speed-rotate', label: 'rotate', part: 'verb', emoji: '🔄' },
      { id: 'speed-simplify', label: 'simplify', part: 'verb', emoji: '🧩' },
      { id: 'speed-quickly', label: 'quickly', part: 'adverb', emoji: '💨' },
      { id: 'speed-carefully', label: 'carefully', part: 'adverb', emoji: '🧠' },
      { id: 'speed-accurate', label: 'accurate', part: 'adjective', emoji: '✅' },
      { id: 'speed-steep', label: 'steep', part: 'adjective', emoji: '⛰️' },
    ],
    visual: 'graph',
  },
];

const TOTAL_ROUNDS = ROUNDS.length;
const TOTAL_TOKENS = ROUNDS.reduce((sum, round) => sum + round.tokens.length, 0);

const shuffle = <T,>(items: T[]): T[] => [...items].sort(() => Math.random() - 0.5);

const buildRoundState = (round: Round): RoundState => ({
  pool: shuffle(round.tokens),
  bins: round.parts.reduce<Partial<Record<PartOfSpeech, SpeechToken[]>>>((acc, part) => {
    acc[part] = [];
    return acc;
  }, {}),
});

const binIdForDroppable = (binId: PartOfSpeech): string => `bin-${binId}`;
const isBinDroppable = (value: string): boolean => value.startsWith('bin-');
const getBinIdFromDroppable = (value: string): PartOfSpeech =>
  value.replace('bin-', '') as PartOfSpeech;

const moveWithinList = <T,>(items: T[], from: number, to: number): T[] => {
  const updated = [...items];
  const [moved] = updated.splice(from, 1);
  if (moved === undefined) return updated;
  updated.splice(to, 0, moved);
  return updated;
};

const moveBetweenLists = <T,>(
  source: T[],
  destination: T[],
  sourceIndex: number,
  destinationIndex: number
): { source: T[]; destination: T[] } => {
  const nextSource = [...source];
  const nextDestination = [...destination];
  const [moved] = nextSource.splice(sourceIndex, 1);
  if (!moved) {
    return { source, destination };
  }
  nextDestination.splice(destinationIndex, 0, moved);
  return { source: nextSource, destination: nextDestination };
};

const removeTokenById = <T extends { id: string }>(
  items: T[],
  tokenId: string
): { updated: T[]; token?: T } => {
  const index = items.findIndex((item) => item.id === tokenId);
  if (index === -1) {
    return { updated: items };
  }
  const updated = [...items];
  const [token] = updated.splice(index, 1);
  return { updated, token };
};

const buildTokenClassName = ({
  isDragging,
  showStatus,
  isCorrect,
  isSelected,
  isCoarsePointer,
}: {
  isDragging: boolean;
  showStatus: boolean;
  isCorrect: boolean;
  isSelected: boolean;
  isCoarsePointer: boolean;
}): string =>
  cn(
    KANGUR_INLINE_CENTER_ROW_CLASSNAME,
    'rounded-[18px] border font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-300/70 focus-visible:ring-offset-2 ring-offset-white cursor-grab select-none touch-manipulation active:scale-[0.985]',
    isCoarsePointer ? 'min-h-[52px] px-4 py-3 text-[15px]' : 'px-3 py-2 text-base',
    KANGUR_ACCENT_STYLES.slate.badge,
    KANGUR_ACCENT_STYLES.slate.hoverCard,
    isDragging && 'scale-[1.02] shadow-[0_18px_40px_-26px_rgba(15,23,42,0.2)] cursor-grabbing',
    isSelected && 'ring-2 ring-amber-400/80 ring-offset-1 ring-offset-white',
    showStatus &&
      (isCorrect
        ? 'ring-2 ring-emerald-400/80 ring-offset-1 ring-offset-transparent'
        : 'ring-2 ring-rose-400/80 ring-offset-1 ring-offset-transparent')
  );

const resolveBinStatus = ({
  checked,
  isDraggingOver,
  isCorrect,
  accent,
  isCoarsePointer,
}: {
  checked: boolean;
  isDraggingOver: boolean;
  isCorrect: boolean;
  accent: KangurAccent;
  isCoarsePointer: boolean;
}): { className: string; statusAccent: KangurAccent } => {
  if (checked) {
    return {
      statusAccent: isCorrect ? 'emerald' : 'rose',
      className: cn(
        'rounded-[22px] border px-3 py-3 transition touch-manipulation',
        isCoarsePointer ? 'min-h-[132px]' : 'min-h-[110px]',
        isCorrect
          ? KANGUR_ACCENT_STYLES.emerald.activeCard
          : KANGUR_ACCENT_STYLES.rose.activeCard
      ),
    };
  }

  if (isDraggingOver) {
    return {
      statusAccent: accent,
      className: cn(
        'rounded-[22px] border-2 border-dashed px-3 py-3 transition touch-manipulation scale-[1.01]',
        isCoarsePointer ? 'min-h-[132px]' : 'min-h-[110px]',
        KANGUR_ACCENT_STYLES[accent].activeCard
      ),
    };
  }

  return {
    statusAccent: accent,
    className: cn(
      'rounded-[22px] border-2 border-dashed px-3 py-3 transition touch-manipulation',
      isCoarsePointer ? 'min-h-[132px]' : 'min-h-[110px]',
      KANGUR_ACCENT_STYLES[accent].badge,
      KANGUR_ACCENT_STYLES[accent].hoverCard
    ),
  };
};

function DraggableToken({
  token,
  index,
  isDragDisabled,
  showStatus,
  isCorrect,
  isSelected,
  isCoarsePointer,
  onClick,
}: {
  token: SpeechToken;
  index: number;
  isDragDisabled: boolean;
  showStatus: boolean;
  isCorrect: boolean;
  isSelected: boolean;
  isCoarsePointer: boolean;
  onClick: () => void;
}): React.ReactElement | React.ReactPortal {
  return (
    <Draggable
      draggableId={token.id}
      index={index}
      isDragDisabled={isDragDisabled}
      disableInteractiveElementBlocking
    >
      {(draggableProvided, snapshot) => {
        const content = (
          <button
            ref={draggableProvided.innerRef}
            {...draggableProvided.draggableProps}
            {...draggableProvided.dragHandleProps}
            style={getKangurMobileDragHandleStyle(
              draggableProvided.draggableProps.style,
              isCoarsePointer
            )}
            className={buildTokenClassName({
              isDragging: snapshot.isDragging,
              showStatus,
              isCorrect,
              isSelected,
              isCoarsePointer,
            })}
            aria-label={token.label}
            aria-pressed={isSelected}
            aria-disabled={isDragDisabled}
            type='button'
            onClick={(event) => {
              event.stopPropagation();
              if (snapshot.isDragging || isDragDisabled) return;
              onClick();
            }}
          >
            <span aria-hidden='true'>{token.emoji}</span>
            <span>{token.label}</span>
          </button>
        );

        return renderKangurDragPreview(content, snapshot.isDragging);
      }}
    </Draggable>
  );
}

export default function EnglishPartsOfSpeechGame({
  finishLabel,
  onFinish,
}: KangurMiniGameFinishProps): React.JSX.Element {
  const translations = useTranslations('KangurMiniGames');
  const isCoarsePointer = useKangurCoarsePointer();
  const resolvedFinishLabel = finishLabel ?? getKangurMiniGameFinishLabel(translations, 'topics');
  const [roundIndex, setRoundIndex] = useState(0);
  const [roundState, setRoundState] = useState<RoundState>(() =>
    buildRoundState(ROUNDS[0]!)
  );
  const [selectedTokenId, setSelectedTokenId] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [roundCorrect, setRoundCorrect] = useState(0);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [feedback, setFeedback] = useState<KangurMiniGameFeedbackState>(null);
  const [xpEarned, setXpEarned] = useState(0);
  const [xpBreakdown, setXpBreakdown] = useState<KangurRewardBreakdownEntry[]>([]);
  const scoreRef = useRef(0);
  const sessionStartedAtRef = useRef(Date.now());

  const round = ROUNDS[roundIndex] ?? ROUNDS[0]!;
  const bins = useMemo(
    () =>
      round.parts.map((part) => ({
        id: part,
        ...PART_META[part],
        label: getPartsOfSpeechPartMessage(translations, part, 'label', PART_META[part].label),
        description: getPartsOfSpeechPartMessage(
          translations,
          part,
          'description',
          PART_META[part].description
        ),
      })),
    [round.parts, translations]
  );
  const expectedByPart = useMemo(() => {
    return round.parts.reduce<Record<PartOfSpeech, Set<string>>>((acc, part) => {
      acc[part] = new Set(round.tokens.filter((token) => token.part === part).map((token) => token.id));
      return acc;
    }, {} as Record<PartOfSpeech, Set<string>>);
  }, [round.parts, round.tokens]);

  const isRoundComplete = roundState.pool.length === 0;
  const selectedToken = selectedTokenId
    ? roundState.pool.find((token) => token.id === selectedTokenId) ??
      Object.values(roundState.bins)
        .flatMap((items) => items ?? [])
        .find((token) => token.id === selectedTokenId) ??
      null
    : null;

  const handleAssignToken = (part: PartOfSpeech): void => {
    if (checked || !selectedTokenId) return;
    setRoundState((prev) => {
      let token: SpeechToken | undefined;
      const { updated: nextPool, token: poolToken } = removeTokenById(prev.pool, selectedTokenId);
      token = poolToken;
      const nextBins = { ...prev.bins };
      if (!token) {
        for (const [id, items] of Object.entries(prev.bins)) {
          const { updated, token: binToken } = removeTokenById(items ?? [], selectedTokenId);
          if (binToken) {
            token = binToken;
            nextBins[id as PartOfSpeech] = updated;
            break;
          }
        }
      }
      if (!token) return prev;
      return {
        pool: nextPool,
        bins: {
          ...nextBins,
          [part]: [...(nextBins[part] ?? []), token],
        },
      };
    });
    setSelectedTokenId(null);
  };

  const handleReturnToPool = (): void => {
    if (checked || !selectedTokenId) return;
    setRoundState((prev) => {
      let token: SpeechToken | undefined;
      const { updated: nextPool, token: poolToken } = removeTokenById(prev.pool, selectedTokenId);
      token = poolToken;
      const nextBins = { ...prev.bins };
      if (!token) {
        for (const [id, items] of Object.entries(prev.bins)) {
          const { updated, token: binToken } = removeTokenById(items ?? [], selectedTokenId);
          if (binToken) {
            token = binToken;
            nextBins[id as PartOfSpeech] = updated;
            break;
          }
        }
      }
      if (!token) return prev;
      return {
        pool: [...nextPool, token],
        bins: nextBins,
      };
    });
    setSelectedTokenId(null);
  };

  const resolveRoundVisual = (): React.JSX.Element => {
    switch (round.visual) {
      case 'preposition':
        return <PartsOfSpeechPrepositionAnimation />;
      case 'graph':
        return <PartsOfSpeechGraphAnimation />;
      case 'cards':
      default:
        return <PartsOfSpeechCardPulseAnimation />;
    }
  };

  const handleCheck = (): void => {
    if (checked) return;
    const correctCount = round.parts.reduce((acc, part) => {
      const assigned = roundState.bins[part] ?? [];
      const correct = assigned.filter((token) => token.part === part).length;
      return acc + correct;
    }, 0);
    const nextScore = score + correctCount;
    scoreRef.current = nextScore;
    setScore(nextScore);
    setRoundCorrect(correctCount);
    setChecked(true);
    setFeedback({
      kind: correctCount === round.tokens.length ? 'success' : 'error',
      text:
        correctCount === round.tokens.length
          ? translations('englishPartsOfSpeech.feedback.roundPerfect')
          : translateKangurMiniGameWithFallback(
              translations,
              'englishPartsOfSpeech.feedback.roundProgress',
              `You got ${correctCount}/${round.tokens.length} correct. Check the colours and keep going.`,
              { correct: correctCount, total: round.tokens.length }
            ),
    });
    setSelectedTokenId(null);
  };

  const handleNext = (): void => {
    if (roundIndex + 1 >= TOTAL_ROUNDS) {
      const ownerKey = getProgressOwnerKey();
      const progress = loadProgress({ ownerKey });
      const reward = createLessonPracticeReward(progress, {
        activityKey: 'english_parts_of_speech_sort',
        lessonKey: 'english_parts_of_speech',
        correctAnswers: scoreRef.current,
        totalQuestions: TOTAL_TOKENS,
        strongThresholdPercent: 75,
      });
      addXp(reward.xp, reward.progressUpdates, { ownerKey });
      void persistKangurSessionScore({
        operation: 'english_parts_of_speech',
        score: scoreRef.current,
        totalQuestions: TOTAL_TOKENS,
        correctAnswers: scoreRef.current,
        timeTakenSeconds: Math.round((Date.now() - sessionStartedAtRef.current) / 1000),
        xpEarned: reward.xp,
      });
      setXpEarned(reward.xp);
      setXpBreakdown(reward.breakdown ?? []);
      setDone(true);
      return;
    }

    const nextIndex = roundIndex + 1;
    const nextRound = ROUNDS[nextIndex] ?? ROUNDS[0]!;
    setRoundIndex(nextIndex);
    setRoundState(buildRoundState(nextRound));
    setChecked(false);
    setRoundCorrect(0);
    setFeedback(null);
    setSelectedTokenId(null);
  };

  const handleReset = (): void => {
    if (checked) return;
    setRoundState(buildRoundState(round));
    setSelectedTokenId(null);
  };

  const handleDragEnd = (result: DropResult): void => {
    if (checked) return;
    const { source, destination } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;
    if (source.droppableId !== 'pool' && !isBinDroppable(source.droppableId)) return;
    if (destination.droppableId !== 'pool' && !isBinDroppable(destination.droppableId)) return;

    setRoundState((prev) => {
      const sourceId = source.droppableId;
      const destinationId = destination.droppableId;
      const sourceList =
        sourceId === 'pool' ? prev.pool : prev.bins[getBinIdFromDroppable(sourceId)] ?? [];
      const destinationList =
        destinationId === 'pool'
          ? prev.pool
          : prev.bins[getBinIdFromDroppable(destinationId)] ?? [];

      if (sourceId === destinationId) {
        const reordered = moveWithinList(sourceList, source.index, destination.index);
        if (sourceId === 'pool') {
          return { ...prev, pool: reordered };
        }
        return {
          ...prev,
          bins: {
            ...prev.bins,
            [getBinIdFromDroppable(sourceId)]: reordered,
          },
        };
      }

      const { source: nextSource, destination: nextDestination } = moveBetweenLists(
        sourceList,
        destinationList,
        source.index,
        destination.index
      );

      if (sourceId === 'pool') {
        return {
          pool: nextSource,
          bins: {
            ...prev.bins,
            [getBinIdFromDroppable(destinationId)]: nextDestination,
          },
        };
      }

      if (destinationId === 'pool') {
        return {
          pool: nextDestination,
          bins: {
            ...prev.bins,
            [getBinIdFromDroppable(sourceId)]: nextSource,
          },
        };
      }

      return {
        pool: prev.pool,
        bins: {
          ...prev.bins,
          [getBinIdFromDroppable(sourceId)]: nextSource,
          [getBinIdFromDroppable(destinationId)]: nextDestination,
        },
      };
    });
    setSelectedTokenId(null);
  };

  if (done) {
    const percent = TOTAL_TOKENS ? Math.round((scoreRef.current / TOTAL_TOKENS) * 100) : 0;
    return (
      <KangurPracticeGameSummary dataTestId='english-parts-of-speech-summary-shell'>
        <KangurPracticeGameSummaryEmoji
          dataTestId='english-parts-of-speech-summary-emoji'
          emoji={percent === 100 ? '🏆' : percent >= 70 ? '🌟' : '💪'}
        />
        <KangurPracticeGameSummaryTitle
          accent='sky'
          title={
            <KangurHeadline data-testid='english-parts-of-speech-summary-title'>
              {getKangurMiniGameScoreLabel(translations, scoreRef.current, TOTAL_TOKENS)}
            </KangurHeadline>
          }
        />
        <KangurPracticeGameSummaryXP accent='sky' xpEarned={xpEarned} />
        <KangurPracticeGameSummaryBreakdown
          breakdown={xpBreakdown}
          dataTestId='english-parts-of-speech-summary-breakdown'
          itemDataTestIdPrefix='english-parts-of-speech-summary-breakdown'
        />
        <KangurPracticeGameSummaryProgress accent='sky' percent={percent} />
        <KangurPracticeGameSummaryMessage>
          {percent === 100
            ? translations('englishPartsOfSpeech.summary.perfect')
            : percent >= 70
              ? translations('englishPartsOfSpeech.summary.good')
              : translations('englishPartsOfSpeech.summary.retry')}
        </KangurPracticeGameSummaryMessage>
        <KangurPracticeGameSummaryActions
          finishLabel={resolvedFinishLabel}
          onFinish={onFinish}
          restartLabel={translations('shared.restart')}
          onRestart={() => {
            setRoundIndex(0);
            setRoundState(buildRoundState(ROUNDS[0]!));
            setChecked(false);
            setRoundCorrect(0);
            setScore(0);
            scoreRef.current = 0;
            setDone(false);
            setFeedback(null);
            setXpEarned(0);
            setXpBreakdown([]);
            sessionStartedAtRef.current = Date.now();
          }}
        />
      </KangurPracticeGameSummary>
    );
  }

  const feedbackAccent: KangurAccent = feedback?.kind === 'success' ? 'emerald' : 'rose';

  return (
    <KangurPracticeGameStage className='mx-auto max-w-3xl'>
      <KangurPracticeGameProgress
        accent={round.accent}
        currentRound={roundIndex}
        dataTestId='english-parts-of-speech-progress-bar'
        totalRounds={TOTAL_ROUNDS}
      />
      <KangurDragDropContext onDragEnd={handleDragEnd}>
        <KangurGlassPanel
          className={cn('w-full', KANGUR_PANEL_GAP_CLASSNAME)}
          padding='lg'
          surface='playField'
        >
          <div className='relative overflow-hidden rounded-[28px] border border-white/70 bg-[linear-gradient(140deg,#f0f9ff_0%,#eef2ff_48%,#fefce8_100%)] p-4'>
            <div className='pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(14,165,233,0.18),transparent_45%),radial-gradient(circle_at_80%_10%,rgba(99,102,241,0.16),transparent_38%),radial-gradient(circle_at_50%_100%,rgba(245,158,11,0.12),transparent_45%)]' />
            <div className={cn('relative z-10 flex flex-col', KANGUR_PANEL_GAP_CLASSNAME)}>
              <div className='flex items-center justify-between gap-2'>
                <KangurStatusChip accent={round.accent} className='text-[10px] uppercase tracking-[0.16em]'>
                  {translateKangurMiniGameWithFallback(
                    translations,
                    'englishPartsOfSpeech.inRound.roundLabel',
                    `Round ${roundIndex + 1}/${TOTAL_ROUNDS}`,
                    { current: roundIndex + 1, total: TOTAL_ROUNDS }
                  )}
                </KangurStatusChip>
                <KangurStatusChip accent='slate' className='text-[10px] uppercase tracking-[0.16em]'>
                  {translateKangurMiniGameWithFallback(
                    translations,
                    isCoarsePointer
                      ? 'englishPartsOfSpeech.inRound.modeLabelTouch'
                      : 'englishPartsOfSpeech.inRound.modeLabel',
                    isCoarsePointer ? 'Tap or drag' : 'Drag and drop'
                  )}
                </KangurStatusChip>
              </div>
              <div className={`${KANGUR_GRID_SPACED_CLASSNAME} sm:grid-cols-[1.1fr_0.9fr] sm:items-center`}>
                <div>
                  <p className='text-lg font-bold text-slate-800'>
                    {getPartsOfSpeechRoundMessage(translations, round.id, 'title', round.title)}
                  </p>
                  <p className='text-sm text-slate-600'>
                    {getPartsOfSpeechRoundMessage(translations, round.id, 'prompt', round.prompt)}
                  </p>
                  <p className='mt-1 text-xs font-semibold text-slate-500'>
                    {getPartsOfSpeechRoundMessage(translations, round.id, 'hint', round.hint)}
                  </p>
                </div>
                <div className='rounded-[18px] border border-white/70 bg-white/80 p-2'>
                  {resolveRoundVisual()}
                </div>
              </div>
            </div>
          </div>

          <KangurInfoCard accent='slate' className='w-full' padding='md' tone='neutral'>
            <p className='text-xs font-semibold uppercase tracking-[0.16em] text-slate-500 text-center'>
              {translations('englishPartsOfSpeech.inRound.poolLabel')}
            </p>
            <Droppable droppableId='pool' direction='horizontal'>
              {(provided, snapshot) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className={cn(
                    'mt-3 flex flex-wrap items-center justify-center gap-2 rounded-[20px] border-2 border-dashed px-3 py-3 transition touch-manipulation',
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
                  aria-label={translations('englishPartsOfSpeech.inRound.poolAria')}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter' || event.key === ' ') {
                      event.preventDefault();
                      handleReturnToPool();
                    }
                  }}
                >
                  {roundState.pool.map((token, index) => (
                    <DraggableToken
                      key={token.id}
                      token={token}
                      index={index}
                      isDragDisabled={checked}
                      showStatus={false}
                      isCorrect={false}
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
                      {translations('englishPartsOfSpeech.inRound.poolEmpty')}
                    </p>
                  ) : null}
                </div>
              )}
            </Droppable>
          </KangurInfoCard>

          <div className='grid w-full grid-cols-1 gap-3 sm:grid-cols-3'>
            {bins.map((bin) => {
              const items = roundState.bins[bin.id] ?? [];
              const expectedIds = expectedByPart[bin.id] ?? new Set<string>();
              const isCorrect =
                items.length === expectedIds.size &&
                items.every((item) => expectedIds.has(item.id));
              return (
                <Droppable key={bin.id} droppableId={binIdForDroppable(bin.id)}>
                  {(provided, snapshot) => {
                    const surface = resolveBinStatus({
                      checked,
                      isDraggingOver: snapshot.isDraggingOver,
                      isCorrect,
                      accent: bin.accent,
                      isCoarsePointer,
                    });
                    return (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className={cn(
                          surface.className,
                          selectedToken && !checked && isCoarsePointer && 'border-amber-200 bg-amber-50/35'
                        )}
                        onClick={() => handleAssignToken(bin.id)}
                        role='button'
                        tabIndex={checked ? -1 : 0}
                        aria-disabled={checked}
                        aria-label={translations('englishPartsOfSpeech.inRound.binAria', {
                          label: bin.label,
                        })}
                        onKeyDown={(event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault();
                            handleAssignToken(bin.id);
                          }
                        }}
                      >
                        <div className='flex items-center justify-between gap-2'>
                          <div className={`${KANGUR_CENTER_ROW_CLASSNAME} text-sm font-bold text-slate-700`}>
                            <span className='text-lg' aria-hidden='true'>
                              {bin.emoji}
                            </span>
                            {bin.label}
                          </div>
                          {checked ? (
                            <KangurStatusChip accent={surface.statusAccent} size='sm'>
                              {items.length}/{expectedIds.size}
                            </KangurStatusChip>
                          ) : null}
                        </div>
                        <p className='mt-1 text-xs text-slate-500'>{bin.description}</p>
                        <div className={`mt-3 ${KANGUR_WRAP_ROW_CLASSNAME}`}>
                          {items.map((item, index) => (
                            <DraggableToken
                              key={item.id}
                              token={item}
                              index={index}
                              isDragDisabled={checked}
                              showStatus={checked}
                              isCorrect={item.part === bin.id}
                              isSelected={selectedTokenId === item.id}
                              isCoarsePointer={isCoarsePointer}
                              onClick={() =>
                                setSelectedTokenId((current) =>
                                  current === item.id ? null : item.id
                                )
                              }
                            />
                          ))}
                          {provided.placeholder}
                          {checked && items.length === 0 ? (
                            <p className='text-xs font-semibold text-rose-600'>
                              {translations('englishPartsOfSpeech.inRound.missingWords')}
                            </p>
                          ) : null}
                        </div>
                      </div>
                    );
                  }}
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
                data-testid='english-parts-of-speech-selection-hint'
              >
                {selectedToken
                  ? translateKangurMiniGameWithFallback(
                      translations,
                      'englishPartsOfSpeech.inRound.touchSelected',
                      `Selected word: ${selectedToken.label}. Tap a category or the pool.`,
                      { label: selectedToken.label }
                    )
                  : translateKangurMiniGameWithFallback(
                      translations,
                      'englishPartsOfSpeech.inRound.touchIdle',
                      'Tap a word, then tap a category or the pool.'
                    )}
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
                {translations('englishPartsOfSpeech.inRound.clearRound')}
              </KangurButton>
              {checked ? (
                <KangurStatusChip accent={feedbackAccent}>
                  {translations('englishPartsOfSpeech.inRound.hitsLabel', {
                    hits: roundCorrect,
                    total: round.tokens.length,
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
                {translations('englishPartsOfSpeech.inRound.check')}
              </KangurButton>
            ) : (
              <KangurButton size='sm' type='button' variant='primary' onClick={handleNext}>
                {roundIndex + 1 >= TOTAL_ROUNDS
                  ? translations('englishPartsOfSpeech.inRound.seeResult')
                  : translations('englishPartsOfSpeech.inRound.next')}
              </KangurButton>
            )}
          </div>
        </KangurGlassPanel>
      </KangurDragDropContext>
    </KangurPracticeGameStage>
  );
}
