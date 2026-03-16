'use client';

import { Eye, EyeOff } from 'lucide-react';
import * as React from 'react';

import { cn } from '@/shared/utils';

import { Button } from './button';
import { Input, type InputProps } from './input';

interface PasswordInputProps extends Omit<InputProps, 'type'> {
  containerClassName?: string;
  defaultVisible?: boolean;
}

export const PasswordInput = React.forwardRef<HTMLInputElement, PasswordInputProps>(
  (
    {
      containerClassName,
      className,
      defaultVisible = false,
      disabled,
      ...props
    },
    ref
  ) => {
    const [isVisible, setIsVisible] = React.useState(defaultVisible);
    const toggleVisibility = () => setIsVisible((prev) => !prev);
    const toggleLabel = isVisible ? 'Hide password' : 'Show password';

    return (
      <div className={cn('relative flex items-center', containerClassName)}>
        <Input
          {...props}
          ref={ref}
          type={isVisible ? 'text' : 'password'}
          disabled={disabled}
          className={cn('pr-10', className)}
        />
        <Button
          type='button'
          variant='ghost'
          size='icon'
          onClick={toggleVisibility}
          className='absolute right-1 size-7 text-gray-500 hover:text-gray-300'
          aria-label={toggleLabel}
          aria-pressed={isVisible}
          title={toggleLabel}
          disabled={disabled}
        >
          {isVisible ? (
            <EyeOff className='size-3.5' aria-hidden='true' />
          ) : (
            <Eye className='size-3.5' aria-hidden='true' />
          )}
        </Button>
      </div>
    );
  }
);

PasswordInput.displayName = 'PasswordInput';
