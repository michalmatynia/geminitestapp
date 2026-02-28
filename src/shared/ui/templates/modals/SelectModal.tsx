'use client';

import { useState, useCallback, useMemo } from 'react';

import { AppModal } from '@/shared/ui/app-modal';
import { Button } from '@/shared/ui/button';

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
  onSelect: (option: SelectOption<T>) => void;
  loading?: boolean;
  searchable?: boolean;
  multiple?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

/**
 * Reusable modal template for single/multi-select operations.
 * Consolidates SelectIntegrationModal, SelectProductForListingModal patterns.
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
  const [selected, setSelected] = useState<Set<string | number>>(new Set());

  const filteredOptions = useMemo(() => {
    if (!searchable || !search) return options;
    return options.filter(
      (opt) =>
        opt.label.toLowerCase().includes(search.toLowerCase()) ||
        opt.description?.toLowerCase().includes(search.toLowerCase())
    );
  }, [options, search, searchable]);

  const handleSelect = useCallback(
    (option: SelectOption<T>) => {
      if (multiple) {
        const newSelected = new Set(selected);
        if (newSelected.has(option.id)) {
          newSelected.delete(option.id);
        } else {
          newSelected.add(option.id);
        }
        setSelected(newSelected);
      } else {
        onSelect(option);
        onClose();
      }
    },
    [multiple, selected, onSelect, onClose]
  );

  const handleConfirm = useCallback(() => {
    if (multiple) {
      const selectedOptions = options.filter((opt) => selected.has(opt.id));
      selectedOptions.forEach((opt) => onSelect(opt));
      onClose();
    }
  }, [multiple, selected, options, onSelect, onClose]);

  return (
    <AppModal
      open={open}
      onOpenChange={onClose}
      onClose={onClose}
      title={title}
      subtitle={subtitle}
      size={size}
      headerActions={
        <Button onClick={onClose} variant='outline' disabled={loading}>
          Close
        </Button>
      }
    >
      <div className='flex flex-col gap-4'>
        {searchable && (
          <input
            type='text'
            placeholder='Search options...'
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            disabled={loading}
            className='px-3 py-2 border border-border rounded-md bg-background text-foreground placeholder-muted-foreground'
          />
        )}

        {loading ? (
          <div className='flex items-center justify-center py-8'>
            <span className='text-muted-foreground'>Loading...</span>
          </div>
        ) : filteredOptions.length === 0 ? (
          <div className='flex items-center justify-center py-8'>
            <span className='text-muted-foreground'>No options available</span>
          </div>
        ) : (
          <div className='space-y-2 max-h-96 overflow-y-auto'>
            {filteredOptions.map((option) => (
              <button
                key={option.id}
                onClick={() => handleSelect(option)}
                disabled={option.disabled || loading}
                className={`
                  w-full p-3 text-left rounded-md border transition-colors
                  ${
                    selected.has(option.id)
                      ? 'bg-primary/10 border-primary'
                      : 'bg-card border-border hover:bg-muted'
                  }
                  ${option.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
                `}
              >
                <div className='font-medium'>{option.label}</div>
                {option.description && (
                  <div className='text-sm text-muted-foreground'>{option.description}</div>
                )}
              </button>
            ))}
          </div>
        )}

        {multiple && (
          <div className='flex justify-end gap-2 pt-4 border-t border-border'>
            <Button onClick={onClose} variant='outline' disabled={loading}>
              Cancel
            </Button>
            <Button
              onClick={handleConfirm}
              variant='default'
              disabled={selected.size === 0 || loading}
            >
              Select ({selected.size})
            </Button>
          </div>
        )}
      </div>
    </AppModal>
  );
}
