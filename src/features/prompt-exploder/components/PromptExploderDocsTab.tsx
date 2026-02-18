'use client';

import React from 'react';

import { FormSection, Input } from '@/shared/ui';

import { PROMPT_EXPLODER_DOC_CATALOG } from '../docs/catalog';

const normalize = (value: string): string =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();

export function PromptExploderDocsTab(): React.JSX.Element {
  const [query, setQuery] = React.useState('');

  const filtered = React.useMemo(() => {
    const normalizedQuery = normalize(query);
    if (!normalizedQuery) return PROMPT_EXPLODER_DOC_CATALOG;
    return PROMPT_EXPLODER_DOC_CATALOG.filter((doc) => {
      const haystack = normalize(
        `${doc.title} ${doc.summary} ${doc.section} ${doc.aliases.join(' ')} ${doc.id}`
      );
      return haystack.includes(normalizedQuery);
    });
  }, [query]);

  const grouped = React.useMemo(() => {
    const map = new Map<string, typeof filtered>();
    filtered.forEach((doc) => {
      const current = map.get(doc.section) ?? [];
      current.push(doc);
      map.set(doc.section, current);
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [filtered]);

  return (
    <FormSection
      title='Docs'
      description='Canonical Prompt Exploder documentation used by the tooltip system (source in /docs).'
      variant='subtle'
      className='p-4'
    >
      <div className='space-y-4'>
        <div className='grid gap-2 md:grid-cols-[minmax(0,1fr)_auto]'>
          <Input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
            }}
            placeholder='Search docs entries, actions, sections, aliases...'
          />
          <div className='rounded border border-border/50 bg-card/20 px-3 py-2 text-xs text-gray-400'>
            Entries: <span className='text-gray-200'>{filtered.length}</span>
          </div>
        </div>

        {grouped.length === 0 ? (
          <div className='text-sm text-gray-500'>No docs entries matched this query.</div>
        ) : (
          <div className='space-y-4'>
            {grouped.map(([section, entries]) => (
              <div key={section} className='rounded border border-border/60 bg-card/20 p-3'>
                <div className='mb-2 text-xs font-semibold uppercase tracking-wide text-gray-300'>
                  {section}
                </div>
                <div className='space-y-2'>
                  {entries.map((entry) => (
                    <div key={entry.id} className='rounded border border-border/50 bg-card/30 p-2 text-xs'>
                      <div className='font-medium text-gray-100'>{entry.title}</div>
                      <div className='mt-1 text-gray-300'>{entry.summary}</div>
                      <div className='mt-1 text-[10px] text-gray-500'>
                        id: <span className='font-mono'>{entry.id}</span> · aliases:{' '}
                        <span className='font-mono'>{entry.aliases.join(', ')}</span>
                      </div>
                      <div className='mt-1 text-[10px] text-gray-500'>
                        docs: <span className='font-mono'>{entry.docPath}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </FormSection>
  );
}
