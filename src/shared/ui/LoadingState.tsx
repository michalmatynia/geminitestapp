'use client';

import { Loader2 } from 'lucide-react';
import React from 'react';

import { cn } from '@/shared/utils';

interface LoadingStateProps {
  message?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function LoadingState({
  message = 'Loading...',
  className,
  size = 'md',
}: LoadingStateProps): React.JSX.Element {
  const iconSize = {
    sm: 'size-4',
    md: 'size-6',
    lg: 'size-10',
  }[size];

  return (
    <div className={cn('flex flex-col items-center justify-center p-8 text-center', className)}>
      <Loader2 className={cn('animate-spin text-muted-foreground', iconSize)} />
      {message && (
        <p className={cn('mt-2 text-muted-foreground', size === 'sm' ? 'text-xs' : 'text-sm')}>
          {message}
        </p>
      )}
    </div>
  );
}
