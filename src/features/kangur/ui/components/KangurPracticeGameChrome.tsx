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
import {
  KANGUR_ACCENT_STYLES,
  KANGUR_PANEL_GAP_CLASSNAME,
  type KangurAccent,
} from '@/features/kangur/ui/design/tokens';
import type { KangurRewardBreakdownEntry } from '@/features/kangur/ui/types';
import { cn } from '@/features/kangur/shared/utils';

type KangurPracticeGameStageProps = React.HTMLAttributes<HTMLDivElement>;

export function KangurPracticeGameStage({
  className,
  ...props
}: KangurPracticeGameStageProps): React.JSX.Element {
  return (
    <div
      className={cn(
        'flex w-full max-w-sm flex-col items-center',
        KANGUR_PANEL_GAP_CLASSNAME,
        className
      )}
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
  const progressAccent = accent;
  const progressTestId = dataTestId;
  const progressValue = (currentRound / totalRounds) * 100;

  return (
    <div className='flex items-center gap-2 w-full'>
      <KangurProgressBar
        accent={progressAccent}
        className='flex-1'
        data-testid={progressTestId}
        size='sm'
        value={progressValue}
      />
      <span className='break-words text-xs font-bold [color:var(--kangur-page-muted-text)]'>
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
  const emojiTestId = dataTestId;
  const emojiAriaHidden = ariaHidden;

  return (
    <KangurDisplayEmoji aria-hidden={emojiAriaHidden} data-testid={emojiTestId} size='lg'>
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
        'break-words text-2xl font-extrabold [color:var(--kangur-page-text)]',
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
  const breakdownItems = breakdown;
  const summaryTestId = dataTestId;
  const summaryItemPrefix = itemDataTestIdPrefix;

  if (breakdownItems.length === 0) return null;
  return (
    <KangurRewardBreakdownChips
      accent='slate'
      breakdown={breakdownItems}
      className='justify-center'
      dataTestId={summaryTestId}
      itemDataTestIdPrefix={summaryItemPrefix}
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
  const summaryPercent = percent;
  const summaryAccent = accent;
  const summaryTestId = dataTestId;
  const summaryAriaLabel = ariaLabel;
  const summaryAriaValueText = ariaValueText;
  const summaryClassName = className;

  return (
    <KangurProgressBar
      accent={summaryAccent}
      animated
      aria-label={summaryAriaLabel}
      aria-valuetext={summaryAriaValueText}
      className={summaryClassName}
      data-testid={summaryTestId}
      size='md'
      value={summaryPercent}
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
  const handleRestart = onRestart;
  const handleFinish = onFinish;
  const restartClassName = restartButtonClassName;
  const finishClassName = finishButtonClassName;
  const wrapperClassName = className;

  return (
    <div className={cn('flex w-full flex-col kangur-panel-gap sm:flex-row', wrapperClassName)}>
      <KangurButton
        className={cn('w-full sm:flex-1', restartClassName)}
        onClick={handleRestart}
        size='lg'
        variant='surface'
      >
        <RefreshCw className='w-4 h-4' /> {restartLabel}
      </KangurButton>
      <KangurButton
        className={cn('w-full sm:flex-1', finishClassName)}
        onClick={handleFinish}
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
      className={cn('break-words [color:var(--kangur-page-muted-text)]', className)}
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
  const summaryPanelClassName = panelClassName;
  const summaryTestId = dataTestId;

  return (
    <motion.div
      animate={{ opacity: 1, scale: 1 }}
      className={cn('mx-auto w-full max-w-sm', wrapperClassName)}
      initial={{ opacity: 0, scale: 0.9 }}
    >
      <KangurGlassPanel
        className={cn(
          'flex flex-col items-center text-center',
          KANGUR_PANEL_GAP_CLASSNAME,
          summaryPanelClassName
        )}
        data-testid={summaryTestId}
        padding='xl'
        surface='solid'
        variant='soft'
      >
        {children}
      </KangurGlassPanel>
    </motion.div>
  );
}
