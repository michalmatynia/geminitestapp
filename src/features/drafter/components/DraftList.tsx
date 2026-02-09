'use client';
import {
  PlusIcon,
  Edit2Icon,
  TrashIcon,
  CheckIcon,
  XIcon,
} from 'lucide-react';
import { useState } from 'react';

import { useDrafts, useDeleteDraft } from '@/features/drafter/hooks/useDrafts';
import { ICON_LIBRARY_MAP } from '@/features/icons';
import { logClientError } from '@/features/observability';
import type { ProductDraft } from '@/features/products/types/drafts';
import { Button, ListPanel, useToast, SectionHeader, EmptyState } from '@/shared/ui';
import { ConfirmDialog } from '@/shared/ui';

import { useDrafterContext } from '../context/DrafterContext';

const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

const resolveDraftIconColor = (draft: ProductDraft): string | undefined => {
  if (draft.iconColorMode !== 'custom') return undefined;
  if (typeof draft.iconColor !== 'string') return undefined;
  const normalized = draft.iconColor.trim();
  if (!HEX_COLOR_PATTERN.test(normalized)) return undefined;
  return normalized;
};

export function DraftList(): React.JSX.Element {
  const { openCreator } = useDrafterContext();
  const { data: drafts = [], isLoading: loading } = useDrafts();
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
      header={
        <SectionHeader
          title='Your Product Drafts'
          size='sm'
          actions={
            <Button onClick={() => openCreator()} className='flex items-center gap-2'>
              <PlusIcon className='h-4 w-4' />
              Create New Draft
            </Button>
          }
        />
      }
    >
      <ConfirmDialog
        open={!!draftToDelete}
        onOpenChange={(open: boolean) => !open && setDraftToDelete(null)}
        onConfirm={(): void => { void handleConfirmDelete(); }}
        title='Delete Draft'
        description='Are you sure you want to delete this draft? This action cannot be undone.'
        confirmText='Delete'
        variant='destructive'
      />
      {loading ? (
        <p className='text-sm text-gray-400'>Loading drafts...</p>
      ) : drafts.length === 0 ? (
        <EmptyState
          title='No drafts yet'
          description='Create your first product template to speed up product creation.'
          action={
            <Button onClick={() => openCreator()} variant='outline'>
              <PlusIcon className='mr-2 h-4 w-4' />
              Create Your First Draft
            </Button>
          }
        />
      ) : (
        <div className='space-y-3'>
          {drafts.map((draft: ProductDraft) => (
            <div
              key={draft.id}
              className='rounded-lg border border-border bg-card/50 p-4 transition-colors hover:border'
            >
              <div className='flex items-start justify-between'>
                <div className='flex-1'>
                  <div className='flex items-center gap-3'>
                    {draft.icon &&
                      ((): React.JSX.Element | null => {
                        const IconComponent = ICON_LIBRARY_MAP[draft.icon];
                        const iconColor = resolveDraftIconColor(draft);
                        return IconComponent ? (
                          <div className='flex h-8 w-8 items-center justify-center rounded-md border bg-gray-800 text-gray-400'>
                            <IconComponent className='h-4 w-4' style={iconColor ? { color: iconColor } : undefined} />
                          </div>
                        ) : null;
                      })()}
                    <h3 className='text-lg font-medium text-white'>
                      {draft.name}
                    </h3>
                    {draft.active !== undefined && (
                      <span
                        className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-xs ${
                          draft.active
                            ? 'bg-emerald-500/10 text-emerald-500'
                            : 'bg-gray-500/10 text-gray-500'
                        }`}
                      >
                        {draft.active ? (
                          <>
                            <CheckIcon className='h-3 w-3' />
                            Active
                          </>
                        ) : (
                          <>
                            <XIcon className='h-3 w-3' />
                            Inactive
                          </>
                        )}
                      </span>
                    )}
                  </div>
                  {draft.description && (
                    <p className='mt-1 text-sm text-gray-400'>
                      {draft.description}
                    </p>
                  )}
                  <div className='mt-3 flex flex-wrap gap-2 text-xs text-gray-500'>
                    {draft.sku && (
                      <span className='rounded bg-gray-800 px-2 py-1'>
                        SKU: {draft.sku}
                      </span>
                    )}
                    {draft.catalogIds && draft.catalogIds.length > 0 && (
                      <span className='rounded bg-gray-800 px-2 py-1'>
                        {draft.catalogIds.length} Catalog(s)
                      </span>
                    )}
                    {draft.categoryId && (
                      <span className='rounded bg-gray-800 px-2 py-1'>
                        Category set
                      </span>
                    )}
                    {draft.tagIds && draft.tagIds.length > 0 && (
                      <span className='rounded bg-gray-800 px-2 py-1'>
                        {draft.tagIds.length} Tag(s)
                      </span>
                    )}
                  </div>
                </div>
                <div className='flex gap-2'>
                  <Button
                    onClick={() => openCreator(draft.id)}
                    variant='outline'
                    size='sm'
                    className='flex items-center gap-1'
                  >
                    <Edit2Icon className='h-3 w-3' />
                    Edit
                  </Button>
                  <Button
                    onClick={() => setDraftToDelete(draft.id)}
                    variant='outline'
                    size='sm'
                    disabled={deleting === draft.id}
                    className='flex items-center gap-1 border-red-600 text-red-600 hover:bg-red-600/10'
                  >
                    <TrashIcon className='h-3 w-3' />
                    {deleting === draft.id ? 'Deleting...' : 'Delete'}
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </ListPanel>
  );
}
