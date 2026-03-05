import { motion } from 'framer-motion';
import { Trophy, RotateCcw, Home } from 'lucide-react';

export default function ResultScreen({
  score,
  total,
  playerName,
  operation,
  timeTaken,
  onRestart,
  onHome,
}) {
  const pct = Math.round((score / total) * 100);
  const stars = pct >= 90 ? 3 : pct >= 60 ? 2 : 1;

  const message =
    pct === 100
      ? 'Idealny wynik! Jesteś gwiazdą matematyki! 🌟'
      : pct >= 80
        ? 'Niesamowita robota! Tak trzymaj! 🎉'
        : pct >= 60
          ? 'Dobra robota! Ćwiczenie czyni mistrza! 💪'
          : 'Próbuj dalej — dasz radę! 🚀';

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      className='flex flex-col items-center gap-6 text-center'
    >
      <div className='text-6xl'>
        {'⭐'.repeat(stars)}
        {'☆'.repeat(3 - stars)}
      </div>
      <h2 className='text-3xl font-extrabold text-gray-800'>Świetna robota, {playerName}!</h2>
      <p className='text-gray-500 text-lg'>{message}</p>

      <div className='bg-white rounded-3xl shadow-xl p-8 w-full max-w-sm flex flex-col gap-3'>
        <div className='flex justify-between text-lg'>
          <span className='text-gray-500'>Wynik</span>
          <span className='font-bold text-indigo-600'>
            {score} / {total}
          </span>
        </div>
        <div className='flex justify-between text-lg'>
          <span className='text-gray-500'>Dokładność</span>
          <span className='font-bold text-green-500'>{pct}%</span>
        </div>
        <div className='flex justify-between text-lg'>
          <span className='text-gray-500'>Czas</span>
          <span className='font-bold text-orange-400'>{timeTaken}s</span>
        </div>
        <div className='flex justify-between text-lg'>
          <span className='text-gray-500'>Temat</span>
          <span className='font-bold text-purple-500 capitalize'>{operation}</span>
        </div>
        <div className='w-full bg-gray-100 rounded-full h-4 mt-2'>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${pct}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className='h-4 rounded-full bg-gradient-to-r from-indigo-400 to-purple-500'
          />
        </div>
      </div>

      <div className='flex gap-4'>
        <button
          onClick={onRestart}
          className='flex items-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white font-bold px-6 py-3 rounded-2xl shadow transition'
        >
          <RotateCcw className='w-5 h-5' /> Zagraj ponownie
        </button>
        <button
          onClick={onHome}
          className='flex items-center gap-2 bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold px-6 py-3 rounded-2xl shadow transition'
        >
          <Home className='w-5 h-5' /> Strona główna
        </button>
      </div>
    </motion.div>
  );
}
