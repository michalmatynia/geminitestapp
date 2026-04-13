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
} from '@/features/kangur/ui/constants/mini-game-i18n';
import {
  KangurButton,
  KangurEquationDisplay,
  KangurGlassPanel,
  KangurInfoCard,
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

type DivisionQuotientQuestion = {
  type: 'quotient';
  a: number;
  b: number;
  correct: number;
  choices: number[];
  label: string;
};

type DivisionRemainderQuestion = {
  type: 'remainder';
  a: number;
  b: number;
  quotient: number;
  correct: number;
  remainder: number;
  choices: number[];
  label: string;
};

type DivisionQuestion = DivisionQuotientQuestion | DivisionRemainderQuestion;

type DivisionGameProps = KangurMiniGameFinishVariantProps;

const TOTAL = 7;

const buildDivisionChoices = (correct: number, wrongFactory: () => number): number[] => {
  const wrongs = new Set<number>();
  while (wrongs.size < 3) {
    const wrong = wrongFactory();
    if (wrong !== correct) {
      wrongs.add(wrong);
    }
  }
  return [...wrongs, correct].sort(() => Math.random() - 0.5);
};

const buildDivisionRemainderQuestion = ({
  dividend,
  divisor,
  quotient,
  remainder,
}: {
  dividend: number;
  divisor: number;
  quotient: number;
  remainder: number;
}): DivisionRemainderQuestion => ({
  type: 'remainder',
  a: dividend,
  b: divisor,
  quotient,
  correct: remainder,
  remainder,
  choices: buildDivisionChoices(remainder, () => Math.floor(Math.random() * divisor)),
  label: `${dividend} ÷ ${divisor} = ${quotient} reszta ?`,
});

const buildDivisionQuotientQuestion = ({
  dividend,
  divisor,
  quotient,
}: {
  dividend: number;
  divisor: number;
  quotient: number;
}): DivisionQuotientQuestion => {
  const wrongs = new Set<number>();
  while (wrongs.size < 3) {
    const wrong =
      quotient + (Math.floor(Math.random() * 4) + 1) * (Math.random() < 0.5 ? 1 : -1);
    if (wrong > 0 && wrong !== quotient) {
      wrongs.add(wrong);
    }
  }

  return {
    type: 'quotient',
    a: dividend,
    b: divisor,
    correct: quotient,
    choices: [...wrongs, quotient].sort(() => Math.random() - 0.5),
    label: `${dividend} ÷ ${divisor} = ?`,
  };
};

function generateQuestion(round: number): DivisionQuestion {
  const withRemainder = round >= 3;
  const divisor = Math.floor(Math.random() * 8) + 2;
  const quotient = Math.floor(Math.random() * 9) + 1;
  const remainder = withRemainder ? Math.floor(Math.random() * (divisor - 1)) : 0;
  const dividend = divisor * quotient + remainder;

  if (withRemainder) {
    return buildDivisionRemainderQuestion({ dividend, divisor, quotient, remainder });
  }

  return buildDivisionQuotientQuestion({ dividend, divisor, quotient });
}

function ShareVisual({
  a,
  b,
  quotient,
}: {
  a: number;
  b: number;
  quotient: number;
}): React.JSX.Element | null {
  if (a > 20 || b > 6) {
    return null;
  }

  const emojis = ['🍪', '🍎', '🍬', '🌟', '⚽'];
  const emoji = emojis[b % emojis.length] ?? '🍪';
  const groups = Array.from({ length: b }, (_, groupIndex) =>
    Array.from({ length: quotient }, (_, itemIndex) => ({ groupIndex, itemIndex }))
  );

  return (
    <div
      className='flex max-w-full flex-wrap justify-center gap-2 sm:max-w-xs'
      data-testid='division-share-visual'
    >
      {groups.map((group, groupIndex) => (
        <KangurInfoCard
          accent='sky'
          className='flex min-w-[56px] flex-col items-center gap-0.5 rounded-[22px] sm:min-w-[72px]'
          data-testid={`division-share-group-${groupIndex}`}
          key={groupIndex}
          padding='sm'
          tone='accent'
        >
          <p className='text-xs font-bold text-sky-500'>{groupIndex + 1}</p>
          <div className='flex max-w-[52px] flex-wrap justify-center gap-0.5 sm:max-w-[60px]'>
            {group.map((_, itemIndex) => (
              <span key={itemIndex} className='text-lg'>
                {emoji}
              </span>
            ))}
          </div>
        </KangurInfoCard>
      ))}
    </div>
  );
}

type DivisionChoicePresentation = {
  accent: KangurAccent;
  className: string;
  emphasis: 'neutral' | 'accent';
  state: 'default' | 'muted';
};

type DivisionGameContextValue = {
  confirmed: boolean;
  isCoarsePointer: boolean;
  onConfirm: () => void;
  onSelect: (choice: number) => void;
  question: DivisionQuestion;
  roundIndex: number;
  selected: number | null;
  translations: ReturnType<typeof useTranslations>;
};

const DivisionGameContext = React.createContext<DivisionGameContextValue | null>(null);

function useDivisionGame(): DivisionGameContextValue {
  const context = React.useContext(DivisionGameContext);
  if (!context) {
    throw new Error('useDivisionGame must be used within a DivisionGameContext.Provider');
  }
  return context;
}


const resolveDivisionChoicePresentation = ({
  choice,
  confirmed,
  correct,
  selected,
}: {
  choice: number;
  confirmed: boolean;
  correct: number;
  selected: number | null;
}): DivisionChoicePresentation => {
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
    accent: 'sky',
    className: '[color:var(--kangur-page-text)]',
    emphasis: 'neutral',
    state: 'default',
  };
};

const resolveDivisionSummaryMessage = ({
  percent,
  translations,
}: {
  percent: number;
  translations: ReturnType<typeof useTranslations>;
}): string => {
  if (percent === 100) {
    return translations('division.summary.perfect');
  }

  if (percent >= 60) {
    return translations('division.summary.good');
  }

  return translations('division.summary.retry');
};

const resolveDivisionCheckButtonClassName = ({
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

const resetDivisionGameSession = ({
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
  setQuestion: React.Dispatch<React.SetStateAction<DivisionQuestion>>;
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

const advanceDivisionRound = ({
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
  setQuestion: React.Dispatch<React.SetStateAction<DivisionQuestion>>;
  setRoundIndex: React.Dispatch<React.SetStateAction<number>>;
  setScore: React.Dispatch<React.SetStateAction<number>>;
  setSelected: React.Dispatch<React.SetStateAction<number | null>>;
  setXpBreakdown: React.Dispatch<React.SetStateAction<KangurRewardBreakdownEntry[]>>;
  setXpEarned: React.Dispatch<React.SetStateAction<number>>;
}): void => {
  if (roundIndex + 1 >= TOTAL) {
    const progress = loadProgress({ ownerKey });
    const reward = createLessonPracticeReward(progress, 'division', newScore, TOTAL);
    addXp(reward.xp, reward.progressUpdates, { ownerKey });
    void persistKangurSessionScore({
      operation: 'division',
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

const confirmDivisionSelection = ({
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
  question: DivisionQuestion;
  roundIndex: number;
  score: number;
  selected: number | null;
  sessionStartedAtRef: React.MutableRefObject<number>;
  setConfirmed: React.Dispatch<React.SetStateAction<boolean>>;
  setDone: React.Dispatch<React.SetStateAction<boolean>>;
  setQuestion: React.Dispatch<React.SetStateAction<DivisionQuestion>>;
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
    advanceDivisionRound({
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

function DivisionGameSummaryView({
  finishLabel,
  onFinish,
  onRestart,
  results,
}: {
  finishLabel: string;
  onFinish: () => void;
  onRestart: () => void;
  results: {
    percent: number;
    score: number;
    xpBreakdown: KangurRewardBreakdownEntry[];
    xpEarned: number;
  };
}): React.JSX.Element {
  const { translations } = useDivisionGame();
  const { percent, score, xpBreakdown, xpEarned } = results;

  return (
    <KangurPracticeGameSummary
      dataTestId='division-game-summary-shell'
      wrapperClassName='w-full max-w-3xl'
    >
      <KangurPracticeGameSummaryEmoji
        dataTestId='division-game-summary-emoji'
        emoji={percent === 100 ? '🏆' : percent >= 60 ? '🌟' : '💪'}
      />
      <KangurPracticeGameSummaryTitle
        dataTestId='division-game-summary-title'
        title={getKangurMiniGameScoreLabel(translations, score, TOTAL)}
      />
      <KangurPracticeGameSummaryXP accent='indigo' xpEarned={xpEarned} />
      <KangurPracticeGameSummaryBreakdown
        breakdown={xpBreakdown}
        dataTestId='division-game-summary-breakdown'
        itemDataTestIdPrefix='division-game-summary-breakdown'
      />
      <KangurPracticeGameSummaryProgress accent='teal' percent={percent} />
      <KangurPracticeGameSummaryMessage>
        {resolveDivisionSummaryMessage({ percent, translations })}
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

function DivisionGameQuestionPanel(): React.JSX.Element {
  const { isCoarsePointer, question, translations } = useDivisionGame();

  return (
    <>
      <p className='text-xs font-bold text-blue-400 uppercase tracking-wide'>
        {question.type === 'remainder' ? 'Jaka jest reszta?' : 'Ile wynosi iloraz?'}
      </p>
      <KangurEquationDisplay accent='sky' data-testid='division-game-equation'>
        {question.label}
      </KangurEquationDisplay>

      {question.type === 'quotient' ? (
        <ShareVisual a={question.a} b={question.b} quotient={question.correct} />
      ) : (
        <KangurInfoCard
          accent='teal'
          className='w-full rounded-[24px] text-center text-sm'
          padding='sm'
          tone='accent'
        >
          <p>
            {question.a} = {question.b} × {question.quotient} +{' '}
            <span className='font-extrabold text-lg'>?</span>
          </p>
          <p className='mt-1 text-xs [color:var(--kangur-page-muted-text)]'>
            Ile zostaje po podzieleniu?
          </p>
        </KangurInfoCard>
      )}

      {isCoarsePointer ? (
        <p
          data-testid='division-game-touch-hint'
          className='text-center text-xs font-semibold uppercase tracking-[0.16em] [color:var(--kangur-page-muted-text)]'
        >
          {translations('division.inRound.touchHint')}
        </p>
      ) : null}
    </>
  );
}

function DivisionGameChoicesGrid(): React.JSX.Element {
  const { confirmed, isCoarsePointer, onSelect, question, selected } = useDivisionGame();

  return (
    <div className='grid w-full grid-cols-1 gap-2 sm:grid-cols-2'>
      {question.choices.map((choice, index) => {
        const presentation = resolveDivisionChoicePresentation({
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
            data-testid={`division-game-choice-${index}`}
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

function DivisionGameRoundView(): React.JSX.Element {
  const {
    confirmed,
    onConfirm,
    question,
    roundIndex,
    selected,
  } = useDivisionGame();

  return (
    <KangurPracticeGameShell className='w-full max-w-4xl' data-testid='division-game-shell'>
      <KangurPracticeGameProgress
        accent='teal'
        currentRound={roundIndex}
        dataTestId='division-game-progress-bar'
        totalRounds={TOTAL}
      />

      <div className='w-full'>
        <KangurGlassPanel
          className={cn('flex w-full flex-col', KANGUR_PANEL_GAP_CLASSNAME)}
          data-testid='division-game-round-shell'
          padding='xl'
          surface='solid'
          variant='soft'
        >
          <div className='grid w-full gap-5 lg:grid-cols-[minmax(0,1.15fr)_minmax(300px,0.95fr)] lg:items-start'>
            <div className='flex min-w-0 flex-col items-center gap-4 text-center lg:items-start lg:text-left'>
              <DivisionGameQuestionPanel />
            </div>

            <div className='flex min-w-0 flex-col gap-4'>
              <DivisionGameChoicesGrid />

              <KangurButton
                className={resolveDivisionCheckButtonClassName({
                  confirmed,
                  correct: question.correct,
                  selected,
                })}
                disabled={selected === null || confirmed}
                onClick={onConfirm}
                size='lg'
                type='button'
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

export default function DivisionGame({
  finishLabelVariant = 'lesson',
  onFinish,
}: DivisionGameProps): React.JSX.Element {
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
  const [question, setQuestion] = useState<DivisionQuestion>(() => generateQuestion(0));
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
    confirmDivisionSelection({
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

  if (done) {
    const percent = Math.round((score / TOTAL) * 100);
    return (
      <DivisionGameContext.Provider value={contextValue}>
        <DivisionGameSummaryView
          finishLabel={finishLabel}
          onFinish={handleFinishGame}
          onRestart={() =>
            resetDivisionGameSession({
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
          results={{
            percent,
            score,
            xpBreakdown,
            xpEarned,
          }}
        />
      </DivisionGameContext.Provider>
    );
  }

  return (
    <DivisionGameContext.Provider value={contextValue}>
      <DivisionGameRoundView />
    </DivisionGameContext.Provider>
  );
}
