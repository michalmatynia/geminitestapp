import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { RefreshCw } from 'lucide-react';

import {
  addXp,
  createLessonPracticeReward,
  loadProgress,
} from '@/features/kangur/ui/services/progress';
import { scheduleKangurRoundFeedback } from '@/features/kangur/ui/services/round-transition';

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
  onFinish,
}: MultiplicationGameProps): React.JSX.Element {
  const [roundIndex, setRoundIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [xpEarned, setXpEarned] = useState(0);
  const [question, setQuestion] = useState<MultiplicationQuestion>(() => generateQuestion(0));
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
        const reward = createLessonPracticeReward(progress, 'multiplication', newScore, TOTAL);
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
        className='flex flex-col items-center gap-4 bg-white rounded-3xl shadow-xl p-8 text-center w-full max-w-sm'
      >
        <div className='text-6xl'>{percent === 100 ? '🏆' : percent >= 60 ? '🌟' : '💪'}</div>
        <h2 className='text-2xl font-extrabold text-gray-800'>
          Wynik: {score}/{TOTAL}
        </h2>
        {xpEarned > 0 && (
          <div className='bg-indigo-100 text-indigo-700 font-bold px-4 py-2 rounded-full text-sm'>
            +{xpEarned} XP ✨
          </div>
        )}
        <div className='w-full bg-gray-100 rounded-full h-3'>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percent}%` }}
            transition={{ duration: 0.8 }}
            className='h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full'
          />
        </div>
        <p className='text-gray-500'>
          {percent === 100
            ? 'Idealnie! Mistrz tabliczki!'
            : percent >= 60
              ? 'Świetna robota!'
              : 'Ćwicz dalej!'}
        </p>
        <div className='flex gap-3 w-full'>
          <button
            onClick={() => {
              setRoundIndex(0);
              setScore(0);
              setDone(false);
              setXpEarned(0);
              setQuestion(generateQuestion(0));
              setSelected(null);
              setConfirmed(false);
            }}
            className='flex-1 flex items-center justify-center gap-2 py-2 rounded-2xl border-2 border-gray-200 text-gray-500 font-bold hover:bg-gray-50 transition'
          >
            <RefreshCw className='w-4 h-4' /> Jeszcze raz
          </button>
          <button
            onClick={onFinish}
            className='flex-1 py-2 rounded-2xl bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-bold shadow hover:opacity-90 transition'
          >
            Wróć do lekcji
          </button>
        </div>
      </motion.div>
    );
  }

  return (
    <div className='flex flex-col items-center gap-4 w-full max-w-sm'>
      <div className='flex items-center gap-2 w-full'>
        <div className='flex-1 h-2 bg-gray-100 rounded-full overflow-hidden'>
          <div
            style={{ width: `${(roundIndex / TOTAL) * 100}%` }}
            className='h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all duration-500'
          />
        </div>
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
          className='bg-white rounded-3xl shadow-xl p-6 w-full flex flex-col items-center gap-4'
        >
          {question.type === 'result' ? (
            <>
              <p className='text-xs font-bold text-purple-400 uppercase tracking-wide'>
                Ile wynosi iloczyn?
              </p>
              <p className='text-3xl font-extrabold text-purple-600'>
                {question.a} × {question.b} = <span className='text-gray-400'>?</span>
              </p>
              <MultiplyGrid a={question.a} b={question.b} />
            </>
          ) : (
            <>
              <p className='text-xs font-bold text-purple-400 uppercase tracking-wide'>
                Znajdź brakujący czynnik
              </p>
              <p className='text-3xl font-extrabold text-purple-600'>
                {question.missingA ? (
                  <>
                    <span className='text-gray-400'>?</span> × {question.shown}
                  </>
                ) : (
                  <>
                    {question.shown} × <span className='text-gray-400'>?</span>
                  </>
                )}
                {' = '}
                {question.product}
              </p>
            </>
          )}

          <div className='grid grid-cols-2 gap-2 w-full'>
            {question.choices.map((choice, index) => {
              let className =
                'border-2 border-gray-200 text-gray-700 hover:border-purple-400 bg-white';
              if (confirmed) {
                if (choice === question.correct) {
                  className = 'border-2 border-green-400 bg-green-100 text-green-800';
                } else if (choice === selected) {
                  className = 'border-2 border-red-400 bg-red-100 text-red-700';
                } else {
                  className = 'border-2 border-gray-100 text-gray-300 bg-white opacity-50';
                }
              } else if (choice === selected) {
                className = 'border-2 border-purple-400 bg-purple-50 text-purple-700';
              }

              return (
                <motion.button
                  key={index}
                  whileHover={!confirmed ? { scale: 1.04 } : {}}
                  whileTap={!confirmed ? { scale: 0.96 } : {}}
                  onClick={() => handleSelect(choice)}
                  className={`py-3 rounded-2xl font-extrabold text-xl transition-all ${className}`}
                >
                  {choice}
                </motion.button>
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
            <button
              onClick={handleConfirm}
              disabled={selected === null}
              className='w-full py-2 rounded-2xl bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-extrabold disabled:opacity-40 transition'
            >
              Sprawdź ✓
            </button>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
