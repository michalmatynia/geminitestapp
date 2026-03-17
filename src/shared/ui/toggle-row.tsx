'use client';

import React, { createContext, useContext, useMemo } from 'react';

import type { ToggleRowProps } from '@/shared/contracts/ui';
import { cn } from '@/shared/utils';

import { Card } from './card';
import { Checkbox } from './checkbox';
import { Switch } from './switch';

export type { ToggleRowProps };

type ToggleRowContextValue = ToggleRowProps & {
  descriptionId?: string;
  errorId?: string;
};

const ToggleRowContext = createContext<ToggleRowContextValue | null>(null);

function ToggleRowControl(): React.JSX.Element {
  const context = useContext(ToggleRowContext);
  if (!context) throw new Error('ToggleRowControl must be used within ToggleRow');

  const {
    variant = 'checkbox',
    checked,
    onCheckedChange,
    disabled,
    id,
    loading,
    descriptionId,
    errorId,
    error,
  } = context;
  const describedBy = [descriptionId, errorId].filter(Boolean).join(' ') || undefined;

  if (variant === 'switch') {
    return (
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled || loading}
        aria-describedby={describedBy}
        aria-invalid={Boolean(error) || undefined}
        aria-errormessage={errorId}
      />
    );
  }

  return (
    <Checkbox
      id={id}
      checked={checked}
      onCheckedChange={(val): void => onCheckedChange(val === true)}
      disabled={disabled || loading}
      aria-describedby={describedBy}
      aria-invalid={Boolean(error) || undefined}
      aria-errormessage={errorId}
    />
  );
}

export function ToggleRow(props: ToggleRowProps): React.JSX.Element {
  const generatedId = React.useId();
  const {
    label,
    description,
    checked,
    onCheckedChange,
    disabled = false,
    variant = 'checkbox',
    className,
    labelClassName,
    descriptionClassName,
    id,
    icon,
    loading = false,
    error,
    title,
    children,
    showBorder = true,
    controlWrapper,
  } = props;
  const controlId = id ?? generatedId;
  const descriptionId = description ? `${controlId}-description` : undefined;
  const errorId = error ? `${controlId}-error` : undefined;

  const contextValue = useMemo(
    () => ({
      label,
      description,
      checked,
      onCheckedChange,
      disabled,
      variant,
      className,
      labelClassName,
      descriptionClassName,
      id: controlId,
      icon,
      loading,
      error,
      title,
      children,
      showBorder,
      controlWrapper,
      descriptionId,
      errorId,
    }),
    [
      label,
      description,
      checked,
      onCheckedChange,
      disabled,
      variant,
      className,
      labelClassName,
      descriptionClassName,
      controlId,
      icon,
      loading,
      error,
      title,
      children,
      showBorder,
      controlWrapper,
      descriptionId,
      errorId,
    ]
  );

  const control = <ToggleRowControl />;

  return (
    <ToggleRowContext.Provider value={contextValue}>
      <Card
        variant={showBorder ? 'subtle-compact' : 'none'}
        padding={showBorder ? 'sm' : 'none'}
        className={cn(
          'flex items-center justify-between gap-4 transition-colors',
          !disabled && !loading && 'hover:bg-accent/5',
          disabled && 'opacity-50 grayscale-[0.5]',
          className
        )}
        title={title}
      >
        <div className='flex min-w-0 flex-1 items-start gap-3'>
          {icon && <div className='mt-0.5 shrink-0 text-muted-foreground'>{icon}</div>}
          <div className='min-w-0 flex-1 space-y-0.5'>
            <label
              htmlFor={controlId}
              className={cn(
                'block cursor-pointer text-xs font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70',
                labelClassName
              )}
            >
              {label}
            </label>
            {description && (
              <div
                className={cn(
                  'text-[11px] leading-tight text-muted-foreground',
                  descriptionClassName
                )}
                id={descriptionId}
              >
                {description}
              </div>
            )}
            {error && (
              <p className='text-[10px] font-medium text-destructive' id={errorId}>
                {error}
              </p>
            )}
            {children}
          </div>
        </div>
        <div className='flex shrink-0 items-center'>
          {controlWrapper ? controlWrapper(control) : control}
        </div>
      </Card>
    </ToggleRowContext.Provider>
  );
}
