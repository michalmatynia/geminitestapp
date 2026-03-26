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

type SearchInputNativeProps = Omit<
  SearchInputProps,
  'value' | 'onClear' | 'containerClassName' | 'className' | 'variant' | 'size'
>;

export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  (
    {
      value,
      onClear,
      containerClassName,
      className,
      variant = 'default',
      size = 'default',
      ...props
    },
    ref
  ) => {
    const {
      'aria-label': ariaLabel,
      'aria-labelledby': ariaLabelledBy,
      id,
      placeholder,
      type,
      ...rest
    } = props as SearchInputNativeProps;
    const resolvedAriaLabel =
      ariaLabel ?? (ariaLabelledBy || id ? undefined : placeholder ?? 'Search');
    return (
      <div
        className={cn('relative flex items-center', containerClassName)}
        role='search'
        {...(ariaLabelledBy ? { 'aria-labelledby': ariaLabelledBy } : {})}
      >
        <Search className='absolute left-3 size-4 text-gray-500' aria-hidden='true' />
        <Input
          ref={ref}
          value={value}
          variant={variant}
          size={size}
          className={cn('pl-9 pr-9', className)}
          id={id}
          type={type ?? 'search'}
          placeholder={placeholder}
          aria-label={resolvedAriaLabel}
          aria-labelledby={ariaLabelledBy}
          {...rest}
          title={placeholder}
        />
        {value && onClear ? (
          <Button
            type='button'
            variant='ghost'
            size='icon'
            onClick={onClear}
            className='absolute right-1 size-7 text-gray-500 hover:text-gray-300'
            aria-label='Clear search'
            title='Clear search'
          >
            <X className='size-3.5' aria-hidden='true' />
          </Button>
        ) : null}
      </div>
    );
  }
);

SearchInput.displayName = 'SearchInput';
