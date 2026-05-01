'use client';

import { Edit2Icon, PlusIcon, Trash2 } from 'lucide-react';
import React, { useState } from 'react';

import { useDeleteDraftMutation, useDraftQueries } from '@/features/drafter/hooks/useDraftQueries';
import type { ProductDraft } from '@/shared/contracts/products/drafts';
import type { SimpleSettingsListItem } from '@/shared/contracts/ui/menus';
import { ICON_LIBRARY_MAP } from '@/shared/lib/icons';
import { StatusBadge } from '@/shared/ui/data-display.public';
import { ListPanel, UI_CENTER_ROW_SPACED_CLASSNAME } from '@/shared/ui/navigation-and-layout.public';
import { Badge, Button, useToast } from '@/shared/ui/primitives.public';
import { SimpleSettingsList } from '@/shared/ui/templates.public';
import { ConfirmModal } from '@/shared/ui/templates/modals/ConfirmModal';
import { logClientCatch } from '@/shared/utils/observability/client-error-logger';

import { useDrafterActions } from '../context/DrafterContext';

const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/;

interface DraftListItem extends SimpleSettingsListItem {
  original: ProductDraft;
}

const hasText = (value: string | null | undefined): value is string =>
  typeof value === 'string' && value.length > 0;

const hasItems = <T,>(items: T[] | null | undefined): items is T[] =>
  Array.isArray(items) && items.length > 0;

const resolveDraftIconColor = (draft: ProductDraft): string | undefined => {
  if (draft.iconColorMode !== 'custom') return undefined;
  if (typeof draft.iconColor !== 'string') return undefined;
  const normalized = draft.iconColor.trim();
  if (!HEX_COLOR_PATTERN.test(normalized)) return undefined;
  return normalized;
};

function DraftIcon({ draft }: { draft: ProductDraft }): React.JSX.Element | null {
  if (!hasText(draft.icon)) return null;

  const IconComponent = ICON_LIBRARY_MAP[draft.icon];
  if (IconComponent === undefined) return null;

  const iconColor = resolveDraftIconColor(draft);
  return (
    <div className='flex h-8 w-8 items-center justify-center rounded-md border bg-gray-800 text-gray-400'>
      <IconComponent
        className='h-4 w-4'
        style={iconColor !== undefined ? { color: iconColor } : undefined}
      />
    </div>
  );
}

function DraftTitle({ draft }: { draft: ProductDraft }): React.JSX.Element {
  return (
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
  );
}

const toDraftListItem = (draft: ProductDraft): DraftListItem => ({
  id: draft.id,
  title: <DraftTitle draft={draft} />,
  description: draft.description,
  icon: <DraftIcon draft={draft} />,
  original: draft,
});

function DraftListActions({
  draft,
  disabled,
  onDelete,
  onEdit,
}: {
  draft: ProductDraft;
  disabled: boolean;
  onDelete: (draftId: string) => void;
  onEdit: (draftId: string) => void;
}): React.JSX.Element {
  return (
    <div className='flex items-center gap-2'>
      <Button
        onClick={() => onEdit(draft.id)}
        variant='outline'
        size='sm'
        className='flex items-center gap-1'
      >
        <Edit2Icon className='h-3 w-3' />
        Edit
      </Button>
      <Button
        onClick={() => onDelete(draft.id)}
        variant='outline'
        size='sm'
        disabled={disabled}
        className='flex items-center gap-1 border-red-500/30 text-red-300 hover:bg-red-500/10 hover:text-red-200'
      >
        <Trash2 className='h-3 w-3' />
        Delete
      </Button>
    </div>
  );
}

function DraftMetadata({ draft }: { draft: ProductDraft }): React.JSX.Element {
  return (
    <div className='flex flex-wrap gap-2 text-xs text-gray-500'>
      {hasText(draft.sku) ? (
        <Badge variant='neutral' className='font-normal'>
          SKU: {draft.sku}
        </Badge>
      ) : null}
      {hasItems(draft.catalogIds) ? (
        <Badge variant='neutral' className='font-normal'>
          {draft.catalogIds.length} Catalog(s)
        </Badge>
      ) : null}
      {hasText(draft.categoryId) ? (
        <Badge variant='neutral' className='font-normal'>
          Category set
        </Badge>
      ) : null}
      {hasItems(draft.tagIds) ? (
        <Badge variant='neutral' className='font-normal'>
          {draft.tagIds.length} Tag(s)
        </Badge>
      ) : null}
    </div>
  );
}

function CreateDraftButton({ onCreate }: { onCreate: () => void }): React.JSX.Element {
  return (
    <Button onClick={onCreate} className='flex items-center gap-2'>
      <PlusIcon className='h-4 w-4' />
      Create New Draft
    </Button>
  );
}

function DraftDeleteConfirmModal({
  deleting,
  draftToDelete,
  onClose,
  onConfirm,
}: {
  deleting: string | null;
  draftToDelete: string | null;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}): React.JSX.Element {
  return (
    <ConfirmModal
      isOpen={draftToDelete !== null}
      onClose={onClose}
      onConfirm={onConfirm}
      title='Delete Draft'
      message='Are you sure you want to delete this draft? This action cannot be undone.'
      confirmText='Delete'
      isDangerous={true}
      loading={deleting !== null}
    />
  );
}

export function DraftList(): React.JSX.Element {
  const { openCreator } = useDrafterActions();
  const { data: drafts = [], isLoading: loading } = useDraftQueries();
  const deleteDraftMutation = useDeleteDraftMutation();
  const [deleting, setDeleting] = useState<string | null>(null);
  const [draftToDelete, setDraftToDelete] = useState<string | null>(null);
  const { toast } = useToast();

  const handleConfirmDelete = async (): Promise<void> => {
    if (!hasText(draftToDelete)) return;
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
      headerActions={<CreateDraftButton onCreate={() => openCreator()} />}
    >
      <DraftDeleteConfirmModal
        deleting={deleting}
        draftToDelete={draftToDelete}
        onClose={() => setDraftToDelete(null)}
        onConfirm={handleConfirmDelete}
      />
      <SimpleSettingsList<DraftListItem>
        items={drafts.map(toDraftListItem)}
        isLoading={loading}
        emptyMessage='No drafts yet. Create your first product template to speed up product creation.'
        renderActions={(item: DraftListItem) => (
          <DraftListActions
            draft={item.original}
            disabled={deleting !== null}
            onDelete={setDraftToDelete}
            onEdit={openCreator}
          />
        )}
        renderCustomContent={(item: DraftListItem) => (
          <DraftMetadata draft={item.original} />
        )}
      />
    </ListPanel>
  );
}
