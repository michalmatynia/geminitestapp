'use client';

import React from 'react';
import { Pin, X } from 'lucide-react';

import type { CaseResolverFile } from '@/shared/contracts/case-resolver';
import { Button } from '@/shared/ui';

type CaseListHeldDockProps = {
  heldCaseFile: CaseResolverFile | null;
  isHierarchyLocked: boolean;
  onOpenCase: (caseId: string) => void;
  onClearHeldCase: () => void;
};

export function CaseListHeldDock({
  heldCaseFile,
  isHierarchyLocked,
  onOpenCase,
  onClearHeldCase,
}: CaseListHeldDockProps): React.JSX.Element | null {
  if (!heldCaseFile) return null;

  return (
    <div className='sticky top-[3.65rem] z-20 mb-3 rounded-md border border-cyan-500/40 bg-cyan-500/10 px-3 py-2 backdrop-blur-sm'>
      <div className='flex items-center justify-between gap-2'>
        <div className='min-w-0'>
          <div className='flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-cyan-200'>
            <Pin className='size-3.5' />
            Held Case
          </div>
          <div className='truncate text-sm font-medium text-gray-100'>
            {heldCaseFile.name}
          </div>
          <div className='truncate text-[10px] text-cyan-100/80'>
            {isHierarchyLocked
              ? 'Unlock hierarchy to nest this case under a new parent.'
              : 'Use "Nest held here" on any target case row.'}
          </div>
        </div>
        <div className='flex items-center gap-1'>
          <Button
            variant='outline'
            size='xs'
            className='h-7'
            onClick={(): void => {
              onOpenCase(heldCaseFile.id);
            }}
          >
            Open
          </Button>
          <Button
            variant='outline'
            size='xs'
            className='h-7 w-7'
            onClick={(): void => {
              onClearHeldCase();
            }}
            aria-label='Clear held case'
            title='Clear held case'
          >
            <X className='size-3.5' />
          </Button>
        </div>
      </div>
    </div>
  );
}
