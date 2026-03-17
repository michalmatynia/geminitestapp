'use client';

import { DragDropContext, Draggable, Droppable } from '@hello-pangea/dnd';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

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
  KangurButton,
  KangurGlassPanel,
  KangurHeadline,
  KangurInfoCard,
  KangurStatusChip,
  KangurTextField,
} from '@/features/kangur/ui/design/primitives';
import {
  KANGUR_ACCENT_STYLES,
  KANGUR_PANEL_GAP_CLASSNAME,
  KANGUR_WRAP_ROW_CLASSNAME,
  type KangurAccent,
} from '@/features/kangur/ui/design/tokens';
import {
  addXp,
  createLessonPracticeReward,
  loadProgress,
} from '@/features/kangur/ui/services/progress';
import { scheduleKangurRoundFeedback } from '@/features/kangur/ui/services/round-transition';
import { persistKangurSessionScore } from '@/features/kangur/ui/services/session-score';
import type { KangurRewardBreakdownEntry } from '@/features/kangur/ui/types';
import { cn } from '@/features/kangur/shared/utils';
import { safeSetInterval, safeClearInterval, type SafeTimerId } from '@/shared/lib/timers';

import type { DropResult } from '@hello-pangea/dnd';

type BaseRound = {
  id: string;
  accent: KangurAccent;
  prompt: string;
  question: string;
  hint: string;
};

type ChoiceRound = BaseRound & {
  kind: 'choice';
  options: string[];
  answer: string;
};

type TimedRound = BaseRound & {
  kind: 'timed';
  options: string[];
  answer: string;
  timeLimitSec: number;
};

type OrderRound = BaseRound & {
  kind: 'order';
  tokens: string[];
  answer: string[];
};

type FillRound = BaseRound & {
  kind: 'fill';
  answers: string[];
  placeholder?: string;
};

type Round = ChoiceRound | TimedRound | OrderRound | FillRound;

const ROUNDS: Round[] = [
  {
    id: 'svo-order',
    kind: 'choice',
    accent: 'violet',
    prompt: 'Wybierz zdanie w poprawnym szyku S + V + O.',
    question: 'Które zdanie jest poprawne?',
    answer: 'The drummer plays the rhythm.',
    options: [
      'Plays the drummer the rhythm.',
      'The drummer plays the rhythm.',
      'The rhythm plays the drummer.',
      'Plays the rhythm the drummer.',
    ],
    hint: 'Najpierw podmiot (The drummer), potem czasownik, na końcu dopełnienie.',
  },
  {
    id: 'order-words',
    kind: 'order',
    accent: 'sky',
    prompt: 'Przeciągnij słowa, żeby ułożyć poprawne zdanie.',
    question: 'Ułóż: My friend always finishes homework on time.',
    tokens: ['My', 'friend', 'always', 'finishes', 'homework', 'on', 'time'],
    answer: ['My', 'friend', 'always', 'finishes', 'homework', 'on', 'time'],
    hint: 'Zacznij od podmiotu, potem czasownik, potem reszta.',
  },
  {
    id: 'do-question',
    kind: 'fill',
    accent: 'indigo',
    prompt: 'Uzupełnij pytanie właściwym słowem.',
    question: '___ you play football on Saturdays?',
    answers: ['do'],
    placeholder: 'do / does',
    hint: 'Dla you używamy do.',
  },
  {
    id: 'connector-so',
    kind: 'timed',
    accent: 'amber',
    prompt: 'Szybka runda — masz kilka sekund!',
    question: 'I was late, ___ I texted my coach.',
    answer: 'so',
    options: ['so', 'because', 'but', 'when'],
    timeLimitSec: 8,
    hint: 'Skutek → so.',
  },
  {
    id: 'frequency-adverb',
    kind: 'choice',
    accent: 'teal',
    prompt: 'Wybierz poprawne miejsce dla przysłówka.',
    question: 'She ___ checks her notes after class.',
    answer: 'often',
    options: ['often', 'after', 'quickly', 'yesterday'],
    hint: 'Przysłówki częstotliwości stoją przed czasownikiem głównym.',
  },
  {
    id: 'does-negative',
    kind: 'fill',
    accent: 'rose',
    prompt: 'Uzupełnij przeczenie.',
    question: 'She ___ like exams.',
    answers: ['doesn\'t', 'does not'],
    placeholder: 'doesn\'t',
    hint: 'She → does not → doesn\'t.',
  },
];

const TOTAL_ROUNDS = ROUNDS.length;
const dragPortal = typeof document === 'undefined' ? null : document.body;

const shuffle = <T,>(items: T[]): T[] => [...items].sort(() => Math.random() - 0.5);

const reorderWithinList = <T,>(list: T[], startIndex: number, endIndex: number): T[] => {
  const updated = [...list];
  const [removed] = updated.splice(startIndex, 1);
  if (removed === undefined) {
    return updated;
  }
  updated.splice(endIndex, 0, removed);
  return updated;
};

const normalizeText = (value: string): string =>
  value
    .trim()
    .toLowerCase()
    .replace(/[.!?]/g, '')
    .replace(/\s+/g, ' ');

type FeedbackState = {
  kind: 'success' | 'error';
  text: string;
};

type EnglishSentenceStructureGameProps = {
  finishLabel?: string;
  onFinish: () => void;
};

type RoundState = {
  selection: string | null;
  orderTokens: string[];
  fillValue: string;
};

const evaluateRound = (
  round: Round,
  { selection, orderTokens, fillValue }: RoundState
): { isCorrect: boolean; correctAnswerLabel: string } => {
  switch (round.kind) {
    case 'choice':
    case 'timed': {
      const isCorrect =
        Boolean(selection) &&
        normalizeText(selection ?? '') === normalizeText(round.answer);
      return { isCorrect, correctAnswerLabel: round.answer };
    }
    case 'order': {
      const normalizedAnswer = round.answer.map(normalizeText);
      const normalizedOrder = orderTokens.map(normalizeText);
      const isCorrect =
        normalizedAnswer.length === normalizedOrder.length &&
        normalizedAnswer.every((value, index) => value === normalizedOrder[index]);
      return { isCorrect, correctAnswerLabel: round.answer.join(' ') };
    }
    case 'fill': {
      const normalizedGuess = normalizeText(fillValue);
      const normalizedAnswers = round.answers.map(normalizeText);
      const isCorrect = normalizedAnswers.includes(normalizedGuess);
      return { isCorrect, correctAnswerLabel: round.answers[0] ?? '' };
    }
    default:
      return { isCorrect: false, correctAnswerLabel: '' };
  }
};

export default function EnglishSentenceStructureGame({
  finishLabel = 'Wróć do Grajmy',
  onFinish,
}: EnglishSentenceStructureGameProps): React.JSX.Element {
  const [roundIndex, setRoundIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [isChecking, setIsChecking] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);
  const [xpBreakdown, setXpBreakdown] = useState<KangurRewardBreakdownEntry[]>([]);
  const [selection, setSelection] = useState<string | null>(null);
  const [orderTokens, setOrderTokens] = useState<string[]>([]);
  const [fillValue, setFillValue] = useState('');
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const sessionStartedAtRef = useRef(Date.now());
  const handleCheckRef = useRef<(options?: { auto?: boolean }) => void>(() => undefined);
  const autoSubmitRef = useRef(false);
  const timerRef = useRef<SafeTimerId | null>(null);

  const round = ROUNDS[roundIndex] ?? ROUNDS[0]!;

  useEffect(() => {
    setFeedback(null);
    setIsChecking(false);
    setSelection(null);
    setFillValue('');
    setOrderTokens(round.kind === 'order' ? shuffle(round.tokens) : []);
    setTimeLeft(round.kind === 'timed' ? round.timeLimitSec : null);
    autoSubmitRef.current = false;
    if (timerRef.current) {
      safeClearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, [roundIndex, round]);

  const isReady = useMemo(() => {
    switch (round.kind) {
      case 'choice':
      case 'timed':
        return Boolean(selection);
      case 'order':
        return orderTokens.length > 0;
      case 'fill':
        return fillValue.trim().length > 0;
      default:
        return false;
    }
  }, [fillValue, orderTokens.length, round.kind, selection]);

  const handleOrderDragEnd = (result: DropResult): void => {
    if (!result.destination || round.kind !== 'order') {
      return;
    }
    const destination = result.destination;
    setOrderTokens((prev) =>
      reorderWithinList(prev, result.source.index, destination.index)
    );
  };

  const handleCheck = (options?: { auto?: boolean }): void => {
    if (isChecking) return;
    const isAuto = options?.auto ?? false;
    if (!isAuto && !isReady) return;

    setIsChecking(true);
    autoSubmitRef.current = true;
    if (timerRef.current) {
      safeClearInterval(timerRef.current);
      timerRef.current = null;
    }

    const { isCorrect, correctAnswerLabel } = evaluateRound(round, {
      selection,
      orderTokens,
      fillValue,
    });
    const nextScore = isCorrect ? score + 1 : score;
    const feedbackText = isCorrect
      ? 'Świetnie! Tak właśnie budujemy to zdanie.'
      : `Prawidłowa odpowiedź: ${correctAnswerLabel}.`;

    setScore(nextScore);
    setFeedback({ kind: isCorrect ? 'success' : 'error', text: feedbackText });

    scheduleKangurRoundFeedback(() => {
      if (roundIndex + 1 >= TOTAL_ROUNDS) {
        const progress = loadProgress();
        const reward = createLessonPracticeReward(progress, {
          activityKey: 'english_sentence_structure_quiz',
          lessonKey: 'english_sentence_structure',
          correctAnswers: nextScore,
          totalQuestions: TOTAL_ROUNDS,
          strongThresholdPercent: 75,
        });
        addXp(reward.xp, reward.progressUpdates);
        void persistKangurSessionScore({
          operation: 'english_sentence_structure',
          score: nextScore,
          totalQuestions: TOTAL_ROUNDS,
          correctAnswers: nextScore,
          timeTakenSeconds: Math.round((Date.now() - sessionStartedAtRef.current) / 1000),
          xpEarned: reward.xp,
        });
        setXpEarned(reward.xp);
        setXpBreakdown(reward.breakdown ?? []);
        setDone(true);
      } else {
        setRoundIndex((current) => current + 1);
      }
      setIsChecking(false);
    });
  };

  useEffect(() => {
    handleCheckRef.current = handleCheck;
  }, [handleCheck]);

  useEffect(() => {
    if (round.kind !== 'timed') {
      return;
    }

    timerRef.current = safeSetInterval(() => {
      setTimeLeft((prev) => {
        if (prev === null) return prev;
        const next = prev - 1;
        if (next <= 0) {
          if (!autoSubmitRef.current) {
            autoSubmitRef.current = true;
            handleCheckRef.current({ auto: true });
          }
          return 0;
        }
        return next;
      });
    }, 1000);

    return () => {
      if (timerRef.current) {
        safeClearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [round.kind, roundIndex]);

  const handleRestart = (): void => {
    setRoundIndex(0);
    setScore(0);
    setDone(false);
    setFeedback(null);
    setIsChecking(false);
    setSelection(null);
    setOrderTokens([]);
    setFillValue('');
    setTimeLeft(null);
    setXpEarned(0);
    setXpBreakdown([]);
    sessionStartedAtRef.current = Date.now();
  };

  if (done) {
    const percent = Math.round((score / TOTAL_ROUNDS) * 100);
    return (
      <KangurPracticeGameSummary dataTestId='english-structure-summary-shell'>
        <KangurPracticeGameSummaryEmoji
          dataTestId='english-structure-summary-emoji'
          emoji={percent === 100 ? '🏆' : percent >= 60 ? '✨' : '💪'}
        />
        <KangurPracticeGameSummaryTitle
          accent='violet'
          title={
            <KangurHeadline data-testid='english-structure-summary-title'>
              Wynik: {score}/{TOTAL_ROUNDS}
            </KangurHeadline>
          }
        />
        <KangurPracticeGameSummaryXP accent='violet' xpEarned={xpEarned} />
        <KangurPracticeGameSummaryBreakdown
          breakdown={xpBreakdown}
          dataTestId='english-structure-summary-breakdown'
          itemDataTestIdPrefix='english-structure-summary-breakdown'
        />
        <KangurPracticeGameSummaryProgress accent='violet' percent={percent} />
        <KangurPracticeGameSummaryMessage>
          {percent >= 80
            ? 'Świetny szyk zdania!'
            : percent >= 60
              ? 'Dobra robota, zostało parę szczegółów.'
              : 'Zrób jeszcze jedną rundę i popraw szyk.'}
        </KangurPracticeGameSummaryMessage>
        <KangurPracticeGameSummaryActions
          finishLabel={finishLabel}
          onFinish={onFinish}
          onRestart={handleRestart}
        />
      </KangurPracticeGameSummary>
    );
  }

  return (
    <KangurPracticeGameStage className='max-w-sm' data-testid='english-structure-game-stage'>
      <KangurPracticeGameProgress
        accent={round.accent}
        currentRound={roundIndex}
        dataTestId='english-structure-progress-bar'
        totalRounds={TOTAL_ROUNDS}
      />
      <KangurGlassPanel
        className={cn('w-full', KANGUR_PANEL_GAP_CLASSNAME)}
        padding='lg'
        surface='solid'
      >
        <div className='flex flex-wrap items-center gap-3'>
          <KangurStatusChip accent={round.accent} size='sm'>
            {round.prompt}
          </KangurStatusChip>
          <p className='text-sm text-slate-500'>
            Runda {roundIndex + 1} z {TOTAL_ROUNDS}
          </p>
          {round.kind === 'timed' ? (
            <KangurStatusChip
              accent={timeLeft !== null && timeLeft <= 3 ? 'rose' : 'amber'}
              size='sm'
            >
              Czas: {timeLeft ?? round.timeLimitSec}s
            </KangurStatusChip>
          ) : null}
        </div>
        <KangurHeadline className='text-xl sm:text-2xl'>{round.question}</KangurHeadline>

        {round.kind === 'choice' || round.kind === 'timed' ? (
          <div className='grid gap-3 sm:grid-cols-2'>
            {round.options.map((option) => (
              <button
                key={option}
                type='button'
                onClick={() => setSelection(option)}
                className={cn(
                  'rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition',
                  selection === option
                    ? KANGUR_ACCENT_STYLES[round.accent].activeCard
                    : 'border-slate-200 bg-white/70 hover:-translate-y-[1px]'
                )}
                aria-pressed={selection === option}
              >
                {option}
              </button>
            ))}
          </div>
        ) : null}

        {round.kind === 'fill' ? (
          <div className='grid gap-3'>
            <KangurTextField
              accent={round.accent}
              placeholder={round.placeholder ?? 'Wpisz odpowiedź'}
              value={fillValue}
              onChange={(event) => setFillValue(event.target.value)}
              aria-label='Uzupełnij brakujące słowo'
            />
            <p className='text-xs text-slate-500'>
              Wpisz brakujące słowo, a potem kliknij „Sprawdź”.
            </p>
          </div>
        ) : null}

        {round.kind === 'order' ? (
          <div className='space-y-3'>
            <div className='rounded-2xl border border-slate-200/70 bg-white/70 px-4 py-3 text-sm font-semibold text-slate-800'>
              {orderTokens.join(' ')}
            </div>
            <DragDropContext onDragEnd={handleOrderDragEnd}>
              <Droppable droppableId={`order-${round.id}`} direction='vertical'>
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className='grid gap-2'
                  >
                    {orderTokens.map((token, index) => (
                      <Draggable
                        key={`${round.id}-${token}-${index}`}
                        draggableId={`${round.id}-${token}-${index}`}
                        index={index}
                        isDragDisabled={isChecking}
                      >
                        {(draggableProvided, snapshot) => {
                          const content = (
                            <div
                              ref={draggableProvided.innerRef}
                              {...draggableProvided.draggableProps}
                              {...draggableProvided.dragHandleProps}
                              className={cn(
                                'flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm font-semibold transition',
                                snapshot.isDragging
                                  ? 'border-violet-300 bg-violet-50 shadow-lg'
                                  : 'border-slate-200 bg-white/70 hover:-translate-y-[1px]'
                              )}
                            >
                              <span className='text-xs uppercase tracking-wide text-slate-400'>
                                #{index + 1}
                              </span>
                              <span>{token}</span>
                            </div>
                          );

                          if (snapshot.isDragging && dragPortal) {
                            return createPortal(content, dragPortal);
                          }

                          return content;
                        }}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          </div>
        ) : null}

        {feedback ? (
          <KangurInfoCard
            accent={feedback.kind === 'success' ? 'emerald' : 'rose'}
            padding='md'
            tone='accent'
          >
            {feedback.text}
          </KangurInfoCard>
        ) : (
          <KangurInfoCard accent='slate' padding='md' tone='muted'>
            {round.hint}
          </KangurInfoCard>
        )}
        <div className={KANGUR_WRAP_ROW_CLASSNAME}>
          <KangurButton
            onClick={() => handleCheck()}
            disabled={!isReady || isChecking}
            aria-busy={isChecking}
          >
            {isChecking ? 'Sprawdzam…' : 'Sprawdź'}
          </KangurButton>
          <KangurButton onClick={handleRestart} variant='ghost'>
            Zacznij od nowa
          </KangurButton>
        </div>
      </KangurGlassPanel>
    </KangurPracticeGameStage>
  );
}
