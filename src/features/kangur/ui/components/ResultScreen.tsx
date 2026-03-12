import { motion } from 'framer-motion';
import { Home, RotateCcw } from 'lucide-react';

import {
  KangurButton,
  KangurDisplayEmoji,
  KangurGlassPanel,
  KangurHeadline,
  KangurProgressBar,
} from '@/features/kangur/ui/design/primitives';
import type { KangurOperation } from '@/features/kangur/ui/types';

const OPERATION_LABELS: Partial<Record<KangurOperation, string>> = {
  addition: 'Dodawanie',
  subtraction: 'Odejmowanie',
  multiplication: 'Mnożenie',
  division: 'Dzielenie',
  decimals: 'Ułamki',
  powers: 'Potęgi',
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
  const handleRestartGame = (): void => {
    onRestart();
  };
  const handleGoHome = (): void => {
    onHome();
  };

  const message =
    percent === 100
      ? 'Idealny wynik! Jesteś gwiazdą matematyki! 🌟'
      : percent >= 80
        ? 'Niesamowita robota! Tak trzymaj! 🎉'
        : percent >= 60
          ? 'Dobra robota! Ćwiczenie czyni mistrza! 💪'
          : 'Próbuj dalej. Dasz radę! 🚀';

  return (
    <motion.div
      aria-labelledby='kangur-result-heading'
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      className='flex w-full flex-col items-center gap-6 text-center'
    >
      <KangurDisplayEmoji aria-hidden='true' data-testid='result-screen-emoji' size='lg'>
        {'⭐'.repeat(stars)}
        {'☆'.repeat(3 - stars)}
      </KangurDisplayEmoji>
      <p className='sr-only'>{`Ocena: ${stars} z 3 gwiazdek.`}</p>
      <KangurHeadline
        as='h2'
        data-testid='result-screen-title'
        id='kangur-result-heading'
        size='lg'
      >
        Świetna robota, {playerName}!
      </KangurHeadline>
      <p
        role='status'
        aria-live='polite'
        className='text-lg [color:var(--kangur-page-muted-text)]'
      >
        {message}
      </p>

      <KangurGlassPanel
        className='w-full max-w-sm flex flex-col gap-3 shadow-[0_18px_40px_-30px_rgba(168,175,216,0.2)]'
        data-testid='result-screen-shell'
        padding='xl'
        surface='solid'
        variant='soft'
      >
        <dl className='space-y-3 text-lg'>
          <div className='flex flex-col gap-1 text-left sm:flex-row sm:items-center sm:justify-between sm:gap-4'>
            <dt className='[color:var(--kangur-page-muted-text)]'>Wynik</dt>
            <dd className='font-bold text-indigo-600'>
              {score} / {total}
            </dd>
          </div>
          <div className='flex flex-col gap-1 text-left sm:flex-row sm:items-center sm:justify-between sm:gap-4'>
            <dt className='[color:var(--kangur-page-muted-text)]'>Dokładność</dt>
            <dd className='font-bold text-green-500'>{percent}%</dd>
          </div>
          <div className='flex flex-col gap-1 text-left sm:flex-row sm:items-center sm:justify-between sm:gap-4'>
            <dt className='[color:var(--kangur-page-muted-text)]'>Czas</dt>
            <dd className='font-bold text-amber-500'>{timeTaken}s</dd>
          </div>
          <div className='flex flex-col gap-1 text-left sm:flex-row sm:items-center sm:justify-between sm:gap-4'>
            <dt className='[color:var(--kangur-page-muted-text)]'>Temat</dt>
            <dd className='font-bold text-purple-500'>{operationLabel}</dd>
          </div>
        </dl>
        <KangurProgressBar
          accent='indigo'
          animated
          aria-label='Dokładność odpowiedzi'
          aria-valuetext={`${percent}% poprawnych odpowiedzi`}
          className='mt-2'
          data-testid='result-screen-progress-bar'
          size='lg'
          value={percent}
        />
      </KangurGlassPanel>

      <div className='flex w-full flex-col gap-3 sm:flex-row sm:justify-center sm:gap-4'>
        <KangurButton className='w-full sm:w-auto' onClick={handleRestartGame} size='lg' variant='primary'>
          <RotateCcw className='w-5 h-5' /> Zagraj ponownie
        </KangurButton>
        <KangurButton className='w-full sm:w-auto' onClick={handleGoHome} size='lg' variant='surface'>
          <Home className='w-5 h-5' /> Strona główna
        </KangurButton>
      </div>
    </motion.div>
  );
}
