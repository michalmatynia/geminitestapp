'use client';

import React from 'react';
import { Badge, Button } from '@/shared/ui/primitives.public';
import { cn } from '@/shared/utils/ui-utils';

export function NodeListPanel({
  activeNodeOptions,
  selectedNodeId,
  selectNode,
}: {
  activeNodeOptions: { value: string; label: string; description?: string }[];
  selectedNodeId: string | null;
  selectNode: (id: string) => void;
}) {
  if (activeNodeOptions.length === 0) return null;

  return (
    <div className='w-72 flex flex-col gap-3'>
      <div className='flex-1 overflow-hidden bg-card/40 border border-border/40 rounded-lg p-2'>
        <div className='mb-3 flex items-center justify-between px-1'>
          <span className='text-[10px] font-bold uppercase tracking-wider text-gray-500'>
            Nodes
          </span>
          <Badge variant='neutral' className='bg-muted/30 text-[10px]'>
            {activeNodeOptions.length}
          </Badge>
        </div>
        <div className='flex-1 overflow-y-auto space-y-1.5 pr-1'>
          {activeNodeOptions.map((option) => {
            const isSelected = selectedNodeId === option.value;
            return (
              <Button
                key={option.value}
                variant='outline'
                onClick={() => selectNode(option.value)}
                className={cn(
                  'w-full flex-col items-start gap-1 h-auto p-2.5 text-left transition-all',
                  isSelected
                    ? 'border-blue-500/50 bg-blue-500/10 hover:bg-blue-500/15'
                    : 'border-border/40 bg-card/20 hover:border-border/80 hover:bg-card/40'
                )}
              >
                <div className='truncate text-xs font-medium text-gray-200 w-full'>
                  {option.label}
                </div>
                {option.description && (
                  <div className='truncate text-[10px] text-gray-500 w-full'>
                    {option.description}
                  </div>
                )}
              </Button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
