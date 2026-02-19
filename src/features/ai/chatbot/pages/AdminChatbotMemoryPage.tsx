'use client';

import { ChevronDown, ChevronUp } from 'lucide-react';
import { useMemo } from 'react';

import { 
  Button, 
  Input, 
  SectionHeader, 
  FormField, 
  StandardDataTablePanel,
  Tag
} from '@/shared/ui';

import { useChatbotMemoryState, type ExtendedMemoryItem } from '../hooks/useChatbotMemoryState';

import type { ColumnDef } from '@tanstack/react-table';

const formatDate = (value?: string | null): string => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString();
};

export default function AgentMemoryPage(): React.JSX.Element {
  const {
    items,
    memoryKey,
    setMemoryKey,
    tag,
    setTag,
    query,
    setQuery,
    limit,
    setLimit,
    expanded,
    toggleExpanded,
    loading,
    isFetching,
    error,
    refetch,
  } = useChatbotMemoryState();

  const columns = useMemo<ColumnDef<ExtendedMemoryItem>[]>(() => [
    {
      id: 'expander',
      header: () => null,
      cell: ({ row }) => (
        <Button
          size='icon'
          variant='ghost'
          className='h-7 w-7'
          onClick={() => toggleExpanded(row.original.id)}
        >
          {expanded[row.original.id] ? <ChevronUp className='size-4' /> : <ChevronDown className='size-4' />}
        </Button>
      ),
    },
    {
      accessorKey: 'summary',
      header: 'Memory / Summary',
      cell: ({ row }) => (
        <div className='flex flex-col gap-1'>
          <span className='font-medium text-white'>
            {row.original.summary || row.original.content.slice(0, 100)}
          </span>
          <span className='text-[10px] text-gray-500 font-mono'>
            Key: {row.original.memoryKey}
          </span>
        </div>
      ),
    },
    {
      accessorKey: 'tags',
      header: 'Tags',
      cell: ({ row }) => (
        <div className='flex flex-wrap gap-1'>
          {row.original.tags?.length ? (
            row.original.tags.map((t) => (
              <Tag key={t} label={t} />
            ))
          ) : (
            <span className='text-xs text-gray-600'>None</span>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'importance',
      header: 'Score',
      cell: ({ row }) => (
        <span className='text-xs font-medium text-gray-300'>
          {row.original.importance ?? '—'}
        </span>
      ),
    },
    {
      accessorKey: 'updatedAt',
      header: 'Last Seen',
      cell: ({ row }) => (
        <span className='text-xs text-gray-400'>
          {formatDate(row.original.updatedAt)}
        </span>
      ),
    },
  ], [expanded, toggleExpanded]);

  return (
    <div className='mx-auto w-full max-w-none py-10'>
      <SectionHeader
        title='Agent Long-Term Memory'
        description='Knowledge preserved by agents across conversations and runs.'
        eyebrow={(
          <a href='/admin/chatbot' className='text-blue-300 hover:text-blue-200'>
            ← Back to chatbot
          </a>
        )}
        actions={(
          <Button
            variant='outline'
            size='xs'
            onClick={refetch}
            disabled={isFetching}
          >
            {isFetching ? 'Refreshing...' : 'Refresh'}
          </Button>
        )}
        className='mb-6'
      />

      <StandardDataTablePanel
        variant='flat'
        alerts={error ? <p className='text-sm text-rose-400'>{error instanceof Error ? error.message : String(error)}</p> : null}
        filters={(
          <div className='grid gap-4 md:grid-cols-4'>
            <FormField label='Memory key'>
              <Input
                size='sm'
                value={memoryKey}
                onChange={(e) => setMemoryKey(e.target.value)}
                placeholder='run-id or key'
                className='h-8'
              />
            </FormField>
            <FormField label='Tag'>
              <Input
                size='sm'
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                placeholder='tag name'
                className='h-8'
              />
            </FormField>
            <FormField label='Search content'>
              <Input
                size='sm'
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder='text search'
                className='h-8'
              />
            </FormField>
            <FormField label='Limit'>
              <Input
                size='sm'
                type='number'
                min={1}
                max={100}
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
                className='h-8'
              />
            </FormField>
          </div>
        )}
        columns={columns}
        data={items}
        isLoading={loading}
        renderRowDetails={({ row }: { row: { original: ExtendedMemoryItem } }) => (
          <div className='p-4 space-y-4 bg-black/20'>
            <div className='grid gap-4 md:grid-cols-2'>
              <div>
                <h4 className='text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-2'>Full Content</h4>
                <pre className='whitespace-pre-wrap rounded border border-border/60 bg-black/40 p-3 font-mono text-[11px] text-gray-300'>
                  {row.original.content}
                </pre>
              </div>
              <div>
                <h4 className='text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-2'>Context Details</h4>
                <div className='space-y-2 text-xs text-gray-400'>
                  <div className='flex justify-between border-b border-white/5 pb-1'>
                    <span>Created</span>
                    <span className='text-gray-200'>{formatDate(row.original.createdAt)}</span>
                  </div>
                  <div className='flex justify-between border-b border-white/5 pb-1'>
                    <span>Accessed</span>
                    <span className='text-gray-200'>{formatDate(row.original.lastAccessedAt)}</span>
                  </div>
                  <div className='flex justify-between border-b border-white/5 pb-1'>
                    <span>Run ID</span>
                    <span className='font-mono text-gray-200'>{row.original.runId || '—'}</span>
                  </div>
                </div>
                {row.original.metadata && (
                  <div className='mt-4'>
                    <h4 className='text-[10px] font-semibold uppercase tracking-wider text-gray-500 mb-2'>Metadata</h4>
                    <pre className='whitespace-pre-wrap rounded border border-border/60 bg-black/40 p-2 font-mono text-[10px] text-gray-400'>
                      {JSON.stringify(row.original.metadata, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        expanded={expanded}
      />
    </div>
  );
}
