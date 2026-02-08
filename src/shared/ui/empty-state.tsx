'use client';

import React, { ReactNode } from 'react';

import { cn } from '@/shared/utils';

interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  title,
  description,
  icon,
  action,
  className,
}: EmptyStateProps): React.JSX.Element {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center rounded-lg border border-dashed p-12 text-center',
        className
      )}
    >
      {icon && <div className='mb-4 text-gray-500'>{icon}</div>}
      <h3 className='text-lg font-medium text-white'>{title}</h3>
      {description && (
        <p className='mt-2 text-sm text-gray-400 max-w-xs mx-auto'>
          {description}
        </p>
      )}
      {action && <div className='mt-6'>{action}</div>}
    </div>
  );
}
