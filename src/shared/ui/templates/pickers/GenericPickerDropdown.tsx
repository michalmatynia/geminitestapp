'use client';

import { Plus } from 'lucide-react';
import { memo, useState, useCallback, useMemo } from 'react';

import { cn } from '@/shared/utils';

import type { GenericPickerDropdownProps, PickerOption, PickerGroup } from '@/shared/contracts/ui';

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
 *   onSelect={(option) => console.log(option)}
 *   ariaLabel="Select a section type"
 * />
 */
export const GenericPickerDropdown = memo(function GenericPickerDropdown<
  T extends PickerOption = PickerOption
>({
  groups,
  onSelect,
  selectedKey,
  ariaLabel = 'Add item',
  triggerClassName,
  dropdownClassName,
  triggerContent = <Plus className='size-3' />,
  disabled = false,
  searchable = false,
  searchPlaceholder = 'Search...',
}: GenericPickerDropdownProps<T>): React.ReactNode {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const handleSelect = useCallback(
    (option: T) => {
      onSelect(option);
      setIsOpen(false);
      setSearchQuery('');
    },
    [onSelect]
  );

  const handleOpenChange = useCallback(() => {
    if (!disabled) {
      setIsOpen(!isOpen);
    }
  }, [isOpen, disabled]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.stopPropagation();
        handleOpenChange();
      } else if (e.key === 'Escape') {
        setIsOpen(false);
      }
    },
    [handleOpenChange]
  );

  const allOptions = useMemo(
    () => groups.flatMap((g: PickerGroup) => g.options),
    [groups]
  );

  const filteredGroups = useMemo(() => {
    if (!searchable || !searchQuery) return groups;

    const query = searchQuery.toLowerCase();
    return groups
      .map((group: PickerGroup) => ({
        ...group,
        options: group.options.filter((opt: PickerOption) =>
          opt.label.toLowerCase().includes(query) ||
          opt.description?.toLowerCase().includes(query)
        ),
      }))
      .filter((group: PickerGroup) => group.options.length > 0);
  }, [groups, searchQuery, searchable]);

  const allOptionsCount = allOptions.length;
  if (allOptionsCount === 0) return null;

  return (
    <div className='relative'>
      {/* Trigger Button */}
      <div
        role='button'
        tabIndex={disabled ? -1 : 0}
        onClick={handleOpenChange}
        onKeyDown={handleKeyDown}
        className={cn(
          'flex h-5 w-5 items-center justify-center rounded text-gray-500 transition hover:bg-muted/50 hover:text-gray-300',
          disabled && 'cursor-not-allowed opacity-50',
          triggerClassName
        )}
        aria-label={ariaLabel}
        aria-disabled={disabled}
      >
        {triggerContent}
      </div>

      {/* Dropdown Menu */}
      {isOpen && !disabled && (
        <>
          {/* Backdrop */}
          <div
            className='fixed inset-0 z-40'
            onClick={() => setIsOpen(false)}
            onKeyDown={(e: React.KeyboardEvent) => {
              if (e.key === 'Escape') setIsOpen(false);
            }}
            role='button'
            tabIndex={-1}
            aria-label='Close picker'
          />

          {/* Dropdown Content */}
          <div
            className={cn(
              'absolute left-0 top-full z-50 mt-1 w-48 rounded-md border border-border/50 bg-popover/95 p-1 shadow-lg backdrop-blur-md',
              dropdownClassName
            )}
          >
            {/* Search Input (if enabled) */}
            {searchable && (
              <div className='mb-2 border-b border-border/30 pb-2'>
                <input
                  type='text'
                  placeholder={searchPlaceholder}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className='w-full rounded px-2 py-1 text-xs bg-background/80 border border-border/40 placeholder-gray-500 text-gray-200 focus:outline-none focus:ring-1 focus:ring-blue-500'
                  autoFocus
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
                <div key={group.label}>
                  {groupIdx > 0 && <div className='my-1 border-t border-border/30' />}

                  {/* Group Header */}
                  <div className='px-2 py-1.5 text-xs font-medium uppercase tracking-wide text-gray-400'>
                    {group.label}
                  </div>

                  {/* Group Options */}
                  {group.options.map((option: PickerOption) => {
                    const isSelected = selectedKey === option.key;
                    return (
                      <button
                        key={option.key}
                        type='button'
                        onClick={() => handleSelect(option as T)}
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
                        {option.icon && <span className='flex-shrink-0'>{option.icon}</span>}
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
