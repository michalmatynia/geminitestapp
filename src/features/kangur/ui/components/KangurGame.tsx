import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { CheckCircle, XCircle } from 'lucide-react';

import KangurExam from '@/features/kangur/ui/components/KangurExam';
import {
  Q1Illustration,
  Q2Illustration,
  Q3Illustration,
  Q4Illustration,
  Q5Illustration,
  Q6Illustration,
  Q7Illustration,
  Q8Illustration,
  Q9Illustration,
  Q10Illustration,
  Q11Illustration,
  Q15Illustration,
  Q16Illustration,
} from '@/features/kangur/ui/components/KangurIllustrations';
import { useKangurGameContext } from '@/features/kangur/ui/context/KangurGameContext';
import {
  KangurButton,
  KangurInfoCard,
  KangurOptionCardButton,
  KangurPanel,
  KangurProgressBar,
  KangurStatusChip,
} from '@/features/kangur/ui/design/primitives';
import { KANGUR_ACCENT_STYLES, type KangurAccent } from '@/features/kangur/ui/design/tokens';
import { getKangurQuestions, isExamMode } from '@/features/kangur/ui/services/kangur-questions';
import { XP_REWARDS, addXp, loadProgress } from '@/features/kangur/ui/services/progress';
import type { KangurExamQuestion, KangurQuestionChoice } from '@/features/kangur/ui/types';
import { cn } from '@/shared/utils';

type IllustrationComponent = () => React.JSX.Element;

type QuestionViewProps = {
  q: KangurExamQuestion;
  qIndex: number;
  total: number;
  onAnswer: (correct: boolean) => void;
};

type ResultViewProps = {
  score: number;
  total: number;
  onRestart: () => void;
};

const ILLUSTRATIONS: Record<string, IllustrationComponent | undefined> = {
  '2024_1': Q1Illustration,
  '2024_2': Q2Illustration,
  '2024_3': Q3Illustration,
  '2024_4': Q4Illustration,
  '2024_5': Q5Illustration,
  '2024_6': Q6Illustration,
  '2024_7': Q7Illustration,
  '2024_8': Q8Illustration,
  '2024_4pt_9': Q9Illustration,
  '2024_4pt_10': Q10Illustration,
  '2024_4pt_11': Q11Illustration,
  '2024_4pt_15': Q15Illustration,
  '2024_4pt_16': Q16Illustration,
};

function QuestionView({ q, qIndex, total, onAnswer }: QuestionViewProps): React.JSX.Element {
  const [selected, setSelected] = useState<KangurQuestionChoice | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const choices = q.choices ?? [];

  const handleSelect = (choice: KangurQuestionChoice): void => {
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
    const correct = selected === q.answer;
    setTimeout(() => onAnswer(correct), 1400);
  };

  return (
    <div className='flex flex-col gap-4 w-full'>
      <div className='flex items-center gap-2'>
        <KangurProgressBar
          accent='amber'
          className='flex-1'
          data-testid='kangur-game-progress-bar'
          size='sm'
          value={(qIndex / total) * 100}
        />
        <span className='text-xs font-bold text-gray-400'>
          {qIndex + 1}/{total}
        </span>
      </div>

      <KangurPanel className='flex flex-col gap-3' padding='lg' variant='soft'>
        <div className='flex items-center justify-between mb-1'>
          <p className='text-sm font-bold text-orange-500 uppercase tracking-wide'>
            Pytanie {qIndex + 1}
          </p>
          {q.id.startsWith('2024_') && (
            <KangurStatusChip accent='emerald' data-testid='kangur-game-point-chip' size='sm'>
              ⭐ 3 pkt (łatwe)
            </KangurStatusChip>
          )}
        </div>
        <p className='text-gray-800 font-semibold leading-relaxed'>{q.question}</p>
        {ILLUSTRATIONS[q.id] &&
          (() => {
            const Illustration = ILLUSTRATIONS[q.id];
            if (!Illustration) {
              return null;
            }
            return (
              <KangurInfoCard
                accent='slate'
                className='rounded-[22px]'
                data-testid='kangur-game-illustration-shell'
                padding='sm'
                tone='muted'
              >
                <Illustration />
              </KangurInfoCard>
            );
          })()}
      </KangurPanel>

      <div className='flex flex-col gap-2'>
        {choices.map((choice, index) => {
          let accent: KangurAccent = 'slate';
          let emphasis: 'neutral' | 'accent' = 'neutral';
          let state: 'default' | 'muted' = 'default';
          let style = 'text-slate-700';
          let badgeClassName = KANGUR_ACCENT_STYLES.slate.badge;
          if (confirmed) {
            if (choice === q.answer) {
              accent = 'emerald';
              emphasis = 'accent';
              style = KANGUR_ACCENT_STYLES.emerald.activeText;
              badgeClassName = KANGUR_ACCENT_STYLES.emerald.badge;
            } else if (choice === selected) {
              accent = 'rose';
              emphasis = 'accent';
              style = KANGUR_ACCENT_STYLES.rose.activeText;
              badgeClassName = KANGUR_ACCENT_STYLES.rose.badge;
            } else {
              state = 'muted';
              style = '';
              badgeClassName = KANGUR_ACCENT_STYLES.slate.badge;
            }
          } else if (choice === selected) {
            accent = 'amber';
            emphasis = 'accent';
            style = KANGUR_ACCENT_STYLES.amber.activeText;
            badgeClassName = KANGUR_ACCENT_STYLES.amber.badge;
          }

          return (
            <motion.div
              key={`${String(choice)}-${index}`}
              whileHover={!confirmed ? { scale: 1.02 } : {}}
              whileTap={!confirmed ? { scale: 0.98 } : {}}
            >
              <KangurOptionCardButton
                accent={accent}
                className={cn(
                  'w-full rounded-[24px] px-4 py-3 font-semibold transition-all flex items-center gap-3',
                  style,
                  confirmed ? 'cursor-default' : 'cursor-pointer'
                )}
                data-testid={`kangur-game-choice-${index}`}
                emphasis={emphasis}
                onClick={() => handleSelect(choice)}
                state={state}
                type='button'
              >
                <span
                  className={cn(
                    'flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full text-sm font-extrabold',
                    badgeClassName
                  )}
                >
                  {String.fromCharCode(65 + index)}
                </span>
                <span>{choice}</span>
                {confirmed && choice === q.answer && (
                  <CheckCircle className='w-4 h-4 text-green-600 ml-auto flex-shrink-0' />
                )}
                {confirmed && choice === selected && choice !== q.answer && (
                  <XCircle className='w-4 h-4 text-red-500 ml-auto flex-shrink-0' />
                )}
              </KangurOptionCardButton>
            </motion.div>
          );
        })}
      </div>

      {confirmed && q.explanation && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <KangurInfoCard
            accent='sky'
            className='rounded-[22px] text-sm'
            data-testid='kangur-game-explanation'
            padding='sm'
            tone='accent'
          >
            💡 {q.explanation}
          </KangurInfoCard>
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
          Zatwierdź odpowiedź ✓
        </KangurButton>
      )}
    </div>
  );
}

function ResultView({ score, total, onRestart }: ResultViewProps): React.JSX.Element {
  const { onBack } = useKangurGameContext();
  const pct = total > 0 ? Math.round((score / total) * 100) : 0;
  const emoji = pct === 100 ? '🏆' : pct >= 70 ? '🌟' : pct >= 40 ? '👍' : '💪';

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className='w-full'>
      <KangurPanel
        className='flex flex-col items-center gap-4 text-center'
        padding='xl'
        variant='elevated'
      >
        <div className='text-6xl'>{emoji}</div>
        <h2 className='text-2xl font-extrabold text-gray-800'>
          Wynik: {score}/{total}
        </h2>
        <p className='text-gray-500'>
          {pct === 100
            ? 'Idealny wynik! Jesteś mistrzem Kangura! 🦘'
            : pct >= 70
              ? 'Świetnie! Gotowy/a na konkurs!'
              : pct >= 40
                ? 'Dobra robota! Ćwicz dalej!'
                : 'Nie poddawaj się! Spróbuj jeszcze raz!'}
        </p>
        <KangurProgressBar
          accent='amber'
          animated
          data-testid='kangur-game-summary-progress-bar'
          size='lg'
          value={pct}
        />
        <p className='text-sm text-gray-400'>{pct}% poprawnych odpowiedzi</p>
        <div className='flex w-full gap-3'>
          <KangurButton className='flex-1' onClick={onBack} size='lg' variant='secondary'>
            Menu
          </KangurButton>
          <KangurButton className='flex-1' onClick={onRestart} size='lg' variant='primary'>
            Spróbuj ponownie 🔁
          </KangurButton>
        </div>
      </KangurPanel>
    </motion.div>
  );
}

function PracticeModeGame(): React.JSX.Element {
  const { mode } = useKangurGameContext();
  const questions = getKangurQuestions(mode);
  const [current, setCurrent] = useState(0);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  const handleAnswer = (correct: boolean): void => {
    const newScore = correct ? score + 1 : score;
    if (correct) {
      setScore(newScore);
    }

    if (current + 1 >= questions.length) {
      const progress = loadProgress();
      const isPerfect = newScore === questions.length;
      const xp = isPerfect
        ? XP_REWARDS.perfect_game
        : newScore >= Math.ceil(questions.length * 0.7)
          ? XP_REWARDS.great_game
          : XP_REWARDS.good_game;

      addXp(xp, {
        gamesPlayed: progress.gamesPlayed + 1,
        perfectGames: isPerfect ? progress.perfectGames + 1 : progress.perfectGames,
      });
      setScore(newScore);
      setFinished(true);
    } else {
      setCurrent((previous) => previous + 1);
    }
  };

  const handleRestart = (): void => {
    setCurrent(0);
    setScore(0);
    setFinished(false);
  };

  if (finished) {
    return <ResultView score={score} total={questions.length} onRestart={handleRestart} />;
  }

  const activeQuestion = questions[current];
  if (!activeQuestion) {
    return <ResultView score={score} total={questions.length} onRestart={handleRestart} />;
  }

  return (
    <AnimatePresence mode='wait'>
      <motion.div
        key={current}
        initial={{ opacity: 0, x: 30 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -30 }}
        className='w-full'
      >
        <QuestionView
          q={activeQuestion}
          qIndex={current}
          total={questions.length}
          onAnswer={handleAnswer}
        />
      </motion.div>
    </AnimatePresence>
  );
}

function KangurGameContent(): React.JSX.Element {
  const { mode } = useKangurGameContext();
  if (isExamMode(mode)) {
    return <KangurExam />;
  }
  return <PracticeModeGame />;
}

export default function KangurGame(): React.JSX.Element {
  return <KangurGameContent />;
}
