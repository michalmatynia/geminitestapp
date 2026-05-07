'use client';

import { useLayoutEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import type React from 'react';

import {
  SCRAPE_TEMPLATE_PLACEHOLDER_OPTIONS,
  type ScrapeTemplatePlaceholderOption,
} from '@/shared/contracts/products/scrape-template-placeholders';
import { cn } from '@/shared/utils/ui-utils';

export type DraftPlaceholderAnchorElement = HTMLInputElement | HTMLTextAreaElement;

type DraftPlaceholderDropdownProps = {
  anchorRef: React.MutableRefObject<DraftPlaceholderAnchorElement | null>;
  open: boolean;
  query: string;
  onSelect: (key: string) => void;
};

type ActivePlaceholderRange = {
  query: string;
  start: number;
  end: number;
};

type DropdownPosition = {
  left: number;
  maxHeight: number;
  top: number;
  width: number;
};

export type DraftPlaceholderMenuState = {
  open: boolean;
  query: string;
};

const MIN_DROPDOWN_HEIGHT = 140;
const MAX_DROPDOWN_HEIGHT = 256;
const DROPDOWN_GAP = 4;
const VIEWPORT_MARGIN = 12;
export const CLOSED_PLACEHOLDER_MENU: DraftPlaceholderMenuState = {
  open: false,
  query: '',
};

const normalizePlaceholderSearch = (value: string): string =>
  value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '');

const hasDisallowedPlaceholderWhitespace = (value: string): boolean => {
  let quoteOpen = false;
  let escaped = false;
  for (const character of value) {
    if (escaped) {
      escaped = false;
      continue;
    }
    if (quoteOpen) {
      if (character === '\\') escaped = true;
      else if (character === '"') quoteOpen = false;
      continue;
    }
    if (character === '"') {
      quoteOpen = true;
      continue;
    }
    if (/\s/.test(character)) return true;
  }
  return false;
};

export const getActivePlaceholderRange = (
  value: string,
  cursorPosition: number
): ActivePlaceholderRange | null => {
  const boundedCursor = Math.min(Math.max(cursorPosition, 0), value.length);
  const beforeCursor = value.slice(0, boundedCursor);
  const start = beforeCursor.lastIndexOf('[');
  if (start < 0) return null;

  const query = beforeCursor.slice(start + 1);
  if (query.includes(']') || hasDisallowedPlaceholderWhitespace(query)) return null;

  return {
    query,
    start,
    end: boundedCursor,
  };
};

export const insertPlaceholderToken = (
  value: string,
  token: string,
  cursorPosition: number
): { nextValue: string; nextCursor: number } => {
  const activeRange = getActivePlaceholderRange(value, cursorPosition);
  const replaceStart = activeRange?.start ?? cursorPosition;
  const replaceEnd = activeRange?.end ?? cursorPosition;
  const insertion = `[${token}]`;
  return {
    nextValue: `${value.slice(0, replaceStart)}${insertion}${value.slice(replaceEnd)}`,
    nextCursor: replaceStart + insertion.length,
  };
};

export const filterPlaceholderOptions = (
  query: string
): ScrapeTemplatePlaceholderOption[] => {
  const normalizedQuery = normalizePlaceholderSearch(query);
  if (normalizedQuery.length === 0) return SCRAPE_TEMPLATE_PLACEHOLDER_OPTIONS;

  return SCRAPE_TEMPLATE_PLACEHOLDER_OPTIONS.filter((option) => {
    const searchable = normalizePlaceholderSearch(
      `${option.key} ${option.label} ${option.description}`
    );
    return searchable.includes(normalizedQuery);
  });
};

export const resolvePlaceholderMenuState = ({
  cursorPosition,
  enabled,
  value,
}: {
  cursorPosition: number | null;
  enabled: boolean;
  value: string;
}): DraftPlaceholderMenuState => {
  if (enabled === false || cursorPosition === null) return CLOSED_PLACEHOLDER_MENU;
  const activeRange = getActivePlaceholderRange(value, cursorPosition);
  if (activeRange === null) return CLOSED_PLACEHOLDER_MENU;
  return { open: true, query: activeRange.query };
};

const resolveDropdownPosition = (
  anchor: DraftPlaceholderAnchorElement
): DropdownPosition => {
  const rect = anchor.getBoundingClientRect();
  const viewportHeight =
    typeof window !== 'undefined' ? window.innerHeight : MAX_DROPDOWN_HEIGHT;
  const spaceBelow = viewportHeight - rect.bottom - VIEWPORT_MARGIN;
  const spaceAbove = rect.top - VIEWPORT_MARGIN;
  const shouldOpenAbove = spaceBelow < MIN_DROPDOWN_HEIGHT && spaceAbove > spaceBelow;
  const maxHeight = Math.max(
    MIN_DROPDOWN_HEIGHT,
    Math.min(MAX_DROPDOWN_HEIGHT, shouldOpenAbove ? spaceAbove : spaceBelow)
  );
  const top = shouldOpenAbove
    ? Math.max(VIEWPORT_MARGIN, rect.top - maxHeight - DROPDOWN_GAP)
    : rect.bottom + DROPDOWN_GAP;

  return {
    left: rect.left,
    maxHeight,
    top,
    width: rect.width,
  };
};

const useDropdownPosition = (
  anchorRef: DraftPlaceholderDropdownProps['anchorRef'],
  open: boolean
): DropdownPosition | null => {
  const [position, setPosition] = useState<DropdownPosition | null>(null);

  useLayoutEffect(() => {
    if (!open) {
      setPosition(null);
      return undefined;
    }

    const updatePosition = (): void => {
      const anchor = anchorRef.current;
      if (anchor !== null) setPosition(resolveDropdownPosition(anchor));
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [anchorRef, open]);

  return position;
};

function DraftPlaceholderDropdownOptions({
  options,
  onSelect,
}: {
  options: ScrapeTemplatePlaceholderOption[];
  onSelect: (key: string) => void;
}): React.JSX.Element {
  if (options.length === 0) {
    return <div className='px-2 py-1.5 text-xs text-muted-foreground'>No placeholders found.</div>;
  }

  return (
    <>
      {options.map((option) => {
        let selectedByMouse = false;
        const handleMouseDown = (event: React.MouseEvent<HTMLButtonElement>): void => {
          event.preventDefault();
          event.stopPropagation();
          selectedByMouse = true;
          onSelect(option.key);
        };
        const handleClick = (): void => {
          if (selectedByMouse) return;
          onSelect(option.key);
        };

        return (
          <button
            key={option.key}
            type='button'
            role='option'
            aria-label={`[${option.key}]`}
            aria-selected={false}
            className='pointer-events-auto flex w-full flex-col rounded px-2 py-1.5 text-left text-xs hover:bg-muted'
            onMouseDown={handleMouseDown}
            onClick={handleClick}
          >
            <span className='font-mono text-foreground'>[{option.key}]</span>
            <span className='text-muted-foreground'>{option.description}</span>
          </button>
        );
      })}
    </>
  );
}

export function DraftPlaceholderDropdown({
  anchorRef,
  open,
  query,
  onSelect,
}: DraftPlaceholderDropdownProps): React.JSX.Element | null {
  const position = useDropdownPosition(anchorRef, open);
  const filteredOptions = useMemo(() => filterPlaceholderOptions(query), [query]);

  if (!open || position === null || typeof document === 'undefined') return null;

  return createPortal(
    <div
      role='listbox'
      aria-label='Scrape placeholders'
      tabIndex={-1}
      className={cn(
        'pointer-events-auto fixed z-[80] overflow-auto rounded-md border border-border bg-popover/95 p-1 shadow-xl backdrop-blur-md'
      )}
      style={{
        left: position.left,
        maxHeight: position.maxHeight,
        top: position.top,
        width: position.width,
      }}
      onMouseDown={(event): void => event.preventDefault()}
    >
      <DraftPlaceholderDropdownOptions options={filteredOptions} onSelect={onSelect} />
    </div>,
    document.body
  );
}
