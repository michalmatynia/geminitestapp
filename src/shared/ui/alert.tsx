import { AlertCircle, X } from 'lucide-react';
import * as React from 'react';

import type { AlertVariant } from '@/shared/contracts/ui';
import { cn } from '@/shared/utils/ui-utils';

export type { AlertVariant };

interface AlertProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
  variant?: AlertVariant;
  title?: React.ReactNode;
  description?: React.ReactNode;
  icon?: React.ReactNode;
  onDismiss?: () => void;
}

const variantStyles: Record<AlertVariant, string> = {
  default: 'bg-card text-foreground border-border',
  error: 'border-red-500/40 bg-red-500/10 text-red-200',
  warning: 'border-amber-500/40 bg-amber-500/10 text-amber-100',
  success: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-100',
  info: 'border-blue-500/40 bg-blue-500/10 text-blue-100',
};

const iconMap: Record<AlertVariant, React.ReactNode> = {
  default: <AlertCircle className='size-4' />,
  error: <AlertCircle className='size-4' />,
  warning: <AlertCircle className='size-4' />,
  success: <AlertCircle className='size-4' />,
  info: <AlertCircle className='size-4' />,
};

/**
 * Alert - A standardized component for displaying messages and feedback.
 * Supports multiple variants, titles, custom icons, and dismissal.
 */
export const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  (
    { className, variant = 'default', title, description, icon, onDismiss, children, ...props },
    ref
  ) => {
    const resolvedIcon = icon ?? iconMap[variant];
    const content = children ?? description;

    return (
      <div
        ref={ref}
        role='alert'
        className={cn(
          'relative flex gap-3 rounded-md border px-4 py-3 text-sm transition-all',
          variantStyles[variant],
          className
        )}
        {...props}
      >
        {resolvedIcon && (
          <div className='mt-0.5 shrink-0 opacity-80' aria-hidden='true'>
            {resolvedIcon}
          </div>
        )}
        <div className='flex-1 min-w-0'>
          {title && <div className='font-semibold mb-1 leading-none tracking-tight'>{title}</div>}
          {content ? (
            <div className={cn('text-xs opacity-90 leading-relaxed', !title && 'text-sm')}>
              {content}
            </div>
          ) : null}
        </div>
        {onDismiss && (
          <button
            type='button'
            onClick={onDismiss}
            className='shrink-0 rounded-md p-1 opacity-50 hover:opacity-100 hover:bg-black/10 transition-all'
            aria-label='Dismiss alert'
            title={'Dismiss alert'}>
            <X className='size-3.5' aria-hidden='true' />
          </button>
        )}
      </div>
    );
  }
);

Alert.displayName = 'Alert';
