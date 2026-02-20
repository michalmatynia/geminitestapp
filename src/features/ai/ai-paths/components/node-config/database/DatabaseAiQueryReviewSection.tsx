import { ChevronDown, ChevronUp } from 'lucide-react';
import React from 'react';

import type { DatabaseConfig, DbQueryConfig, NodeConfig } from '@/features/ai/ai-paths/lib';
import { Button } from '@/shared/ui';

import type { AiQuery } from '@/shared/contracts/ai-paths';

type DatabaseAiQueryReviewSectionProps = {
  pendingAiQuery: string;
  codeSnippets: string[];
  selectedSnippetIndex: number;
  setSelectedSnippetIndex: React.Dispatch<React.SetStateAction<number>>;
  setAiQueries: React.Dispatch<React.SetStateAction<AiQuery[]>>;
  setSelectedAiQueryId: React.Dispatch<React.SetStateAction<string>>;
  setPendingAiQuery: React.Dispatch<React.SetStateAction<string>>;
  updateSelectedNodeConfig: (patch: Partial<NodeConfig>) => void;
  databaseConfig: DatabaseConfig;
  queryConfig: DbQueryConfig;
  toast: (
    message: string,
    options?: { variant?: 'success' | 'error' | 'info' | 'warning' }
  ) => void;
};

export function DatabaseAiQueryReviewSection({
  pendingAiQuery,
  codeSnippets,
  selectedSnippetIndex,
  setSelectedSnippetIndex,
  setAiQueries,
  setSelectedAiQueryId,
  setPendingAiQuery,
  updateSelectedNodeConfig,
  databaseConfig,
  queryConfig,
  toast,
}: DatabaseAiQueryReviewSectionProps): React.JSX.Element | null {
  if (!pendingAiQuery) {
    return null;
  }

  return (
    <div className='rounded-md border border-purple-500/40 bg-purple-500/10 p-3'>
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-2'>
          <div className='h-2 w-2 rounded-full bg-purple-400'></div>
          <span className='text-xs text-purple-100'>AI query ready for review</span>
          {codeSnippets.length > 0 && (
            <span className='text-[10px] text-purple-300'>
              ({codeSnippets.length} code snippet{codeSnippets.length > 1 ? 's' : ''})
            </span>
          )}
        </div>
        <div className='flex gap-2'>
          <Button
            type='button'
            className='h-7 rounded-md border border-emerald-700 bg-emerald-500/10 px-3 text-[10px] text-emerald-200 hover:bg-emerald-500/20'
            onClick={(): void => {
              const queryToAccept =
                selectedSnippetIndex >= 0 && codeSnippets[selectedSnippetIndex]
                  ? codeSnippets[selectedSnippetIndex]
                  : pendingAiQuery;
              const newQuery: AiQuery = {
                id: `ai-${Date.now()}`,
                query: queryToAccept,
                timestamp: new Date().toISOString(),
              };
              setAiQueries((prev: AiQuery[]): AiQuery[] => [...prev, newQuery]);
              setSelectedAiQueryId(newQuery.id);
              updateSelectedNodeConfig({
                database: {
                  ...databaseConfig,
                  query: {
                    ...queryConfig,
                    mode: 'custom',
                    queryTemplate: queryToAccept,
                  },
                },
              });
              setPendingAiQuery('');
              toast(
                selectedSnippetIndex >= 0 && codeSnippets[selectedSnippetIndex]
                  ? `Code snippet ${selectedSnippetIndex + 1} accepted.`
                  : 'AI query accepted and saved.',
                { variant: 'success' }
              );
            }}
          >
            {selectedSnippetIndex >= 0 && codeSnippets.length > 0
              ? `Accept Snippet ${selectedSnippetIndex + 1}`
              : 'Accept'}
          </Button>
          <Button
            type='button'
            className='h-7 rounded-md border border-rose-700 bg-rose-500/10 px-3 text-[10px] text-rose-200 hover:bg-rose-500/20'
            onClick={(): void => {
              setPendingAiQuery('');
              toast('AI query rejected.', { variant: 'success' });
            }}
          >
            Reject
          </Button>
        </div>
      </div>

      {codeSnippets.length > 0 && (
        <div className='mt-2 flex items-center gap-2'>
          <div className='flex flex-col'>
            <Button
              type='button'
              className='h-5 w-5 rounded-sm border border-purple-600 bg-purple-500/20 p-0 text-purple-200 hover:bg-purple-500/40 disabled:opacity-30'
              disabled={selectedSnippetIndex <= 0}
              onClick={(): void =>
                setSelectedSnippetIndex((prev: number): number => Math.max(0, prev - 1))
              }
            >
              <ChevronUp className='h-3 w-3' />
            </Button>
            <Button
              type='button'
              className='h-5 w-5 rounded-sm border border-purple-600 bg-purple-500/20 p-0 text-purple-200 hover:bg-purple-500/40 disabled:opacity-30'
              disabled={selectedSnippetIndex >= codeSnippets.length - 1}
              onClick={(): void =>
                setSelectedSnippetIndex((prev: number): number =>
                  Math.min(codeSnippets.length - 1, prev + 1)
                )
              }
            >
              <ChevronDown className='h-3 w-3' />
            </Button>
          </div>
          <div className='flex-1 rounded-md border border-cyan-600/50 bg-cyan-500/10 p-2'>
            <div className='mb-1 flex items-center justify-between'>
              <span className='text-[10px] text-cyan-300'>
                Snippet {selectedSnippetIndex + 1} of {codeSnippets.length}
              </span>
              <Button
                type='button'
                className='h-5 rounded-sm border border-gray-600 bg-gray-500/20 px-2 text-[9px] text-gray-300 hover:bg-gray-500/40'
                onClick={(): void => setSelectedSnippetIndex(-1)}
              >
                Show Full Response
              </Button>
            </div>
            <pre className='max-h-20 overflow-auto rounded bg-card/70 p-2 text-[11px] text-cyan-100 whitespace-pre-wrap break-all'>
              {codeSnippets[selectedSnippetIndex]}
            </pre>
          </div>
        </div>
      )}

      {(selectedSnippetIndex < 0 || codeSnippets.length === 0) && (
        <pre className='mt-2 max-h-25 overflow-auto rounded-md bg-card/70 p-2 text-[11px] text-gray-300 whitespace-pre-wrap break-all'>
          {pendingAiQuery}
        </pre>
      )}
    </div>
  );
}
