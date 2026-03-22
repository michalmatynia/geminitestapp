'use client';

import { useCallback, useMemo, useState } from 'react';

import type { SelectOption } from '@/shared/contracts/ui';
import { FormModal } from '@/shared/ui/FormModal';
import { UI_STACK_RELAXED_CLASSNAME } from '@/shared/ui/layout';
import { SearchInput } from '@/shared/ui/search-input';
import { cn } from '@/shared/utils';

export type { SelectOption };

export interface SelectModalProps<T> {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  options: SelectOption<T>[];
  onSelect: (option: SelectOption<T> | SelectOption<T>[]) => void;
  loading?: boolean;
  searchable?: boolean;
  multiple?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

/**
 * Reusable modal template for single/multi-select operations.
 * Refactored to leverage FormModal and SearchInput for consistent UX.
 */
export function SelectModal<T>({
  open,
  onClose,
  title,
  subtitle,
  options,
  onSelect,
  loading = false,
  searchable = true,
  multiple = false,
  size: modalSize = 'md',
}: SelectModalProps<T>): React.JSX.Element {
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(new Set());

  const filteredOptions = useMemo(() => {
    if (!searchable || !search) return options;
    const term = search.toLowerCase();
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(term) || opt.description?.toLowerCase().includes(term)
    );
  }, [options, search, searchable]);

  const handleSelect = useCallback(
    (option: SelectOption<T>) => {
      if (multiple) {
        setSelectedIds((current) => {
          const next = new Set(current);
          if (next.has(option.id)) {
            next.delete(option.id);
          } else {
            next.add(option.id);
          }
          return next;
        });
        return;
      }

      onSelect(option);
      onClose();
    },
    [multiple, onClose, onSelect]
  );

  const handleConfirm = useCallback(() => {
    if (!multiple) return;

    const selectedOptions = options.filter((opt) => selectedIds.has(opt.id));
    onSelect(selectedOptions);
    onClose();
  }, [multiple, onClose, onSelect, options, selectedIds]);

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      size={modalSize}
      onSave={handleConfirm}
      showSaveButton={multiple}
      saveText={`Select (${selectedIds.size})`}
      isSaveDisabled={selectedIds.size === 0}
      isSaving={loading}
    >
      <div className={UI_STACK_RELAXED_CLASSNAME}>
        {searchable ? (
          <SearchInput
            placeholder='Search options...'
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onClear={() => setSearch('')}
            aria-label='Search options'
            disabled={loading}
            size='sm'
          />
        ) : null}

        {loading ? (
          <div className='flex items-center justify-center py-12'>
            <span className='text-sm text-muted-foreground animate-pulse'>Loading options...</span>
          </div>
        ) : filteredOptions.length === 0 ? (
          <div className='flex items-center justify-center py-12'>
            <span className='text-sm text-muted-foreground italic'>No options available</span>
          </div>
        ) : (
          <div className='space-y-1 max-h-96 overflow-y-auto pr-1'>
            {filteredOptions.map((option) => (
              <button
                key={option.id}
                type='button'
                onClick={() => handleSelect(option)}
                disabled={option.disabled || loading}
                aria-label={option.label}
                className={cn(
                  'w-full rounded-md border p-3 text-left transition-all duration-200',
                  selectedIds.has(option.id)
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border/60 bg-card/40 text-gray-300 hover:border-border hover:bg-muted/20',
                  option.disabled ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'
                )}
              >
                <div className='text-sm font-medium'>{option.label}</div>
                {option.description ? (
                  <div className='mt-0.5 text-xs opacity-70'>{option.description}</div>
                ) : null}
              </button>
            ))}
          </div>
        )}
      </div>
    </FormModal>
  );
}
