'use client';

import { Plus } from 'lucide-react';
import { memo, useState, useCallback, useEffect, useId, useMemo, useRef } from 'react';

import type { GenericPickerDropdownProps, PickerOption, PickerGroup } from '@/shared/contracts/ui';
import { cn } from '@/shared/utils';

/**
 * GenericPickerDropdown - Reusable dropdown picker for grouped options
 *
 * Features:
 * - Typed generics for type safety
 * - Grouped options with labels
 * - Keyboard navigation support
 * - Icon support for options
 * - Customizable styling
 * - Accessibility-first design
 *
 * @example
 * const groups = [
 *   {
 *     label: 'Basic',
 *     options: [
 *       { key: 'grid', label: 'Grid', icon: <GridIcon /> }
 *     ]
 *   }
 * ];
 *
 * <GenericPickerDropdown
 *   groups={groups}
 *   onSelect={(option) => {
 *     // handle selection
 *   }}
 *   ariaLabel="Select a section type"
 * />
 */
export const GenericPickerDropdown = memo(function GenericPickerDropdown<
  T extends PickerOption = PickerOption,
>(props: GenericPickerDropdownProps<T>): React.ReactNode {
  const {
    groups,
    onSelect,
    selectedKey,
    ariaLabel = 'Add item',
    triggerClassName,
    dropdownClassName,
    triggerContent = <Plus className='size-3' aria-hidden='true' />,
    disabled = false,
    searchable = false,
    searchPlaceholder = 'Search...',
  } = props;
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const listboxId = useId();
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const optionRefs = useRef(new Map<string, HTMLButtonElement>());

  const filteredGroups = useMemo(() => {
    if (!searchable || !searchQuery) return groups;

    const query = searchQuery.toLowerCase();
    return groups
      .map((group: PickerGroup) => ({
        ...group,
        options: group.options.filter(
          (opt: PickerOption) =>
            opt.label.toLowerCase().includes(query) ||
            opt.description?.toLowerCase().includes(query)
        ),
      }))
      .filter((group: PickerGroup) => group.options.length > 0);
  }, [groups, searchQuery, searchable]);

  const allOptions = useMemo(() => groups.flatMap((g: PickerGroup) => g.options), [groups]);
  const enabledFilteredOptions = useMemo(
    () =>
      filteredGroups
        .flatMap((group: PickerGroup) => group.options)
        .filter((option: PickerOption) => !option.disabled),
    [filteredGroups]
  );
  const pendingFocusKeyRef = useRef<string | null>(null);

  const focusOption = useCallback((optionKey: string | null | undefined) => {
    if (!optionKey) return;
    optionRefs.current.get(optionKey)?.focus();
  }, []);

  const getFocusOptionKey = useCallback(
    (preferred: 'selected' | 'first' | 'last' = 'selected'): string | null => {
      if (enabledFilteredOptions.length === 0) return null;

      if (preferred === 'selected' && selectedKey) {
        const selectedOption = enabledFilteredOptions.find((option) => option.key === selectedKey);
        if (selectedOption) return selectedOption.key;
      }

      if (preferred === 'last') {
        return enabledFilteredOptions.at(-1)?.key ?? null;
      }

      return enabledFilteredOptions[0]?.key ?? null;
    },
    [enabledFilteredOptions, selectedKey]
  );

  const closeDropdown = useCallback((returnFocusToTrigger = false) => {
    setIsOpen(false);
    pendingFocusKeyRef.current = null;

    if (returnFocusToTrigger) {
      queueMicrotask(() => {
        triggerRef.current?.focus();
      });
    }
  }, []);

  const handleSelect = useCallback(
    (option: T) => {
      onSelect(option);
      closeDropdown(true);
      setSearchQuery('');
    },
    [closeDropdown, onSelect]
  );

  const openDropdown = useCallback(
    (preferredFocus: 'selected' | 'first' | 'last' = 'selected') => {
      if (disabled) return;
      pendingFocusKeyRef.current = getFocusOptionKey(preferredFocus);
      setIsOpen(true);
    },
    [disabled, getFocusOptionKey]
  );

  const handleOpenChange = useCallback(() => {
    if (disabled) return;

    if (isOpen) {
      closeDropdown(false);
      return;
    }

    openDropdown();
  }, [closeDropdown, disabled, isOpen, openDropdown]);

  const focusOptionBoundary = useCallback(
    (boundary: 'first' | 'last') => {
      focusOption(getFocusOptionKey(boundary));
    },
    [focusOption, getFocusOptionKey]
  );

  const focusRelativeOption = useCallback(
    (optionKey: string, direction: -1 | 1) => {
      const currentIndex = enabledFilteredOptions.findIndex((option) => option.key === optionKey);
      if (currentIndex < 0) {
        focusOptionBoundary(direction > 0 ? 'first' : 'last');
        return;
      }

      const nextIndex = Math.min(
        enabledFilteredOptions.length - 1,
        Math.max(0, currentIndex + direction)
      );
      focusOption(enabledFilteredOptions[nextIndex]?.key ?? null);
    },
    [enabledFilteredOptions, focusOption, focusOptionBoundary]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        e.stopPropagation();
        handleOpenChange();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        if (isOpen) {
          focusOptionBoundary('first');
          return;
        }
        openDropdown('first');
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        if (isOpen) {
          focusOptionBoundary('last');
          return;
        }
        openDropdown('last');
      } else if (e.key === 'Escape') {
        e.preventDefault();
        closeDropdown(false);
      }
    },
    [closeDropdown, focusOptionBoundary, handleOpenChange, isOpen, openDropdown]
  );

  const handleDropdownKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      closeDropdown(true);
    }
  }, [closeDropdown]);

  const handleSearchInputKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        focusOptionBoundary('first');
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        focusOptionBoundary('last');
      } else if (e.key === 'Escape') {
        e.preventDefault();
        closeDropdown(true);
      }
    },
    [closeDropdown, focusOptionBoundary]
  );

  const handleOptionKeyDown = useCallback(
    (option: T, e: React.KeyboardEvent<HTMLButtonElement>) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        focusRelativeOption(option.key, 1);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        focusRelativeOption(option.key, -1);
      } else if (e.key === 'Home') {
        e.preventDefault();
        focusOptionBoundary('first');
      } else if (e.key === 'End') {
        e.preventDefault();
        focusOptionBoundary('last');
      } else if (e.key === 'Escape') {
        e.preventDefault();
        closeDropdown(true);
      }
    },
    [closeDropdown, focusOptionBoundary, focusRelativeOption]
  );

  const handleContainerBlur = useCallback((e: React.FocusEvent<HTMLDivElement>) => {
    if (e.relatedTarget instanceof Node && e.currentTarget.contains(e.relatedTarget)) {
      return;
    }
    closeDropdown(false);
  }, [closeDropdown]);

  const setOptionRef = useCallback((optionKey: string, node: HTMLButtonElement | null) => {
    if (node) {
      optionRefs.current.set(optionKey, node);
      return;
    }
    optionRefs.current.delete(optionKey);
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    if (searchable) {
      searchInputRef.current?.focus();
      return;
    }

    const nextFocusKey = pendingFocusKeyRef.current ?? getFocusOptionKey();
    if (!nextFocusKey) return;

    queueMicrotask(() => {
      focusOption(nextFocusKey);
      pendingFocusKeyRef.current = null;
    });
  }, [focusOption, getFocusOptionKey, isOpen, searchable]);

  const allOptionsCount = allOptions.length;
  if (allOptionsCount === 0) return null;

  return (
    <div className='relative' onBlur={handleContainerBlur}>
      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type='button'
        onClick={handleOpenChange}
        onKeyDown={handleKeyDown}
        className={cn(
          'flex h-5 w-5 items-center justify-center rounded text-gray-500 transition hover:bg-muted/50 hover:text-gray-300',
          disabled && 'cursor-not-allowed opacity-50',
          triggerClassName
        )}
        aria-label={ariaLabel}
        aria-controls={isOpen ? listboxId : undefined}
        aria-expanded={isOpen}
        aria-haspopup='listbox'
        disabled={disabled}
      >
        {triggerContent}
      </button>

      {/* Dropdown Menu */}
      {isOpen && !disabled && (
        <>
          {/* Backdrop */}
          <button
            type='button'
            className='fixed inset-0 z-40 cursor-pointer border-0 bg-transparent p-0'
            onClick={() => setIsOpen(false)}
            aria-label='Close dropdown'
            tabIndex={-1}
          />

          {/* Dropdown Content */}
          <div
            id={listboxId}
            className={cn(
              'absolute left-0 top-full z-50 mt-1 w-48 rounded-md border border-border/50 bg-popover/95 p-1 shadow-lg backdrop-blur-md',
              dropdownClassName
            )}
            role='listbox'
            aria-label={ariaLabel}
            tabIndex={-1}
            onKeyDown={handleDropdownKeyDown}
          >
            {/* Search Input (if enabled) */}
            {searchable && (
              <div className='mb-2 border-b border-border/30 pb-2'>
                <input
                  ref={searchInputRef}
                  type='text'
                  placeholder={searchPlaceholder}
                  aria-label={`Search ${ariaLabel.toLowerCase()}`}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={handleSearchInputKeyDown}
                  className='w-full rounded px-2 py-1 text-xs bg-background/80 border border-border/40 placeholder-gray-500 text-gray-200 focus:outline-none focus-visible:ring-1 focus-visible:ring-blue-500'
                />
              </div>
            )}

            {/* Groups and Options */}
            {filteredGroups.length === 0 ? (
              <div className='px-2 py-1.5 text-xs text-gray-500'>
                {searchable ? 'No results found' : 'No options available'}
              </div>
            ) : (
              filteredGroups.map((group: PickerGroup, groupIdx: number) => (
                <div key={group.label} role='group' aria-label={group.label}>
                  {groupIdx > 0 && (
                    <div className='my-1 border-t border-border/30' aria-hidden='true' />
                  )}

                  {/* Group Header */}
                  <div
                    className='px-2 py-1.5 text-xs font-medium uppercase tracking-wide text-gray-400'
                    aria-hidden='true'
                  >
                    {group.label}
                  </div>

                  {/* Group Options */}
                  {group.options.map((option: PickerOption) => {
                    const isSelected = selectedKey === option.key;
                    return (
                      <button
                        ref={(node) => setOptionRef(option.key, node)}
                        key={option.key}
                        type='button'
                        role='option'
                        aria-selected={isSelected}
                        aria-disabled={option.disabled || undefined}
                        onClick={() => handleSelect(option as T)}
                        onKeyDown={(e) => handleOptionKeyDown(option as T, e)}
                        disabled={option.disabled}
                        className={cn(
                          'flex w-full items-center gap-2 rounded-sm px-2 py-1.5 text-sm transition',
                          isSelected
                            ? 'bg-blue-500/20 text-blue-300'
                            : 'text-gray-300 hover:bg-foreground/10',
                          option.disabled && 'cursor-not-allowed opacity-50'
                        )}
                        title={option.description}
                      >
                        {option.icon && (
                          <span className='flex-shrink-0' aria-hidden='true'>
                            {option.icon}
                          </span>
                        )}
                        <span>{option.label}</span>
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
});

GenericPickerDropdown.displayName = 'GenericPickerDropdown';
