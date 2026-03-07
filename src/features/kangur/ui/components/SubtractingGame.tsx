import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { RefreshCw } from 'lucide-react';

import {
  KANGUR_ACCENT_STYLES,
  type KangurAccent,
} from '@/features/kangur/ui/design/tokens';
import {
  KangurButton,
  KangurOptionCardButton,
  KangurPanel,
  KangurProgressBar,
  KangurStatusChip,
} from '@/features/kangur/ui/design/primitives';
import {
  addXp,
  createLessonPracticeReward,
  loadProgress,
} from '@/features/kangur/ui/services/progress';
import { scheduleKangurRoundFeedback } from '@/features/kangur/ui/services/round-transition';
import { cn } from '@/shared/utils';

type SubtractingQuestion = {
  a: number;
  b: number;
  correct: number;
  choices: number[];
};

type SubtractingGameProps = {
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

export default function SubtractingGame({ onFinish }: SubtractingGameProps): React.JSX.Element {
  const [roundIndex, setRoundIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);
  const [question, setQuestion] = useState<SubtractingQuestion>(() => generateQuestion(0));
  const [selected, setSelected] = useState<number | null>(null);
  const [confirmed, setConfirmed] = useState(false);

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
        setXpEarned(reward.xp);
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
        <KangurPanel
          className='flex flex-col items-center gap-4 text-center'
          padding='xl'
          variant='elevated'
        >
          <div className='text-6xl'>{percent === 100 ? '🏆' : percent >= 60 ? '🌟' : '💪'}</div>
          <h2 className='text-2xl font-extrabold text-gray-800'>
            Wynik: {score}/{TOTAL}
          </h2>
          {xpEarned > 0 && (
            <KangurStatusChip accent='indigo' className='px-4 py-2 text-sm font-bold'>
              +{xpEarned} XP ✨
            </KangurStatusChip>
          )}
          <KangurProgressBar accent='rose' animated size='md' value={percent} />
          <p className='text-gray-500'>
            {percent === 100
              ? 'Idealnie! Mistrz odejmowania!'
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
                setQuestion(generateQuestion(0));
                setSelected(null);
                setConfirmed(false);
              }}
              size='lg'
              variant='secondary'
            >
              <RefreshCw className='w-4 h-4' /> Jeszcze raz
            </KangurButton>
            <KangurButton className='flex-1' onClick={onFinish} size='lg' variant='primary'>
              Wróć do lekcji
            </KangurButton>
          </div>
        </KangurPanel>
      </motion.div>
    );
  }

  return (
    <div className='flex flex-col items-center gap-4 w-full max-w-sm'>
      <div className='flex items-center gap-2 w-full'>
        <KangurProgressBar
          accent='rose'
          className='flex-1'
          data-testid='subtracting-game-progress-bar'
          size='sm'
          value={(roundIndex / TOTAL) * 100}
        />
        <span className='text-xs font-bold text-gray-400'>
          {roundIndex + 1}/{TOTAL}
        </span>
      </div>

      <AnimatePresence mode='wait'>
        <motion.div
          key={roundIndex}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className='w-full'
        >
          <KangurPanel
            className='flex w-full flex-col items-center gap-4'
            data-testid='subtracting-game-round-shell'
            padding='lg'
            variant='elevated'
          >
            <p className='text-3xl font-extrabold text-red-500'>
              {question.a} − {question.b} = <span className='text-gray-400'>?</span>
            </p>
            <AppleVisual a={question.a} b={question.b} />
            <div className='grid grid-cols-2 gap-2 w-full'>
              {question.choices.map((choice, index) => {
                let accent: KangurAccent = 'rose';
                let emphasis: 'neutral' | 'accent' = 'neutral';
                let state: 'default' | 'muted' = 'default';
                let className = 'text-slate-700';
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
                      data-testid={`subtracting-game-choice-${index}`}
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
            {confirmed && (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                className={`text-lg font-extrabold ${selected === question.correct ? 'text-green-600' : 'text-red-500'}`}
              >
                {selected === question.correct ? '🎉 Brawo!' : `❌ Odpowiedź: ${question.correct}`}
              </motion.div>
            )}
            {!confirmed && (
              <KangurButton
                className='w-full'
                disabled={selected === null}
                onClick={handleConfirm}
                size='lg'
                variant='primary'
              >
                Sprawdź ✓
              </KangurButton>
            )}
          </KangurPanel>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
