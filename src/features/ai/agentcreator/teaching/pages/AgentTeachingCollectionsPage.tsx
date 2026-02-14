'use client';

import { Pencil, Trash2 } from 'lucide-react';
import Link from 'next/link';
import React, { useMemo } from 'react';

import type { AgentTeachingEmbeddingCollectionRecord } from '@/shared/types/domain/agent-teaching';
import { 
  Button, 
  ConfirmDialog, 
  Input, 
  SectionHeader, 
  FormModal, 
  DataTable, 
  Textarea, 
  SelectSimple, 
  FormField, 
  FormSection 
} from '@/shared/ui';

import { useAgentTeachingCollectionsState } from '../hooks/useAgentTeachingCollectionsState';

import type { ColumnDef } from '@tanstack/react-table';

export function AgentTeachingCollectionsPage(): React.JSX.Element {
  const {
    collections,
    embeddingModels,
    isLoading,
    saving,
    deleting,
    modalOpen,
    editing,
    draft,
    setDraft,
    itemToDelete,
    setItemToDelete,
    openCreate,
    openEdit,
    closeModal,
    handleSave,
    handleDelete,
    usedByCount,
  } = useAgentTeachingCollectionsState();

  const columns = useMemo<ColumnDef<AgentTeachingEmbeddingCollectionRecord>[]>(() => [
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
      cell: ({ row }) => <span className='text-xs text-gray-300 bg-white/5 px-2 py-1 rounded'>{row.original.embeddingModel}</span>,
    },
    {
      id: 'usage',
      header: 'Usage',
      cell: ({ row }) => <span className='text-xs text-gray-400'>{usedByCount(row.original.id)} learners</span>,
    },
    {
      accessorKey: 'updatedAt',
      header: 'Updated',
      cell: ({ row }) => <span className='text-xs text-gray-500'>{row.original.updatedAt ? new Date(row.original.updatedAt).toLocaleString() : '—'}</span>,
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
            disabled={saving || deleting}
          >
            <Pencil className='size-3.5' />
          </Button>
          <Button
            variant='ghost'
            size='xs'
            className='h-7 w-7 p-0 text-rose-400 hover:text-rose-300'
            onClick={() => setItemToDelete(row.original)}
            disabled={saving || deleting}
          >
            <Trash2 className='size-3.5' />
          </Button>
        </div>
      ),
    },
  ], [openEdit, saving, deleting, usedByCount, setItemToDelete]);

  return (
    <div className='mx-auto w-full max-w-none py-10 space-y-6'>
      <SectionHeader
        title='Embedding School'
        description='Knowledge base management for AI agents. Upload documents to create searchable vector embeddings.'
        eyebrow={(
          <Link href='/admin/agentcreator/teaching' className='text-blue-300 hover:text-blue-200 transition-colors'>
            ← Back to learners
          </Link>
        )}
        actions={(
          <Button onClick={openCreate} className='h-8 text-xs'>
            New Collection
          </Button>
        )}
      />

      <FormSection className='p-6'>
        <div className='rounded-md border border-border bg-gray-950/20'>
          <DataTable
            columns={columns}
            data={collections}
            isLoading={isLoading}
          />
        </div>
      </FormSection>

      <ConfirmDialog
        open={!!itemToDelete}
        onOpenChange={(open) => !open && setItemToDelete(null)}
        title='Delete collection?'
        description={`This will permanently delete "${itemToDelete?.name}" and all associated document embeddings. Agents using this collection will lose access to this knowledge.`}
        confirmText='Delete'
        variant='destructive'
        onConfirm={() => { void handleDelete(); }}
      />

      <FormModal
        open={modalOpen}
        onClose={closeModal}
        size='sm'
        title={editing ? 'Edit Collection' : 'New Collection'}
        onSave={() => void handleSave()}
        isSaving={saving}
      >
        <div className='space-y-4'>
          <FormField label='Name'>
            <Input
              value={draft.name ?? ''}
              onChange={(e) => setDraft(prev => ({ ...prev, name: e.target.value }))}
              placeholder='e.g. "Product Manuals"'
            />
          </FormField>
          
          <FormField label='Description'>
            <Textarea
              value={draft.description ?? ''}
              onChange={(e) => setDraft(prev => ({ ...prev, description: e.target.value }))}
              placeholder='Optional description of contents'
              className='min-h-[80px]'
            />
          </FormField>

          <FormField
            label='Embedding Model'
            description='Determines the vector space for semantic search. Cannot be changed after creation.'
          >
            <SelectSimple
              size='sm'
              value={draft.embeddingModel ?? ''}
              onValueChange={(val) => setDraft(prev => ({ ...prev, embeddingModel: val }))}
              options={embeddingModels.map(m => ({ value: m, label: m }))}
              placeholder='Select model'
              disabled={!!editing}
            />
          </FormField>
        </div>
      </FormModal>
    </div>
  );
}
