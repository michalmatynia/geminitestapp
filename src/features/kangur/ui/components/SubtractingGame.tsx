'use client';

import { useRef, useState } from 'react';

import KangurAnswerChoiceCard from '@/features/kangur/ui/components/KangurAnswerChoiceCard';
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
  KangurEquationDisplay,
  KangurGlassPanel,
  KangurHeadline,
} from '@/features/kangur/ui/design/primitives';
import {
  KANGUR_ACCENT_STYLES,
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

type SubtractingQuestion = {
  a: number;
  b: number;
  correct: number;
  choices: number[];
};

type SubtractingGameProps = {
  finishLabelVariant?: 'lesson' | 'play';
  onFinish: () => void;
};

const TOTAL = 6;

function generateQuestion(round: number): SubtractingQuestion {
  const difficulty = round < 2 ? 'easy' : round < 4 ? 'medium' : 'hard';
  let a: number;
  let b: number;

  if (difficulty === 'easy') {
    b = Math.floor(Math.random() * 5) + 1;
    a = b + Math.floor(Math.random() * 5) + 1;
  } else if (difficulty === 'medium') {
    b = Math.floor(Math.random() * 9) + 1;
    a = b + Math.floor(Math.random() * 9) + 1;
  } else {
    b = Math.floor(Math.random() * 20) + 5;
    a = b + Math.floor(Math.random() * 30) + 5;
  }

  const correct = a - b;
  const wrongs = new Set<number>();
  while (wrongs.size < 3) {
    const wrong = correct + (Math.floor(Math.random() * 4) + 1) * (Math.random() < 0.5 ? 1 : -1);
    if (wrong >= 0 && wrong !== correct) {
      wrongs.add(wrong);
    }
  }

  const choices = [...wrongs, correct].sort(() => Math.random() - 0.5);
  return { a, b, correct, choices };
}

function AppleVisual({ a, b }: { a: number; b: number }): React.JSX.Element | null {
  if (a > 12) {
    return null;
  }

  return (
    <div className='flex flex-wrap gap-1 justify-center max-w-xs'>
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

export default function SubtractingGame({
  finishLabelVariant = 'lesson',
  onFinish,
}: SubtractingGameProps): React.JSX.Element {
  const finishLabel = finishLabelVariant === 'play' ? 'Wróć do Grajmy' : 'Wróć do lekcji';
  const [roundIndex, setRoundIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const handleFinishGame = (): void => {
    onFinish();
  };
  const [xpEarned, setXpEarned] = useState(0);
  const [xpBreakdown, setXpBreakdown] = useState<KangurRewardBreakdownEntry[]>([]);
  const [question, setQuestion] = useState<SubtractingQuestion>(() => generateQuestion(0));
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
    if (selected === null || confirmed) {
      return;
    }
    setConfirmed(true);
    const isCorrect = selected === question.correct;
    const newScore = isCorrect ? score + 1 : score;

    scheduleKangurRoundFeedback(() => {
      if (roundIndex + 1 >= TOTAL) {
        const progress = loadProgress();
        const reward = createLessonPracticeReward(progress, 'subtracting', newScore, TOTAL);
        addXp(reward.xp, reward.progressUpdates);
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
      } else {
        setScore(newScore);
        setRoundIndex((current) => current + 1);
        setQuestion(generateQuestion(roundIndex + 1));
        setSelected(null);
        setConfirmed(false);
      }
    });
  };

  if (done) {
    const percent = Math.round((score / TOTAL) * 100);
    return (
      <KangurPracticeGameSummary dataTestId='subtracting-game-summary-shell'>
        <KangurPracticeGameSummaryEmoji
          dataTestId='subtracting-game-summary-emoji'
          emoji={percent === 100 ? '🏆' : percent >= 60 ? '🌟' : '💪'}
        />
        <KangurPracticeGameSummaryTitle
          accent='rose'
          title={<KangurHeadline data-testid='subtracting-game-summary-title'>Wynik: {score}/{TOTAL}</KangurHeadline>}
        />
        <KangurPracticeGameSummaryXP accent='indigo' xpEarned={xpEarned} />
        <KangurPracticeGameSummaryBreakdown
          breakdown={xpBreakdown}
          dataTestId='subtracting-game-summary-breakdown'
          itemDataTestIdPrefix='subtracting-game-summary-breakdown'
        />
        <KangurPracticeGameSummaryProgress accent='rose' percent={percent} />
        <KangurPracticeGameSummaryMessage>
          {percent === 100
            ? 'Idealnie! Mistrz odejmowania!'
            : percent >= 60
              ? 'Świetna robota!'
              : 'Ćwicz dalej!'}
        </KangurPracticeGameSummaryMessage>
        <KangurPracticeGameSummaryActions
          finishLabel={finishLabel}
          onFinish={handleFinishGame}
          onRestart={() => {
            setRoundIndex(0);
            setScore(0);
            setDone(false);
            setXpEarned(0);
            setXpBreakdown([]);
            setQuestion(generateQuestion(0));
            setSelected(null);
            setConfirmed(false);
            sessionStartedAtRef.current = Date.now();
          }}
        />
      </KangurPracticeGameSummary>
    );
  }

  return (
    <KangurPracticeGameStage>
      <KangurPracticeGameProgress
        accent='rose'
        currentRound={roundIndex}
        dataTestId='subtracting-game-progress-bar'
        totalRounds={TOTAL}
      />
      <div className='w-full'>
        <KangurGlassPanel
          className='flex w-full flex-col items-center gap-4'
          data-testid='subtracting-game-round-shell'
          padding='lg'
          surface='solid'
          variant='soft'
        >
          <KangurEquationDisplay accent='rose' data-testid='subtracting-game-equation'>
            {question.a} − {question.b} ={' '}
            <span className='[color:var(--kangur-page-muted-text)]'>?</span>
          </KangurEquationDisplay>
          <AppleVisual a={question.a} b={question.b} />
          <div className='grid w-full grid-cols-1 gap-2 sm:grid-cols-2'>
            {question.choices.map((choice, index) => {
              let accent: KangurAccent = 'rose';
              let emphasis: 'neutral' | 'accent' = 'neutral';
              let state: 'default' | 'muted' = 'default';
              let className = '[color:var(--kangur-page-text)]';
              if (confirmed) {
                if (choice === question.correct) {
                  accent = 'emerald';
                  emphasis = 'accent';
                  className = KANGUR_ACCENT_STYLES.emerald.activeText;
                } else if (choice === selected) {
                  accent = 'rose';
                  emphasis = 'accent';
                  className = KANGUR_ACCENT_STYLES.rose.activeText;
                } else {
                  accent = 'slate';
                  state = 'muted';
                  className = '';
                }
              } else if (choice === selected) {
                accent = 'amber';
                emphasis = 'accent';
                className = KANGUR_ACCENT_STYLES.amber.activeText;
              }

              return (
                <KangurAnswerChoiceCard
                  accent={accent}
                  buttonClassName={cn(
                    'flex items-center justify-center px-4 py-3 text-center text-lg font-extrabold sm:text-xl',
                    className,
                    confirmed ? 'cursor-default' : 'cursor-pointer'
                  )}
                  data-testid={`subtracting-game-choice-${index}`}
                  emphasis={emphasis}
                  hoverScale={1.04}
                  interactive={!confirmed}
                  key={index}
                  onClick={() => handleSelect(choice)}
                  state={state}
                  tapScale={0.96}
                  type='button'
                >
                  {choice}
                </KangurAnswerChoiceCard>
              );
            })}
          </div>
          <KangurButton
            className={cn(
              'w-full',
              confirmed
                ? selected === question.correct
                  ? 'bg-emerald-500 border-emerald-500 text-white'
                  : 'bg-rose-500 border-rose-500 text-white'
                : '[background:var(--kangur-soft-card-background)] [border-color:var(--kangur-soft-card-border)] [color:var(--kangur-page-text)]'
            )}
            disabled={selected === null || confirmed}
            onClick={handleConfirm}
            size='lg'
            variant='primary'
          >
            Sprawdź ✓
          </KangurButton>
        </KangurGlassPanel>
      </div>
    </KangurPracticeGameStage>
  );
}
