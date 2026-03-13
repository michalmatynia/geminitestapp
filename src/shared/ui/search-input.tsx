'use client';

import { Search, X } from 'lucide-react';
import React from 'react';

import { createStrictContext } from '@/shared/lib/react/createStrictContext';
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

type SearchInputRuntimeValue = {
  value: string;
  onClear?: () => void;
  containerClassName?: string;
  className?: string;
  variant: 'default' | 'subtle';
  size: 'default' | 'sm' | 'xs';
  inputProps: SearchInputNativeProps;
};

const { Context: SearchInputRuntimeContext, useStrictContext: useSearchInputRuntime } =
  createStrictContext<SearchInputRuntimeValue>({
    hookName: 'useSearchInputRuntime',
    providerName: 'SearchInputRuntimeProvider',
    displayName: 'SearchInputRuntimeContext',
  });

const SearchInputContent = React.forwardRef<HTMLInputElement>(function SearchInputContent(_, ref) {
  const runtime = useSearchInputRuntime();
  const { 'aria-label': ariaLabel, 'aria-labelledby': ariaLabelledBy, id, placeholder, ...rest } =
    runtime.inputProps;
  const resolvedAriaLabel =
    ariaLabel ?? (ariaLabelledBy || id ? undefined : placeholder ?? 'Search');
  return (
    <div className={cn('relative flex items-center', runtime.containerClassName)}>
      <Search className='absolute left-3 size-4 text-gray-500' aria-hidden='true' />
      <Input
        ref={ref}
        value={runtime.value}
        variant={runtime.variant}
        size={runtime.size}
        className={cn('pl-9 pr-9', runtime.className)}
        id={id}
        placeholder={placeholder}
        aria-label={resolvedAriaLabel}
        aria-labelledby={ariaLabelledBy}
        {...rest}
      />
      {runtime.value && runtime.onClear && (
        <Button
          type='button'
          variant='ghost'
          size='icon'
          onClick={runtime.onClear}
          className='absolute right-1 size-7 text-gray-500 hover:text-gray-300'
          aria-label='Clear search'
        >
          <X className='size-3.5' aria-hidden='true' />
        </Button>
      )}
    </div>
  );
});

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
    const runtimeValue = React.useMemo<SearchInputRuntimeValue>(
      () => ({
        value,
        onClear,
        containerClassName,
        className,
        variant,
        size,
        inputProps: props,
      }),
      [value, onClear, containerClassName, className, variant, size, props]
    );

    return (
      <SearchInputRuntimeContext.Provider value={runtimeValue}>
        <SearchInputContent ref={ref} />
      </SearchInputRuntimeContext.Provider>
    );
  }
);

SearchInputContent.displayName = 'SearchInputContent';
SearchInput.displayName = 'SearchInput';
