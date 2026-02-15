'use client';

import { Trash2 } from 'lucide-react';
import Link from 'next/link';
import React, { useMemo } from 'react';

import type { AgentTeachingChatSource, AgentTeachingEmbeddingDocumentListItem } from '@/shared/types/domain/agent-teaching';
import { 
  Button, 
  Input, 
  SectionHeader, 
  DataTable, 
  Textarea, 
  FormSection, 
  FormField,
  Badge
} from '@/shared/ui';
import { ConfirmModal } from '@/shared/ui/templates/modals';

import { useAgentTeachingQueriesCollectionDetailState } from '../hooks/useAgentTeachingQueriesCollectionDetailState';

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
    text, setText,
    title, setTitle,
    source, setSource,
    tags, setTags,
    docToDelete, setDocToDelete,
    searchQuery, setSearchQuery,
    searchTopK, setSearchTopK,
    searchMinScore, setSearchMinScore,
    searchResults,
    searchError,
    handleAdd,
    handleDelete,
    handleSearch,
  } = useAgentTeachingQueriesCollectionDetailState();

  const columns = useMemo<ColumnDef<AgentTeachingEmbeddingDocumentListItem>[]>(() => [
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
              {row.original.metadata.tags.map(t => (
                <Badge key={t} variant='outline' className='text-[9px] px-1 py-0'>{t}</Badge>
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
      cell: ({ row }) => <span className='text-xs text-gray-500'>{row.original.updatedAt ? new Date(row.original.updatedAt).toLocaleString() : '—'}</span>,
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
  ], [adding, deleting, setDocToDelete]);

  return (
    <div className='mx-auto w-full max-w-none py-10 space-y-6'>
      <SectionHeader
        title={collection ? collection.name : 'Collection'}
        description='Manage documents (original text + embedding vectors).'
        eyebrow={(
          <Link href='/admin/agentcreator/teaching/collections' className='text-blue-300 hover:text-blue-200 transition-colors'>
            ← Back to collections
          </Link>
        )}
        actions={collection ? (
          <Badge variant='secondary' className='text-xs font-mono'>
            Model: {collection.embeddingModel}
          </Badge>
        ) : undefined}
      />

      <div className='grid gap-6 lg:grid-cols-2'>
        <FormSection title='Add Document' className='p-6'>
          <div className='space-y-4'>
            <div className='grid gap-4 md:grid-cols-2'>
              <FormField label='Title (optional)'>
                <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder='e.g. Product naming rules' />
              </FormField>
              <FormField label='Source (optional)'>
                <Input value={source} onChange={(e) => setSource(e.target.value)} placeholder='e.g. internal wiki' />
              </FormField>
            </div>
            <FormField label='Tags (comma separated)'>
              <Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder='pricing, listings, seo' />
            </FormField>
            <FormField
              label='Text Content'
              description='Raw text to be vectorized and stored.'
            >
              <Textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                placeholder='Paste knowledge content here...'
                className='min-h-[120px] font-mono text-xs'
              />
            </FormField>
            <div className='flex justify-end'>
              <Button onClick={() => void handleAdd()} disabled={adding || deleting || !collectionId || !text.trim()}>
                {adding ? 'Embedding...' : 'Add Document'}
              </Button>
            </div>
          </div>
        </FormSection>

        <FormSection
          title='Semantic Search Simulator'
          description='Test retrieval relevance by running queries against this collection.'
          actions={(
            <Button
              variant='outline'
              size='xs'
              onClick={() => void handleSearch()}
              disabled={searching || !collectionId || !searchQuery.trim()}
            >
              {searching ? 'Searching...' : 'Run Search'}
            </Button>
          )}
          className='p-6'
        >
          <div className='space-y-4'>
            <FormField label='Test Query'>
              <Textarea
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder='Ask a question...'
                className='min-h-[80px]'
                disabled={searching || !collectionId}
              />
            </FormField>
            
            <div className='grid grid-cols-2 gap-4'>
              <FormField label='Top K'>
                <Input
                  type='number'
                  min={1}
                  max={50}
                  value={String(searchTopK)}
                  onChange={(e) => setSearchTopK(Number(e.target.value))}
                  disabled={searching || !collectionId}
                />
              </FormField>
              <FormField label='Min Score'>
                <Input
                  type='number'
                  min={-1}
                  max={1}
                  step={0.01}
                  value={String(searchMinScore)}
                  onChange={(e) => setSearchMinScore(Number(e.target.value))}
                  disabled={searching || !collectionId}
                />
              </FormField>
            </div>

            {searchError && (
              <div className='p-3 rounded bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300'>
                {searchError}
              </div>
            )}

            <div className='rounded-md border border-border bg-black/20 p-0 overflow-hidden'>
              <div className='px-3 py-2 border-b border-border/40 text-xs font-semibold text-gray-400'>Results</div>
              <div className='max-h-[200px] overflow-y-auto p-2 space-y-2'>
                {searchResults.length === 0 ? (
                  <div className='text-center py-4 text-xs text-gray-600'>
                    {searching ? ' analyzing vectors...' : 'No results to display.'}
                  </div>
                ) : (
                  searchResults.map((src: AgentTeachingChatSource) => (
                    <div key={src.documentId} className='text-xs p-2 rounded bg-white/5 border border-white/5'>
                      <div className='flex justify-between mb-1 text-gray-400'>
                        <span>Score: {src.score.toFixed(3)}</span>
                        <span>{src.metadata?.title}</span>
                      </div>
                      <p className='text-gray-300 line-clamp-3'>{src.text}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </FormSection>
      </div>

      <div className='rounded-md border border-border bg-gray-950/20'>
        <DataTable
          columns={columns}
          data={docs}
          isLoading={isLoading}
        />
      </div>

      <ConfirmDialog
        open={!!docToDelete}
        onOpenChange={(open) => !open && setDocToDelete(null)}
        title='Delete document'
        description='This action cannot be undone.'
        confirmText='Delete'
        variant='destructive'
        onConfirm={() => { void handleDelete(); }}
      />
    </div>
  );
}
