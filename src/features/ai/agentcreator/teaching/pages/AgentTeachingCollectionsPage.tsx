'use client';

import { Pencil, Trash2 } from 'lucide-react';
import Link from 'next/link';
import React, { useMemo } from 'react';

import type { AgentTeachingEmbeddingCollectionRecord } from '@/shared/contracts/agent-teaching';
import { AdminAgentTeachingBreadcrumbs } from '@/shared/ui/admin.public';
import { Button } from '@/shared/ui/primitives.public';
import { PageLayout } from '@/shared/ui/navigation-and-layout.public';
import { StandardDataTablePanel } from '@/shared/ui/templates.public';
import { ConfirmModal } from '@/shared/ui/templates/modals';

import { AgentTeachingCollectionModal } from '../components/AgentTeachingCollectionModal';
import {
  AgentTeachingCollectionsProvider,
  useAgentTeachingCollectionsContext,
} from '../context/AgentTeachingCollectionsContext';

import type { ColumnDef } from '@tanstack/react-table';

const hasText = (value: string | null | undefined): value is string =>
  value !== null && value !== undefined && value.trim().length > 0;

const formatUpdatedAt = (value: string | null | undefined): string => {
  if (!hasText(value)) {
    return '—';
  }
  return new Date(value).toLocaleString();
};

const buildCollectionColumns = ({
  openEdit,
  isSaving,
  isDeleting,
  getUsedByCount,
  setItemToDelete,
}: Pick<
  ReturnType<typeof useAgentTeachingCollectionsContext>,
  'openEdit' | 'isSaving' | 'isDeleting' | 'getUsedByCount' | 'setItemToDelete'
>): ColumnDef<AgentTeachingEmbeddingCollectionRecord>[] => [
  buildCollectionNameColumn(),
  buildCollectionModelColumn(),
  buildCollectionUsageColumn(getUsedByCount),
  buildCollectionUpdatedColumn(),
  buildCollectionActionsColumn({ openEdit, isSaving, isDeleting, setItemToDelete }),
];

const buildCollectionNameColumn = (): ColumnDef<AgentTeachingEmbeddingCollectionRecord> => ({
  accessorKey: 'name',
  header: 'Collection',
  cell: ({ row }) => (
    <div className='flex flex-col'>
      <Link
        href={`/admin/agentcreator/teaching/collections/${encodeURIComponent(row.original.id)}`}
        className='font-medium text-white hover:text-blue-300 transition-colors'
      >
        {row.original.name}
      </Link>
      {hasText(row.original.description) ? (
        <span className='text-xs text-gray-500 truncate max-w-[300px]'>
          {row.original.description}
        </span>
      ) : null}
    </div>
  ),
});

const buildCollectionModelColumn = (): ColumnDef<AgentTeachingEmbeddingCollectionRecord> => ({
  accessorKey: 'embeddingModel',
  header: 'Model',
  cell: ({ row }) => (
    <span className='text-xs text-gray-300 bg-white/5 px-2 py-1 rounded'>
      {row.original.embeddingModel}
    </span>
  ),
});

const buildCollectionUsageColumn = (
  getUsedByCount: ReturnType<typeof useAgentTeachingCollectionsContext>['getUsedByCount']
): ColumnDef<AgentTeachingEmbeddingCollectionRecord> => ({
  id: 'usage',
  header: 'Usage',
  cell: ({ row }) => (
    <span className='text-xs text-gray-400'>{getUsedByCount(row.original.id)} learners</span>
  ),
});

const buildCollectionUpdatedColumn = (): ColumnDef<AgentTeachingEmbeddingCollectionRecord> => ({
  accessorKey: 'updatedAt',
  header: 'Updated',
  cell: ({ row }) => (
    <span className='text-xs text-gray-500'>{formatUpdatedAt(row.original.updatedAt)}</span>
  ),
});

const buildCollectionActionsColumn = ({
  openEdit,
  isSaving,
  isDeleting,
  setItemToDelete,
}: Pick<
  ReturnType<typeof useAgentTeachingCollectionsContext>,
  'openEdit' | 'isSaving' | 'isDeleting' | 'setItemToDelete'
>): ColumnDef<AgentTeachingEmbeddingCollectionRecord> => ({
  id: 'actions',
  header: () => <div className='text-right'>Actions</div>,
  cell: ({ row }) => (
    <CollectionActions
      collection={row.original}
      isDisabled={isSaving || isDeleting}
      onEdit={openEdit}
      onDelete={setItemToDelete}
    />
  ),
});

function CollectionActions({
  collection,
  isDisabled,
  onEdit,
  onDelete,
}: {
  collection: AgentTeachingEmbeddingCollectionRecord;
  isDisabled: boolean;
  onEdit: (collection: AgentTeachingEmbeddingCollectionRecord) => void;
  onDelete: (collection: AgentTeachingEmbeddingCollectionRecord | null) => void;
}): React.JSX.Element {
  return (
    <div className='flex justify-end gap-2'>
      <Button
        variant='ghost'
        size='xs'
        className='h-7 w-7 p-0'
        onClick={() => onEdit(collection)}
        disabled={isDisabled}
        aria-label={`Edit ${collection.name}`}
        title='Edit collection'
      >
        <Pencil className='size-3.5' />
      </Button>
      <Button
        variant='ghost'
        size='xs'
        className='h-7 w-7 p-0 text-rose-400 hover:text-rose-300'
        onClick={() => onDelete(collection)}
        disabled={isDisabled}
        aria-label={`Delete ${collection.name}`}
        title='Delete collection'
      >
        <Trash2 className='size-3.5' />
      </Button>
    </div>
  );
}

function AgentTeachingCollectionsContent(): React.JSX.Element {
  const {
    collections,
    isLoading,
    isSaving,
    isDeleting,
    itemToDelete,
    setItemToDelete,
    openCreate,
    openEdit,
    handleDelete,
    getUsedByCount,
  } = useAgentTeachingCollectionsContext();

  const columns = useMemo<ColumnDef<AgentTeachingEmbeddingCollectionRecord>[]>(
    () => buildCollectionColumns({ openEdit, isSaving, isDeleting, getUsedByCount, setItemToDelete }),
    [openEdit, isSaving, isDeleting, getUsedByCount, setItemToDelete]
  );

  return (
    <PageLayout
      title='Embedding School'
      eyebrow={<AdminAgentTeachingBreadcrumbs current='Collections' className='mb-2' />}
      description='Knowledge base management for AI agents. Upload documents to create searchable vector embeddings.'
      headerActions={
        <Button onClick={openCreate} className='h-8 text-xs'>
          New Collection
        </Button>
      }
      containerClassName='mx-auto w-full max-w-none py-10'
    >

      <StandardDataTablePanel columns={columns} data={collections} isLoading={isLoading} />

      <ConfirmModal
        isOpen={itemToDelete !== null}
        onClose={() => setItemToDelete(null)}
        title='Delete collection?'
        message={`This will permanently delete "${itemToDelete?.name}" and all associated document embeddings. Agents using this collection will lose access to this knowledge.`}
        confirmText='Delete'
        isDangerous={true}
        onConfirm={handleDelete}
      />

      <AgentTeachingCollectionModal />
    </PageLayout>
  );
}

export function AgentTeachingCollectionsPage(): React.JSX.Element {
  return (
    <AgentTeachingCollectionsProvider>
      <AgentTeachingCollectionsContent />
    </AgentTeachingCollectionsProvider>
  );
}
