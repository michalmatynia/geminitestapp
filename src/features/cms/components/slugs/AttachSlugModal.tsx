'use client';

import React, { useMemo, useState } from 'react';

import type { Slug } from '@/features/cms/types';
import type { EntityModalProps } from '@/shared/types/modal-props';
import { AppModal, Button, Checkbox, FormField, SearchInput } from '@/shared/ui';

interface AttachSlugModalProps extends EntityModalProps<Slug, Slug> {
  onAttach: (selectedIds: string[]) => Promise<void>;
  alreadyAssignedIds: Set<string>;
}

export function AttachSlugModal({
  isOpen,
  onClose,
  items: allSlugs = [],
  loading = false,
  onAttach,
  alreadyAssignedIds,
}: AttachSlugModalProps): React.JSX.Element | null {
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [isAttaching, setIsAttaching] = useState(false);

  const availableSlugs = useMemo(() => {
    const base = allSlugs.filter((slug) => !alreadyAssignedIds.has(slug.id));
    const term = search.trim().toLowerCase();
    if (!term) return base;
    return base.filter((slug) => slug.slug.toLowerCase().includes(term));
  }, [allSlugs, alreadyAssignedIds, search]);

  const toggleSelection = (slugId: string): void => {
    setSelectedIds((prev) =>
      prev.includes(slugId) ? prev.filter((id) => id !== slugId) : [...prev, slugId]
    );
  };

  const selectAllVisible = (): void => {
    const visibleIds = availableSlugs.map((slug) => slug.id);
    setSelectedIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
  };

  const clearSelection = (): void => {
    setSelectedIds([]);
  };

  const handleAttach = async (): Promise<void> => {
    if (!selectedIds.length) {
      setError('Select at least one slug to attach.');
      return;
    }
    setError('');
    setIsAttaching(true);
    try {
      await onAttach(selectedIds);
      setSelectedIds([]);
      setSearch('');
      onClose();
    } catch (_err) {
      setError('Failed to attach slugs. Please try again.');
    } finally {
      setIsAttaching(false);
    }
  };

  const handleClose = (): void => {
    setSelectedIds([]);
    setSearch('');
    setError('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <AppModal
      open={isOpen}
      onClose={handleClose}
      title='Attach Existing Slug'
      size='md'
      footer={
        <div className='flex justify-end gap-2'>
          <Button variant='outline' size='sm' onClick={handleClose} disabled={isAttaching}>
            Cancel
          </Button>
          <Button
            size='sm'
            onClick={() => { void handleAttach(); }}
            disabled={selectedIds.length === 0 || isAttaching}
          >
            {isAttaching ? 'Attaching...' : `Attach ${selectedIds.length > 0 ? `(${selectedIds.length})` : ''}`}
          </Button>
        </div>
      }
    >
      <div className='space-y-4'>
        <FormField label='Search Available Routes'>
          <SearchInput
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onClear={() => setSearch('')}
            placeholder='Filter slugs...'
            className='h-9'
          />
        </FormField>

        <div className='space-y-2'>
          <div className='flex items-center justify-between'>
            <span className='text-[10px] uppercase font-bold text-gray-500'>Available Slugs</span>
            <div className='flex items-center gap-3 text-[10px] uppercase font-bold'>
              <button
                type='button'
                className='text-blue-400 hover:text-blue-300'
                onClick={selectAllVisible}
              >
                All
              </button>
              <button
                type='button'
                className='text-gray-500 hover:text-gray-400'
                onClick={clearSelection}
              >
                None
              </button>
            </div>
          </div>

          <div className='max-h-60 overflow-y-auto rounded border border-border/60 bg-black/20 p-2 divide-y divide-white/5'>
            {loading ? (
              <div className='py-8 text-center text-xs text-gray-500 animate-pulse'>
                Fetching global slug index...
              </div>
            ) : availableSlugs.length === 0 ? (
              <div className='py-8 text-center text-xs text-gray-600 italic'>
                No unassigned routes found matching your criteria.
              </div>
            ) : (
              availableSlugs.map((slug) => (
                <label
                  key={slug.id}
                  className='flex items-center gap-3 p-2 hover:bg-white/5 cursor-pointer transition-colors'
                >
                  <Checkbox
                    checked={selectedIds.includes(slug.id)}
                    onCheckedChange={() => toggleSelection(slug.id)}
                  />
                  <span className='text-sm text-gray-300'>/{slug.slug}</span>
                </label>
              ))
            )}
          </div>

          {error && <p className='text-xs text-rose-400 font-medium'>{error}</p>}
        </div>
      </div>
    </AppModal>
  );
}
