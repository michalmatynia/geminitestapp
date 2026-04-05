'use client';

import { Edit2Icon, PlusIcon } from 'lucide-react';
import React, { useEffect, useState } from 'react';

import { DraftCreator } from '@/features/drafter/components/DraftCreator';
import { useDeleteDraftMutation, useDraftQueries } from '@/features/drafter/hooks/useDraftQueries';
import type { ProductDraft } from '@/shared/contracts/products/drafts';
import type { SimpleSettingsListItem } from '@/shared/contracts/ui/menus';
import { ICON_LIBRARY_MAP } from '@/shared/lib/icons';
import { Badge, Button, useToast } from '@/shared/ui/primitives.public';
import { FormModal } from '@/shared/ui/forms-and-actions.public';
import { ListPanel, SectionHeader, UI_CENTER_ROW_SPACED_CLASSNAME } from '@/shared/ui/navigation-and-layout.public';
import { SimpleSettingsList } from '@/shared/ui/templates.public';
import { StatusBadge } from '@/shared/ui/data-display.public';
import { ConfirmModal } from '@/shared/ui/templates/modals/ConfirmModal';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';

import {
  DrafterProvider,
  useDrafterActions,
  useDrafterState,
} from '../context/DrafterContext';

const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

interface DraftListItem extends SimpleSettingsListItem {
  original: ProductDraft;
}

const resolveDraftIconColor = (draft: ProductDraft): string | undefined => {
  if (draft.iconColorMode !== 'custom') return undefined;
  if (typeof draft.iconColor !== 'string') return undefined;
  const normalized = draft.iconColor.trim();
  if (!HEX_COLOR_PATTERN.test(normalized)) return undefined;
  return normalized;
};

function DraftList(): React.JSX.Element {
  const { openCreator } = useDrafterActions();
  const { data: drafts = [], isLoading: loading } = useDraftQueries();
  const deleteDraftMutation = useDeleteDraftMutation();
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
      logClientCatch(error, {
        source: 'DraftList',
        action: 'deleteDraft',
        draftId: draftToDelete,
      });
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
      <SimpleSettingsList<DraftListItem>
        items={drafts.map(
          (draft: ProductDraft): DraftListItem => ({
            id: draft.id,
            title: (
              <div className={UI_CENTER_ROW_SPACED_CLASSNAME}>
                <h3 className='text-lg font-medium text-white'>{draft.name}</h3>
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
            icon:
              draft.icon &&
              ((): React.JSX.Element | null => {
                const IconComponent = ICON_LIBRARY_MAP[draft.icon];
                const iconColor = resolveDraftIconColor(draft);
                return IconComponent ? (
                  <div className='flex h-8 w-8 items-center justify-center rounded-md border bg-gray-800 text-gray-400'>
                    <IconComponent
                      className='h-4 w-4'
                      style={iconColor ? { color: iconColor } : undefined}
                    />
                  </div>
                ) : null;
              })(),
            original: draft,
          })
        )}
        isLoading={loading}
        emptyMessage='No drafts yet. Create your first product template to speed up product creation.'
        renderActions={(item: DraftListItem) => (
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
        onDelete={(item: DraftListItem) => setDraftToDelete(item.original.id)}
        renderCustomContent={(item: DraftListItem) => (
          <div className='flex flex-wrap gap-2 text-xs text-gray-500'>
            {item.original.sku && (
              <Badge variant='neutral' className='font-normal'>
                SKU: {item.original.sku}
              </Badge>
            )}
            {item.original.catalogIds && item.original.catalogIds.length > 0 && (
              <Badge variant='neutral' className='font-normal'>
                {item.original.catalogIds.length} Catalog(s)
              </Badge>
            )}
            {item.original.categoryId && (
              <Badge variant='neutral' className='font-normal'>
                Category set
              </Badge>
            )}
            {item.original.tagIds && item.original.tagIds.length > 0 && (
              <Badge variant='neutral' className='font-normal'>
                {item.original.tagIds.length} Tag(s)
              </Badge>
            )}
          </div>
        )}
      />
    </ListPanel>
  );
}

function DraftCreatorModal(): React.JSX.Element | null {
  const { isCreatorOpen: isOpen, editingDraftId, formRef } = useDrafterState();
  const { closeCreator: onClose } = useDrafterActions();

  const { data: drafts = [] } = useDraftQueries();
  const editingDraft = drafts.find((d: ProductDraft) => d.id === editingDraftId) ?? null;

  const [isDraftActive, setIsDraftActive] = useState<boolean>(true);

  useEffect((): void => {
    if (isOpen && !editingDraft) {
      setIsDraftActive(true);
    } else if (isOpen && editingDraft) {
      setIsDraftActive(editingDraft.active ?? true);
    }
  }, [isOpen, editingDraft]);

  if (!isOpen) return null;

  const title = editingDraft ? 'Edit Draft' : 'Create Draft';
  const submitText = editingDraft ? 'Update Draft' : 'Create Draft';

  const actions = (
    <div className='flex items-center gap-2 rounded-md border border-border/60 bg-muted/30 px-3 py-1 mr-2'>
      <span className='text-[10px] font-bold uppercase tracking-wider text-muted-foreground'>
        Quick Create
      </span>
      <Button
        type='button'
        variant={isDraftActive ? 'default' : 'outline'}
        size='xs'
        className={`h-6 min-w-12 text-[10px] font-bold ${
          isDraftActive
            ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30 border-emerald-500/30'
            : 'text-red-400 hover:bg-red-500/10 border-red-500/30'
        }`}
        onClick={(): void => setIsDraftActive((prev: boolean) => !prev)}
      >
        {isDraftActive ? 'ACTIVE' : 'OFF'}
      </Button>
    </div>
  );

  return (
    <FormModal
      open={isOpen}
      onClose={onClose}
      title={title}
      size='xl'
      className='max-w-5xl'
      onSave={(): void => {
        if (formRef.current) {
          formRef.current.requestSubmit();
        }
      }}
      saveText={submitText}
      actions={actions}
    >
      <DraftCreator
        active={isDraftActive}
        onActiveChange={(value: boolean): void => setIsDraftActive(value)}
      />
    </FormModal>
  );
}

function AdminDraftsPageContent(): React.JSX.Element {
  return (
    <div className='page-section'>
      <SectionHeader
        title='Product Drafts'
        description='Create reusable templates for products with pre-filled values'
        className='mb-6'
      />

      <DraftList />

      <DraftCreatorModal />
    </div>
  );
}

export function AdminDraftsPage(): React.JSX.Element {
  return (
    <DrafterProvider>
      <AdminDraftsPageContent />
    </DrafterProvider>
  );
}
