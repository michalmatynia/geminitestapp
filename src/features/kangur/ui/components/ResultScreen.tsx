import { motion } from 'framer-motion';
import { Home, RotateCcw } from 'lucide-react';

import { KangurButton, KangurPanel } from '@/features/kangur/ui/design/primitives';
import type { KangurOperation } from '@/features/kangur/ui/types';

export type ResultScreenProps = {
  score: number;
  total: number;
  playerName: string;
  operation: KangurOperation | null;
  timeTaken: number;
  onRestart: () => void;
  onHome: () => void;
};

export default function ResultScreen({
  score,
  total,
  playerName,
  operation,
  timeTaken,
  onRestart,
  onHome,
}: ResultScreenProps): React.JSX.Element {
  const percent = total > 0 ? Math.round((score / total) * 100) : 0;
  const stars = percent >= 90 ? 3 : percent >= 60 ? 2 : 1;

  const message =
    percent === 100
      ? 'Idealny wynik! Jestes gwiazda matematyki! 🌟'
      : percent >= 80
        ? 'Niesamowita robota! Tak trzymaj! 🎉'
        : percent >= 60
          ? 'Dobra robota! Cwiczenie czyni mistrza! 💪'
          : 'Probuj dalej. Dasz rade! 🚀';

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
      <h2 className='text-3xl font-extrabold text-slate-800'>Swietna robota, {playerName}!</h2>
      <p className='text-lg text-slate-500'>{message}</p>

      <KangurPanel className='w-full max-w-sm flex flex-col gap-3' padding='xl' variant='elevated'>
        <div className='flex justify-between text-lg'>
          <span className='text-slate-500'>Wynik</span>
          <span className='font-bold text-indigo-600'>
            {score} / {total}
          </span>
        </div>
        <div className='flex justify-between text-lg'>
          <span className='text-slate-500'>Dokladnosc</span>
          <span className='font-bold text-green-500'>{percent}%</span>
        </div>
        <div className='flex justify-between text-lg'>
          <span className='text-slate-500'>Czas</span>
          <span className='font-bold text-amber-500'>{timeTaken}s</span>
        </div>
        <div className='flex justify-between text-lg'>
          <span className='text-slate-500'>Temat</span>
          <span className='font-bold text-purple-500 capitalize'>{operation ?? 'mixed'}</span>
        </div>
        <div className='w-full bg-gray-100 rounded-full h-4 mt-2'>
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${percent}%` }}
            transition={{ duration: 0.8, ease: 'easeOut' }}
            className='h-4 rounded-full bg-gradient-to-r from-indigo-400 to-purple-500'
          />
        </div>
      </KangurPanel>

      <div className='flex gap-4'>
        <KangurButton onClick={onRestart} size='lg' variant='primary'>
          <RotateCcw className='w-5 h-5' /> Zagraj ponownie
        </KangurButton>
        <KangurButton onClick={onHome} size='lg' variant='secondary'>
          <Home className='w-5 h-5' /> Strona glowna
        </KangurButton>
      </div>
    </motion.div>
  );
}
