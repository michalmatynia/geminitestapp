import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, CheckCircle, XCircle } from 'lucide-react';
import { getKangurQuestions, isExamMode } from './kangurQuestions';
import KangurExam from './KangurExam';
import { addXp, XP_REWARDS, loadProgress } from '@/features/kangur/legacy/components/progress/progressSystem';
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
} from './KangurIllustrations';

const ILLUSTRATIONS = {
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

function QuestionView({ q, qIndex, total, onAnswer }) {
  const [selected, setSelected] = useState(null);
  const [confirmed, setConfirmed] = useState(false);

  const choices = q.choices || [];

  const handleSelect = (choice) => {
    if (confirmed) return;
    setSelected(choice);
  };

  const handleConfirm = () => {
    if (!selected || confirmed) return;
    setConfirmed(true);
    const correct = selected === q.answer;
    setTimeout(() => onAnswer(correct), 1400);
  };

  return (
    <div className='flex flex-col gap-4 w-full'>
      {/* Progress */}
      <div className='flex items-center gap-2'>
        <div className='flex-1 h-2 bg-gray-100 rounded-full overflow-hidden'>
          <div
            style={{ width: `${(qIndex / total) * 100}%` }}
            className='h-full bg-gradient-to-r from-orange-400 to-yellow-400 rounded-full transition-all duration-500'
          />
        </div>
        <span className='text-xs font-bold text-gray-400'>
          {qIndex + 1}/{total}
        </span>
      </div>

      {/* Question */}
      <div className='bg-white rounded-2xl shadow p-5 flex flex-col gap-3'>
        <div className='flex items-center justify-between mb-1'>
          <p className='text-sm font-bold text-orange-500 uppercase tracking-wide'>
            Pytanie {qIndex + 1}
          </p>
          {q.id?.startsWith('2024_') && (
            <span className='text-xs font-bold bg-green-100 text-green-700 border border-green-300 rounded-full px-2 py-0.5'>
              ⭐ 3 pkt (łatwe)
            </span>
          )}
        </div>
        <p className='text-gray-800 font-semibold leading-relaxed'>{q.question}</p>
        {ILLUSTRATIONS[q.id] &&
          (() => {
            const Illus = ILLUSTRATIONS[q.id];
            return (
              <div className='bg-gray-50 rounded-xl p-3 border border-gray-100'>
                <Illus />
              </div>
            );
          })()}
      </div>

      {/* Choices */}
      <div className='flex flex-col gap-2'>
        {choices.map((choice, i) => {
          let style = 'bg-white border-2 border-gray-200 text-gray-700 hover:border-orange-400';
          if (confirmed) {
            if (choice === q.answer)
              style = 'bg-green-100 border-2 border-green-500 text-green-800';
            else if (choice === selected) style = 'bg-red-100 border-2 border-red-400 text-red-700';
            else style = 'bg-white border-2 border-gray-100 text-gray-400 opacity-60';
          } else if (choice === selected) {
            style = 'bg-orange-50 border-2 border-orange-400 text-orange-800';
          }

          return (
            <motion.button
              key={i}
              whileHover={!confirmed ? { scale: 1.02 } : {}}
              whileTap={!confirmed ? { scale: 0.98 } : {}}
              onClick={() => handleSelect(choice)}
              className={`w-full text-left px-4 py-3 rounded-xl font-semibold transition-all flex items-center gap-3 ${style}`}
            >
              <span className='w-7 h-7 rounded-full bg-orange-100 text-orange-600 font-extrabold text-sm flex items-center justify-center flex-shrink-0'>
                {String.fromCharCode(65 + i)}
              </span>
              <span>{choice}</span>
              {confirmed && choice === q.answer && (
                <CheckCircle className='w-4 h-4 text-green-600 ml-auto flex-shrink-0' />
              )}
              {confirmed && choice === selected && choice !== q.answer && (
                <XCircle className='w-4 h-4 text-red-500 ml-auto flex-shrink-0' />
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Explanation after answer */}
      {confirmed && q.explanation && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className='bg-blue-50 border border-blue-200 rounded-xl p-3 text-sm text-blue-800'
        >
          💡 {q.explanation}
        </motion.div>
      )}

      {/* Confirm button */}
      {!confirmed && (
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={handleConfirm}
          disabled={!selected}
          className='w-full py-3 rounded-2xl font-extrabold text-white bg-gradient-to-r from-orange-400 to-yellow-400 shadow disabled:opacity-40 transition'
        >
          Zatwierdź odpowiedź ✓
        </motion.button>
      )}
    </div>
  );
}

function ResultView({ score, total, mode, onRestart, onBack }) {
  const pct = Math.round((score / total) * 100);
  const emoji = pct === 100 ? '🏆' : pct >= 70 ? '🌟' : pct >= 40 ? '👍' : '💪';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className='bg-white rounded-3xl shadow-xl p-8 flex flex-col items-center gap-4 text-center w-full'
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
      <div className='w-full bg-gray-100 rounded-full h-4 overflow-hidden'>
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 0.8 }}
          className='h-full bg-gradient-to-r from-orange-400 to-yellow-400 rounded-full'
        />
      </div>
      <p className='text-sm text-gray-400'>{pct}% poprawnych odpowiedzi</p>
      <div className='flex gap-3 w-full'>
        <button
          onClick={onBack}
          className='flex-1 py-2.5 rounded-2xl font-bold border-2 border-gray-200 text-gray-500 hover:bg-gray-50 transition'
        >
          Menu
        </button>
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
          onClick={onRestart}
          className='flex-1 py-2.5 rounded-2xl font-extrabold text-white bg-gradient-to-r from-orange-400 to-yellow-400 shadow'
        >
          Spróbuj ponownie 🔁
        </motion.button>
      </div>
    </motion.div>
  );
}

export default function KangurGame({ mode, onBack }) {
  if (isExamMode(mode)) {
    return <KangurExam mode={mode} onBack={onBack} />;
  }

  const questions = getKangurQuestions(mode);
  const [current, setCurrent] = useState(0);
  const [score, setScore] = useState(0);
  const [finished, setFinished] = useState(false);

  const handleAnswer = (correct) => {
    const newScore = correct ? score + 1 : score;
    if (correct) setScore(newScore);

    if (current + 1 >= questions.length) {
      // Award XP
      const prog = loadProgress();
      const isPerfect = newScore === questions.length;
      const xp = isPerfect
        ? XP_REWARDS.perfect_game
        : newScore >= Math.ceil(questions.length * 0.7)
          ? XP_REWARDS.great_game
          : XP_REWARDS.good_game;
      addXp(xp, {
        gamesPlayed: prog.gamesPlayed + 1,
        perfectGames: isPerfect ? prog.perfectGames + 1 : prog.perfectGames,
      });
      setScore(newScore);
      setFinished(true);
    } else {
      setCurrent((c) => c + 1);
    }
  };

  const handleRestart = () => {
    setCurrent(0);
    setScore(0);
    setFinished(false);
  };

  if (finished) {
    return (
      <ResultView
        score={score}
        total={questions.length}
        mode={mode}
        onRestart={handleRestart}
        onBack={onBack}
      />
    );
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
          q={questions[current]}
          qIndex={current}
          total={questions.length}
          onAnswer={handleAnswer}
        />
      </motion.div>
    </AnimatePresence>
  );
}
