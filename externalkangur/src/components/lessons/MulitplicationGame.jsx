import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { RefreshCw } from 'lucide-react';

const TOTAL = 8;

function generateQuestion(round) {
  // Two modes: pick answer OR fill in the blank (which factor is missing?)
  const useBlank = round % 2 === 1;
  const a = Math.floor(Math.random() * 9) + 2; // 2-10
  const b = Math.floor(Math.random() * 9) + 2; // 2-10
  const correct = a * b;

  if (useBlank) {
    // show "? × b = correct" or "a × ? = correct"
    const missingA = Math.random() < 0.5;
    const shown = missingA ? b : a;
    const missing = missingA ? a : b;
    const wrongs = new Set();
    while (wrongs.size < 3) {
      const w = missing + (Math.floor(Math.random() * 4) + 1) * (Math.random() < 0.5 ? 1 : -1);
      if (w > 0 && w !== missing && w <= 12) wrongs.add(w);
    }
    if (wrongs.size < 3) {
      wrongs.add(missing + 1);
      wrongs.add(missing + 2);
    }
    const choices = [...wrongs, missing].sort(() => Math.random() - 0.5);
    return { type: 'blank', a, b, correct: missing, product: correct, shown, missingA, choices };
  }

  const wrongs = new Set();
  while (wrongs.size < 3) {
    const w = correct + (Math.floor(Math.random() * 6) + 1) * (Math.random() < 0.5 ? 1 : -1);
    if (w > 0 && w !== correct) wrongs.add(w);
  }
  const choices = [...wrongs, correct].sort(() => Math.random() - 0.5);
  return { type: 'result', a, b, correct, choices };
}

// Grid visual: show a×b grid of colored dots
function MultiplyGrid({ a, b }) {
  if (a > 8 || b > 8) return null;
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

export default function MultiplicationGame({ onFinish }) {
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
            className='h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full'
          />
        </div>
        <p className='text-gray-500'>
          {pct === 100
            ? 'Idealnie! Mistrz tabliczki!'
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
            className='flex-1 py-2 rounded-2xl bg-gradient-to-r from-purple-500 to-indigo-500 text-white font-bold shadow hover:opacity-90 transition'
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
            className='h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full transition-all duration-500'
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
          {q.type === 'result' ? (
            <>
              <p className='text-xs font-bold text-purple-400 uppercase tracking-wide'>
                Ile wynosi iloczyn?
              </p>
              <p className='text-3xl font-extrabold text-purple-600'>
                {q.a} × {q.b} = <span className='text-gray-400'>?</span>
              </p>
              <MultiplyGrid a={q.a} b={q.b} />
            </>
          ) : (
            <>
              <p className='text-xs font-bold text-purple-400 uppercase tracking-wide'>
                Znajdź brakujący czynnik
              </p>
              <p className='text-3xl font-extrabold text-purple-600'>
                {q.missingA ? (
                  <>
                    <span className='text-gray-400'>?</span> × {q.shown}
                  </>
                ) : (
                  <>
                    {q.shown} × <span className='text-gray-400'>?</span>
                  </>
                )}
                {' = '}
                {q.product}
              </p>
            </>
          )}

          <div className='grid grid-cols-2 gap-2 w-full'>
            {q.choices.map((c, i) => {
              let cls = 'border-2 border-gray-200 text-gray-700 hover:border-purple-400 bg-white';
              if (confirmed) {
                if (c === q.correct) cls = 'border-2 border-green-400 bg-green-100 text-green-800';
                else if (c === selected) cls = 'border-2 border-red-400 bg-red-100 text-red-700';
                else cls = 'border-2 border-gray-100 text-gray-300 bg-white opacity-50';
              } else if (c === selected) {
                cls = 'border-2 border-purple-400 bg-purple-50 text-purple-700';
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
