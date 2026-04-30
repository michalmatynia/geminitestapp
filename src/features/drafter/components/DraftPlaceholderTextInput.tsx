'use client';

import { useRef, useState } from 'react';
import type React from 'react';

import { SCRAPE_TEMPLATE_PLACEHOLDER_OPTIONS } from '@/shared/contracts/products/scrape-template-placeholders';
import { Input, Textarea } from '@/shared/ui/primitives.public';
import { cn } from '@/shared/utils/ui-utils';

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

const insertPlaceholderToken = (
  value: string,
  token: string,
  cursorPosition: number
): { nextValue: string; nextCursor: number } => {
  const replaceStart = value.slice(0, cursorPosition).endsWith('[')
    ? cursorPosition - 1
    : cursorPosition;
  const insertion = `[${token}]`;
  return {
    nextValue: `${value.slice(0, replaceStart)}${insertion}${value.slice(cursorPosition)}`,
    nextCursor: replaceStart + insertion.length,
  };
};

export function DraftPlaceholderTextInput(
  props: DraftPlaceholderTextInputProps
): React.JSX.Element {
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
  const ref = useRef<TextControlElement | null>(null);
  const [open, setOpen] = useState(false);

  const handleKeyDown = (event: React.KeyboardEvent<TextControlElement>): void => {
    if (placeholderDropdownEnabled && event.key === '[') {
      window.setTimeout(() => setOpen(true), 0);
    }
    if (event.key === 'Escape') {
      setOpen(false);
    }
  };

  const handleSelectPlaceholder = (key: string): void => {
    const element = ref.current;
    const cursorPosition = element?.selectionStart ?? value.length;
    const { nextValue, nextCursor } = insertPlaceholderToken(value, key, cursorPosition);
    onValueChange(nextValue);
    setOpen(false);
    window.requestAnimationFrame(() => {
      ref.current?.focus();
      ref.current?.setSelectionRange(nextCursor, nextCursor);
    });
  };

  const commonProps = {
    id,
    value,
    disabled,
    placeholder,
    title,
    onKeyDown: handleKeyDown,
    onFocus: (): void => {
      if (placeholderDropdownEnabled && value.endsWith('[')) setOpen(true);
    },
    onChange: (
      event: React.ChangeEvent<HTMLInputElement> | React.ChangeEvent<HTMLTextAreaElement>
    ): void => onValueChange(event.target.value),
    'aria-label': ariaLabel ?? placeholder,
  };

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
      {placeholderDropdownEnabled && open ? (
        <div
          className={cn(
            'absolute z-50 mt-1 max-h-64 w-full overflow-auto rounded-md border border-border bg-popover p-1 shadow-lg'
          )}
          onMouseDown={(event): void => event.preventDefault()}
        >
          {SCRAPE_TEMPLATE_PLACEHOLDER_OPTIONS.map((option) => (
            <button
              key={option.key}
              type='button'
              className='flex w-full flex-col rounded px-2 py-1.5 text-left text-xs hover:bg-muted'
              onClick={(): void => handleSelectPlaceholder(option.key)}
            >
              <span className='font-mono text-foreground'>[{option.key}]</span>
              <span className='text-muted-foreground'>{option.description}</span>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
