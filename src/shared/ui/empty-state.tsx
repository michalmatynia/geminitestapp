import React, { ReactNode } from 'react';

import { cn } from '@/shared/utils';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
  variant?: 'default' | 'compact';
}

export function EmptyState({
  title,
  description,
  icon,
  action,
  className,
  variant = 'default',
}: EmptyStateProps): React.JSX.Element {
  const isCompact = variant === 'compact';

  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-lg border border-dashed text-center',
        isCompact ? 'p-6' : 'p-12',
        className
      )}
    >
      {icon && <div className={cn(isCompact ? 'mb-2' : 'mb-4', 'text-gray-500')}>{icon}</div>}
      <h3 className={cn(isCompact ? 'text-sm' : 'text-lg', 'font-medium text-white')}>{title}</h3>
      {description && (
        <p
          className={cn(
            isCompact ? 'mt-1 text-xs' : 'mt-2 text-sm',
            'text-gray-400 max-w-xs mx-auto'
          )}
        >
          {description}
        </p>
      )}
      {action && <div className={isCompact ? 'mt-4' : 'mt-6'}>{action}</div>}
    </div>
  );
}
