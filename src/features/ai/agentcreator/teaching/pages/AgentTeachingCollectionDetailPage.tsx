'use client';

import { Trash2, BookOpen } from 'lucide-react';
import Link from 'next/link';
import React, { useMemo } from 'react';

import type { AgentTeachingEmbeddingDocumentListItem } from '@/shared/contracts/agent-teaching';
import { Button, StandardDataTablePanel, Badge, ConfirmModal, PanelHeader } from '@/shared/ui';

import { useAgentTeachingCollectionDetailState } from '../hooks/useAgentTeachingCollectionDetailState';
import { DocumentAddForm } from '../components/DocumentAddForm';
import { SearchSimulator } from '../components/SearchSimulator';

import type { ColumnDef } from '@tanstack/react-table';

export function AgentTeachingCollectionDetailPage(): React.JSX.Element {
  const {
    collectionId,
    collection,
    docs,
    isLoading,
    adding,
    deleting,
    searching,
    text,
    setText,
    title,
    setTitle,
    source,
    setSource,
    tags,
    setTags,
    docToDelete,
    setDocToDelete,
    searchQuery,
    setSearchQuery,
    searchTopK,
    setSearchTopK,
    searchMinScore,
    setSearchMinScore,
    searchResults,
    searchError,
    handleAdd,
    handleDelete,
    handleSearch,
  } = useAgentTeachingCollectionDetailState();

  const columns = useMemo<ColumnDef<AgentTeachingEmbeddingDocumentListItem>[]>(
    () => [
      {
        accessorKey: 'text',
        header: 'Document Text',
        cell: ({ row }) => (
          <div className='max-w-[520px] truncate text-sm text-gray-300' title={row.original.text}>
            {row.original.text}
          </div>
        ),
      },
      {
        id: 'meta',
        header: 'Metadata',
        cell: ({ row }) => (
          <div className='flex flex-col gap-1 text-xs'>
            {row.original.metadata?.title && (
              <div className='text-gray-200 font-medium'>{row.original.metadata.title}</div>
            )}
            {row.original.metadata?.source && (
              <div className='text-gray-500 italic'>{row.original.metadata.source}</div>
            )}
            {row.original.metadata?.tags?.length ? (
              <div className='flex gap-1 flex-wrap'>
                {row.original.metadata.tags.map((t) => (
                  <Badge key={t} variant='outline' className='text-[9px] px-1 py-0'>
                    {t}
                  </Badge>
                ))}
              </div>
            ) : null}
            <div className='text-[10px] text-gray-600 mt-1'>
              {row.original.embeddingModel} ({row.original.embeddingDimensions})
            </div>
          </div>
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
          <div className='text-right'>
            <Button
              variant='ghost'
              size='xs'
              className='h-7 w-7 p-0 text-rose-400 hover:text-rose-300'
              onClick={() => setDocToDelete(row.original)}
              disabled={adding || deleting}
            >
              <Trash2 className='size-3.5' />
            </Button>
          </div>
        ),
      },
    ],
    [adding, deleting, setDocToDelete]
  );

  return (
    <div className='mx-auto w-full max-w-none py-10 space-y-6'>
      <PanelHeader
        title={collection ? collection.name : 'Collection'}
        description='Manage documents (original text + embedding vectors).'
        icon={<BookOpen className='size-4' />}
        subtitle={
          <Link
            href='/admin/agentcreator/teaching/collections'
            className='text-blue-300 hover:text-blue-200 transition-colors ml-2'
          >
            ← Back to collections
          </Link>
        }
        actions={
          collection
            ? [
                {
                  key: 'model',
                  label: `Model: ${collection.embeddingModel}`,
                  variant: 'secondary',
                  onClick: () => {},
                  disabled: true,
                },
              ]
            : []
        }
      />

      <div className='grid gap-6 lg:grid-cols-2'>
        <DocumentAddForm
          title={title}
          setTitle={setTitle}
          source={source}
          setSource={setSource}
          tags={tags}
          setTags={setTags}
          text={text}
          setText={setText}
          onAdd={() => void handleAdd()}
          isAdding={adding}
          isDeleting={deleting}
          collectionId={collectionId}
        />

        <SearchSimulator
          query={searchQuery}
          setQuery={setSearchQuery}
          topK={searchTopK}
          setTopK={setSearchTopK}
          minScore={searchMinScore}
          setMinScore={setSearchMinScore}
          onSearch={() => void handleSearch()}
          isSearching={searching}
          collectionId={collectionId}
          results={searchResults}
          error={searchError}
        />
      </div>

      <StandardDataTablePanel columns={columns} data={docs} isLoading={isLoading} />

      <ConfirmModal
        isOpen={!!docToDelete}
        onClose={() => setDocToDelete(null)}
        onConfirm={() => {
          void handleDelete();
        }}
        title='Delete document'
        message='Are you sure you want to delete this document? This action cannot be undone and will remove the vector representation from the embedding collection.'
        confirmText='Delete'
        isDangerous={true}
        loading={deleting}
      />
    </div>
  );
}
