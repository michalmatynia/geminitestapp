import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { RefreshCw } from 'lucide-react';

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
  return { type: 'quotient', a: dividend, b: divisor, correct, choices, label: `${dividend} ÷ ${divisor} = ?` };
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
    <div className='flex flex-wrap gap-2 justify-center max-w-xs'>
      {groups.map((group, groupIndex) => (
        <div
          key={groupIndex}
          className='flex flex-col items-center gap-0.5 bg-blue-50 rounded-xl p-2 border border-blue-100'
        >
          <p className='text-xs text-blue-400 font-bold'>{groupIndex + 1}</p>
          <div className='flex flex-wrap gap-0.5 justify-center max-w-[60px]'>
            {group.map((_, itemIndex) => (
              <span key={itemIndex} className='text-lg'>
                {emoji}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function DivisionGame({ onFinish }: DivisionGameProps): React.JSX.Element {
  const [roundIndex, setRoundIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
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

    setTimeout(() => {
      if (roundIndex + 1 >= TOTAL) {
        setScore(newScore);
        setDone(true);
      } else {
        setScore(newScore);
        setRoundIndex((current) => current + 1);
        setQuestion(generateQuestion(roundIndex + 1));
        setSelected(null);
        setConfirmed(false);
      }
    }, 1200);
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
        <div className='w-full bg-gray-100 rounded-full h-3'>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percent}%` }}
            transition={{ duration: 0.8 }}
            className='h-full bg-gradient-to-r from-blue-500 to-teal-400 rounded-full'
          />
        </div>
        <p className='text-gray-500'>
          {percent === 100
            ? 'Idealnie! Mistrz dzielenia!'
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
            className='flex-1 py-2 rounded-2xl bg-gradient-to-r from-blue-500 to-teal-400 text-white font-bold shadow hover:opacity-90 transition'
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
            className='h-full bg-gradient-to-r from-blue-500 to-teal-400 rounded-full transition-all duration-500'
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
          <p className='text-xs font-bold text-blue-400 uppercase tracking-wide'>
            {question.type === 'remainder' ? 'Jaka jest reszta?' : 'Ile wynosi iloraz?'}
          </p>
          <p className='text-3xl font-extrabold text-blue-600'>{question.label}</p>

          {question.type === 'quotient' && (
            <ShareVisual a={question.a} b={question.b} quotient={question.correct} />
          )}

          {question.type === 'remainder' && (
            <div className='bg-teal-50 border border-teal-200 rounded-2xl p-3 text-center text-sm text-teal-700'>
              <p>
                {question.a} = {question.b} × {question.quotient} +{' '}
                <span className='font-extrabold text-lg'>?</span>
              </p>
              <p className='text-xs text-gray-400 mt-1'>Ile zostaje po podzieleniu?</p>
            </div>
          )}

          <div className='grid grid-cols-2 gap-2 w-full'>
            {question.choices.map((choice, index) => {
              let className = 'border-2 border-gray-200 text-gray-700 hover:border-blue-400 bg-white';
              if (confirmed) {
                if (choice === question.correct) {
                  className = 'border-2 border-green-400 bg-green-100 text-green-800';
                } else if (choice === selected) {
                  className = 'border-2 border-red-400 bg-red-100 text-red-700';
                } else {
                  className = 'border-2 border-gray-100 text-gray-300 bg-white opacity-50';
                }
              } else if (choice === selected) {
                className = 'border-2 border-blue-400 bg-blue-50 text-blue-700';
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
              className='w-full py-2 rounded-2xl bg-gradient-to-r from-blue-500 to-teal-400 text-white font-extrabold disabled:opacity-40 transition'
            >
              Sprawdź ✓
            </button>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
