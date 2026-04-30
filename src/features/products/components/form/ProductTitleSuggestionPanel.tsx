'use client';

import { ChevronRight } from 'lucide-react';
import React, { useLayoutEffect, useState } from 'react';
import { createPortal } from 'react-dom';

import { cn } from '@/shared/utils/ui-utils';

import type { SuggestionOption } from './StructuredProductNameField.types';

type ProductTitleSuggestionPanelProps = {
  anchorRef?: React.RefObject<HTMLInputElement | null>;
  listboxId: string;
  listboxLabel: string;
  suggestions: SuggestionOption[];
  highlightedIndex: number;
  onApply: (option: SuggestionOption) => void;
  onHighlight: (index: number) => void;
};

type SuggestionPanelPosition = {
  left: number;
  maxHeight: number;
  top: number;
  width: number;
};

type ProductTitleSuggestionPanelContentProps = ProductTitleSuggestionPanelProps & {
  position: SuggestionPanelPosition | null;
};

const MIN_PANEL_HEIGHT = 140;
const MAX_PANEL_HEIGHT = 240;
const PANEL_GAP = 6;
const VIEWPORT_MARGIN = 12;

const resolvePanelPosition = (anchor: HTMLInputElement): SuggestionPanelPosition => {
  const rect = anchor.getBoundingClientRect();
  const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : MAX_PANEL_HEIGHT;
  const viewportWidth = typeof window !== 'undefined' ? window.innerWidth : rect.width;
  const spaceBelow = viewportHeight - rect.bottom - VIEWPORT_MARGIN;
  const spaceAbove = rect.top - VIEWPORT_MARGIN;
  const shouldOpenAbove = spaceBelow < MIN_PANEL_HEIGHT && spaceAbove > spaceBelow;
  const maxHeight = Math.max(
    MIN_PANEL_HEIGHT,
    Math.min(MAX_PANEL_HEIGHT, shouldOpenAbove ? spaceAbove : spaceBelow)
  );
  const width = Math.max(
    1,
    Math.min(rect.width, Math.max(1, viewportWidth - VIEWPORT_MARGIN * 2))
  );
  const left = Math.min(
    Math.max(VIEWPORT_MARGIN, rect.left),
    Math.max(VIEWPORT_MARGIN, viewportWidth - width - VIEWPORT_MARGIN)
  );
  return {
    left,
    maxHeight,
    top: shouldOpenAbove
      ? Math.max(VIEWPORT_MARGIN, rect.top - maxHeight - PANEL_GAP)
      : rect.bottom + PANEL_GAP,
    width,
  };
};

const useSuggestionPanelPosition = (
  anchorRef: React.RefObject<HTMLInputElement | null> | undefined
): SuggestionPanelPosition | null => {
  const [position, setPosition] = useState<SuggestionPanelPosition | null>(null);

  useLayoutEffect(() => {
    if (anchorRef === undefined) return undefined;
    const updatePosition = (): void => {
      const anchor = anchorRef.current;
      if (anchor === null) {
        setPosition(null);
        return;
      }
      setPosition(resolvePanelPosition(anchor));
    };
    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [anchorRef]);

  return position;
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
    'pointer-events-auto min-w-0 overflow-hidden rounded-md border border-border/70 bg-card/95 shadow-2xl backdrop-blur',
    'transform-gpu will-change-transform transition-[opacity,transform,box-shadow] duration-200 ease-out motion-reduce:transition-none',
    'motion-safe:animate-in motion-safe:fade-in motion-safe:duration-200 motion-safe:ease-out',
    'motion-safe:slide-in-from-top-2'
  );

const getSuggestionPanelPositionClassName = (anchored: boolean): string =>
  anchored
    ? 'fixed z-[70]'
    : 'absolute left-0 right-0 top-[calc(100%+6px)] z-30';

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

function ProductTitleSuggestionPanelContent({
  listboxId,
  listboxLabel,
  suggestions,
  highlightedIndex,
  onApply,
  onHighlight,
  position,
}: ProductTitleSuggestionPanelContentProps): React.JSX.Element {
  const anchored = position !== null;
  return (
    <div
      id={listboxId}
      role='listbox'
      aria-label={listboxLabel}
      tabIndex={-1}
      className={cn(
        getSuggestionPanelClassName(),
        getSuggestionPanelPositionClassName(anchored)
      )}
      style={
        anchored
          ? {
              left: position.left,
              maxHeight: position.maxHeight,
              top: position.top,
              width: position.width,
            }
          : undefined
      }
      onMouseDown={(event: React.MouseEvent): void => event.preventDefault()}
    >
      <div className='max-h-full overflow-y-auto p-1'>
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

export function ProductTitleSuggestionPanel(
  props: ProductTitleSuggestionPanelProps
): React.JSX.Element {
  const position = useSuggestionPanelPosition(props.anchorRef);
  const content = <ProductTitleSuggestionPanelContent {...props} position={position} />;

  if (props.anchorRef === undefined || position === null || typeof document === 'undefined') {
    return content;
  }

  return createPortal(content, document.body);
}
