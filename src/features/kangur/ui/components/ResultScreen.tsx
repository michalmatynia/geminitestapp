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
import { useKangurCoarsePointer } from '@/features/kangur/ui/hooks/useKangurCoarsePointer';
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

const resolveResultPercent = (score: number, total: number): number =>
  total > 0 ? Math.round((score / total) * 100) : 0;

const resolveResultStars = (percent: number): number => {
  if (percent >= 90) {
    return 3;
  }
  if (percent >= 60) {
    return 2;
  }
  return 1;
};

const resolveResultOperationLabel = (
  operation: KangurOperation | null,
  translations: ReturnType<typeof useTranslations<'KangurMiniGames'>>
): string =>
  operation
    ? translations(`resultScreen.operations.${operation}`)
    : translations('resultScreen.operations.mixed');

const resolveResultSummaryMessage = (
  percent: number,
  translations: ReturnType<typeof useTranslations<'KangurMiniGames'>>
): string => {
  if (percent === 100) {
    return translations('resultScreen.summary.perfect');
  }
  if (percent >= 80) {
    return translations('resultScreen.summary.excellent');
  }
  if (percent >= 60) {
    return translations('resultScreen.summary.good');
  }
  return translations('resultScreen.summary.retry');
};

const resolveResultActionClassName = (isCoarsePointer: boolean): string =>
  isCoarsePointer
    ? 'w-full min-h-11 px-4 touch-manipulation select-none active:scale-[0.97] sm:w-auto'
    : 'w-full sm:w-auto';

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
  const isCoarsePointer = useKangurCoarsePointer();
  const percent = resolveResultPercent(score, total);
  const stars = resolveResultStars(percent);
  const operationLabel = resolveResultOperationLabel(operation, translations);
  const actionClassName = resolveResultActionClassName(isCoarsePointer);
  const handleRestartGame = (): void => {
    onRestart();
  };
  const handleGoHome = (): void => {
    onHome();
  };
  const message = resolveResultSummaryMessage(percent, translations);

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
        <div className='space-y-3 text-lg'>
          <KangurPanelRow className='text-left sm:items-center sm:justify-between'>
            <span className='[color:var(--kangur-page-muted-text)]'>
              {translations('resultScreen.stats.score')}
            </span>
            <span className='font-bold text-indigo-600'>
              {score} / {total}
            </span>
          </KangurPanelRow>
          <KangurPanelRow className='text-left sm:items-center sm:justify-between'>
            <span className='[color:var(--kangur-page-muted-text)]'>
              {translations('resultScreen.stats.accuracy')}
            </span>
            <span className='font-bold text-green-500'>{percent}%</span>
          </KangurPanelRow>
          <KangurPanelRow className='text-left sm:items-center sm:justify-between'>
            <span className='[color:var(--kangur-page-muted-text)]'>
              {translations('resultScreen.stats.time')}
            </span>
            <span className='font-bold text-amber-500'>{timeTaken}s</span>
          </KangurPanelRow>
          <KangurPanelRow className='text-left sm:items-center sm:justify-between'>
            <span className='[color:var(--kangur-page-muted-text)]'>
              {translations('resultScreen.stats.topic')}
            </span>
            <span className='font-bold text-purple-500'>{operationLabel}</span>
          </KangurPanelRow>
        </div>
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
          className={actionClassName}
          onClick={handleRestartGame}
          size='lg'
          variant='primary'
        >
          <RotateCcw aria-hidden='true' className='w-5 h-5' /> {translations('resultScreen.actions.restart')}
        </KangurButton>
        <KangurButton
          className={actionClassName}
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
