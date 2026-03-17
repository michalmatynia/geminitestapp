'use client';

import React, { useMemo, useState } from 'react';

import type { Slug } from '@/shared/contracts/cms';
import type { EntityModalProps } from '@/shared/contracts/ui';
import {
  FormModal,
  FormField,
  LoadingState,
  SearchableList,
  Button,
  UI_CENTER_ROW_SPACED_CLASSNAME,
} from '@/shared/ui';
import { logClientError } from '@/shared/utils/observability/client-error-logger';


interface AttachSlugModalProps extends EntityModalProps<Slug, Slug> {
  onAttach: (selectedIds: string[]) => Promise<void>;
  alreadyAssignedIds: Set<string>;
}

type AttachSlugModalRuntimeValue = {
  isOpen: boolean;
  handleClose: () => void;
  handleAttach: () => Promise<void>;
  selectedCount: number;
  isAttaching: boolean;
};

const AttachSlugModalRuntimeContext = React.createContext<AttachSlugModalRuntimeValue | null>(null);

function useAttachSlugModalRuntime(): AttachSlugModalRuntimeValue {
  const runtime = React.useContext(AttachSlugModalRuntimeContext);
  if (!runtime) {
    throw new Error(
      'useAttachSlugModalRuntime must be used within AttachSlugModalRuntimeContext.Provider'
    );
  }
  return runtime;
}

function AttachSlugFormModal({ children }: { children: React.ReactNode }): React.JSX.Element {
  const { isOpen, handleClose, handleAttach, selectedCount, isAttaching } =
    useAttachSlugModalRuntime();
  return (
    <FormModal
      open={isOpen}
      onClose={handleClose}
      title='Attach Existing Slug'
      onSave={() => void handleAttach()}
      isSaving={isAttaching}
      saveText={`Attach ${selectedCount > 0 ? `(${selectedCount})` : ''}`}
      isSaveDisabled={selectedCount === 0}
      size='md'
    >
      {children}
    </FormModal>
  );
}

export function AttachSlugModal({
  isOpen,
  onClose,
  items: allSlugs = [],
  loading = false,
  onAttach,
  alreadyAssignedIds,
}: AttachSlugModalProps): React.JSX.Element | null {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [isAttaching, setIsAttaching] = useState(false);

  const availableSlugs = useMemo(() => {
    return allSlugs.filter((slug) => !alreadyAssignedIds.has(slug.id));
  }, [allSlugs, alreadyAssignedIds]);

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
      onClose();
    } catch (_err) {
      logClientError(_err);
      setError('Failed to attach slugs. Please try again.');
    } finally {
      setIsAttaching(false);
    }
  };

  const handleClose = (): void => {
    setSelectedIds([]);
    setError('');
    onClose();
  };

  const runtimeValue = useMemo<AttachSlugModalRuntimeValue>(
    () => ({
      isOpen,
      handleClose,
      handleAttach,
      selectedCount: selectedIds.length,
      isAttaching,
    }),
    [isOpen, handleClose, handleAttach, selectedIds.length, isAttaching]
  );

  return (
    <AttachSlugModalRuntimeContext.Provider value={runtimeValue}>
      <AttachSlugFormModal>
        <div className='space-y-4'>
          <FormField
            label='Route Assignment'
            description='Select global routes that are not yet assigned to this zone.'
          >
            {loading ? (
              <LoadingState message='Fetching global slug index...' className='py-8' size='sm' />
            ) : (
              <SearchableList
                items={availableSlugs}
                selectedIds={selectedIds}
                onToggle={toggleSelection}
                getId={(s) => s.id}
                getLabel={(s) => s.slug}
                searchPlaceholder='Filter slugs...'
                maxHeight='max-h-60'
                extraActions={
                  <div className={`${UI_CENTER_ROW_SPACED_CLASSNAME} text-[10px] uppercase font-bold`}>
                    <Button
                      variant='link'
                      className='h-auto p-0 text-[10px] uppercase font-bold text-primary hover:text-primary/80 transition-colors'
                      onClick={selectAllVisible}
                    >
                      Select All
                    </Button>
                    <Button
                      variant='link'
                      className='h-auto p-0 text-[10px] uppercase font-bold text-muted-foreground hover:text-foreground transition-colors'
                      onClick={clearSelection}
                    >
                      Clear
                    </Button>
                  </div>
                }
                renderItem={(slug) => (
                  <div className='flex flex-col'>
                    <span className='text-sm font-medium text-gray-200 group-hover:text-white transition-colors'>
                      /{slug.slug}
                    </span>
                    <span className='text-[10px] text-muted-foreground font-mono'>{slug.id}</span>
                  </div>
                )}
              />
            )}
          </FormField>
          {error && <p className='text-xs text-destructive font-medium px-1'>{error}</p>}
        </div>
      </AttachSlugFormModal>
    </AttachSlugModalRuntimeContext.Provider>
  );
}
