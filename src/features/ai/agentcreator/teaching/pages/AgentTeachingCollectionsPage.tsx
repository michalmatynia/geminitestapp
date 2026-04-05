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
    () => [
      {
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
            {row.original.description?.trim() && (
              <span className='text-xs text-gray-500 truncate max-w-[300px]'>
                {row.original.description}
              </span>
            )}
          </div>
        ),
      },
      {
        accessorKey: 'embeddingModel',
        header: 'Model',
        cell: ({ row }) => (
          <span className='text-xs text-gray-300 bg-white/5 px-2 py-1 rounded'>
            {row.original.embeddingModel}
          </span>
        ),
      },
      {
        id: 'usage',
        header: 'Usage',
        cell: ({ row }) => (
          <span className='text-xs text-gray-400'>{getUsedByCount(row.original.id)} learners</span>
        ),
      },
      {
        accessorKey: 'updatedAt',
        header: 'Updated',
        cell: ({ row }) => (
          <span className='text-xs text-gray-500'>
            {row.original.updatedAt ? new Date(row.original.updatedAt).toLocaleString() : '—'}
          </span>
        ),
      },
      {
        id: 'actions',
        header: () => <div className='text-right'>Actions</div>,
        cell: ({ row }) => (
          <div className='flex justify-end gap-2'>
            <Button
              variant='ghost'
              size='xs'
              className='h-7 w-7 p-0'
              onClick={() => openEdit(row.original)}
              disabled={isSaving || isDeleting}
              aria-label={`Edit ${row.original.name}`}
              title='Edit collection'
            >
              <Pencil className='size-3.5' />
            </Button>
            <Button
              variant='ghost'
              size='xs'
              className='h-7 w-7 p-0 text-rose-400 hover:text-rose-300'
              onClick={() => setItemToDelete(row.original)}
              disabled={isSaving || isDeleting}
              aria-label={`Delete ${row.original.name}`}
              title='Delete collection'
            >
              <Trash2 className='size-3.5' />
            </Button>
          </div>
        ),
      },
    ],
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
        isOpen={!!itemToDelete}
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
