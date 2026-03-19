'use client';

import { motion } from 'framer-motion';
import { Home, RotateCcw } from 'lucide-react';
import { useTranslations } from 'next-intl';

import {
  KangurButton,
  KangurDisplayEmoji,
  KangurGlassPanel,
  KangurHeadline,
  KangurPanelRow,
  KangurProgressBar,
} from '@/features/kangur/ui/design/primitives';
import { getKangurMiniGameAccuracyText } from '@/features/kangur/ui/constants/mini-game-i18n';
import { KANGUR_PANEL_GAP_CLASSNAME } from '@/features/kangur/ui/design/tokens';
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
  const translations = useTranslations('KangurMiniGames');
  const percent = total > 0 ? Math.round((score / total) * 100) : 0;
  const stars = percent >= 90 ? 3 : percent >= 60 ? 2 : 1;
  const operationLabel = operation
    ? translations(`resultScreen.operations.${operation}`)
    : translations('resultScreen.operations.mixed');
  const handleRestartGame = (): void => {
    onRestart();
  };
  const handleGoHome = (): void => {
    onHome();
  };

  const message =
    percent === 100
      ? translations('resultScreen.summary.perfect')
      : percent >= 80
        ? translations('resultScreen.summary.excellent')
        : percent >= 60
          ? translations('resultScreen.summary.good')
          : translations('resultScreen.summary.retry');

  return (
    <motion.div
      aria-labelledby='kangur-result-heading'
      initial={{ opacity: 0, scale: 0.85 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`flex w-full flex-col items-center text-center ${KANGUR_PANEL_GAP_CLASSNAME}`}
    >
      <KangurDisplayEmoji aria-hidden='true' data-testid='result-screen-emoji' size='lg'>
        {'⭐'.repeat(stars)}
        {'☆'.repeat(3 - stars)}
      </KangurDisplayEmoji>
      <p className='sr-only'>{translations('resultScreen.starsAria', { stars })}</p>
      <KangurHeadline
        as='h2'
        data-testid='result-screen-title'
        id='kangur-result-heading'
        size='lg'
      >
        {translations('resultScreen.heading')}, {playerName}!
      </KangurHeadline>
      <p
        role='status'
        aria-live='polite'
        className='text-lg [color:var(--kangur-page-muted-text)]'
      >
        {message}
      </p>

      <KangurGlassPanel
        className='w-full max-w-sm flex flex-col kangur-panel-gap shadow-[0_18px_40px_-30px_rgba(168,175,216,0.2)]'
        data-testid='result-screen-shell'
        padding='xl'
        surface='solid'
        variant='soft'
      >
        <dl className='space-y-3 text-lg'>
          <KangurPanelRow className='text-left sm:items-center sm:justify-between'>
            <dt className='[color:var(--kangur-page-muted-text)]'>
              {translations('resultScreen.stats.score')}
            </dt>
            <dd className='font-bold text-indigo-600'>
              {score} / {total}
            </dd>
          </KangurPanelRow>
          <KangurPanelRow className='text-left sm:items-center sm:justify-between'>
            <dt className='[color:var(--kangur-page-muted-text)]'>
              {translations('resultScreen.stats.accuracy')}
            </dt>
            <dd className='font-bold text-green-500'>{percent}%</dd>
          </KangurPanelRow>
          <KangurPanelRow className='text-left sm:items-center sm:justify-between'>
            <dt className='[color:var(--kangur-page-muted-text)]'>
              {translations('resultScreen.stats.time')}
            </dt>
            <dd className='font-bold text-amber-500'>{timeTaken}s</dd>
          </KangurPanelRow>
          <KangurPanelRow className='text-left sm:items-center sm:justify-between'>
            <dt className='[color:var(--kangur-page-muted-text)]'>
              {translations('resultScreen.stats.topic')}
            </dt>
            <dd className='font-bold text-purple-500'>{operationLabel}</dd>
          </KangurPanelRow>
        </dl>
        <KangurProgressBar
          accent='indigo'
          animated
          aria-label={translations('resultScreen.progressAriaLabel')}
          aria-valuetext={getKangurMiniGameAccuracyText(translations, percent)}
          className='mt-2'
          data-testid='result-screen-progress-bar'
          size='lg'
          value={percent}
        />
      </KangurGlassPanel>

      <KangurPanelRow className='w-full sm:justify-center'>
        <KangurButton
          className='w-full sm:w-auto'
          onClick={handleRestartGame}
          size='lg'
          variant='primary'
        >
          <RotateCcw aria-hidden='true' className='w-5 h-5' /> {translations('resultScreen.actions.restart')}
        </KangurButton>
        <KangurButton
          className='w-full sm:w-auto'
          onClick={handleGoHome}
          size='lg'
          variant='surface'
        >
          <Home aria-hidden='true' className='w-5 h-5' /> {translations('resultScreen.actions.home')}
        </KangurButton>
      </KangurPanelRow>
    </motion.div>
  );
}
