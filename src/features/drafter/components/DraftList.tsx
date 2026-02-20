'use client';
import {
  PlusIcon,
  Edit2Icon,
} from 'lucide-react';
import { useState } from 'react';

import { useDraftQueries, useDeleteDraft } from '@/features/drafter/hooks/useDraftQueries';
import { ICON_LIBRARY_MAP } from '@/features/icons';
import { logClientError } from '@/features/observability';
import type { ProductDraftDto } from '@/shared/contracts/products';
import { Button, ListPanel, useToast, SimpleSettingsList, StatusBadge } from '@/shared/ui';
import { ConfirmModal } from '@/shared/ui/templates/modals/ConfirmModal';

import { useDrafterContext } from '../context/DrafterContext';

const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

const resolveDraftIconColor = (draft: ProductDraftDto): string | undefined => {
  if (draft.iconColorMode !== 'custom') return undefined;
  if (typeof draft.iconColor !== 'string') return undefined;
  const normalized = draft.iconColor.trim();
  if (!HEX_COLOR_PATTERN.test(normalized)) return undefined;
  return normalized;
};

export function DraftList(): React.JSX.Element {
  const { openCreator } = useDrafterContext();
  const { data: drafts = [], isLoading: loading } = useDraftQueries();
  const deleteDraftMutation = useDeleteDraft();
  const [deleting, setDeleting] = useState<string | null>(null);
  const [draftToDelete, setDraftToDelete] = useState<string | null>(null);
  const { toast } = useToast();

  const handleConfirmDelete = async (): Promise<void> => {
    if (!draftToDelete) return;
    try {
      setDeleting(draftToDelete);
      await deleteDraftMutation.mutateAsync(draftToDelete);
      toast('Draft deleted successfully', { variant: 'success' });
    } catch (error) {
      logClientError(error, { context: { source: 'DraftList', action: 'deleteDraft', draftId: draftToDelete } });
      toast('Failed to delete draft', { variant: 'error' });
    } finally {
      setDeleting(null);
      setDraftToDelete(null);
    }
  };

  return (
    <ListPanel
      title='Your Product Drafts'
      headerActions={
        <Button onClick={() => openCreator()} className='flex items-center gap-2'>
          <PlusIcon className='h-4 w-4' />
          Create New Draft
        </Button>
      }
    >
      <ConfirmModal
        isOpen={!!draftToDelete}
        onClose={() => setDraftToDelete(null)}
        onConfirm={handleConfirmDelete}
        title='Delete Draft'
        message='Are you sure you want to delete this draft? This action cannot be undone.'
        confirmText='Delete'
        isDangerous={true}
        loading={!!deleting}
      />
      <SimpleSettingsList
        items={drafts.map((draft: ProductDraftDto) => ({
          id: draft.id,
          title: (
            <div className='flex items-center gap-3'>
              <h3 className='text-lg font-medium text-white'>
                {draft.name}
              </h3>
              {draft.active !== undefined && (
                <StatusBadge 
                  status={draft.active ? 'Active' : 'Inactive'} 
                  variant={draft.active ? 'active' : 'neutral'} 
                  size='sm'
                  className='font-bold'
                />
              )}
            </div>
          ),
          description: draft.description,
          icon: draft.icon && ((): React.JSX.Element | null => {
            const IconComponent = ICON_LIBRARY_MAP[draft.icon];
            const iconColor = resolveDraftIconColor(draft);
            return IconComponent ? (
              <div className='flex h-8 w-8 items-center justify-center rounded-md border bg-gray-800 text-gray-400'>
                <IconComponent className='h-4 w-4' style={iconColor ? { color: iconColor } : undefined} />
              </div>
            ) : null;
          })(),
          original: draft
        }))}
        isLoading={loading}
        emptyMessage='No drafts yet. Create your first product template to speed up product creation.'
        renderActions={(item) => (
          <div className='flex items-center gap-2'>
            <Button
              onClick={() => openCreator(item.original.id)}
              variant='outline'
              size='sm'
              className='flex items-center gap-1'
            >
              <Edit2Icon className='h-3 w-3' />
              Edit
            </Button>
          </div>
        )}
        onDelete={(item) => setDraftToDelete(item.original.id)}
        renderCustomContent={(item) => (
          <div className='flex flex-wrap gap-2 text-xs text-gray-500'>
            {item.original.sku && (
              <span className='rounded bg-gray-800 px-2 py-1'>
                SKU: {item.original.sku}
              </span>
            )}
            {item.original.catalogIds && item.original.catalogIds.length > 0 && (
              <span className='rounded bg-gray-800 px-2 py-1'>
                {item.original.catalogIds.length} Catalog(s)
              </span>
            )}
            {item.original.categoryId && (
              <span className='rounded bg-gray-800 px-2 py-1'>
                Category set
              </span>
            )}
            {item.original.tagIds && item.original.tagIds.length > 0 && (
              <span className='rounded bg-gray-800 px-2 py-1'>
                {item.original.tagIds.length} Tag(s)
              </span>
            )}
          </div>
        )}
      />
    </ListPanel>
  );
}
