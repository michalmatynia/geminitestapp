'use client';

import React from 'react';

import { AI_PATHS_NODE_DOCS as NODE_DOCS_LIST } from '@/shared/lib/ai-paths/core/docs/node-docs';
import { DEFAULT_AI_PATHS_VALIDATION_DOC_SOURCES } from '@/shared/lib/ai-paths/core/validation-engine';
import { Button, Card, Hint, Label, SearchInput, Textarea, useToast } from '@/shared/ui';

import { useAdminAiPathsValidationContext } from '../../context/AdminAiPathsValidationContext';
import { parseDocsSourcesText } from '../../pages/AdminAiPathsValidationUtils';

export function DocsConnectionsPanel(): React.JSX.Element {
  const {
    docsSourcesDraft,
    setDocsSourcesDraft,
    handleApplyDocsSources,
    filteredNodeDocs,
    docsSearch,
    setDocsSearch,
    updateDraft,
  } = useAdminAiPathsValidationContext();
  const { toast } = useToast();

  const applyDocsSources = (nextSources: string[]): void => {
    const normalized = parseDocsSourcesText(nextSources.join('\n'));
    updateDraft({ docsSources: normalized });
    setDocsSourcesDraft(normalized.join('\n'));
  };

  return (
    <Card variant='subtle' padding='md' className='border-border/60 bg-card/40'>
      <div className='mb-4 flex flex-wrap items-center justify-between gap-2'>
        <h3 className='text-sm font-semibold text-white'>Docs Connections</h3>
        <div className='flex items-center gap-2'>
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={() => {
              applyDocsSources([...DEFAULT_AI_PATHS_VALIDATION_DOC_SOURCES]);
              toast('Loaded default AI-Paths docs sources.', { variant: 'info' });
            }}
          >
            Load Defaults
          </Button>
          <Button type='button' variant='outline' size='sm' onClick={handleApplyDocsSources}>
            Apply Docs Sources
          </Button>
        </div>
      </div>
      <Label className='text-xs text-gray-400'>Docs Sources (one per line)</Label>
      <Textarea
        className='mt-2 min-h-[96px]'
        value={docsSourcesDraft}
        onChange={(event) => setDocsSourcesDraft(event.target.value)}
        aria-label='Docs sources'
       title="Textarea"/>

      <div className='mt-4 flex flex-wrap items-center justify-between gap-2'>
        <Label className='text-xs text-gray-400'>Node Docs Catalog</Label>
        <div className='text-xs text-gray-500'>
          {filteredNodeDocs.length}/{NODE_DOCS_LIST.length}
        </div>
      </div>
      <SearchInput
        value={docsSearch}
        onChange={(event) => setDocsSearch(event.target.value)}
        onClear={() => setDocsSearch('')}
        placeholder='Search node docs by type, title, ports...'
        className='mt-2 h-9'
      />
      <Card
        variant='subtle-compact'
        padding='sm'
        className='mt-3 max-h-56 space-y-2 overflow-y-auto border-border/60 bg-card/30'
      >
        {filteredNodeDocs.map((doc) => {
          const sourceId = `ai-paths:node-docs:${doc.type}`;
          const docsSet = new Set(parseDocsSourcesText(docsSourcesDraft));
          const connected = docsSet.has(sourceId);
          return (
            <Card
              key={doc.type}
              variant='subtle-compact'
              padding='sm'
              className='flex items-start justify-between gap-3 border-border/50 bg-card/40'
            >
              <div className='min-w-0'>
                <div className='text-xs font-semibold text-gray-100'>
                  {doc.title}
                  <Hint size='xxs' uppercase className='ml-2 text-gray-400'>
                    {doc.type}
                  </Hint>
                </div>
                <div className='line-clamp-2 text-[11px] text-gray-400'>{doc.purpose}</div>
              </div>
              <Button
                type='button'
                variant='outline'
                size='sm'
                className='h-7 px-2 text-[11px]'
                onClick={() => {
                  const nextSources = Array.from(docsSet);
                  if (!connected) {
                    nextSources.push(sourceId);
                  }
                  applyDocsSources(nextSources);
                }}
              >
                {connected ? 'Connected' : 'Connect'}
              </Button>
            </Card>
          );
        })}
      </Card>
    </Card>
  );
}
