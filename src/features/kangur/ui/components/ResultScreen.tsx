import { motion } from 'framer-motion';
import { Home, RotateCcw } from 'lucide-react';

import {
  KangurButton,
  KangurDisplayEmoji,
  KangurPanel,
  KangurProgressBar,
} from '@/features/kangur/ui/design/primitives';
import type { KangurOperation } from '@/features/kangur/ui/types';

const OPERATION_LABELS: Partial<Record<KangurOperation, string>> = {
  addition: 'Dodawanie',
  subtraction: 'Odejmowanie',
  multiplication: 'Mnozenie',
  division: 'Dzielenie',
  decimals: 'Ulamki',
  powers: 'Potegi',
  roots: 'Pierwiastki',
  clock: 'Zegar',
  mixed: 'Mieszane',
};

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
  const operationLabel = operation ? OPERATION_LABELS[operation] ?? operation : 'Mieszane';

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
      aria-labelledby='kangur-result-heading'
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      className='flex flex-col items-center gap-6 text-center'
    >
      <KangurDisplayEmoji aria-hidden='true' data-testid='result-screen-emoji' size='lg'>
        {'⭐'.repeat(stars)}
        {'☆'.repeat(3 - stars)}
      </KangurDisplayEmoji>
      <p className='sr-only'>{`Ocena: ${stars} z 3 gwiazdek.`}</p>
      <h2 id='kangur-result-heading' className='text-3xl font-extrabold text-slate-800'>
        Swietna robota, {playerName}!
      </h2>
      <p role='status' aria-live='polite' className='text-lg text-slate-500'>
        {message}
      </p>

      <KangurPanel className='w-full max-w-sm flex flex-col gap-3' padding='xl' variant='elevated'>
        <dl className='space-y-3 text-lg'>
          <div className='flex justify-between gap-4'>
            <dt className='text-slate-500'>Wynik</dt>
            <dd className='font-bold text-indigo-600'>
              {score} / {total}
            </dd>
          </div>
          <div className='flex justify-between gap-4'>
            <dt className='text-slate-500'>Dokladnosc</dt>
            <dd className='font-bold text-green-500'>{percent}%</dd>
          </div>
          <div className='flex justify-between gap-4'>
            <dt className='text-slate-500'>Czas</dt>
            <dd className='font-bold text-amber-500'>{timeTaken}s</dd>
          </div>
          <div className='flex justify-between gap-4'>
            <dt className='text-slate-500'>Temat</dt>
            <dd className='font-bold text-purple-500'>{operationLabel}</dd>
          </div>
        </dl>
        <KangurProgressBar
          accent='indigo'
          animated
          aria-label='Dokladnosc odpowiedzi'
          aria-valuetext={`${percent}% poprawnych odpowiedzi`}
          className='mt-2'
          data-testid='result-screen-progress-bar'
          size='lg'
          value={percent}
        />
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
