'use client';

import React, { useMemo, useState } from 'react';

import type { Slug } from '@/shared/contracts/cms';
import type { EntityModalProps } from '@/shared/contracts/ui';
import { FormModal, Checkbox, FormField, SearchInput, LoadingState, Card } from '@/shared/ui';

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

  return (
    <FormModal
      open={isOpen}
      onClose={handleClose}
      title='Attach Existing Slug'
      onSave={() => void handleAttach()}
      isSaving={isAttaching}
      saveText={`Attach ${selectedIds.length > 0 ? `(${selectedIds.length})` : ''}`}
      isSaveDisabled={selectedIds.length === 0}
      size='md'
    >
      <div className='space-y-4'>
        <FormField label='Search Available Routes' description='Filter global routes that are not yet assigned to this zone.'>
          <SearchInput
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onClear={() => setSearch('')}
            placeholder='Filter slugs...'
            className='h-9'
          />
        </FormField>

        <div className='space-y-2'>
          <div className='flex items-center justify-between px-1'>
            <span className='text-[10px] uppercase font-bold text-muted-foreground'>Available Slugs</span>
            <div className='flex items-center gap-3 text-[10px] uppercase font-bold'>
              <button
                type='button'
                className='text-primary hover:text-primary/80 transition-colors'
                onClick={selectAllVisible}
              >
                Select All
              </button>
              <button
                type='button'
                className='text-muted-foreground hover:text-foreground transition-colors'
                onClick={clearSelection}
              >
                Clear
              </button>
            </div>
          </div>

          <Card variant='subtle-compact' padding='none' className='max-h-60 overflow-y-auto border-border/60 bg-black/20 divide-y divide-white/5'>
            {loading ? (
              <LoadingState message='Fetching global slug index...' className='py-8' size='sm' />
            ) : availableSlugs.length === 0 ? (
              <div className='py-8 text-center text-xs text-muted-foreground/60 italic'>
                No unassigned routes found matching your criteria.
              </div>
            ) : (
              availableSlugs.map((slug) => (
                <label
                  key={slug.id}
                  className='flex items-center gap-3 p-2.5 hover:bg-white/5 cursor-pointer transition-colors group'
                >
                  <Checkbox
                    checked={selectedIds.includes(slug.id)}
                    onCheckedChange={() => toggleSelection(slug.id)}
                  />
                  <div className='flex flex-col'>
                    <span className='text-sm font-medium text-gray-200 group-hover:text-white transition-colors'>/{slug.slug}</span>
                    <span className='text-[10px] text-muted-foreground font-mono'>{slug.id}</span>
                  </div>
                </label>
              ))
            )}
          </Card>

          {error && <p className='text-xs text-destructive font-medium px-1'>{error}</p>}
        </div>
      </div>
    </FormModal>
  );
}
