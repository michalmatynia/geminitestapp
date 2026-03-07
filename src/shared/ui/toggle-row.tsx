'use client';

import React, { type ReactNode, createContext, useContext, useMemo } from 'react';

import { cn } from '@/shared/utils';

import { Card } from './card';
import { Checkbox } from './checkbox';
import { Switch } from './switch';

export interface ToggleRowProps {
  label: string;
  description?: string | ReactNode | undefined;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean | undefined;
  variant?: 'checkbox' | 'switch' | undefined;
  className?: string | undefined;
  labelClassName?: string | undefined;
  descriptionClassName?: string | undefined;
  id?: string | undefined;
  icon?: ReactNode | undefined;
  loading?: boolean | undefined;
  error?: string | undefined;
  title?: string | undefined;
  children?: ReactNode | undefined;
  showBorder?: boolean | undefined;
  controlWrapper?: (control: ReactNode) => ReactNode;
}

export interface ToggleRowContextValue {
  label: string;
  description?: string | ReactNode;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  variant?: 'checkbox' | 'switch';
  className?: string;
  labelClassName?: string;
  descriptionClassName?: string;
  id?: string;
  icon?: ReactNode;
  loading?: boolean;
  error?: string;
  title?: string;
  children?: ReactNode;
  showBorder?: boolean;
  controlWrapper?: (control: ReactNode) => ReactNode;
}

const ToggleRowContext = createContext<ToggleRowContextValue | null>(null);

function ToggleRowControl(): React.JSX.Element {
  const context = useContext(ToggleRowContext);
  if (!context) throw new Error('ToggleRowControl must be used within ToggleRow');

  const { variant = 'checkbox', checked, onCheckedChange, disabled, id, loading } = context;

  if (variant === 'switch') {
    return (
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled || loading}
      />
    );
  }

  return (
    <Checkbox
      id={id}
      checked={checked}
      onCheckedChange={(val): void => onCheckedChange(val === true)}
      disabled={disabled || loading}
    />
  );
}

export function ToggleRow(props: ToggleRowProps): React.JSX.Element {
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
      id,
      icon,
      loading,
      error,
      title,
      children,
      showBorder,
      controlWrapper,
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
      id,
      icon,
      loading,
      error,
      title,
      children,
      showBorder,
      controlWrapper,
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
              htmlFor={id}
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
              >
                {description}
              </div>
            )}
            {error && <p className='text-[10px] font-medium text-destructive'>{error}</p>}
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
