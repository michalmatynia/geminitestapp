'use client';

import { Search, X } from 'lucide-react';
import React from 'react';

import { cn } from '@/shared/utils';

import { Button } from './button';
import { Input } from './input';

interface SearchInputProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  value: string;
  onClear?: () => void;
  containerClassName?: string;
  variant?: 'default' | 'subtle';
  size?: 'default' | 'sm' | 'xs';
}

export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  ({ value, onClear, containerClassName, className, variant = 'default', size = 'default', ...props }, ref) => {
    return (
      <div className={cn('relative flex items-center', containerClassName)}>
        <Search className='absolute left-3 size-4 text-gray-500' />
        <Input
          ref={ref}
          value={value}
          variant={variant}
          size={size}
          className={cn('pl-9 pr-9', className)}
          {...props}
        />
        {value && onClear && (
          <Button
            type='button'
            variant='ghost'
            size='icon'
            onClick={onClear}
            className='absolute right-1 size-7 text-gray-500 hover:text-gray-300'
            aria-label='Clear search'
          >
            <X className='size-3.5' />
          </Button>
        )}
      </div>
    );
  }
);

SearchInput.displayName = 'SearchInput';
