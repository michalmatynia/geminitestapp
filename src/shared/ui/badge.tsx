import { cva, type VariantProps } from 'class-variance-authority';
import { X } from 'lucide-react';
import * as React from 'react';

import { cn, getTextContent } from '@/shared/utils';

const badgeVariants = cva(
  'inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
  {
    variants: {
      variant: {
        default: 'border-transparent bg-primary text-primary-foreground hover:bg-primary/80',
        primary: 'border-transparent bg-primary text-primary-foreground hover:bg-primary/80',
        secondary:
          'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80',
        destructive:
          'border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80',
        outline: 'text-foreground',
        success: 'border-transparent bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500/20',
        warning: 'border-transparent bg-amber-500/10 text-amber-500 hover:bg-amber-500/20',
        info: 'border-transparent bg-blue-500/10 text-blue-500 hover:bg-blue-500/20',
        neutral: 'border-transparent bg-gray-500/10 text-gray-500 hover:bg-gray-500/20',
        pending: 'border-amber-500/40 bg-amber-500/20 text-amber-300 hover:bg-amber-500/30',
        active: 'border-emerald-500/40 bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30',
        failed: 'border-red-500/40 bg-red-500/20 text-red-300 hover:bg-red-500/30',
        removed: 'border-gray-500/40 bg-gray-500/20 text-gray-300 hover:bg-gray-500/30',
        error: 'border-rose-500/40 bg-rose-500/20 text-rose-300 hover:bg-rose-500/30',
        processing: 'border-blue-500/40 bg-blue-500/20 text-blue-300 hover:bg-blue-500/30',
        cyan: 'border-cyan-500/40 bg-cyan-500/15 text-cyan-200 hover:bg-cyan-500/25',
        amber: 'border-amber-500/40 bg-amber-500/15 text-amber-200 hover:bg-amber-500/25',
      },
    },
    defaultVariants: {
      variant: 'default',
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLElement>, VariantProps<typeof badgeVariants> {
  icon?: React.ReactNode;
  onRemove?: () => void;
  removeLabel?: string;
}

/**
 * Badge - A unified badge component used as a base for Tags, StatusBadges, and Chips.
 * Supports icons, semantic variants, and integrated removal functionality.
 */
function Badge({
  className,
  variant,
  icon,
  onRemove,
  removeLabel,
  children,
  onClick,
  onKeyDown,
  ...props
}: BadgeProps) {
  const isClickable = !!onClick;
  const isNativeButton = isClickable && !onRemove;
  const isSplitInteractive = isClickable && !!onRemove;
  const handleButtonClick = onClick;
  const handleButtonKeyDown = onKeyDown;
  const accessibleLabel = getTextContent(children).trim();
  const sharedClassName = cn(
    badgeVariants({ variant }),
    isClickable && 'cursor-pointer hover:brightness-110 active:opacity-80 transition-all',
    className
  );

  const content = (
    <>
      {icon && (
        <span className='mr-1.5 shrink-0' aria-hidden='true'>
          {icon}
        </span>
      )}
      {children}
      {onRemove && (
        <button
          type='button'
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className='ml-1.5 -mr-1 rounded-full p-0.5 hover:bg-black/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background transition-colors'
          aria-label={removeLabel || 'Remove'}
          title={removeLabel || 'Remove'}>
          <X className='size-3' aria-hidden='true' />
        </button>
      )}
    </>
  );

  if (isNativeButton) {
    return (
      <button
        type='button'
        className={sharedClassName}
        onClick={handleButtonClick}
        onKeyDown={handleButtonKeyDown}
        aria-label={accessibleLabel || undefined}
        {...(props as React.ButtonHTMLAttributes<HTMLButtonElement>)}
      >
        {content}
      </button>
    );
  }

  if (isSplitInteractive) {
    return (
      <div className={cn(sharedClassName, 'gap-0 px-0 py-0')} {...props}>
        <button
          type='button'
          className='inline-flex items-center rounded-full rounded-r-none px-2.5 py-0.5 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2'
          onClick={handleButtonClick}
          onKeyDown={handleButtonKeyDown}
          aria-label={accessibleLabel || undefined}
        >
          {icon && (
            <span className='mr-1.5 shrink-0' aria-hidden='true'>
              {icon}
            </span>
          )}
          {children}
        </button>
        <button
          type='button'
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className='mr-1 rounded-full p-0.5 hover:bg-black/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background transition-colors'
          aria-label={removeLabel || 'Remove'}
          title={removeLabel || 'Remove'}>
          <X className='size-3' aria-hidden='true' />
        </button>
      </div>
    );
  }

  return (
    <div
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      className={sharedClassName}
      onClick={onClick}
      onKeyDown={(event) => {
        onKeyDown?.(event);
        if (event.defaultPrevented || !isClickable) {
          return;
        }
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          event.currentTarget.click();
        }
      }}
      {...props}
    >
      {content}
    </div>
  );
}

export { Badge, badgeVariants };
