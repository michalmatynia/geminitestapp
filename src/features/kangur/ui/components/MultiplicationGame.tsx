'use client';

import { useKangurProgressOwnerKey } from '@/features/kangur/ui/hooks/useKangurProgressOwnerKey';
import { useTranslations } from 'next-intl';
import { useRef, useState } from 'react';

import KangurAnswerChoiceCard from '@/features/kangur/ui/components/KangurAnswerChoiceCard';
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
  translateKangurMiniGameWithFallback,
} from '@/features/kangur/ui/constants/mini-game-i18n';
import {
  KangurButton,
  KangurEquationDisplay,
  KangurGlassPanel,
  KangurHeadline,
} from '@/features/kangur/ui/design/primitives';
import {
  KANGUR_ACCENT_STYLES,
  KANGUR_PANEL_GAP_CLASSNAME,
  type KangurAccent,
} from '@/features/kangur/ui/design/tokens';
import { useKangurCoarsePointer } from '@/features/kangur/ui/hooks/useKangurCoarsePointer';
import {
  addXp,
  createLessonPracticeReward,
  loadProgress,
} from '@/features/kangur/ui/services/progress';
import { scheduleKangurRoundFeedback } from '@/features/kangur/ui/services/round-transition';
import { persistKangurSessionScore } from '@/features/kangur/ui/services/session-score';
import type {
  KangurMiniGameFinishVariantProps,
  KangurRewardBreakdownEntry,
} from '@/features/kangur/ui/types';
import { cn } from '@/features/kangur/shared/utils';

type MultiplicationResultQuestion = {
  type: 'result';
  a: number;
  b: number;
  correct: number;
  choices: number[];
};

type MultiplicationBlankQuestion = {
  type: 'blank';
  a: number;
  b: number;
  correct: number;
  product: number;
  shown: number;
  missingA: boolean;
  choices: number[];
};

type MultiplicationQuestion = MultiplicationResultQuestion | MultiplicationBlankQuestion;

type MultiplicationGameProps = KangurMiniGameFinishVariantProps;

const TOTAL = 8;

const buildPositiveMultiplicationChoices = (correct: number, upperBound = Number.POSITIVE_INFINITY): number[] => {
  const wrongs = new Set<number>();
  while (wrongs.size < 3) {
    const wrong =
      correct + (Math.floor(Math.random() * 6) + 1) * (Math.random() < 0.5 ? 1 : -1);
    if (wrong > 0 && wrong !== correct && wrong <= upperBound) {
      wrongs.add(wrong);
    }
  }
  return [...wrongs, correct].sort(() => Math.random() - 0.5);
};

const buildMultiplicationBlankQuestion = ({
  a,
  b,
}: {
  a: number;
  b: number;
}): MultiplicationBlankQuestion => {
  const missingA = Math.random() < 0.5;
  const shown = missingA ? b : a;
  const missing = missingA ? a : b;

  return {
    type: 'blank',
    a,
    b,
    correct: missing,
    product: a * b,
    shown,
    missingA,
    choices: buildPositiveMultiplicationChoices(missing, 12),
  };
};

const buildMultiplicationResultQuestion = ({
  a,
  b,
}: {
  a: number;
  b: number;
}): MultiplicationResultQuestion => ({
  type: 'result',
  a,
  b,
  correct: a * b,
  choices: buildPositiveMultiplicationChoices(a * b),
});

function generateQuestion(round: number): MultiplicationQuestion {
  const useBlank = round % 2 === 1;
  const a = Math.floor(Math.random() * 9) + 2;
  const b = Math.floor(Math.random() * 9) + 2;

  if (useBlank) {
    return buildMultiplicationBlankQuestion({ a, b });
  }

  return buildMultiplicationResultQuestion({ a, b });
}

function MultiplyGrid({ a, b }: { a: number; b: number }): React.JSX.Element | null {
  if (a > 8 || b > 8) {
    return null;
  }

  const colors = ['bg-purple-400', 'bg-indigo-400', 'bg-pink-400', 'bg-violet-400'];
  return (
    <div className='flex flex-col gap-0.5'>
      {Array.from({ length: Math.min(b, 8) }).map((_, row) => (
        <div key={row} className='flex gap-0.5'>
          {Array.from({ length: Math.min(a, 8) }).map((_, col) => (
            <div
              key={col}
              className={`w-5 h-5 rounded-full ${colors[row % colors.length]} opacity-80`}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

type MultiplicationChoicePresentation = {
  accent: KangurAccent;
  className: string;
  emphasis: 'neutral' | 'accent';
  state: 'default' | 'muted';
};

const resolveMultiplicationChoicePresentation = ({
  choice,
  confirmed,
  correct,
  selected,
}: {
  choice: number;
  confirmed: boolean;
  correct: number;
  selected: number | null;
}): MultiplicationChoicePresentation => {
  if (confirmed) {
    if (choice === correct) {
      return {
        accent: 'emerald',
        className: KANGUR_ACCENT_STYLES.emerald.activeText,
        emphasis: 'accent',
        state: 'default',
      };
    }

    if (choice === selected) {
      return {
        accent: 'rose',
        className: KANGUR_ACCENT_STYLES.rose.activeText,
        emphasis: 'accent',
        state: 'default',
      };
    }

    return {
      accent: 'slate',
      className: '',
      emphasis: 'neutral',
      state: 'muted',
    };
  }

  if (choice === selected) {
    return {
      accent: 'amber',
      className: KANGUR_ACCENT_STYLES.amber.activeText,
      emphasis: 'accent',
      state: 'default',
    };
  }

  return {
    accent: 'violet',
    className: '[color:var(--kangur-page-text)]',
    emphasis: 'neutral',
    state: 'default',
  };
};

const resolveMultiplicationSummaryMessage = ({
  percent,
  translations,
}: {
  percent: number;
  translations: ReturnType<typeof useTranslations>;
}): string => {
  if (percent === 100) {
    return translations('multiplication.summary.perfect');
  }

  if (percent >= 60) {
    return translations('multiplication.summary.good');
  }

  return translations('multiplication.summary.retry');
};

const resolveMultiplicationCheckButtonClassName = ({
  confirmed,
  correct,
  selected,
}: {
  confirmed: boolean;
  correct: number;
  selected: number | null;
}): string =>
  cn(
    'w-full',
    confirmed
      ? selected === correct
        ? 'bg-emerald-500 border-emerald-500 text-white'
        : 'bg-rose-500 border-rose-500 text-white'
      : '[background:var(--kangur-soft-card-background)] [border-color:var(--kangur-soft-card-border)] [color:var(--kangur-page-text)]'
  );

const resetMultiplicationGameSession = ({
  sessionStartedAtRef,
  setConfirmed,
  setDone,
  setQuestion,
  setRoundIndex,
  setScore,
  setSelected,
  setXpBreakdown,
  setXpEarned,
}: {
  sessionStartedAtRef: React.MutableRefObject<number>;
  setConfirmed: React.Dispatch<React.SetStateAction<boolean>>;
  setDone: React.Dispatch<React.SetStateAction<boolean>>;
  setQuestion: React.Dispatch<React.SetStateAction<MultiplicationQuestion>>;
  setRoundIndex: React.Dispatch<React.SetStateAction<number>>;
  setScore: React.Dispatch<React.SetStateAction<number>>;
  setSelected: React.Dispatch<React.SetStateAction<number | null>>;
  setXpBreakdown: React.Dispatch<React.SetStateAction<KangurRewardBreakdownEntry[]>>;
  setXpEarned: React.Dispatch<React.SetStateAction<number>>;
}): void => {
  setRoundIndex(0);
  setScore(0);
  setDone(false);
  setXpEarned(0);
  setXpBreakdown([]);
  setQuestion(generateQuestion(0));
  setSelected(null);
  setConfirmed(false);
  sessionStartedAtRef.current = Date.now();
};

const advanceMultiplicationRound = ({
  newScore,
  ownerKey,
  roundIndex,
  sessionStartedAtRef,
  setConfirmed,
  setDone,
  setQuestion,
  setRoundIndex,
  setScore,
  setSelected,
  setXpBreakdown,
  setXpEarned,
}: {
  newScore: number;
  ownerKey: string | null;
  roundIndex: number;
  sessionStartedAtRef: React.MutableRefObject<number>;
  setConfirmed: React.Dispatch<React.SetStateAction<boolean>>;
  setDone: React.Dispatch<React.SetStateAction<boolean>>;
  setQuestion: React.Dispatch<React.SetStateAction<MultiplicationQuestion>>;
  setRoundIndex: React.Dispatch<React.SetStateAction<number>>;
  setScore: React.Dispatch<React.SetStateAction<number>>;
  setSelected: React.Dispatch<React.SetStateAction<number | null>>;
  setXpBreakdown: React.Dispatch<React.SetStateAction<KangurRewardBreakdownEntry[]>>;
  setXpEarned: React.Dispatch<React.SetStateAction<number>>;
}): void => {
  if (roundIndex + 1 >= TOTAL) {
    const progress = loadProgress({ ownerKey });
    const reward = createLessonPracticeReward(progress, 'multiplication', newScore, TOTAL);
    addXp(reward.xp, reward.progressUpdates, { ownerKey });
    void persistKangurSessionScore({
      operation: 'multiplication',
      score: newScore,
      totalQuestions: TOTAL,
      correctAnswers: newScore,
      timeTakenSeconds: Math.round((Date.now() - sessionStartedAtRef.current) / 1000),
      xpEarned: reward.xp,
    });
    setXpEarned(reward.xp);
    setXpBreakdown(reward.breakdown ?? []);
    setScore(newScore);
    setDone(true);
    return;
  }

  setScore(newScore);
  setRoundIndex((current) => current + 1);
  setQuestion(generateQuestion(roundIndex + 1));
  setSelected(null);
  setConfirmed(false);
};

const confirmMultiplicationSelection = ({
  confirmed,
  ownerKey,
  question,
  roundIndex,
  score,
  selected,
  sessionStartedAtRef,
  setConfirmed,
  setDone,
  setQuestion,
  setRoundIndex,
  setScore,
  setSelected,
  setXpBreakdown,
  setXpEarned,
}: {
  confirmed: boolean;
  ownerKey: string | null;
  question: MultiplicationQuestion;
  roundIndex: number;
  score: number;
  selected: number | null;
  sessionStartedAtRef: React.MutableRefObject<number>;
  setConfirmed: React.Dispatch<React.SetStateAction<boolean>>;
  setDone: React.Dispatch<React.SetStateAction<boolean>>;
  setQuestion: React.Dispatch<React.SetStateAction<MultiplicationQuestion>>;
  setRoundIndex: React.Dispatch<React.SetStateAction<number>>;
  setScore: React.Dispatch<React.SetStateAction<number>>;
  setSelected: React.Dispatch<React.SetStateAction<number | null>>;
  setXpBreakdown: React.Dispatch<React.SetStateAction<KangurRewardBreakdownEntry[]>>;
  setXpEarned: React.Dispatch<React.SetStateAction<number>>;
}): void => {
  if (selected === null || confirmed) {
    return;
  }

  setConfirmed(true);
  const newScore = selected === question.correct ? score + 1 : score;
  scheduleKangurRoundFeedback(() => {
    advanceMultiplicationRound({
      newScore,
      ownerKey,
      roundIndex,
      sessionStartedAtRef,
      setConfirmed,
      setDone,
      setQuestion,
      setRoundIndex,
      setScore,
      setSelected,
      setXpBreakdown,
      setXpEarned,
    });
  });
};

function MultiplicationGameSummaryView({
  finishLabel,
  onFinish,
  onRestart,
  percent,
  score,
  translations,
  xpBreakdown,
  xpEarned,
}: {
  finishLabel: string;
  onFinish: () => void;
  onRestart: () => void;
  percent: number;
  score: number;
  translations: ReturnType<typeof useTranslations>;
  xpBreakdown: KangurRewardBreakdownEntry[];
  xpEarned: number;
}): React.JSX.Element {
  return (
    <KangurPracticeGameSummary dataTestId='multiplication-game-summary-shell'>
      <KangurPracticeGameSummaryEmoji
        dataTestId='multiplication-game-summary-emoji'
        emoji={percent === 100 ? '🏆' : percent >= 60 ? '🌟' : '💪'}
      />
      <KangurPracticeGameSummaryTitle
        accent='indigo'
        title={
          <KangurHeadline data-testid='multiplication-game-summary-title'>
            {getKangurMiniGameScoreLabel(translations, score, TOTAL)}
          </KangurHeadline>
        }
      />
      <KangurPracticeGameSummaryXP accent='indigo' xpEarned={xpEarned} />
      <KangurPracticeGameSummaryBreakdown
        breakdown={xpBreakdown}
        dataTestId='multiplication-game-summary-breakdown'
        itemDataTestIdPrefix='multiplication-game-summary-breakdown'
      />
      <KangurPracticeGameSummaryProgress accent='indigo' percent={percent} />
      <KangurPracticeGameSummaryMessage>
        {resolveMultiplicationSummaryMessage({ percent, translations })}
      </KangurPracticeGameSummaryMessage>
      <KangurPracticeGameSummaryActions
        finishLabel={finishLabel}
        onFinish={onFinish}
        restartLabel={translations('shared.restart')}
        onRestart={onRestart}
      />
    </KangurPracticeGameSummary>
  );
}

function MultiplicationGameQuestionPanel({
  question,
}: {
  question: MultiplicationQuestion;
}): React.JSX.Element {
  if (question.type === 'result') {
    return (
      <>
        <p className='text-xs font-bold text-purple-400 uppercase tracking-wide'>
          Ile wynosi iloczyn?
        </p>
        <KangurEquationDisplay accent='violet' data-testid='multiplication-game-equation'>
          {question.a} × {question.b} ={' '}
          <span className='[color:var(--kangur-page-muted-text)]'>?</span>
        </KangurEquationDisplay>
        <MultiplyGrid a={question.a} b={question.b} />
      </>
    );
  }

  return (
    <>
      <p className='text-xs font-bold text-purple-400 uppercase tracking-wide'>
        Znajdź brakujący czynnik
      </p>
      <KangurEquationDisplay accent='violet' data-testid='multiplication-game-equation'>
        {question.missingA ? (
          <>
            <span className='[color:var(--kangur-page-muted-text)]'>?</span> × {question.shown}
          </>
        ) : (
          <>
            {question.shown} × <span className='[color:var(--kangur-page-muted-text)]'>?</span>
          </>
        )}
        {' = '}
        {question.product}
      </KangurEquationDisplay>
    </>
  );
}

function MultiplicationGameChoicesGrid({
  confirmed,
  isCoarsePointer,
  onSelect,
  question,
  selected,
}: {
  confirmed: boolean;
  isCoarsePointer: boolean;
  onSelect: (choice: number) => void;
  question: MultiplicationQuestion;
  selected: number | null;
}): React.JSX.Element {
  return (
    <div className='grid w-full grid-cols-1 gap-2 sm:grid-cols-2'>
      {question.choices.map((choice, index) => {
        const presentation = resolveMultiplicationChoicePresentation({
          choice,
          confirmed,
          correct: question.correct,
          selected,
        });

        return (
          <KangurAnswerChoiceCard
            accent={presentation.accent}
            buttonClassName={cn(
              'flex items-center justify-center px-4 py-3 text-center text-lg font-extrabold touch-manipulation select-none sm:text-xl',
              isCoarsePointer && 'min-h-[4.25rem] active:scale-[0.98]',
              presentation.className,
              confirmed ? 'cursor-default' : 'cursor-pointer'
            )}
            data-testid={`multiplication-game-choice-${index}`}
            emphasis={presentation.emphasis}
            hoverScale={1.04}
            interactive={!confirmed}
            key={index}
            onClick={() => onSelect(choice)}
            state={presentation.state}
            tapScale={0.96}
            type='button'
          >
            {choice}
          </KangurAnswerChoiceCard>
        );
      })}
    </div>
  );
}

function MultiplicationGameRoundView({
  confirmed,
  isCoarsePointer,
  onConfirm,
  onSelect,
  question,
  roundIndex,
  selected,
  translations,
}: {
  confirmed: boolean;
  isCoarsePointer: boolean;
  onConfirm: () => void;
  onSelect: (choice: number) => void;
  question: MultiplicationQuestion;
  roundIndex: number;
  selected: number | null;
  translations: ReturnType<typeof useTranslations>;
}): React.JSX.Element {
  return (
    <KangurPracticeGameShell>
      <KangurPracticeGameProgress
        accent='indigo'
        currentRound={roundIndex}
        dataTestId='multiplication-game-progress-bar'
        totalRounds={TOTAL}
      />
      <div className='w-full'>
        <KangurGlassPanel
          className={cn('flex flex-col items-center', KANGUR_PANEL_GAP_CLASSNAME)}
          data-testid='multiplication-game-round-shell'
          padding='xl'
          surface='solid'
          variant='soft'
        >
          <MultiplicationGameQuestionPanel question={question} />

          {isCoarsePointer ? (
            <p
              data-testid='multiplication-game-touch-hint'
              className='text-center text-xs font-semibold uppercase tracking-[0.16em] [color:var(--kangur-page-muted-text)]'
            >
              {translateKangurMiniGameWithFallback(
                translations,
                'multiplication.inRound.touchHint',
                'Tap an answer, then tap Check.'
              )}
            </p>
          ) : null}

          <MultiplicationGameChoicesGrid
            confirmed={confirmed}
            isCoarsePointer={isCoarsePointer}
            onSelect={onSelect}
            question={question}
            selected={selected}
          />

          <div role='status' aria-live='polite' aria-atomic='true' className='sr-only'>
            {confirmed
              ? selected === question.correct
                ? 'Dobrze! Poprawna odpowiedź.'
                : `Niepoprawnie. Poprawna odpowiedź: ${question.correct}.`
              : ''}
          </div>

          <KangurButton
            className={resolveMultiplicationCheckButtonClassName({
              confirmed,
              correct: question.correct,
              selected,
            })}
            disabled={selected === null || confirmed}
            onClick={onConfirm}
            size='lg'
            variant='primary'
            data-testid='multiplication-game-check'
          >
            Sprawdź ✓
          </KangurButton>
        </KangurGlassPanel>
      </div>
    </KangurPracticeGameShell>
  );
}

export default function MultiplicationGame({
  finishLabelVariant = 'lesson',
  onFinish,
}: MultiplicationGameProps): React.JSX.Element {
  const ownerKey = useKangurProgressOwnerKey();
  const translations = useTranslations('KangurMiniGames');
  const isCoarsePointer = useKangurCoarsePointer();
  const finishLabel = getKangurMiniGameFinishLabel(
    translations,
    finishLabelVariant === 'play' ? 'play' : 'lesson'
  );
  const [roundIndex, setRoundIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const handleFinishGame = (): void => {
    onFinish();
  };
  const [xpEarned, setXpEarned] = useState(0);
  const [xpBreakdown, setXpBreakdown] = useState<KangurRewardBreakdownEntry[]>([]);
  const [question, setQuestion] = useState<MultiplicationQuestion>(() => generateQuestion(0));
  const [selected, setSelected] = useState<number | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const sessionStartedAtRef = useRef(Date.now());

  const handleSelect = (choice: number): void => {
    if (confirmed) {
      return;
    }
    setSelected(choice);
  };

  const handleConfirm = (): void => {
    confirmMultiplicationSelection({
      confirmed,
      ownerKey,
      question,
      roundIndex,
      score,
      selected,
      sessionStartedAtRef,
      setConfirmed,
      setDone,
      setQuestion,
      setRoundIndex,
      setScore,
      setSelected,
      setXpBreakdown,
      setXpEarned,
    });
  };

  if (done) {
    const percent = Math.round((score / TOTAL) * 100);
    return (
      <MultiplicationGameSummaryView
        finishLabel={finishLabel}
        onFinish={handleFinishGame}
        onRestart={() =>
          resetMultiplicationGameSession({
            sessionStartedAtRef,
            setConfirmed,
            setDone,
            setQuestion,
            setRoundIndex,
            setScore,
            setSelected,
            setXpBreakdown,
            setXpEarned,
          })
        }
        percent={percent}
        score={score}
        translations={translations}
        xpBreakdown={xpBreakdown}
        xpEarned={xpEarned}
      />
    );
  }

  return (
    <MultiplicationGameRoundView
      confirmed={confirmed}
      isCoarsePointer={isCoarsePointer}
      onConfirm={handleConfirm}
      onSelect={handleSelect}
      question={question}
      roundIndex={roundIndex}
      selected={selected}
      translations={translations}
    />
  );
}
