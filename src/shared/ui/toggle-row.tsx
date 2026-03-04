'use client';

import React, { type ReactNode } from 'react';

import { createStrictContext } from '@/shared/lib/react/createStrictContext';
import { cn } from '@/shared/utils';

import { Card } from './card';
import { Checkbox } from './checkbox';
import { Label } from './label';
import { Switch } from './switch';
import { StatusToggle } from './status-toggle';

type ToggleRowType = 'checkbox' | 'switch' | 'status';

type ToggleRowStatusEnabledVariant = 'emerald' | 'cyan' | 'blue';
type ToggleRowStatusDisabledVariant = 'red' | 'slate' | 'gray';

interface ToggleRowProps {
  label: ReactNode;
  description?: ReactNode;
  icon?: ReactNode;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  type?: ToggleRowType;
  disabled?: boolean;
  className?: string;
  labelClassName?: string;
  id?: string;
  children?: ReactNode;
  enabledLabel?: string;
  disabledLabel?: string;
  enabledVariant?: ToggleRowStatusEnabledVariant;
  disabledVariant?: ToggleRowStatusDisabledVariant;
  controlWrapper?: (control: ReactNode) => ReactNode;
}

type ToggleRowControlRuntimeValue = {
  generatedId: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  type: ToggleRowType;
  disabled: boolean;
  enabledLabel?: string;
  disabledLabel?: string;
  enabledVariant?: ToggleRowStatusEnabledVariant;
  disabledVariant?: ToggleRowStatusDisabledVariant;
  controlWrapper?: (control: ReactNode) => ReactNode;
};

const {
  Context: ToggleRowControlRuntimeContext,
  useStrictContext: useToggleRowControlRuntime,
} = createStrictContext<ToggleRowControlRuntimeValue>({
  hookName: 'useToggleRowControlRuntime',
  providerName: 'ToggleRowControlRuntimeProvider',
  displayName: 'ToggleRowControlRuntimeContext',
});

type ToggleRowControlRuntimeProviderProps = {
  value: ToggleRowControlRuntimeValue;
  children: ReactNode;
};

function ToggleRowControlRuntimeProvider(
  props: ToggleRowControlRuntimeProviderProps
): React.JSX.Element {
  const { value, children } = props;

  return (
    <ToggleRowControlRuntimeContext.Provider value={value}>
      {children}
    </ToggleRowControlRuntimeContext.Provider>
  );
}

function ToggleRowControl(): React.JSX.Element {
  const runtime = useToggleRowControlRuntime();

  let control: ReactNode;
  if (runtime.type === 'switch') {
    control = (
      <Switch
        id={runtime.generatedId}
        checked={runtime.checked}
        onCheckedChange={runtime.onCheckedChange}
        disabled={runtime.disabled}
      />
    );
  } else if (runtime.type === 'status') {
    control = (
      <StatusToggle
        enabled={runtime.checked}
        onToggle={runtime.onCheckedChange}
        disabled={runtime.disabled}
        enabledLabel={runtime.enabledLabel}
        disabledLabel={runtime.disabledLabel}
        enabledVariant={runtime.enabledVariant}
        disabledVariant={runtime.disabledVariant}
      />
    );
  } else {
    control = (
      <Checkbox
        id={runtime.generatedId}
        checked={runtime.checked}
        onCheckedChange={(val: boolean | 'indeterminate') => runtime.onCheckedChange(val === true)}
        disabled={runtime.disabled}
      />
    );
  }

  return <>{runtime.controlWrapper ? runtime.controlWrapper(control) : control}</>;
}

export function ToggleRow(props: ToggleRowProps): React.JSX.Element {
  const {
    label,
    description,
    icon,
    checked,
    onCheckedChange,
    type = 'checkbox',
    disabled = false,
    className,
    labelClassName,
    id,
    children,
    enabledLabel,
    disabledLabel,
    enabledVariant,
    disabledVariant,
    controlWrapper,
  } = props;

  const generatedId = id || React.useId();
  const controlRuntimeValue = React.useMemo<ToggleRowControlRuntimeValue>(
    () => ({
      generatedId,
      checked,
      onCheckedChange,
      type,
      disabled,
      enabledLabel,
      disabledLabel,
      enabledVariant,
      disabledVariant,
      controlWrapper,
    }),
    [
      generatedId,
      checked,
      onCheckedChange,
      type,
      disabled,
      enabledLabel,
      disabledLabel,
      enabledVariant,
      disabledVariant,
      controlWrapper,
    ]
  );

  return (
    <Card
      variant='subtle-compact'
      padding='sm'
      className={cn(
        'flex flex-row items-center justify-between gap-4 transition-colors hover:bg-card/50 bg-card/30',
        disabled && 'opacity-50 pointer-events-none',
        className
      )}
    >
      {children}
      <div className='relative z-10 flex-1 space-y-0.5'>
        <div className='flex items-center gap-1.5'>
          {icon ? <span className='shrink-0'>{icon}</span> : null}
          <Label
            htmlFor={generatedId}
            className={cn('text-sm font-medium text-gray-200 cursor-pointer', labelClassName)}
          >
            {label}
          </Label>
        </div>
        {description && <p className='text-[11px] text-gray-500 leading-tight'>{description}</p>}
      </div>
      <ToggleRowControlRuntimeProvider value={controlRuntimeValue}>
        <ToggleRowControl />
      </ToggleRowControlRuntimeProvider>
    </Card>
  );
}
