import * as React from 'react';

import { cn } from '@/shared/utils';

type LoadingPanelProps = React.HTMLAttributes<HTMLDivElement> & {
  message?: React.ReactNode;
};

export function LoadingPanel({
  children,
  className,
  message = 'Loading...',
  role = 'status',
  ...props
}: LoadingPanelProps): React.JSX.Element {
  return (
    <div
      className={cn(
        'min-h-[420px] rounded-xl border border-border/40 bg-card/20 p-6 text-sm text-muted-foreground',
        className
      )}
      role={role}
      aria-live={props['aria-live'] ?? 'polite'}
      aria-atomic={props['aria-atomic'] ?? true}
      {...props}
    >
      {children ?? message}
    </div>
  );
}
