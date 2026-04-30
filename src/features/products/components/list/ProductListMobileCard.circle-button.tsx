'use client';

import type React from 'react';

import { Button } from '@/shared/ui/button';
import { cn } from '@/shared/utils/ui-utils';

type CircleIconButtonProps = {
  onClick?: () => void;
  onMouseEnter?: () => void;
  onFocus?: () => void;
  disabled?: boolean;
  ariaLabel: string;
  title?: string;
  className?: string;
  children: React.ReactNode;
};

export function CircleIconButton({
  onClick,
  onMouseEnter,
  onFocus,
  disabled,
  ariaLabel,
  title,
  className,
  children,
}: CircleIconButtonProps): React.JSX.Element {
  const isDisabled = disabled === true;

  return (
    <Button
      type='button'
      disabled={isDisabled}
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onFocus={onFocus}
      variant='ghost'
      size='icon'
      aria-label={ariaLabel}
      title={title}
      className={cn(
        'size-8 rounded-full border border-transparent bg-transparent p-0 hover:bg-transparent',
        isDisabled ? 'cursor-not-allowed opacity-60' : undefined,
        className
      )}
    >
      {children}
    </Button>
  );
}
