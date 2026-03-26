'use client';

import { Eraser } from 'lucide-react';
import type { ReactNode } from 'react';

import {
  KangurButton,
  KangurPanelRow,
} from '@/features/kangur/ui/design/primitives';
import { cn } from '@/features/kangur/shared/utils';
import type { KangurMiniGameInformationalFeedback } from '@/features/kangur/ui/types';

type KangurDrawingActionRowProps = {
  clearDisabled?: boolean;
  clearLabel: string;
  clearTestId?: string;
  feedback: KangurMiniGameInformationalFeedback | null;
  historyActions?: ReactNode;
  isCoarsePointer?: boolean;
  onClear: () => void;
  onPrimary: () => void;
  primaryDisabled?: boolean;
  primaryLabel: string;
  primaryTestId?: string;
};

const getPrimaryFeedbackClassName = (
  feedback: KangurMiniGameInformationalFeedback | null
): string =>
  feedback
    ? feedback.kind === 'success'
      ? 'bg-emerald-500 border-emerald-500 text-white'
      : feedback.kind === 'error'
        ? 'bg-rose-500 border-rose-500 text-white'
        : 'bg-amber-500 border-amber-500 text-white'
    : '[background:var(--kangur-soft-card-background)] [border-color:var(--kangur-soft-card-border)] [color:var(--kangur-page-text)]';

export function KangurDrawingActionRow({
  clearDisabled = false,
  clearLabel,
  clearTestId,
  feedback,
  historyActions,
  isCoarsePointer = false,
  onClear,
  onPrimary,
  primaryDisabled = false,
  primaryLabel,
  primaryTestId,
}: KangurDrawingActionRowProps): React.JSX.Element {
  return (
    <KangurPanelRow className='w-full'>
      {historyActions}
      <KangurButton
        className={cn('w-full sm:flex-1', isCoarsePointer && 'min-h-11')}
        data-testid={clearTestId}
        disabled={clearDisabled}
        onClick={onClear}
        size='lg'
        type='button'
        variant='surface'
      >
        <Eraser aria-hidden='true' className='w-4 h-4' />
        {clearLabel}
      </KangurButton>
      <KangurButton
        className={cn(
          'w-full sm:flex-1',
          isCoarsePointer && 'min-h-11',
          getPrimaryFeedbackClassName(feedback)
        )}
        data-testid={primaryTestId}
        disabled={primaryDisabled}
        onClick={onPrimary}
        size='lg'
        type='button'
        variant='primary'
      >
        {primaryLabel}
      </KangurButton>
    </KangurPanelRow>
  );
}
