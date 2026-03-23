import * as React from 'react';

import { cn } from '@/features/kangur/shared/utils';
import {
  KangurButton,
  type KangurButtonProps,
} from '@/features/kangur/ui/design/primitives/KangurButton';

type KangurCheckButtonTone = 'success' | 'error' | null | undefined;

type KangurCheckButtonProps = KangurButtonProps & {
  feedbackTone?: KangurCheckButtonTone;
};

const FEEDBACK_TONE_CLASSNAME: Record<Exclude<KangurCheckButtonTone, null | undefined>, string> = {
  success:
    'border-emerald-500 bg-emerald-500 text-white hover:border-emerald-500 hover:bg-emerald-500 hover:text-white focus-visible:ring-emerald-300/70 disabled:opacity-100',
  error:
    'border-rose-500 bg-rose-500 text-white hover:border-rose-500 hover:bg-rose-500 hover:text-white focus-visible:ring-rose-300/70 disabled:opacity-100',
};

export const KangurCheckButton = React.forwardRef<HTMLButtonElement, KangurCheckButtonProps>(
  ({ className, feedbackTone = null, ...props }, ref) => (
    <KangurButton
      {...props}
      ref={ref}
      className={cn(
        className,
        feedbackTone ? FEEDBACK_TONE_CLASSNAME[feedbackTone] : null
      )}
    />
  )
);

KangurCheckButton.displayName = 'KangurCheckButton';
