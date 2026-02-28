import React from 'react';
import { ClockIcon, ChevronDownIcon, Trash2Icon } from 'lucide-react';
import { Button } from '@/shared/ui';

export type SqlHistoryDropdownProps = {
  history: string[];
  showHistory: boolean;
  setShowHistory: (show: boolean) => void;
  onSelectQuery: (query: string) => void;
  onClearHistory: () => void;
};

export function SqlHistoryDropdown({
  history,
  showHistory,
  setShowHistory,
  onSelectQuery,
  onClearHistory,
}: SqlHistoryDropdownProps): React.JSX.Element {
  return (
    <div className='relative'>
      <Button
        variant='outline'
        size='sm'
        onClick={(): void => setShowHistory(!showHistory)}
        className='h-8 gap-1 text-xs'
        disabled={history.length === 0}
      >
        <ClockIcon className='size-3' />
        History ({history.length})
        <ChevronDownIcon className='size-3' />
      </Button>
      {showHistory && history.length > 0 && (
        <div className='absolute right-0 top-full z-50 mt-1 w-96 max-h-64 overflow-auto rounded-md border border-border bg-card shadow-lg'>
          <div className='flex items-center justify-between border-b border-border px-3 py-2'>
            <span className='text-[11px] text-gray-500'>Recent queries</span>
            <Button
              variant='ghost'
              size='sm'
              onClick={onClearHistory}
              className='h-6 gap-1 text-[10px] text-red-400'
            >
              <Trash2Icon className='size-3' />
              Clear
            </Button>
          </div>
          {history.map((item: string, i: number) => (
            <button
              key={i}
              type='button'
              onClick={(): void => {
                onSelectQuery(item);
                setShowHistory(false);
              }}
              className='w-full truncate border-b border-border px-3 py-2 text-left text-xs font-mono text-gray-300 hover:bg-muted/50 last:border-b-0'
            >
              {item}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
