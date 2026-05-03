'use client';

import { useRef, useState } from 'react';
import type React from 'react';

import { Input, Textarea } from '@/shared/ui/primitives.public';

import {
  CLOSED_PLACEHOLDER_MENU,
  DraftPlaceholderDropdown,
  insertPlaceholderToken,
  resolvePlaceholderMenuState,
  type DraftPlaceholderAnchorElement,
  type DraftPlaceholderMenuState,
} from './DraftPlaceholderDropdown';

type DraftPlaceholderTextInputProps = {
  id?: string;
  value: string;
  onValueChange: (next: string) => void;
  placeholder?: string;
  title?: string;
  ariaLabel?: string;
  disabled?: boolean;
  multiline?: boolean;
  rows?: number;
  className?: string;
  placeholderDropdownEnabled: boolean;
};

type TextControlElement = HTMLInputElement | HTMLTextAreaElement;

type DraftPlaceholderTextInputController = {
  commonProps: {
    id?: string;
    value: string;
    disabled?: boolean;
    placeholder?: string;
    title?: string;
    onKeyDown: (event: React.KeyboardEvent<TextControlElement>) => void;
    onFocus: () => void;
    onClick: () => void;
    onKeyUp: () => void;
    onChange: (
      event: React.ChangeEvent<HTMLInputElement> | React.ChangeEvent<HTMLTextAreaElement>
    ) => void;
    'aria-label'?: string;
  };
  handleSelectPlaceholder: (key: string) => void;
  placeholderMenu: DraftPlaceholderMenuState;
  ref: React.MutableRefObject<TextControlElement | null>;
};

type DraftPlaceholderTextInputControllerInput = Pick<
  DraftPlaceholderTextInputProps,
  | 'ariaLabel'
  | 'disabled'
  | 'id'
  | 'onValueChange'
  | 'placeholder'
  | 'placeholderDropdownEnabled'
  | 'title'
  | 'value'
>;

const focusControlAt = (
  ref: React.MutableRefObject<TextControlElement | null>,
  cursorPosition: number
): void => {
  window.requestAnimationFrame(() => {
    ref.current?.focus();
    ref.current?.setSelectionRange(cursorPosition, cursorPosition);
  });
};

const buildCommonProps = ({
  ariaLabel,
  disabled,
  id,
  onValueChange,
  placeholder,
  placeholderDropdownEnabled,
  setPlaceholderMenu,
  title,
  updateFromCurrentElement,
  updatePlaceholderMenu,
  value,
}: DraftPlaceholderTextInputControllerInput & {
  setPlaceholderMenu: React.Dispatch<React.SetStateAction<DraftPlaceholderMenuState>>;
  updateFromCurrentElement: () => void;
  updatePlaceholderMenu: (nextValue: string, cursorPosition: number | null) => void;
}): DraftPlaceholderTextInputController['commonProps'] => ({
  id,
  value,
  disabled,
  placeholder,
  title,
  onKeyDown: (event): void => {
    if (placeholderDropdownEnabled && event.key === '[') {
      window.setTimeout(updateFromCurrentElement, 0);
    }
    if (event.key === 'Escape') setPlaceholderMenu(CLOSED_PLACEHOLDER_MENU);
  },
  onFocus: updateFromCurrentElement,
  onClick: updateFromCurrentElement,
  onKeyUp: updateFromCurrentElement,
  onChange: (event): void => {
    onValueChange(event.target.value);
    updatePlaceholderMenu(event.target.value, event.target.selectionStart);
  },
  'aria-label': ariaLabel ?? placeholder,
});

function useDraftPlaceholderTextInputController({
  ariaLabel,
  disabled,
  id,
  onValueChange,
  placeholder,
  placeholderDropdownEnabled,
  title,
  value,
}: DraftPlaceholderTextInputControllerInput): DraftPlaceholderTextInputController {
  const ref = useRef<TextControlElement | null>(null);
  const [placeholderMenu, setPlaceholderMenu] =
    useState<DraftPlaceholderMenuState>(CLOSED_PLACEHOLDER_MENU);

  const updatePlaceholderMenu = (nextValue: string, cursorPosition: number | null): void =>
    setPlaceholderMenu(
      resolvePlaceholderMenuState({
        cursorPosition,
        enabled: placeholderDropdownEnabled,
        value: nextValue,
      })
    );

  const updateFromCurrentElement = (): void => {
    const element = ref.current;
    if (element !== null) updatePlaceholderMenu(element.value, element.selectionStart);
  };

  const handleSelectPlaceholder = (key: string): void => {
    const cursorPosition = ref.current?.selectionStart ?? value.length;
    const { nextValue, nextCursor } = insertPlaceholderToken(value, key, cursorPosition);
    onValueChange(nextValue);
    setPlaceholderMenu(CLOSED_PLACEHOLDER_MENU);
    focusControlAt(ref, nextCursor);
  };

  return {
    commonProps: buildCommonProps({
      ariaLabel,
      disabled,
      id,
      onValueChange,
      placeholder,
      placeholderDropdownEnabled,
      setPlaceholderMenu,
      title,
      updateFromCurrentElement,
      updatePlaceholderMenu,
      value,
    }),
    handleSelectPlaceholder,
    placeholderMenu,
    ref,
  };
}

export function DraftPlaceholderTextInput(props: DraftPlaceholderTextInputProps): React.JSX.Element {
  const {
    id,
    value,
    onValueChange,
    placeholder,
    title,
    ariaLabel,
    disabled,
    multiline = false,
    rows,
    className,
    placeholderDropdownEnabled,
  } = props;
  const { commonProps, handleSelectPlaceholder, placeholderMenu, ref } =
    useDraftPlaceholderTextInputController({
      ariaLabel,
      disabled,
      id,
      onValueChange,
      placeholder,
      placeholderDropdownEnabled,
      title,
      value,
    });

  return (
    <div className='relative'>
      {multiline ? (
        <Textarea
          {...commonProps}
          ref={(element): void => {
            ref.current = element;
          }}
          rows={rows}
          className={className}
        />
      ) : (
        <Input
          {...commonProps}
          ref={(element): void => {
            ref.current = element;
          }}
          className={className}
        />
      )}
      <DraftPlaceholderDropdown
        anchorRef={ref as React.MutableRefObject<DraftPlaceholderAnchorElement | null>}
        open={placeholderDropdownEnabled && placeholderMenu.open}
        query={placeholderMenu.query}
        onSelect={handleSelectPlaceholder}
      />
    </div>
  );
}
