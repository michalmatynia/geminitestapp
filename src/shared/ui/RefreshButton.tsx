/**
 * Refresh Button Component
 * 
 * Reusable refresh button with loading state and animation.
 * Provides:
 * - Spinning refresh icon during loading state
 * - Configurable button variants and sizes
 * - Accessibility support with proper labeling
 * - Customizable refresh action handling
 * - Visual feedback for user interactions
 */

'use client';

import { RefreshCcw } from 'lucide-react';
import React from 'react';

import { cn } from '@/shared/utils/ui-utils';

import { Button } from './button';

interface RefreshButtonProps {
  onRefresh: () => void;
  isRefreshing?: boolean;
  label?: string;
  className?: string;
  size?: 'default' | 'xs' | 'sm' | 'lg' | 'icon';
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
}

type RefreshButtonResolvedProps = {
  onRefresh: () => void;
  isRefreshing: boolean;
  label: string;
  className?: string;
  size: 'default' | 'xs' | 'sm' | 'lg' | 'icon';
  variant: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  ariaLabel?: string;
};

const renderRefreshButton = ({
  onRefresh,
  isRefreshing,
  label,
  className,
  size,
  variant,
  ariaLabel,
}: RefreshButtonResolvedProps): React.JSX.Element => (
  <Button
    variant={variant}
    size={size}
    onClick={onRefresh}
    disabled={isRefreshing}
    className={cn('gap-2', className)}
    aria-label={ariaLabel}
  >
    <RefreshCcw className={cn('size-4', isRefreshing && 'animate-spin')} />
    {label ? <span>{label}</span> : null}
  </Button>
);

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
  const ariaLabel = size === 'icon' || !label ? label || 'Refresh' : undefined;

  return renderRefreshButton({
    onRefresh,
    isRefreshing,
    label,
    className,
    size,
    variant,
    ariaLabel,
  });
}
