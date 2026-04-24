'use client';

import React from 'react';

import { createStrictContext } from '@/shared/lib/react/createStrictContext';
import { Button } from '@/shared/ui/primitives.public';

import {
  formatHistoryTime,
  getPromptRunKindLabel,
  getPromptSourceLabel,
  type PromptDiffLine,
  type PromptExtractHistoryEntry,
} from './prompt-extract-utils';
import { useStudioInlineEdit } from './StudioInlineEditContext';

const {
  Context: PromptExtractionHistoryResetContext,
  useStrictContext: usePromptExtractionHistoryReset,
} = createStrictContext<() => void>({
  hookName: 'usePromptExtractionHistoryReset',
  providerName: 'PromptExtractionHistoryResetContext.Provider',
  displayName: 'PromptExtractionHistoryResetContext',
});

function PromptExtractionClearHistoryButton(): React.JSX.Element {
  const onClearHistory = usePromptExtractionHistoryReset();
  return (
    <Button
      size='xs'
      type='button'
      variant='ghost'
      className='h-7 px-2 text-xs text-indigo-100 hover:bg-indigo-500/20'
      onClick={onClearHistory}
    >
      Clear History
    </Button>
  );
}

export function PromptExtractionHistoryPanel(): React.JSX.Element {
  const {
    extractHistory,
    selectedExtractHistory,
    selectedExtractDiffLines,
    selectedExtractChanged,
    setSelectedExtractHistoryId,
    setExtractHistory,
  } = useStudioInlineEdit();

  const onClearHistory = React.useCallback((): void => {
    setExtractHistory([]);
    setSelectedExtractHistoryId(null);
  }, [setExtractHistory, setSelectedExtractHistoryId]);

  return (
    <div className='space-y-2 rounded border border-indigo-500/30 bg-indigo-500/5 p-3'>
      <ExtractionHistoryHeader onClearHistory={onClearHistory} />
      <div className='grid gap-3 md:grid-cols-[220px_minmax(0,1fr)]'>
        <ExtractionHistoryList
          extractHistory={extractHistory}
          selectedExtractHistory={selectedExtractHistory}
          setSelectedExtractHistoryId={setSelectedExtractHistoryId}
        />
        <ExtractionDetails
          selectedExtractHistory={selectedExtractHistory}
          selectedExtractChanged={selectedExtractChanged}
          selectedExtractDiffLines={selectedExtractDiffLines}
        />
      </div>
    </div>
  );
}

function ExtractionHistoryHeader({ onClearHistory }: { onClearHistory: () => void }) {
  return (
    <div className='flex flex-wrap items-center justify-between gap-2'>
      <div className='text-xs font-semibold text-indigo-100'>Extraction History</div>
      <PromptExtractionHistoryResetContext.Provider value={onClearHistory}>
        <PromptExtractionClearHistoryButton />
      </PromptExtractionHistoryResetContext.Provider>
    </div>
  );
}

function ExtractionHistoryList({
  extractHistory,
  selectedExtractHistory,
  setSelectedExtractHistoryId,
}: {
  extractHistory: PromptExtractHistoryEntry[];
  selectedExtractHistory: PromptExtractHistoryEntry | null;
  setSelectedExtractHistoryId: (id: string | null) => void;
}) {
  return (
    <div className='max-h-60 space-y-1 overflow-auto pr-1'>
      {extractHistory.map((entry) => (
        <ExtractionHistoryItem
          key={entry.id}
          entry={entry}
          isSelected={selectedExtractHistory?.id === entry.id}
          onSelect={() => setSelectedExtractHistoryId(entry.id)}
        />
      ))}
    </div>
  );
}

function ExtractionHistoryItem({
  entry,
  isSelected,
  onSelect,
}: {
  entry: PromptExtractHistoryEntry;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const changed = entry.promptBefore !== entry.promptAfter;
  return (
    <button
      type='button'
      onClick={onSelect}
      className={cn(
        'w-full rounded border px-2 py-1.5 text-left text-[11px] transition-colors',
        isSelected
          ? 'border-indigo-400/60 bg-indigo-500/20 text-indigo-100'
          : 'border-indigo-500/25 bg-indigo-500/5 text-indigo-100/80 hover:bg-indigo-500/15'
      )}
    >
      <div className='font-medium'>{getPromptRunKindLabel(entry.runKind)}</div>
      <div className='text-[10px] text-indigo-100/70'>
        {formatHistoryTime(entry.createdAt)} | {getPromptSourceLabel(entry.source)}
      </div>
      <div className='text-[10px] text-indigo-100/70'>
        {changed ? 'Prompt changed' : 'No prompt change'} | Validation {entry.validationBeforeCount}
        {' -> '}
        {entry.validationAfterCount}
      </div>
    </button>
  );
}

function ExtractionDetails({
  selectedExtractHistory,
  selectedExtractChanged,
  selectedExtractDiffLines,
}: {
  selectedExtractHistory: PromptExtractHistoryEntry | null;
  selectedExtractChanged: boolean;
  selectedExtractDiffLines: PromptDiffLine[];
}) {
  if (!selectedExtractHistory) return null;

  return (
    <div className='space-y-2'>
      <div className='rounded border border-indigo-500/30 bg-indigo-500/10 p-2 text-[11px] text-indigo-100/90'>
        <div>
          <span className='font-semibold'>Run:</span>{' '}
          {getPromptRunKindLabel(selectedExtractHistory.runKind)}
        </div>
        <div>
          <span className='font-semibold'>Mode:</span> {selectedExtractHistory.modeRequested ?? 'n/a'}
          {' | '}
          <span className='font-semibold'>Source:</span>{' '}
          {getPromptSourceLabel(selectedExtractHistory.source)}
          {' | '}
          <span className='font-semibold'>Autofix:</span>{' '}
          {selectedExtractHistory.autofixApplied ? 'ON' : 'OFF'}
          {' | '}
          <span className='font-semibold'>Fallback:</span>{' '}
          {selectedExtractHistory.fallbackUsed ? 'YES' : 'NO'}
        </div>
      </div>
      {selectedExtractChanged ? (
        <DiffView lines={selectedExtractDiffLines} />
      ) : (
        <div className='rounded border border-indigo-500/25 bg-indigo-500/5 p-2 text-xs text-indigo-100/80'>
          No prompt formatting differences for this extraction.
        </div>
      )}
    </div>
  );
}

function DiffView({ lines }: { lines: PromptDiffLine[] }) {
  return (
    <div className='max-h-60 overflow-auto rounded border border-indigo-500/30 bg-gray-950/30'>
      <div className='grid grid-cols-2 border-b border-indigo-500/25 text-[10px] uppercase tracking-wide text-indigo-200/80'>
        <div className='px-2 py-1'>Before Autofix</div>
        <div className='px-2 py-1'>After Autofix</div>
      </div>
      <div className='divide-y divide-indigo-500/10 font-mono text-[11px]'>
        {lines.map((line, index) => (
          <div key={`diff-${index}`} className='grid grid-cols-2'>
            <div
              className={cn(
                'whitespace-pre-wrap break-words px-2 py-1',
                line.changed ? 'bg-red-500/10 text-red-100' : 'text-gray-300'
              )}
            >
              {line.before ?? '\u2205'}
            </div>
            <div
              className={cn(
                'whitespace-pre-wrap break-words px-2 py-1',
                line.changed ? 'bg-emerald-500/10 text-emerald-100' : 'text-gray-300'
              )}
            >
              {line.after ?? '\u2205'}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
