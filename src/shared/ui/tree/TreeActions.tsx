'use client';

import { Slot } from '@radix-ui/react-slot';
import React from 'react';

import { cn } from '@/shared/utils';

export type TreeActionSlotShow = 'hover' | 'always';
export type TreeActionSlotAlign = 'end' | 'inline';

export interface TreeActionSlotProps extends React.HTMLAttributes<HTMLDivElement> {
  show?: TreeActionSlotShow;
  isVisible?: boolean;
  align?: TreeActionSlotAlign;
}

export function TreeActionSlot({
  show = 'hover',
  isVisible = false,
  align = 'end',
  className,
  ...props
}: TreeActionSlotProps): React.JSX.Element {
  const visibilityClass =
    show === 'always'
      ? 'opacity-100'
      : isVisible
        ? 'opacity-100'
        : 'opacity-0 group-hover:opacity-100';
  return (
    <div
      className={cn(
        'flex items-center gap-1 transition',
        align === 'end' && 'ml-auto',
        visibilityClass,
        className
      )}
      {...props}
    />
  );
}

export type TreeActionTone = 'default' | 'muted' | 'danger';
export type TreeActionSize = 'xs' | 'sm' | 'md';

const TONE_CLASSES: Record<TreeActionTone, string> = {
  default: 'text-gray-300 hover:text-white hover:bg-muted/50',
  muted: 'text-gray-400 hover:text-gray-200 hover:bg-muted/40',
  danger: 'text-gray-400 hover:text-red-300 hover:bg-red-500/20',
};

const SIZE_CLASSES: Record<TreeActionSize, string> = {
  xs: 'p-0.5',
  sm: 'p-1',
  md: 'p-1.5',
};

export interface TreeActionButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  asChild?: boolean;
  tone?: TreeActionTone;
  size?: TreeActionSize;
}

export function TreeActionButton({
  asChild = false,
  tone = 'default',
  size = 'xs',
  className,
  ...props
}: TreeActionButtonProps): React.JSX.Element {
  const Comp = asChild ? Slot : 'button';
  return (
    <Comp
      type="button"
      className={cn('rounded transition', SIZE_CLASSES[size], TONE_CLASSES[tone], className)}
      {...props}
    />
  );
}
