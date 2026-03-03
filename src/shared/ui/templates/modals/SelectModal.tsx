'use client';

import { useState, useCallback, useMemo } from 'react';

import { FormModal } from '@/shared/ui/FormModal';
import { SearchInput } from '@/shared/ui/search-input';
import { cn } from '@/shared/utils';

export interface SelectOption<T> {
  id: string | number;
  label: string;
  value: T;
  disabled?: boolean;
  description?: string;
}

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
  size = 'md',
}: SelectModalProps<T>) {
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string | number>>(new Set());

  const filteredOptions = useMemo(() => {
    if (!searchable || !search) return options;
    const term = search.toLowerCase();
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(term) ||
        opt.description?.toLowerCase().includes(term)
    );
  }, [options, search, searchable]);

  const handleSelect = useCallback(
    (option: SelectOption<T>) => {
      if (multiple) {
        const next = new Set(selectedIds);
        if (next.has(option.id)) {
          next.delete(option.id);
        } else {
          next.add(option.id);
        }
        setSelectedIds(next);
      } else {
        onSelect(option);
        onClose();
      }
    },
    [multiple, selectedIds, onSelect, onClose]
  );

  const handleConfirm = useCallback(() => {
    if (multiple) {
      const selectedOptions = options.filter((opt) => selectedIds.has(opt.id));
      onSelect(selectedOptions);
      onClose();
    }
  }, [multiple, selectedIds, options, onSelect, onClose]);

  return (
    <FormModal
      open={open}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      size={size}
      onSave={handleConfirm}
      showSaveButton={multiple}
      saveText={`Select (${selectedIds.size})`}
      isSaveDisabled={selectedIds.size === 0}
      isSaving={loading}
    >
      <div className='flex flex-col gap-4'>
        {searchable && (
          <SearchInput
            placeholder='Search options...'
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onClear={() => setSearch('')}
            disabled={loading}
            size='sm'
          />
        )}

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
                className={cn(
                  'w-full p-3 text-left rounded-md border transition-all duration-200',
                  selectedIds.has(option.id)
                    ? 'bg-primary/10 border-primary text-primary'
                    : 'bg-card/40 border-border/60 hover:border-border hover:bg-muted/20 text-gray-300',
                  option.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'
                )}
              >
                <div className='font-medium text-sm'>{option.label}</div>
                {option.description && (
                  <div className='text-xs opacity-70 mt-0.5'>{option.description}</div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>
    </FormModal>
  );
}
