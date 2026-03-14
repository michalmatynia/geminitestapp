'use client';

import { Search } from 'lucide-react';
import React from 'react';

import type { AgentTeachingChatSource } from '@/shared/contracts/agent-teaching';
import { Button, Input, Textarea, FormSection, FormField, Alert, Card } from '@/shared/ui';

export type SearchSimulatorProps = {
  query: string;
  setQuery: (v: string) => void;
  topK: number;
  setTopK: (v: number) => void;
  minScore: number;
  setMinScore: (v: number) => void;
  onSearch: () => void;
  isSearching: boolean;
  collectionId: string | null;
  results: AgentTeachingChatSource[];
  error: string | null;
};

export function SearchSimulator(props: SearchSimulatorProps): React.JSX.Element {
  const {
    query,
    setQuery,
    topK,
    setTopK,
    minScore,
    setMinScore,
    onSearch,
    isSearching,
    collectionId,
    results,
    error,
  } = props;

  return (
    <FormSection
      title='Semantic Search Simulator'
      description='Test retrieval relevance by running queries against this collection.'
      variant='subtle'
      actions={
        <Button
          variant='outline'
          size='xs'
          onClick={onSearch}
          loading={isSearching}
          disabled={!collectionId || !query.trim()}
          className='gap-2'
        >
          <Search className='size-3' />
          Run Search
        </Button>
      }
      className='p-6'
    >
      <div className='space-y-4'>
        <FormField label='Test Query'>
          <Textarea
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder='Ask a question...'
            className='min-h-[80px]'
            disabled={isSearching || !collectionId}
           aria-label="Ask a question..." title="Ask a question..."/>
        </FormField>

        <div className='grid grid-cols-2 gap-4'>
          <FormField label='Top K'>
            <Input
              type='number'
              min={1}
              max={50}
              value={String(topK)}
              onChange={(e) => setTopK(Number(e.target.value))}
              disabled={isSearching || !collectionId}
             aria-label="Top K" title="Top K"/>
          </FormField>
          <FormField label='Min Score'>
            <Input
              type='number'
              min={-1}
              max={1}
              step={0.01}
              value={String(minScore)}
              onChange={(e) => setMinScore(Number(e.target.value))}
              disabled={isSearching || !collectionId}
             aria-label="Min Score" title="Min Score"/>
          </FormField>
        </div>

        {error && (
          <Alert variant='error' className='p-3 text-xs'>
            {error}
          </Alert>
        )}

        <Card
          variant='subtle-compact'
          padding='none'
          className='border-border bg-black/20 overflow-hidden'
        >
          <div className='px-3 py-2 border-b border-border/40 text-xs font-semibold text-gray-400'>
            Results
          </div>
          <div className='max-h-[200px] overflow-y-auto p-2 space-y-2'>
            {results.length === 0 ? (
              <div className='text-center py-4 text-xs text-gray-600'>
                {isSearching ? ' analyzing vectors...' : 'No results to display.'}
              </div>
            ) : (
              results.map((src) => (
                <Card
                  key={src.documentId}
                  variant='subtle-compact'
                  padding='sm'
                  className='text-xs bg-white/5 border-white/5'
                >
                  <div className='flex justify-between mb-1 text-gray-400'>
                    <span>Score: {src.score.toFixed(3)}</span>
                    <span>{src.metadata?.title}</span>
                  </div>
                  <p className='text-gray-300 line-clamp-3'>{src.text}</p>
                </Card>
              ))
            )}
          </div>
        </Card>
      </div>
    </FormSection>
  );
}
