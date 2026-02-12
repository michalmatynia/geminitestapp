'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

import { Button, Input, SectionHeader, SectionPanel, FormSection, FormField } from '@/shared/ui';

import { useChatbotMemory } from '../hooks/useChatbotMemory';

import type { ChatbotMemoryItem } from '../types';

interface ExtendedMemoryItem extends ChatbotMemoryItem {
  memoryKey?: string;
  summary?: string;
  content?: string;
  tags?: string[];
  importance?: number;
  runId?: string;
  lastAccessedAt?: string;
  metadata?: Record<string, unknown>;
}

const formatDate = (value?: string | null): string => {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString();
};

export default function AgentMemoryPage(): React.JSX.Element {
  const [memoryKey, setMemoryKey] = useState<string>('');
  const [tag, setTag] = useState<string>('');
  const [query, setQuery] = useState<string>('');
  const [limit, setLimit] = useState<number>(50);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const queryString = useMemo((): string => {
    const params = new URLSearchParams();
    if (memoryKey.trim()) params.set('memoryKey', memoryKey.trim());
    if (tag.trim()) params.set('tag', tag.trim());
    if (query.trim()) params.set('q', query.trim());
    if (limit) params.set('limit', String(limit));
    return params.toString();
  }, [memoryKey, tag, query, limit]);

  const { data: items = [], isLoading: loading, error } = useChatbotMemory(queryString);

  return (
    <div className='container mx-auto py-10'>
      <SectionPanel className='p-6'>
        <SectionHeader
          title='Agent Long-Term Memory'
          actions={
            <Button asChild type='button' variant='outline' size='sm'>
              <Link href='/admin/chatbot'>Back to chatbot</Link>
            </Button>
          }
          className='mb-4'
        />
        <FormSection title='Filters' className='p-4'>
          <div className='grid gap-3 md:grid-cols-4'>
            <FormField label='Memory key'>
              <Input
                value={memoryKey}
                onChange={(event: React.ChangeEvent<HTMLInputElement>): void => setMemoryKey(event.target.value)}
                placeholder='run-id or tenant key'
                className='h-9'
              />
            </FormField>
            <FormField label='Tag'>
              <Input
                value={tag}
                onChange={(event: React.ChangeEvent<HTMLInputElement>): void => setTag(event.target.value)}
                placeholder='problem-solution'
                className='h-9'
              />
            </FormField>
            <FormField label='Search'>
              <Input
                value={query}
                onChange={(event: React.ChangeEvent<HTMLInputElement>): void => setQuery(event.target.value)}
                placeholder='query text'
                className='h-9'
              />
            </FormField>
            <FormField label='Limit'>
              <Input
                type='number'
                min={1}
                max={100}
                value={limit}
                onChange={(event: React.ChangeEvent<HTMLInputElement>): void => setLimit(Number(event.target.value))}
                className='h-9'
              />
            </FormField>
          </div>
        </FormSection>
        <div className='mt-4 rounded-md border border-border bg-gray-900 p-4 text-sm text-gray-300'>
          {loading ? (
            <p className='text-gray-400'>Loading memory…</p>
          ) : error ? (
            <p className='text-rose-300'>{error instanceof Error ? error.message : String(error)}</p>
          ) : items.length === 0 ? (
            <p className='text-gray-400'>No memory entries found.</p>
          ) : (
            <div className='space-y-3'>
              {items.map((item: ExtendedMemoryItem): React.JSX.Element => (
                <div
                  key={item.id}
                  className='rounded-md border border-border bg-card p-3'
                >
                  <div className='flex flex-wrap items-center justify-between gap-2 text-xs text-gray-400'>
                    <span>Key: {item.memoryKey || item.key}</span>
                    <span>Updated: {formatDate(item.updatedAt)}</span>
                  </div>
                  <p className='mt-2 text-sm text-white'>
                    {item.summary || item.content?.slice(0, 240) || item.value.slice(0, 240)}
                  </p>
                  <div className='mt-2 flex flex-wrap gap-2 text-[11px] text-gray-400'>
                    {item.tags?.length ? (
                      item.tags.map((tagValue: string): React.JSX.Element => (
                        <span
                          key={`${item.id}-${tagValue}`}
                          className='rounded-full border border-border bg-gray-900 px-2 py-[1px]'
                        >
                          {tagValue}
                        </span>
                      ))
                    ) : (
                      <span>No tags</span>
                    )}
                    <span>Importance: {item.importance ?? '—'}</span>
                    <span>Run: {item.runId ?? '—'}</span>
                  </div>
                  <div className='mt-2 text-xs text-gray-500'>
                    Created: {formatDate(item.createdAt)} · Last accessed:{' '}
                    {formatDate(item.lastAccessedAt || item.updatedAt)}
                  </div>
                  <div className='mt-2'>
                    <Button
                      type='button'
                      className='text-[11px] uppercase tracking-wide text-gray-400 hover:text-gray-200'
                      onClick={(): void =>
                        setExpanded((prev: Record<string, boolean>): Record<string, boolean> => ({
                          ...prev,
                          [item.id]: !prev[item.id],
                        }))
                      }
                    >
                      {expanded[item.id] ? 'Hide details' : 'Show details'}
                    </Button>
                  </div>
                  {expanded[item.id] ? (
                    <div className='mt-2 space-y-2 text-[11px] text-gray-200'>
                      <div>
                        <p className='text-[10px] uppercase text-gray-500'>
                          Content
                        </p>
                        <pre className='mt-1 whitespace-pre-wrap rounded-md border border-border bg-gray-900 p-2 text-[10px] text-gray-200'>
                          {item.content || item.value}
                        </pre>
                      </div>
                      {item.metadata ? (
                        <div>
                          <p className='text-[10px] uppercase text-gray-500'>
                            Metadata
                          </p>
                          <pre className='mt-1 whitespace-pre-wrap rounded-md border border-border bg-gray-900 p-2 text-[10px] text-gray-200'>
                            {JSON.stringify(item.metadata, null, 2)}
                          </pre>
                        </div>
                      ) : null}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </div>
      </SectionPanel>
    </div>
  );
}
