'use client';

import { Circle } from 'lucide-react';
import * as React from 'react';

import type { DataAttributes } from '@/shared/contracts/ui/base';
import { resolveControlAccessibleLabel } from '@/shared/ui/control-a11y';
import { cn } from '@/shared/utils/ui-utils';

type RadioGroupContextValue = {
  disabled: boolean;
  name?: string;
  required: boolean;
  selectValue: (value: string) => void;
  value?: string;
};

type RadioGroupProps = Omit<React.HTMLAttributes<HTMLDivElement>, 'defaultValue' | 'onChange'> & {
  defaultValue?: string;
  disabled?: boolean;
  name?: string;
  onValueChange?: (value: string) => void;
  orientation?: 'horizontal' | 'vertical';
  required?: boolean;
  value?: string;
};

type RadioGroupItemProps = Omit<
  React.ButtonHTMLAttributes<HTMLButtonElement>,
  'onChange' | 'type' | 'value'
> &
  DataAttributes & {
    value: string;
  };

type RadioNavigationAction = 'first' | 'last' | 'next' | 'previous';

const RadioGroupContext = React.createContext<RadioGroupContextValue | null>(null);
const RADIO_GROUP_ITEM_CLASS_NAME =
  'aspect-square h-4 w-4 rounded-full border border-primary text-primary shadow focus:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50';

const isRadioButton = (element: Element): element is HTMLButtonElement =>
  element instanceof HTMLButtonElement &&
  element.getAttribute('role') === 'radio' &&
  element.disabled === false;

const getRadioNavigationAction = (key: string): RadioNavigationAction | null => {
  switch (key) {
    case 'ArrowDown':
    case 'ArrowRight':
      return 'next';
    case 'ArrowUp':
    case 'ArrowLeft':
      return 'previous';
    case 'Home':
      return 'first';
    case 'End':
      return 'last';
    default:
      return null;
  }
};

const getNextRadioIndex = (
  currentIndex: number,
  itemCount: number,
  action: RadioNavigationAction
): number => {
  if (action === 'first') return 0;
  if (action === 'last') return itemCount - 1;
  if (currentIndex < 0) return action === 'previous' ? itemCount - 1 : 0;
  if (action === 'next') return (currentIndex + 1) % itemCount;
  return (currentIndex - 1 + itemCount) % itemCount;
};

const activateNavigatedRadioItem = (
  group: HTMLDivElement,
  action: RadioNavigationAction
): boolean => {
  const items = Array.from(group.querySelectorAll('[role="radio"]')).filter(isRadioButton);
  if (items.length === 0) return false;

  const active = document.activeElement;
  const currentIndex = active instanceof HTMLButtonElement ? items.indexOf(active) : -1;
  const nextItem = items[getNextRadioIndex(currentIndex, items.length, action)];
  if (nextItem === undefined) return false;

  nextItem.focus();
  nextItem.click();
  return true;
};

const useRadioGroupSelection = ({
  controlledValue,
  defaultValue,
  disabled,
  onValueChange,
}: {
  controlledValue: string | undefined;
  defaultValue: string | undefined;
  disabled: boolean;
  onValueChange: ((value: string) => void) | undefined;
}): Pick<RadioGroupContextValue, 'selectValue' | 'value'> => {
  const [uncontrolledValue, setUncontrolledValue] = React.useState(defaultValue);
  const isControlled = controlledValue !== undefined;
  const value = isControlled === true ? controlledValue : uncontrolledValue;

  const selectValue = React.useCallback(
    (nextValue: string): void => {
      if (disabled === true) return;
      if (isControlled === false) setUncontrolledValue(nextValue);
      if (nextValue !== value) onValueChange?.(nextValue);
    },
    [disabled, isControlled, onValueChange, value]
  );

  return { selectValue, value };
};

const RadioGroupNativeInput = ({
  checked,
  context,
  disabled,
  value,
}: {
  checked: boolean;
  context: RadioGroupContextValue | null;
  disabled: boolean;
  value: string;
}): React.JSX.Element | null => {
  const name = context?.name;
  const required = context?.required === true;
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
      type='radio'
      value={value}
    />
  );
};

const RadioGroupItemIndicator = ({ checked }: { checked: boolean }): React.JSX.Element => (
  <span className={cn('flex items-center justify-center', checked ? 'opacity-100' : 'opacity-0')}>
    <Circle className='h-2.5 w-2.5 fill-current text-current' aria-hidden='true' />
  </span>
);

const RadioGroup = React.forwardRef<HTMLDivElement, RadioGroupProps>((
  {
    className,
    defaultValue,
    disabled: disabledProp = false,
    name,
    onKeyDown,
    onValueChange,
    orientation,
    required: requiredProp = false,
    tabIndex,
    value: controlledValue,
    ...props
  },
  ref
): React.JSX.Element => {
  const disabled = disabledProp === true;
  const required = requiredProp === true;
  const { selectValue, value } = useRadioGroupSelection({
    controlledValue,
    defaultValue,
    disabled,
    onValueChange,
  });
  const contextValue = React.useMemo(
    () => ({ disabled, name, required, selectValue, value }),
    [disabled, name, required, selectValue, value]
  );

  const handleKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLDivElement>): void => {
      onKeyDown?.(event);
      if (event.defaultPrevented === true || disabled === true) return;

      const action = getRadioNavigationAction(event.key);
      if (action === null) return;
      if (activateNavigatedRadioItem(event.currentTarget, action) === true) {
        event.preventDefault();
      }
    },
    [disabled, onKeyDown]
  );

  return (
    <RadioGroupContext.Provider value={contextValue}>
      <div
        role='radiogroup'
        aria-disabled={disabled === true ? 'true' : undefined}
        aria-orientation={orientation}
        className={cn('grid gap-2', className)}
        tabIndex={tabIndex ?? -1}
        {...props}
        ref={ref}
        onKeyDown={handleKeyDown}
      />
    </RadioGroupContext.Provider>
  );
});
RadioGroup.displayName = 'RadioGroup';

const RadioGroupItem = React.forwardRef<HTMLButtonElement, RadioGroupItemProps>(
  (
    {
      className,
      disabled: disabledProp,
      id,
      onClick,
      title,
      value,
      'aria-label': ariaLabelProp,
      'aria-labelledby': ariaLabelledByProp,
      'data-doc-alias': dataDocAlias, 'data-doc-id': dataDocId, 'data-testid': dataTestId,
      ...props
    },
    ref
  ): React.JSX.Element => {
    const context = React.useContext(RadioGroupContext);
    const disabled = disabledProp === true || context?.disabled === true;
    const checked = context?.value === value;
    const accessible = resolveControlAccessibleLabel({
      ariaLabel: ariaLabelProp, ariaLabelledBy: ariaLabelledByProp,
      componentName: 'RadioGroupItem', fallbackLabels: [value, dataDocAlias, dataDocId, dataTestId],
      id, title,
    });

    const handleClick = (event: React.MouseEvent<HTMLButtonElement>): void => {
      onClick?.(event);
      if (event.defaultPrevented === true || disabled === true) return;
      context?.selectValue(value);
    };

    return (
      <>
        <button
          ref={ref}
          type='button'
          role='radio'
          aria-checked={checked}
          aria-label={accessible.hasLabel === true ? accessible.ariaLabel : undefined}
          aria-labelledby={ariaLabelledByProp}
          className={cn(RADIO_GROUP_ITEM_CLASS_NAME, className)}
          data-disabled={disabled === true ? '' : undefined}
          data-doc-alias={dataDocAlias}
          data-doc-id={dataDocId}
          data-state={checked === true ? 'checked' : 'unchecked'}
          data-testid={dataTestId}
          disabled={disabled}
          id={id}
          title={title}
          value={value}
          onClick={handleClick}
          {...props}
        >
          <RadioGroupItemIndicator checked={checked} />
        </button>
        <RadioGroupNativeInput checked={checked} context={context} disabled={disabled} value={value} />
      </>
    );
  }
);
RadioGroupItem.displayName = 'RadioGroupItem';

export { RadioGroup, RadioGroupItem };
