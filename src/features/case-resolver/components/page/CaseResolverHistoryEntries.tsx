'use client';

import { History } from 'lucide-react';
import React from 'react';

import type { CaseResolverDocumentHistoryEntry } from '@/shared/contracts/case-resolver';
import { Button } from '@/shared/ui';

import { resolveCaseResolverHistoryEntryPreview } from '../../utils/caseResolverUtils';

type CaseResolverHistoryEntriesProps = {
  entries: CaseResolverDocumentHistoryEntry[];
  formatTimestamp: (value: string) => string;
  onRestore: (entry: CaseResolverDocumentHistoryEntry) => void;
  isRestoreDisabled: boolean;
};

export function CaseResolverHistoryEntries({
  entries,
  formatTimestamp,
  onRestore,
  isRestoreDisabled,
}: CaseResolverHistoryEntriesProps): React.JSX.Element {
  return (
    <div className='rounded-lg border border-border/40 bg-card/20 overflow-hidden'>
      {entries.length === 0 ? (
        <div className='p-12 text-center'>
          <History className='mx-auto mb-3 size-8 text-gray-700' />
          <div className='text-xs text-gray-500'>No version history available.</div>
        </div>
      ) : (
        <div className='max-h-[600px] overflow-auto'>
          {entries.map((entry: CaseResolverDocumentHistoryEntry, idx: number) => {
            const previewText = resolveCaseResolverHistoryEntryPreview(entry, 240);
            return (
              <div
                key={entry.id || idx}
                className='group flex items-start justify-between gap-3 p-4 hover:bg-white/5 transition-colors'
              >
                <div className='min-w-0 flex flex-1 items-start gap-4'>
                  <div className='mt-0.5 flex size-10 shrink-0 items-center justify-center rounded-full bg-blue-500/10 text-blue-400'>
                    <History className='size-5' />
                  </div>
                  <div className='min-w-0'>
                    <div className='text-sm font-medium text-gray-200'>{formatTimestamp(entry.savedAt)}</div>
                    <div className='text-[11px] text-gray-500 uppercase tracking-wider'>
                      {entry.editorType} <span className='mx-1 opacity-30'>•</span> Version {entry.documentContentVersion}
                    </div>
                    <div className='mt-1 text-xs text-gray-400 whitespace-pre-line break-words'>
                      {previewText || 'No preview text.'}
                    </div>
                  </div>
                </div>
                <Button
                  variant='outline'
                  size='sm'
                  className='h-8 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity'
                  onClick={() => onRestore(entry)}
                  disabled={isRestoreDisabled}
                >
                  Restore
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
