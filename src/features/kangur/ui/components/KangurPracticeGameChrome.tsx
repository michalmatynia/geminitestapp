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
import { KANGUR_ACCENT_STYLES, type KangurAccent } from '@/features/kangur/ui/design/tokens';
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

// ── Practice Game Summary Sub-components ──────────────────────────────────────

export function KangurPracticeGameSummaryEmoji({
  emoji,
  dataTestId,
  ariaHidden,
}: {
  emoji: React.ReactNode;
  dataTestId: string;
  ariaHidden?: boolean;
}): React.JSX.Element {
  return (
    <KangurDisplayEmoji aria-hidden={ariaHidden} data-testid={dataTestId} size='lg'>
      {emoji}
    </KangurDisplayEmoji>
  );
}

export function KangurPracticeGameSummaryTitle({
  title,
  dataTestId,
  accent,
  unwrapped = false,
  children,
}: {
  title?: React.ReactNode;
  dataTestId?: string;
  accent?: KangurAccent;
  unwrapped?: boolean;
  children?: React.ReactNode;
}): React.JSX.Element {
  const content = children ?? title;
  if (unwrapped) return <>{content}</>;
  return (
    <div
      className={cn(
        'text-2xl font-extrabold [color:var(--kangur-page-text)]',
        accent === 'violet' ? 'tracking-tight' : undefined
      )}
      data-testid={dataTestId}
    >
      {content}
    </div>
  );
}

export function KangurPracticeGameSummaryXP({
  xpEarned,
  accent = 'indigo',
}: {
  xpEarned: number;
  accent?: KangurAccent;
}): React.JSX.Element | null {
  if (xpEarned <= 0) return null;
  const accentClassName = KANGUR_ACCENT_STYLES[accent].badge;
  return (
    <KangurStatusChip className={cn('px-4 py-2 text-sm font-bold', accentClassName)}>
      +{xpEarned} XP ✨
    </KangurStatusChip>
  );
}

export function KangurPracticeGameSummaryBreakdown({
  breakdown,
  dataTestId,
  itemDataTestIdPrefix,
}: {
  breakdown: KangurRewardBreakdownEntry[];
  dataTestId: string;
  itemDataTestIdPrefix: string;
}): React.JSX.Element | null {
  if (breakdown.length === 0) return null;
  return (
    <KangurRewardBreakdownChips
      accent='slate'
      breakdown={breakdown}
      className='justify-center'
      dataTestId={dataTestId}
      itemDataTestIdPrefix={itemDataTestIdPrefix}
    />
  );
}

export function KangurPracticeGameSummaryProgress({
  percent,
  accent,
  dataTestId,
  ariaLabel,
  ariaValueText,
  className,
}: {
  percent: number;
  accent: KangurAccent;
  dataTestId?: string;
  ariaLabel?: string;
  ariaValueText?: string;
  className?: string;
}): React.JSX.Element {
  return (
    <KangurProgressBar
      accent={accent}
      animated
      aria-label={ariaLabel}
      aria-valuetext={ariaValueText}
      className={className}
      data-testid={dataTestId}
      size='md'
      value={percent}
    />
  );
}

export function KangurPracticeGameSummaryActions({
  onRestart,
  onFinish,
  restartLabel = 'Jeszcze raz',
  finishLabel,
  restartButtonClassName,
  finishButtonClassName,
  className,
}: {
  onRestart: () => void;
  onFinish: () => void;
  restartLabel?: React.ReactNode;
  finishLabel: string;
  restartButtonClassName?: string;
  finishButtonClassName?: string;
  className?: string;
}): React.JSX.Element {
  return (
    <div className={cn('flex gap-3 w-full', className)}>
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
  );
}

export function KangurPracticeGameSummaryMessage({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}): React.JSX.Element | null {
  if (!children) return null;
  return (
    <p
      className={cn('[color:var(--kangur-page-muted-text)]', className)}
      role='status'
      aria-live='polite'
      aria-atomic='true'
    >
      {children}
    </p>
  );
}

// ── Main Summary Component ───────────────────────────────────────────────────

type KangurPracticeGameSummaryProps = {
  children: React.ReactNode;
  dataTestId: string;
  panelClassName?: string;
  wrapperClassName?: string;
};

export function KangurPracticeGameSummary({
  children,
  dataTestId,
  panelClassName,
  wrapperClassName,
}: KangurPracticeGameSummaryProps): React.JSX.Element {
  return (
    <motion.div
      animate={{ opacity: 1, scale: 1 }}
      className={cn('mx-auto w-full max-w-sm', wrapperClassName)}
      initial={{ opacity: 0, scale: 0.9 }}
    >
      <KangurGlassPanel
        className={cn('flex flex-col items-center gap-4 text-center', panelClassName)}
        data-testid={dataTestId}
        padding='xl'
        surface='solid'
        variant='soft'
      >
        {children}
      </KangurGlassPanel>
    </motion.div>
  );
}
