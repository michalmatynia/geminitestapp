'use client';

import React from 'react';
import { ClockIcon, ChevronDownIcon, Trash2Icon } from 'lucide-react';
import { Button, Card } from '@/shared/ui';
import { cn } from '@/shared/utils';

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
        <ChevronDownIcon className={cn('size-3 transition-transform', showHistory && 'rotate-180')} />
      </Button>
      {showHistory && history.length > 0 && (
        <Card
          variant='glass'
          padding='none'
          className='absolute right-0 top-full z-50 mt-1 w-96 max-h-64 overflow-hidden border-border bg-card/95 shadow-xl backdrop-blur-md'
        >
          <div className='flex items-center justify-between border-b border-white/5 px-3 py-2 bg-white/5'>
            <span className='text-[10px] uppercase font-bold text-gray-500 tracking-wider'>Recent queries</span>
            <Button
              variant='ghost'
              size='xs'
              onClick={(e) => {
                e.stopPropagation();
                onClearHistory();
              }}
              className='h-6 gap-1 text-[10px] text-red-400 hover:text-red-300 hover:bg-red-500/10'
            >
              <Trash2Icon className='size-3' />
              Clear
            </Button>
          </div>
          <div className='overflow-y-auto max-h-56 divide-y divide-white/5 custom-scrollbar'>
            {history.map((item: string, i: number) => (
              <Button
                key={i}
                variant='ghost'
                onClick={(): void => {
                  onSelectQuery(item);
                  setShowHistory(false);
                }}
                className='h-auto w-full justify-start rounded-none px-3 py-2.5 text-left text-xs font-mono text-gray-300 hover:bg-white/5 hover:text-white transition-colors'
                title={item}
              >
                <span className='truncate'>{item}</span>
              </Button>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
