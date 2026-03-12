'use client';

import React from 'react';

import { motion } from 'framer-motion';
import { RefreshCw } from 'lucide-react';

import KangurRewardBreakdownChips from '@/features/kangur/ui/components/KangurRewardBreakdownChips';
import {
  KangurButton,
  KangurDisplayEmoji,
  KangurGlassPanel,
  KangurProgressBar,
  KangurStatusChip,
} from '@/features/kangur/ui/design/primitives';
import type { KangurAccent } from '@/features/kangur/ui/design/tokens';
import type { KangurRewardBreakdownEntry } from '@/features/kangur/ui/types';
import { cn } from '@/shared/utils';

type KangurPracticeGameStageProps = React.HTMLAttributes<HTMLDivElement>;

export function KangurPracticeGameStage({
  className,
  ...props
}: KangurPracticeGameStageProps): React.JSX.Element {
  return (
    <div
      className={cn('flex w-full max-w-sm flex-col items-center gap-4', className)}
      {...props}
    />
  );
}

type KangurPracticeGameProgressProps = {
  accent: KangurAccent;
  currentRound: number;
  dataTestId: string;
  totalRounds: number;
};

export function KangurPracticeGameProgress({
  accent,
  currentRound,
  dataTestId,
  totalRounds,
}: KangurPracticeGameProgressProps): React.JSX.Element {
  return (
    <div className='flex items-center gap-2 w-full'>
      <KangurProgressBar
        accent={accent}
        className='flex-1'
        data-testid={dataTestId}
        size='sm'
        value={(currentRound / totalRounds) * 100}
      />
      <span className='text-xs font-bold [color:var(--kangur-page-muted-text)]'>
        {currentRound + 1}/{totalRounds}
      </span>
    </div>
  );
}

type KangurPracticeGameSummaryProps = {
  accent: KangurAccent;
  actionsHidden?: boolean;
  actionsClassName?: string;
  breakdown?: KangurRewardBreakdownEntry[];
  breakdownDataTestId: string;
  breakdownItemDataTestIdPrefix: string;
  dataTestId: string;
  emoji: React.ReactNode;
  emojiAriaHidden?: boolean;
  emojiDataTestId: string;
  finishLabel: string;
  finishButtonClassName?: string;
  message: React.ReactNode;
  messageClassName?: string;
  postProgressContent?: React.ReactNode;
  preProgressContent?: React.ReactNode;
  onFinish: () => void;
  onRestart: () => void;
  percent: number;
  progressAccent: KangurAccent;
  progressAriaLabel?: string;
  progressAriaValueText?: string;
  progressClassName?: string;
  progressDataTestId?: string;
  panelClassName?: string;
  restartLabel?: React.ReactNode;
  restartButtonClassName?: string;
  title: React.ReactNode;
  titleDataTestId?: string;
  titleUnwrapped?: boolean;
  wrapperClassName?: string;
  xpAccent?: KangurAccent;
  xpEarned?: number;
};

export function KangurPracticeGameSummary({
  accent,
  actionsHidden = false,
  actionsClassName,
  breakdown = [],
  breakdownDataTestId,
  breakdownItemDataTestIdPrefix,
  dataTestId,
  emoji,
  emojiAriaHidden,
  emojiDataTestId,
  finishLabel,
  finishButtonClassName,
  message,
  messageClassName,
  postProgressContent,
  preProgressContent,
  onFinish,
  onRestart,
  percent,
  progressAccent,
  progressAriaLabel,
  progressAriaValueText,
  progressClassName,
  progressDataTestId,
  panelClassName,
  restartLabel = 'Jeszcze raz',
  restartButtonClassName,
  title,
  titleDataTestId,
  titleUnwrapped = false,
  wrapperClassName,
  xpAccent = 'indigo',
  xpEarned = 0,
}: KangurPracticeGameSummaryProps): React.JSX.Element {
  return (
    <motion.div
      animate={{ opacity: 1, scale: 1 }}
      className={cn('w-full max-w-sm', wrapperClassName)}
      initial={{ opacity: 0, scale: 0.9 }}
    >
      <KangurGlassPanel
        className={cn('flex flex-col items-center gap-4 text-center', panelClassName)}
        data-testid={dataTestId}
        padding='xl'
        surface='solid'
        variant='soft'
      >
        <KangurDisplayEmoji aria-hidden={emojiAriaHidden} data-testid={emojiDataTestId} size='lg'>
          {emoji}
        </KangurDisplayEmoji>
        {titleUnwrapped ? (
          title
        ) : (
          <div
            className={cn(
              'text-2xl font-extrabold [color:var(--kangur-page-text)]',
              accent === 'violet' ? 'tracking-tight' : undefined
            )}
            data-testid={titleDataTestId}
          >
            {title}
          </div>
        )}
        {preProgressContent}
        {xpEarned > 0 ? (
          <KangurStatusChip accent={xpAccent} className='px-4 py-2 text-sm font-bold'>
            +{xpEarned} XP ✨
          </KangurStatusChip>
        ) : null}
        {breakdown.length > 0 ? (
          <KangurRewardBreakdownChips
            accent='slate'
            breakdown={breakdown}
            className='justify-center'
            dataTestId={breakdownDataTestId}
            itemDataTestIdPrefix={breakdownItemDataTestIdPrefix}
          />
        ) : null}
        <KangurProgressBar
          accent={progressAccent}
          animated
          aria-label={progressAriaLabel}
          aria-valuetext={progressAriaValueText}
          className={progressClassName}
          data-testid={progressDataTestId}
          size='md'
          value={percent}
        />
        <p className={cn('[color:var(--kangur-page-muted-text)]', messageClassName)}>{message}</p>
        {postProgressContent}
        {actionsHidden ? null : (
          <div className={cn('flex gap-3 w-full', actionsClassName)}>
            <KangurButton
              className={cn('flex-1', restartButtonClassName)}
              onClick={onRestart}
              size='lg'
              variant='surface'
            >
              <RefreshCw className='w-4 h-4' /> {restartLabel}
            </KangurButton>
            <KangurButton
              className={cn('flex-1', finishButtonClassName)}
              onClick={onFinish}
              size='lg'
              variant='primary'
            >
              {finishLabel}
            </KangurButton>
          </div>
        )}
      </KangurGlassPanel>
    </motion.div>
  );
}
