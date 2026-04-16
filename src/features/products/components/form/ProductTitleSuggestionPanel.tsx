'use client';

import { ChevronRight } from 'lucide-react';
import React from 'react';

import { cn } from '@/shared/utils/ui-utils';

import type { SuggestionOption } from './StructuredProductNameField.types';

type ProductTitleSuggestionPanelProps = {
  listboxId: string;
  listboxLabel: string;
  suggestions: SuggestionOption[];
  highlightedIndex: number;
  onApply: (option: SuggestionOption) => void;
  onHighlight: (index: number) => void;
};

type ProductTitleSuggestionOptionProps = {
  listboxId: string;
  option: SuggestionOption;
  index: number;
  highlightedIndex: number;
  onApply: (option: SuggestionOption) => void;
  onHighlight: (index: number) => void;
};

const getSuggestionPanelClassName = (): string =>
  cn(
    'pointer-events-auto absolute left-0 right-0 top-[calc(100%+6px)] z-30 min-w-0 overflow-hidden rounded-md border border-border/70 bg-card/95 shadow-2xl backdrop-blur',
    'transform-gpu will-change-transform transition-[opacity,transform,box-shadow] duration-200 ease-out motion-reduce:transition-none',
    'motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200 motion-safe:ease-out',
    'motion-safe:slide-in-from-top-2'
  );

const getSuggestionOptionStateClassName = (
  isDisabled: boolean,
  isHighlighted: boolean
): string => {
  if (isDisabled) return 'cursor-not-allowed opacity-50';
  if (isHighlighted) {
    return 'cursor-pointer border-foreground/10 bg-foreground/12 font-medium text-foreground shadow-[inset_0_0_0_1px_rgba(255,255,255,0.08)]';
  }
  return 'cursor-pointer text-muted-foreground hover:translate-x-0.5 hover:border-foreground/10 hover:bg-foreground/6 hover:text-foreground hover:shadow-[inset_0_0_0_1px_rgba(255,255,255,0.05)]';
};

const getSuggestionOptionClassName = (isDisabled: boolean, isHighlighted: boolean): string =>
  cn(
    'group flex min-h-9 w-full min-w-0 items-center justify-between gap-2 rounded-md border border-transparent px-2.5 py-1 text-left text-sm',
    'transition-[background-color,border-color,box-shadow,color,opacity,transform] duration-200 ease-out motion-reduce:transition-none',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/40 focus-visible:ring-offset-1 focus-visible:ring-offset-background',
    getSuggestionOptionStateClassName(isDisabled, isHighlighted)
  );

const getSuggestionChevronClassName = (isHighlighted: boolean): string =>
  cn(
    'size-4 shrink-0 transition-[color,transform] duration-200 ease-out motion-reduce:transition-none',
    isHighlighted
      ? 'translate-x-0.5 text-foreground'
      : 'text-gray-500 group-hover:translate-x-0.5 group-hover:text-foreground'
  );

function ProductTitleSuggestionOption({
  listboxId,
  option,
  index,
  highlightedIndex,
  onApply,
  onHighlight,
}: ProductTitleSuggestionOptionProps): React.JSX.Element {
  const isDisabled = option.disabled === true;
  const isHighlighted = index === highlightedIndex;
  return (
    <button
      id={`${listboxId}-option-${index}`}
      key={`${option.label}-${index}`}
      type='button'
      role='option'
      disabled={option.disabled}
      aria-selected={isHighlighted}
      onMouseDown={(event: React.MouseEvent): void => event.preventDefault()}
      onMouseEnter={(): void => {
        if (isDisabled === false) onHighlight(index);
      }}
      onClick={(): void => onApply(option)}
      className={getSuggestionOptionClassName(isDisabled, isHighlighted)}
      aria-disabled={isDisabled ? true : undefined}
    >
      <span className='min-w-0 flex-1'>
        <span className='block truncate leading-5'>{option.label}</span>
        {typeof option.description === 'string' && option.description !== '' ? (
          <span className='block truncate text-[11px] leading-4 text-muted-foreground'>
            {option.description}
          </span>
        ) : null}
      </span>
      {isDisabled === false ? (
        <ChevronRight className={getSuggestionChevronClassName(isHighlighted)} />
      ) : null}
    </button>
  );
}

export function ProductTitleSuggestionPanel({
  listboxId,
  listboxLabel,
  suggestions,
  highlightedIndex,
  onApply,
  onHighlight,
}: ProductTitleSuggestionPanelProps): React.JSX.Element {
  return (
    <div
      id={listboxId}
      role='listbox'
      aria-label={listboxLabel}
      tabIndex={-1}
      className={getSuggestionPanelClassName()}
      onMouseDown={(event: React.MouseEvent): void => event.preventDefault()}
    >
      <div className='max-h-60 overflow-y-auto p-1'>
        {suggestions.map((option, index) => (
          <ProductTitleSuggestionOption
            key={`${option.label}-${index}`}
            listboxId={listboxId}
            option={option}
            index={index}
            highlightedIndex={highlightedIndex}
            onApply={onApply}
            onHighlight={onHighlight}
          />
        ))}
      </div>
    </div>
  );
}
