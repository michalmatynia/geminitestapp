import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { RefreshCw } from 'lucide-react';

import {
  addXp,
  createLessonPracticeReward,
  loadProgress,
} from '@/features/kangur/ui/services/progress';
import { scheduleKangurRoundFeedback } from '@/features/kangur/ui/services/round-transition';

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
            className='h-full bg-gradient-to-r from-red-400 to-pink-400 rounded-full'
          />
        </div>
        <p className='text-gray-500'>
          {percent === 100
            ? 'Idealnie! Mistrz odejmowania!'
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
            className='flex-1 py-2 rounded-2xl bg-gradient-to-r from-red-400 to-pink-400 text-white font-bold shadow hover:opacity-90 transition'
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
            className='h-full bg-gradient-to-r from-red-400 to-pink-400 rounded-full transition-all duration-500'
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
          <p className='text-3xl font-extrabold text-red-500'>
            {question.a} − {question.b} = <span className='text-gray-400'>?</span>
          </p>
          <AppleVisual a={question.a} b={question.b} />
          <div className='grid grid-cols-2 gap-2 w-full'>
            {question.choices.map((choice, index) => {
              let className =
                'border-2 border-gray-200 text-gray-700 hover:border-red-400 bg-white';
              if (confirmed) {
                if (choice === question.correct) {
                  className = 'border-2 border-green-400 bg-green-100 text-green-800';
                } else if (choice === selected) {
                  className = 'border-2 border-red-400 bg-red-100 text-red-700';
                } else {
                  className = 'border-2 border-gray-100 text-gray-300 bg-white opacity-50';
                }
              } else if (choice === selected) {
                className = 'border-2 border-red-400 bg-red-50 text-red-700';
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
              className='w-full py-2 rounded-2xl bg-gradient-to-r from-red-400 to-pink-400 text-white font-extrabold disabled:opacity-40 transition'
            >
              Sprawdź ✓
            </button>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
