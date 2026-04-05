'use client';

import { ChevronDown, ChevronUp } from 'lucide-react';
import { useMemo } from 'react';

import { AdminChatbotPageLayout } from '@/shared/ui/admin.public';
import { Button, Input, Card } from '@/shared/ui/primitives.public';
import { FormField, Tag, Hint } from '@/shared/ui/forms-and-actions.public';
import { StandardDataTablePanel } from '@/shared/ui/templates.public';
import { UI_GRID_RELAXED_CLASSNAME } from '@/shared/ui/navigation-and-layout.public';

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

  const columns = useMemo<ColumnDef<ExtendedMemoryItem>[]>(
    () => [
      {
        id: 'expander',
        header: () => null,
        cell: ({ row }) => (
          <Button
            size='icon'
            variant='ghost'
            className='h-7 w-7'
            onClick={() => toggleExpanded(row.original.id)}
            aria-label={
              expanded[row.original.id] ? 'Collapse memory details' : 'Expand memory details'
            }
            aria-expanded={expanded[row.original.id]}
            title={expanded[row.original.id] ? 'Collapse memory details' : 'Expand memory details'}
          >
            {expanded[row.original.id] ? (
              <ChevronUp className='size-4' />
            ) : (
              <ChevronDown className='size-4' />
            )}
          </Button>
        ),
      },
      {
        accessorKey: 'value',
        header: 'Memory / Summary',
        cell: ({ row }) => (
          <div className='flex flex-col gap-1'>
            <span className='font-medium text-white'>
              {(row.original.metadata?.['summary'] as string) || row.original.value.slice(0, 100)}
            </span>
            <span className='text-[10px] text-gray-500 font-mono'>Key: {row.original.key}</span>
          </div>
        ),
      },
      {
        accessorKey: 'tags',
        header: 'Tags',
        cell: ({ row }) => (
          <div className='flex flex-wrap gap-1'>
            {(row.original.metadata?.['tags'] as string[])?.length ? (
              (row.original.metadata?.['tags'] as string[]).map((t) => <Tag key={t} label={t} />)
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
            {(row.original.metadata?.['importance'] as number) ?? '—'}
          </span>
        ),
      },
      {
        accessorKey: 'updatedAt',
        header: 'Last Seen',
        cell: ({ row }) => (
          <span className='text-xs text-gray-400'>{formatDate(row.original.updatedAt)}</span>
        ),
      },
    ],
    [expanded, toggleExpanded]
  );

  return (
    <AdminChatbotPageLayout
      title='Agent Long-Term Memory'
      current='Memory'
      description='Knowledge preserved by agents across conversations and runs.'
      headerActions={
        <Button variant='outline' size='xs' onClick={refetch} loading={isFetching}>
          Refresh
        </Button>
      }
    >
      <StandardDataTablePanel
        variant='flat'
        alerts={
          error ? (
            <p className='text-sm text-rose-400'>
              {error instanceof Error ? error.message : String(error)}
            </p>
          ) : null
        }
        filters={
          <div className={`${UI_GRID_RELAXED_CLASSNAME} md:grid-cols-4`}>
            <FormField label='Memory key'>
              <Input
                size='sm'
                value={memoryKey}
                onChange={(e) => setMemoryKey(e.target.value)}
                placeholder='run-id or key'
                className='h-8'
               aria-label='run-id or key' title='run-id or key'/>
            </FormField>
            <FormField label='Tag'>
              <Input
                size='sm'
                value={tag}
                onChange={(e) => setTag(e.target.value)}
                placeholder='tag name'
                className='h-8'
               aria-label='tag name' title='tag name'/>
            </FormField>
            <FormField label='Search content'>
              <Input
                size='sm'
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder='text search'
                className='h-8'
               aria-label='text search' title='text search'/>
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
               aria-label='Limit' title='Limit'/>
            </FormField>
          </div>
        }
        columns={columns}
        data={items}
        isLoading={loading}
        renderRowDetails={({ row }: { row: { original: ExtendedMemoryItem } }) => (
          <div className='p-4 space-y-4 bg-black/20'>
            <div className={`${UI_GRID_RELAXED_CLASSNAME} md:grid-cols-2`}>
              <div>
                <Hint size='xxs' uppercase className='mb-2'>
                  Full Content
                </Hint>
                <Card
                  variant='subtle-compact'
                  padding='sm'
                  className='border-border/60 bg-black/40 font-mono text-[11px] text-gray-300 whitespace-pre-wrap'
                >
                  {row.original.value}
                </Card>
              </div>
              <div>
                <Hint size='xxs' uppercase className='mb-2'>
                  Context Details
                </Hint>
                <Card
                  variant='subtle-compact'
                  padding='sm'
                  className='border-border/60 bg-black/40 space-y-2 text-xs text-gray-400'
                >
                  <div className='flex justify-between border-b border-white/5 pb-1'>
                    <span>Created</span>
                    <span className='text-gray-200'>{formatDate(row.original.createdAt)}</span>
                  </div>
                  <div className='flex justify-between border-b border-white/5 pb-1'>
                    <span>Accessed</span>
                    <span className='text-gray-200'>
                      {formatDate(row.original.metadata?.['lastAccessedAt'] as string)}
                    </span>
                  </div>
                  <div className='flex justify-between border-b border-white/5 pb-1'>
                    <span>Run ID</span>
                    <span className='font-mono text-gray-200'>
                      {(row.original.metadata?.['runId'] as string) || '—'}
                    </span>
                  </div>
                </Card>
                {row.original.metadata && (
                  <div className='mt-4'>
                    <Hint size='xxs' uppercase className='mb-2'>
                      Metadata
                    </Hint>
                    <Card
                      variant='subtle-compact'
                      padding='sm'
                      className='border-border/60 bg-black/40 font-mono text-[10px] text-gray-400 whitespace-pre-wrap'
                    >
                      {JSON.stringify(row.original.metadata, null, 2)}
                    </Card>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        expanded={expanded}
      />
    </AdminChatbotPageLayout>
  );
}
