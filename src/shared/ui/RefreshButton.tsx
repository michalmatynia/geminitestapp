'use client';

import { RefreshCcw } from 'lucide-react';
import React from 'react';

import { createStrictContext } from '@/shared/lib/react/createStrictContext';
import { cn } from '@/shared/utils';

import { Button } from './button';

interface RefreshButtonProps {
  onRefresh: () => void;
  isRefreshing?: boolean;
  label?: string;
  className?: string;
  size?: 'default' | 'sm' | 'lg' | 'icon';
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
}

type RefreshButtonRuntimeValue = {
  onRefresh: () => void;
  isRefreshing: boolean;
  label: string;
  className?: string;
  size: 'default' | 'sm' | 'lg' | 'icon';
  variant: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
};

const { Context: RefreshButtonRuntimeContext, useStrictContext: useRefreshButtonRuntime } =
  createStrictContext<RefreshButtonRuntimeValue>({
    hookName: 'useRefreshButtonRuntime',
    providerName: 'RefreshButtonRuntimeProvider',
    displayName: 'RefreshButtonRuntimeContext',
  });

function RefreshButtonControl(): React.JSX.Element {
  const runtime = useRefreshButtonRuntime();
  return (
    <Button
      variant={runtime.variant}
      size={runtime.size}
      onClick={runtime.onRefresh}
      disabled={runtime.isRefreshing}
      className={cn('gap-2', runtime.className)}
    >
      <RefreshCcw className={cn('size-4', runtime.isRefreshing && 'animate-spin')} />
      {runtime.label && <span>{runtime.label}</span>}
    </Button>
  );
}

/**
 * A standardized refresh button with an animated icon when refreshing.
 */
export function RefreshButton({
  onRefresh,
  isRefreshing = false,
  label = 'Refresh',
  className,
  size = 'sm',
  variant = 'outline',
}: RefreshButtonProps): React.JSX.Element {
  const runtimeValue = React.useMemo<RefreshButtonRuntimeValue>(
    () => ({
      onRefresh,
      isRefreshing,
      label,
      className,
      size,
      variant,
    }),
    [onRefresh, isRefreshing, label, className, size, variant]
  );

  return (
    <RefreshButtonRuntimeContext.Provider value={runtimeValue}>
      <RefreshButtonControl />
    </RefreshButtonRuntimeContext.Provider>
  );
}
