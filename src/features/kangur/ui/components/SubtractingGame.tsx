'use client';

import { useKangurProgressOwnerKey } from '@/features/kangur/ui/hooks/useKangurProgressOwnerKey';
import { useTranslations } from 'next-intl';
import React, { useRef, useState } from 'react';

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

type SubtractingQuestion = {
  a: number;
  b: number;
  correct: number;
  choices: number[];
};

type SubtractingChoicePresentation = {
  accent: KangurAccent;
  className: string;
  emphasis: 'neutral' | 'accent';
  state: 'default' | 'muted';
};

type SubtractingGameContextValue = {
  confirmed: boolean;
  isCoarsePointer: boolean;
  onConfirm: () => void;
  onSelect: (choice: number) => void;
  question: SubtractingQuestion;
  roundIndex: number;
  selected: number | null;
  translations: ReturnType<typeof useTranslations>;
};

const SubtractingGameContext = React.createContext<SubtractingGameContextValue | null>(null);

function useSubtractingGame(): SubtractingGameContextValue {
  const context = React.useContext(SubtractingGameContext);
  if (!context) {
    throw new Error('useSubtractingGame must be used within a SubtractingGameContext.Provider');
  }
  return context;
}


type SubtractingDifficulty = 'easy' | 'medium' | 'hard';

type SubtractingGameProps = KangurMiniGameFinishVariantProps;

const TOTAL = 6;

const resolveSubtractingDifficulty = (round: number): SubtractingDifficulty => {
  if (round < 2) {
    return 'easy';
  }

  if (round < 4) {
    return 'medium';
  }

  return 'hard';
};

const buildSubtractingOperands = (
  difficulty: SubtractingDifficulty
): Pick<SubtractingQuestion, 'a' | 'b'> => {
  if (difficulty === 'easy') {
    const b = Math.floor(Math.random() * 5) + 1;
    return {
      a: b + Math.floor(Math.random() * 5) + 1,
      b,
    };
  }

  if (difficulty === 'medium') {
    const b = Math.floor(Math.random() * 9) + 1;
    return {
      a: b + Math.floor(Math.random() * 9) + 1,
      b,
    };
  }

  const b = Math.floor(Math.random() * 20) + 5;
  return {
    a: b + Math.floor(Math.random() * 30) + 5,
    b,
  };
};

const buildSubtractingChoices = (correct: number): number[] => {
  const wrongs = new Set<number>();
  while (wrongs.size < 3) {
    const wrong = correct + (Math.floor(Math.random() * 4) + 1) * (Math.random() < 0.5 ? 1 : -1);
    if (wrong >= 0 && wrong !== correct) {
      wrongs.add(wrong);
    }
  }

  return [...wrongs, correct].sort(() => Math.random() - 0.5);
};

function generateQuestion(round: number): SubtractingQuestion {
  const { a, b } = buildSubtractingOperands(resolveSubtractingDifficulty(round));
  const correct = a - b;
  return {
    a,
    b,
    correct,
    choices: buildSubtractingChoices(correct),
  };
}

function AppleVisual({ a, b }: { a: number; b: number }): React.JSX.Element | null {
  if (a > 12) {
    return null;
  }

  return (
    <div className='flex max-w-xs flex-wrap justify-center gap-1'>
      {Array.from({ length: a }).map((_, index) => (
        <span
          key={index}
          className={`text-2xl transition-all ${index >= a - b ? '' : 'opacity-30 line-through'}`}
        >
          🍎
        </span>
      ))}
    </div>
  );
}

const resolveSubtractingChoicePresentation = ({
  choice,
  confirmed,
  correct,
  selected,
}: {
  choice: number;
  confirmed: boolean;
  correct: number;
  selected: number | null;
}): SubtractingChoicePresentation => {
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
    accent: 'rose',
    className: '[color:var(--kangur-page-text)]',
    emphasis: 'neutral',
    state: 'default',
  };
};

const resolveSubtractingSummaryMessage = ({
  percent,
  translations,
}: {
  percent: number;
  translations: ReturnType<typeof useTranslations>;
}): string => {
  if (percent === 100) {
    return translations('subtraction.summary.perfect');
  }

  if (percent >= 60) {
    return translations('subtraction.summary.good');
  }

  return translations('subtraction.summary.retry');
};

const resolveSubtractingCheckButtonClassName = ({
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

const resetSubtractingGameSession = ({
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
  setQuestion: React.Dispatch<React.SetStateAction<SubtractingQuestion>>;
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

const advanceSubtractingRound = ({
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
  setQuestion: React.Dispatch<React.SetStateAction<SubtractingQuestion>>;
  setRoundIndex: React.Dispatch<React.SetStateAction<number>>;
  setScore: React.Dispatch<React.SetStateAction<number>>;
  setSelected: React.Dispatch<React.SetStateAction<number | null>>;
  setXpBreakdown: React.Dispatch<React.SetStateAction<KangurRewardBreakdownEntry[]>>;
  setXpEarned: React.Dispatch<React.SetStateAction<number>>;
}): void => {
  if (roundIndex + 1 >= TOTAL) {
    const progress = loadProgress({ ownerKey });
    const reward = createLessonPracticeReward(progress, 'subtracting', newScore, TOTAL);
    addXp(reward.xp, reward.progressUpdates, { ownerKey });
    void persistKangurSessionScore({
      operation: 'subtraction',
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

const confirmSubtractingSelection = ({
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
  question: SubtractingQuestion;
  roundIndex: number;
  score: number;
  selected: number | null;
  sessionStartedAtRef: React.MutableRefObject<number>;
  setConfirmed: React.Dispatch<React.SetStateAction<boolean>>;
  setDone: React.Dispatch<React.SetStateAction<boolean>>;
  setQuestion: React.Dispatch<React.SetStateAction<SubtractingQuestion>>;
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
    advanceSubtractingRound({
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

function SubtractingGameSummaryView({
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
    <KangurPracticeGameSummary
      dataTestId='subtracting-game-summary-shell'
      wrapperClassName='w-full max-w-3xl'
    >
      <KangurPracticeGameSummaryEmoji
        dataTestId='subtracting-game-summary-emoji'
        emoji={percent === 100 ? '🏆' : percent >= 60 ? '🌟' : '💪'}
      />
      <KangurPracticeGameSummaryTitle
        accent='rose'
        title={
          <KangurHeadline data-testid='subtracting-game-summary-title'>
            {getKangurMiniGameScoreLabel(translations, score, TOTAL)}
          </KangurHeadline>
        }
      />
      <KangurPracticeGameSummaryXP accent='indigo' xpEarned={xpEarned} />
      <KangurPracticeGameSummaryBreakdown
        breakdown={xpBreakdown}
        dataTestId='subtracting-game-summary-breakdown'
        itemDataTestIdPrefix='subtracting-game-summary-breakdown'
      />
      <KangurPracticeGameSummaryProgress accent='rose' percent={percent} />
      <KangurPracticeGameSummaryMessage>
        {resolveSubtractingSummaryMessage({ percent, translations })}
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

function SubtractingGameQuestionPanel(): React.JSX.Element {
  const { isCoarsePointer, question, translations } = useSubtractingGame();

  return (
    <>
      <KangurEquationDisplay accent='rose' data-testid='subtracting-game-equation'>
        {question.a} − {question.b} ={' '}
        <span className='[color:var(--kangur-page-muted-text)]'>?</span>
      </KangurEquationDisplay>
      <AppleVisual a={question.a} b={question.b} />
      {isCoarsePointer ? (
        <p
          data-testid='subtracting-game-touch-hint'
          className='text-center text-xs font-semibold uppercase tracking-[0.16em] [color:var(--kangur-page-muted-text)]'
        >
          {translateKangurMiniGameWithFallback(
            translations,
            'subtraction.inRound.touchHint',
            'Tap an answer, then tap Check.'
          )}
        </p>
      ) : null}
    </>
  );
}

function SubtractingGameChoicesGrid(): React.JSX.Element {
  const { confirmed, isCoarsePointer, onSelect, question, selected } = useSubtractingGame();

  return (
    <div className='grid w-full grid-cols-1 gap-2 sm:grid-cols-2'>
      {question.choices.map((choice, index) => {
        const presentation = resolveSubtractingChoicePresentation({
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
            data-testid={`subtracting-game-choice-${index}`}
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

function SubtractingGameRoundView(): React.JSX.Element {
  const {
    confirmed,
    onConfirm,
    question,
    roundIndex,
    selected,
  } = useSubtractingGame();

  return (
    <KangurPracticeGameShell
      className='w-full max-w-4xl'
      data-testid='subtracting-game-shell'
    >
      <KangurPracticeGameProgress
        accent='rose'
        currentRound={roundIndex}
        dataTestId='subtracting-game-progress-bar'
        totalRounds={TOTAL}
      />
      <div className='w-full'>
        <KangurGlassPanel
          className={cn('flex w-full flex-col', KANGUR_PANEL_GAP_CLASSNAME)}
          data-testid='subtracting-game-round-shell'
          padding='lg'
          surface='solid'
          variant='soft'
        >
          <div className='grid w-full gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(300px,0.95fr)] lg:items-start'>
            <div className='flex min-w-0 flex-col items-center gap-4 text-center lg:items-start lg:text-left'>
              <SubtractingGameQuestionPanel />
            </div>

            <div className='flex min-w-0 flex-col gap-4'>
              <SubtractingGameChoicesGrid />

              <KangurButton
                className={resolveSubtractingCheckButtonClassName({
                  confirmed,
                  correct: question.correct,
                  selected,
                })}
                data-testid='subtracting-game-check'
                disabled={selected === null || confirmed}
                onClick={onConfirm}
                size='lg'
                variant='primary'
              >
                Sprawdź ✓
              </KangurButton>
            </div>
          </div>

        </KangurGlassPanel>
      </div>
    </KangurPracticeGameShell>
  );
}

export default function SubtractingGame({
  finishLabelVariant = 'lesson',
  onFinish,
}: SubtractingGameProps): React.JSX.Element {
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
  const [xpEarned, setXpEarned] = useState(0);
  const [xpBreakdown, setXpBreakdown] = useState<KangurRewardBreakdownEntry[]>([]);
  const [question, setQuestion] = useState<SubtractingQuestion>(() => generateQuestion(0));
  const [selected, setSelected] = useState<number | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const sessionStartedAtRef = useRef(Date.now());

  const handleFinishGame = (): void => {
    onFinish();
  };

  const handleSelect = (choice: number): void => {
    if (confirmed) {
      return;
    }
    setSelected(choice);
  };

  const handleConfirm = (): void => {
    confirmSubtractingSelection({
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
      <SubtractingGameSummaryView
        finishLabel={finishLabel}
        onFinish={handleFinishGame}
        onRestart={() =>
          resetSubtractingGameSession({
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

  const contextValue = {
    confirmed,
    isCoarsePointer,
    onConfirm: handleConfirm,
    onSelect: handleSelect,
    question,
    roundIndex,
    selected,
    translations,
  };

  return (
    <SubtractingGameContext.Provider value={contextValue}>
      <SubtractingGameRoundView />
    </SubtractingGameContext.Provider>
  );
}
