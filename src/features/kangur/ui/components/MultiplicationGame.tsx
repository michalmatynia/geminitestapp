import { motion } from 'framer-motion';
import { RefreshCw } from 'lucide-react';
import { useRef, useState } from 'react';

import KangurRewardBreakdownChips from '@/features/kangur/ui/components/KangurRewardBreakdownChips';
import {
  KangurButton,
  KangurDisplayEmoji,
  KangurEquationDisplay,
  KangurGlassPanel,
  KangurHeadline,
  KangurOptionCardButton,
  KangurProgressBar,
  KangurStatusChip,
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
import { cn } from '@/shared/utils';

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

type MultiplicationGameProps = {
  finishLabel?: string;
  onFinish: () => void;
};

const TOTAL = 8;

function generateQuestion(round: number): MultiplicationQuestion {
  const useBlank = round % 2 === 1;
  const a = Math.floor(Math.random() * 9) + 2;
  const b = Math.floor(Math.random() * 9) + 2;
  const correct = a * b;

  if (useBlank) {
    const missingA = Math.random() < 0.5;
    const shown = missingA ? b : a;
    const missing = missingA ? a : b;
    const wrongs = new Set<number>();
    while (wrongs.size < 3) {
      const wrong = missing + (Math.floor(Math.random() * 4) + 1) * (Math.random() < 0.5 ? 1 : -1);
      if (wrong > 0 && wrong !== missing && wrong <= 12) {
        wrongs.add(wrong);
      }
    }
    if (wrongs.size < 3) {
      wrongs.add(missing + 1);
      wrongs.add(missing + 2);
    }
    const choices = [...wrongs, missing].sort(() => Math.random() - 0.5);
    return { type: 'blank', a, b, correct: missing, product: correct, shown, missingA, choices };
  }

  const wrongs = new Set<number>();
  while (wrongs.size < 3) {
    const wrong = correct + (Math.floor(Math.random() * 6) + 1) * (Math.random() < 0.5 ? 1 : -1);
    if (wrong > 0 && wrong !== correct) {
      wrongs.add(wrong);
    }
  }
  const choices = [...wrongs, correct].sort(() => Math.random() - 0.5);
  return { type: 'result', a, b, correct, choices };
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

export default function MultiplicationGame({
  finishLabel = 'Wróć do lekcji',
  onFinish,
}: MultiplicationGameProps): React.JSX.Element {
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
    if (selected === null || confirmed) {
      return;
    }

    setConfirmed(true);
    const isCorrect = selected === question.correct;
    const newScore = isCorrect ? score + 1 : score;

    scheduleKangurRoundFeedback(() => {
      if (roundIndex + 1 >= TOTAL) {
        const progress = loadProgress();
        const reward = createLessonPracticeReward(progress, 'multiplication', newScore, TOTAL);
        addXp(reward.xp, reward.progressUpdates);
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
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className='w-full max-w-sm'
      >
        <KangurGlassPanel
          className='flex flex-col items-center gap-4 text-center'
          data-testid='multiplication-game-summary-shell'
          padding='xl'
          surface='solid'
          variant='soft'
        >
          <KangurDisplayEmoji data-testid='multiplication-game-summary-emoji' size='lg'>
            {percent === 100 ? '🏆' : percent >= 60 ? '🌟' : '💪'}
          </KangurDisplayEmoji>
          <KangurHeadline data-testid='multiplication-game-summary-title'>
            Wynik: {score}/{TOTAL}
          </KangurHeadline>
          {xpEarned > 0 && (
            <KangurStatusChip accent='indigo' className='px-4 py-2 text-sm font-bold'>
              +{xpEarned} XP ✨
            </KangurStatusChip>
          )}
          <KangurRewardBreakdownChips
            accent='slate'
            breakdown={xpBreakdown}
            className='justify-center'
            dataTestId='multiplication-game-summary-breakdown'
            itemDataTestIdPrefix='multiplication-game-summary-breakdown'
          />
          <KangurProgressBar accent='indigo' animated size='md' value={percent} />
          <p className='[color:var(--kangur-page-muted-text)]'>
            {percent === 100
              ? 'Idealnie! Mistrz tabliczki!'
              : percent >= 60
                ? 'Świetna robota!'
                : 'Ćwicz dalej!'}
          </p>
          <div className='flex w-full gap-3'>
            <KangurButton
              className='flex-1'
              onClick={() => {
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
              size='lg'
              variant='surface'
            >
              <RefreshCw className='w-4 h-4' /> Jeszcze raz
            </KangurButton>
            <KangurButton
              className='flex-1'
              onClick={handleFinishGame}
              size='lg'
              variant='primary'
            >
              {finishLabel}
            </KangurButton>
          </div>
        </KangurGlassPanel>
      </motion.div>
    );
  }

  return (
    <div className='flex flex-col items-center gap-4 w-full max-w-sm'>
      <div className='flex items-center gap-2 w-full'>
        <KangurProgressBar
          accent='indigo'
          className='flex-1'
          data-testid='multiplication-game-progress-bar'
          size='sm'
          value={(roundIndex / TOTAL) * 100}
        />
        <span className='text-xs font-bold [color:var(--kangur-page-muted-text)]'>
          {roundIndex + 1}/{TOTAL}
        </span>
      </div>

      <div className='w-full'>
        <KangurGlassPanel
          className='flex flex-col items-center gap-4'
          data-testid='multiplication-game-round-shell'
          padding='xl'
          surface='solid'
          variant='soft'
        >
          {question.type === 'result' ? (
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
          ) : (
            <>
              <p className='text-xs font-bold text-purple-400 uppercase tracking-wide'>
                Znajdź brakujący czynnik
              </p>
              <KangurEquationDisplay accent='violet' data-testid='multiplication-game-equation'>
                {question.missingA ? (
                  <>
                    <span className='[color:var(--kangur-page-muted-text)]'>?</span> ×{' '}
                    {question.shown}
                  </>
                ) : (
                  <>
                    {question.shown} ×{' '}
                    <span className='[color:var(--kangur-page-muted-text)]'>?</span>
                  </>
                )}
                {' = '}
                {question.product}
              </KangurEquationDisplay>
            </>
          )}

          <div className='grid grid-cols-2 gap-2 w-full'>
            {question.choices.map((choice, index) => {
              let accent: KangurAccent = 'violet';
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
                <motion.div
                  key={index}
                  whileHover={!confirmed ? { scale: 1.04 } : {}}
                  whileTap={!confirmed ? { scale: 0.96 } : {}}
                >
                  <KangurOptionCardButton
                    accent={accent}
                    className={cn(
                      'w-full flex items-center justify-center rounded-[24px] px-4 py-3 text-center text-xl font-extrabold transition-all',
                      className,
                      confirmed ? 'cursor-default' : 'cursor-pointer'
                    )}
                    data-testid={`multiplication-game-choice-${index}`}
                    emphasis={emphasis}
                    onClick={() => handleSelect(choice)}
                    state={state}
                    type='button'
                  >
                    {choice}
                  </KangurOptionCardButton>
                </motion.div>
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
    </div>
  );
}
