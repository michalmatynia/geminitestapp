'use client';

import React from 'react';

import { cn } from '@/shared/utils';

interface TagProps {
  label: string;
  color?: string | null;
  className?: string;
  dot?: boolean;
  onRemove?: () => void;
  onClick?: () => void;
}

export function Tag({
  label,
  color,
  className,
  dot = false,
  onRemove,
  onClick,
}: TagProps): React.JSX.Element {
  const isClickable = !!onClick;
  
  return (
    <span
      onClick={onClick}
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors',
        color ? 'text-white' : 'bg-primary/10 text-primary',
        isClickable && 'cursor-pointer hover:brightness-110',
        className
      )}
      style={color ? { backgroundColor: color } : undefined}
    >
      {dot && (
        <span 
          className='size-1.5 rounded-full bg-current' 
          aria-hidden='true' 
        />
      )}
      {label}
      {onRemove && (
        <button
          type='button'
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className='ml-1 -mr-1 rounded-full p-0.5 hover:bg-black/10 focus:outline-none'
          aria-label={`Remove ${label}`}
        >
          <svg
            className='size-2.5'
            fill='currentColor'
            viewBox='0 0 20 20'
          >
            <path
              fillRule='evenodd'
              d='M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z'
              clipRule='evenodd'
            />
          </svg>
        </button>
      )}
    </span>
  );
}
