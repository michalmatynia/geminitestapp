'use client';

import * as React from 'react';

import type { DataAttributes } from '@/shared/contracts/ui/base';
import { resolveControlAccessibleLabel } from '@/shared/ui/control-a11y';
import { cn } from '@/shared/utils/ui-utils';

type SwitchProps = Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  'defaultValue' | 'onChange' | 'value'
> &
  DataAttributes & {
    checked?: boolean;
    defaultChecked?: boolean;
    onCheckedChange?: (checked: boolean) => void;
    required?: boolean;
    value?: string;
  };

type SwitchSelection = {
  checked: boolean;
  setChecked: (checked: boolean) => void;
};

type SwitchButtonProps = Omit<
  SwitchProps,
  'checked' | 'defaultChecked' | 'name' | 'onCheckedChange' | 'onClick'
> & {
  accessible: ReturnType<typeof resolveControlAccessibleLabel>;
  checked: boolean;
  disabled: boolean;
  onSwitchClick: React.MouseEventHandler<HTMLButtonElement>;
};

const SWITCH_BUTTON_CLASS_NAME =
  'peer inline-flex h-[24px] w-[44px] shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input';

const useSwitchSelection = ({
  checkedProp,
  defaultChecked,
  disabled,
  onCheckedChange,
}: {
  checkedProp: boolean | undefined;
  defaultChecked: boolean;
  disabled: boolean;
  onCheckedChange: ((checked: boolean) => void) | undefined;
}): SwitchSelection => {
  const [uncontrolledChecked, setUncontrolledChecked] = React.useState(defaultChecked);
  const isControlled = checkedProp !== undefined;
  const checked = isControlled === true ? checkedProp : uncontrolledChecked;

  const setChecked = React.useCallback(
    (nextChecked: boolean): void => {
      if (disabled === true) return;
      if (isControlled === false) setUncontrolledChecked(nextChecked);
      onCheckedChange?.(nextChecked);
    },
    [disabled, isControlled, onCheckedChange]
  );

  return { checked, setChecked };
};

const SwitchHiddenInput = ({
  checked,
  disabled,
  name,
  required,
  value,
}: {
  checked: boolean;
  disabled: boolean;
  name: string | undefined;
  required: boolean | undefined;
  value: string;
}): React.JSX.Element | null => {
  if (typeof name !== 'string' || name.length === 0) return null;

  return (
    <input
      aria-hidden='true'
      checked={checked}
      className='sr-only'
      disabled={disabled}
      name={name}
      readOnly
      required={required}
      tabIndex={-1}
      type='checkbox'
      value={value}
    />
  );
};

const SwitchThumb = ({
  checked,
  disabled,
}: {
  checked: boolean;
  disabled: boolean;
}): React.JSX.Element => (
  <span
    data-disabled={disabled === true ? '' : undefined}
    data-state={checked === true ? 'checked' : 'unchecked'}
    className='pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0'
  />
);

const SwitchButton = React.forwardRef<HTMLButtonElement, SwitchButtonProps>((
  { accessible, checked, className, disabled, onSwitchClick, required, ...props },
  ref
): React.JSX.Element => (
  <button
    {...props}
    ref={ref}
    type='button'
    role='switch'
    aria-checked={checked}
    aria-label={accessible.hasLabel === true ? accessible.ariaLabel : undefined}
    aria-required={required}
    className={cn(SWITCH_BUTTON_CLASS_NAME, className)}
    data-disabled={disabled === true ? '' : undefined}
    data-state={checked === true ? 'checked' : 'unchecked'}
    disabled={disabled}
    onClick={onSwitchClick}
  >
    <SwitchThumb checked={checked} disabled={disabled} />
  </button>
));
SwitchButton.displayName = 'SwitchButton';

const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>((
  {
    checked: checkedProp,
    className,
    defaultChecked = false,
    disabled: disabledProp,
    id,
    name,
    onCheckedChange,
    onClick,
    required,
    title,
    value = 'on',
    'aria-label': ariaLabelProp,
    'aria-labelledby': ariaLabelledByProp,
    'data-doc-alias': dataDocAlias, 'data-doc-id': dataDocId, 'data-testid': dataTestId,
    ...props
  },
  ref
): React.JSX.Element => {
  const disabled = disabledProp === true;
  const { checked, setChecked } = useSwitchSelection({
    checkedProp,
    defaultChecked,
    disabled,
    onCheckedChange,
  });
  const accessible = resolveControlAccessibleLabel({
    ariaLabel: ariaLabelProp, ariaLabelledBy: ariaLabelledByProp,
    componentName: 'Switch', fallbackLabels: [name, dataDocAlias, dataDocId, dataTestId],
    id, title,
  });

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>): void => {
    onClick?.(event);
    if (event.defaultPrevented === true || disabled === true) return;
    setChecked(checked === false);
  };

  return (
    <>
      <SwitchButton
        ref={ref}
        accessible={accessible}
        aria-labelledby={ariaLabelledByProp}
        checked={checked}
        className={className}
        data-doc-alias={dataDocAlias}
        data-doc-id={dataDocId}
        data-testid={dataTestId}
        disabled={disabled}
        id={id}
        onSwitchClick={handleClick}
        required={required}
        title={title}
        value={value}
        {...props}
      />
      <SwitchHiddenInput checked={checked} disabled={disabled} name={name} required={required} value={value} />
    </>
  );
});
Switch.displayName = 'Switch';

export { Switch };
