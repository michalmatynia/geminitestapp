import { Loader2 } from 'lucide-react';
import React from 'react';

import { cn } from '@/shared/utils';

interface LoadingStateProps {
  message?: string;
  className?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg';
}

export function LoadingState({
  message = 'Loading...',
  className,
  size = 'md',
}: LoadingStateProps): React.JSX.Element {
  const iconSize = {
    xs: 'size-3',
    sm: 'size-4',
    md: 'size-6',
    lg: 'size-10',
  }[size];

  return (
    <div
      className={cn('flex flex-col items-center justify-center p-8 text-center', className)}
      role='status'
      aria-live='polite'
      aria-atomic='true'
    >
      <Loader2 className={cn('animate-spin text-muted-foreground', iconSize)} aria-hidden='true' />
      {message && (
        <p
          className={cn(
            'mt-2 text-muted-foreground',
            size === 'sm' || size === 'xs' ? 'text-[10px] mt-1' : 'text-sm'
          )}
        >
          {message}
        </p>
      )}
    </div>
  );
}
