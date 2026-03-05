import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw } from 'lucide-react';

const TOTAL = 7;

function generateQuestion(round) {
  const withRemainder = round >= 3;
  const b = Math.floor(Math.random() * 8) + 2; // divisor 2-9
  const quotient = Math.floor(Math.random() * 9) + 1;
  const remainder = withRemainder ? Math.floor(Math.random() * (b - 1)) : 0;
  const a = b * quotient + remainder;

  if (withRemainder) {
    // Ask for the remainder
    const correct = remainder;
    const wrongs = new Set();
    while (wrongs.size < 3) {
      const w = Math.floor(Math.random() * b);
      if (w !== correct) wrongs.add(w);
    }
    const choices = [...wrongs, correct].sort(() => Math.random() - 0.5);
    return {
      type: 'remainder',
      a,
      b,
      quotient,
      correct,
      remainder,
      choices,
      label: `${a} ÷ ${b} = ${quotient} reszta ?`,
    };
  }

  // Ask for quotient (no remainder)
  const correct = quotient;
  const wrongs = new Set();
  while (wrongs.size < 3) {
    const w = correct + (Math.floor(Math.random() * 4) + 1) * (Math.random() < 0.5 ? 1 : -1);
    if (w > 0 && w !== correct) wrongs.add(w);
  }
  const choices = [...wrongs, correct].sort(() => Math.random() - 0.5);
  return { type: 'quotient', a, b, correct, choices, label: `${a} ÷ ${b} = ?` };
}

// Visual: share items among groups
function ShareVisual({ a, b, quotient }) {
  if (a > 20 || b > 6) return null;
  const emojis = ['🍪', '🍎', '🍬', '🌟', '⚽'];
  const emoji = emojis[b % emojis.length];
  const groups = Array.from({ length: b }, (_, gi) =>
    Array.from({ length: quotient }, (_, ii) => ({ gi, ii }))
  );
  return (
    <div className='flex flex-wrap gap-2 justify-center max-w-xs'>
      {groups.map((group, gi) => (
        <div
          key={gi}
          className='flex flex-col items-center gap-0.5 bg-blue-50 rounded-xl p-2 border border-blue-100'
        >
          <p className='text-xs text-blue-400 font-bold'>{gi + 1}</p>
          <div className='flex flex-wrap gap-0.5 justify-center max-w-[60px]'>
            {group.map((_, ii) => (
              <span key={ii} className='text-lg'>
                {emoji}
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

export default function DivisionGame({ onFinish }) {
  const [roundIdx, setRoundIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [question, setQuestion] = useState(() => generateQuestion(0));
  const [selected, setSelected] = useState(null);
  const [confirmed, setConfirmed] = useState(false);

  const handleSelect = (choice) => {
    if (confirmed) return;
    setSelected(choice);
  };

  const handleConfirm = () => {
    if (selected === null || confirmed) return;
    setConfirmed(true);
    const correct = selected === question.correct;
    const newScore = correct ? score + 1 : score;
    setTimeout(() => {
      if (roundIdx + 1 >= TOTAL) {
        setScore(newScore);
        setDone(true);
      } else {
        setScore(newScore);
        setRoundIdx((r) => r + 1);
        setQuestion(generateQuestion(roundIdx + 1));
        setSelected(null);
        setConfirmed(false);
      }
    }, 1200);
  };

  if (done) {
    const pct = Math.round((score / TOTAL) * 100);
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className='flex flex-col items-center gap-4 bg-white rounded-3xl shadow-xl p-8 text-center w-full max-w-sm'
      >
        <div className='text-6xl'>{pct === 100 ? '🏆' : pct >= 60 ? '🌟' : '💪'}</div>
        <h2 className='text-2xl font-extrabold text-gray-800'>
          Wynik: {score}/{TOTAL}
        </h2>
        <div className='w-full bg-gray-100 rounded-full h-3'>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.8 }}
            className='h-full bg-gradient-to-r from-blue-500 to-teal-400 rounded-full'
          />
        </div>
        <p className='text-gray-500'>
          {pct === 100
            ? 'Idealnie! Mistrz dzielenia!'
            : pct >= 60
              ? 'Świetna robota!'
              : 'Ćwicz dalej!'}
        </p>
        <div className='flex gap-3 w-full'>
          <button
            onClick={() => {
              setRoundIdx(0);
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

  const q = question;

  return (
    <div className='flex flex-col items-center gap-4 w-full max-w-sm'>
      <div className='flex items-center gap-2 w-full'>
        <div className='flex-1 h-2 bg-gray-100 rounded-full overflow-hidden'>
          <div
            style={{ width: `${(roundIdx / TOTAL) * 100}%` }}
            className='h-full bg-gradient-to-r from-blue-500 to-teal-400 rounded-full transition-all duration-500'
          />
        </div>
        <span className='text-xs font-bold text-gray-400'>
          {roundIdx + 1}/{TOTAL}
        </span>
      </div>

      <AnimatePresence mode='wait'>
        <motion.div
          key={roundIdx}
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -20 }}
          className='bg-white rounded-3xl shadow-xl p-6 w-full flex flex-col items-center gap-4'
        >
          <p className='text-xs font-bold text-blue-400 uppercase tracking-wide'>
            {q.type === 'remainder' ? 'Jaka jest reszta?' : 'Ile wynosi iloraz?'}
          </p>
          <p className='text-3xl font-extrabold text-blue-600'>{q.label}</p>

          {q.type === 'quotient' && <ShareVisual a={q.a} b={q.b} quotient={q.quotient} />}

          {q.type === 'remainder' && (
            <div className='bg-teal-50 border border-teal-200 rounded-2xl p-3 text-center text-sm text-teal-700'>
              <p>
                {q.a} = {q.b} × {q.quotient} + <span className='font-extrabold text-lg'>?</span>
              </p>
              <p className='text-xs text-gray-400 mt-1'>Ile zostaje po podzieleniu?</p>
            </div>
          )}

          <div className='grid grid-cols-2 gap-2 w-full'>
            {q.choices.map((c, i) => {
              let cls = 'border-2 border-gray-200 text-gray-700 hover:border-blue-400 bg-white';
              if (confirmed) {
                if (c === q.correct) cls = 'border-2 border-green-400 bg-green-100 text-green-800';
                else if (c === selected) cls = 'border-2 border-red-400 bg-red-100 text-red-700';
                else cls = 'border-2 border-gray-100 text-gray-300 bg-white opacity-50';
              } else if (c === selected) {
                cls = 'border-2 border-blue-400 bg-blue-50 text-blue-700';
              }
              return (
                <motion.button
                  key={i}
                  whileHover={!confirmed ? { scale: 1.04 } : {}}
                  whileTap={!confirmed ? { scale: 0.96 } : {}}
                  onClick={() => handleSelect(c)}
                  className={`py-3 rounded-2xl font-extrabold text-xl transition-all ${cls}`}
                >
                  {c}
                </motion.button>
              );
            })}
          </div>

          {confirmed && (
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className={`text-lg font-extrabold ${selected === q.correct ? 'text-green-600' : 'text-red-500'}`}
            >
              {selected === q.correct ? '🎉 Brawo!' : `❌ Odpowiedź: ${q.correct}`}
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
