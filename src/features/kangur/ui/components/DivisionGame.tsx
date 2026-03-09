import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { RefreshCw } from 'lucide-react';
import { useState } from 'react';

import {
  KangurButton,
  KangurDisplayEmoji,
  KangurEquationDisplay,
  KangurGlassPanel,
  KangurHeadline,
  KangurInfoCard,
  KangurOptionCardButton,
  KangurProgressBar,
  KangurResultBadge,
  KangurStatusChip,
} from '@/features/kangur/ui/design/primitives';
import {
  KANGUR_ACCENT_STYLES,
  type KangurAccent,
} from '@/features/kangur/ui/design/tokens';
import { createKangurPageTransitionMotionProps } from '@/features/kangur/ui/motion/page-transition';
import {
  addXp,
  createLessonPracticeReward,
  loadProgress,
} from '@/features/kangur/ui/services/progress';
import { scheduleKangurRoundFeedback } from '@/features/kangur/ui/services/round-transition';
import { cn } from '@/shared/utils';

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

type DivisionGameProps = {
  finishLabel?: string;
  onFinish: () => void;
};

const TOTAL = 7;

function generateQuestion(round: number): DivisionQuestion {
  const withRemainder = round >= 3;
  const divisor = Math.floor(Math.random() * 8) + 2;
  const quotient = Math.floor(Math.random() * 9) + 1;
  const remainder = withRemainder ? Math.floor(Math.random() * (divisor - 1)) : 0;
  const dividend = divisor * quotient + remainder;

  if (withRemainder) {
    const correct = remainder;
    const wrongs = new Set<number>();
    while (wrongs.size < 3) {
      const wrong = Math.floor(Math.random() * divisor);
      if (wrong !== correct) {
        wrongs.add(wrong);
      }
    }
    const choices = [...wrongs, correct].sort(() => Math.random() - 0.5);
    return {
      type: 'remainder',
      a: dividend,
      b: divisor,
      quotient,
      correct,
      remainder,
      choices,
      label: `${dividend} ÷ ${divisor} = ${quotient} reszta ?`,
    };
  }

  const correct = quotient;
  const wrongs = new Set<number>();
  while (wrongs.size < 3) {
    const wrong = correct + (Math.floor(Math.random() * 4) + 1) * (Math.random() < 0.5 ? 1 : -1);
    if (wrong > 0 && wrong !== correct) {
      wrongs.add(wrong);
    }
  }
  const choices = [...wrongs, correct].sort(() => Math.random() - 0.5);
  return {
    type: 'quotient',
    a: dividend,
    b: divisor,
    correct,
    choices,
    label: `${dividend} ÷ ${divisor} = ?`,
  };
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
    <div className='flex flex-wrap gap-2 justify-center max-w-xs' data-testid='division-share-visual'>
      {groups.map((group, groupIndex) => (
        <KangurInfoCard
          accent='sky'
          className='flex min-w-[72px] flex-col items-center gap-0.5 rounded-[22px]'
          data-testid={`division-share-group-${groupIndex}`}
          key={groupIndex}
          padding='sm'
          tone='accent'
        >
          <p className='text-xs font-bold text-sky-500'>{groupIndex + 1}</p>
          <div className='flex flex-wrap gap-0.5 justify-center max-w-[60px]'>
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

export default function DivisionGame({
  finishLabel = 'Wróć do lekcji',
  onFinish,
}: DivisionGameProps): React.JSX.Element {
  const prefersReducedMotion = useReducedMotion();
  const roundMotionProps = createKangurPageTransitionMotionProps(prefersReducedMotion);
  const [roundIndex, setRoundIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);
  const [question, setQuestion] = useState<DivisionQuestion>(() => generateQuestion(0));
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
        const reward = createLessonPracticeReward(progress, 'division', newScore, TOTAL);
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
        <KangurGlassPanel
          className='flex flex-col items-center gap-4 text-center'
          data-testid='division-game-summary-shell'
          padding='xl'
          surface='solid'
          variant='soft'
        >
          <KangurDisplayEmoji data-testid='division-game-summary-emoji' size='lg'>
            {percent === 100 ? '🏆' : percent >= 60 ? '🌟' : '💪'}
          </KangurDisplayEmoji>
          <KangurHeadline data-testid='division-game-summary-title'>
            Wynik: {score}/{TOTAL}
          </KangurHeadline>
          {xpEarned > 0 && (
            <KangurStatusChip accent='indigo' className='px-4 py-2 text-sm font-bold'>
              +{xpEarned} XP ✨
            </KangurStatusChip>
          )}
          <KangurProgressBar accent='teal' animated size='md' value={percent} />
          <p className='text-slate-500'>
            {percent === 100
              ? 'Idealnie! Mistrz dzielenia!'
              : percent >= 60
                ? 'Świetna robota!'
                : 'Ćwicz dalej!'}
          </p>
          <div className='flex gap-3 w-full'>
            <KangurButton
              onClick={() => {
                setRoundIndex(0);
                setScore(0);
                setDone(false);
                setXpEarned(0);
                setQuestion(generateQuestion(0));
                setSelected(null);
                setConfirmed(false);
              }}
              className='flex-1'
              size='lg'
              type='button'
              variant='surface'
            >
              <RefreshCw className='w-4 h-4' /> Jeszcze raz
            </KangurButton>
            <KangurButton
              onClick={onFinish}
              className='flex-1'
              size='lg'
              type='button'
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
          accent='teal'
          className='flex-1'
          data-testid='division-game-progress-bar'
          size='sm'
          value={(roundIndex / TOTAL) * 100}
        />
        <span className='text-xs font-bold text-slate-400'>
          {roundIndex + 1}/{TOTAL}
        </span>
      </div>

      <AnimatePresence mode='wait'>
        <motion.div
          key={roundIndex}
          {...roundMotionProps}
          className='w-full'
        >
          <KangurGlassPanel
            className='flex flex-col items-center gap-4'
            data-testid='division-game-round-shell'
            padding='xl'
            surface='solid'
            variant='soft'
          >
            <p className='text-xs font-bold text-blue-400 uppercase tracking-wide'>
              {question.type === 'remainder' ? 'Jaka jest reszta?' : 'Ile wynosi iloraz?'}
            </p>
            <KangurEquationDisplay accent='sky' data-testid='division-game-equation'>
              {question.label}
            </KangurEquationDisplay>

            {question.type === 'quotient' && (
              <ShareVisual a={question.a} b={question.b} quotient={question.correct} />
            )}

            {question.type === 'remainder' && (
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
                <p className='mt-1 text-xs text-slate-500'>Ile zostaje po podzieleniu?</p>
              </KangurInfoCard>
            )}

            <div className='grid grid-cols-2 gap-2 w-full'>
              {question.choices.map((choice, index) => {
                let accent: KangurAccent = 'sky';
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
                      data-testid={`division-game-choice-${index}`}
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
              >
                <KangurResultBadge
                  data-testid='division-game-feedback'
                  size='md'
                  tone={selected === question.correct ? 'success' : 'error'}
                >
                  {selected === question.correct ? '🎉 Brawo!' : `❌ Odpowiedź: ${question.correct}`}
                </KangurResultBadge>
              </motion.div>
            )}
            {!confirmed && (
              <KangurButton
                onClick={handleConfirm}
                className='w-full'
                disabled={selected === null}
                size='lg'
                type='button'
                variant='primary'
              >
                Sprawdź ✓
              </KangurButton>
            )}
          </KangurGlassPanel>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
