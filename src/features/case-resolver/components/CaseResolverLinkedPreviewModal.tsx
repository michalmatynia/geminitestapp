import React from 'react';

import { AppModal, EmptyState } from '@/shared/ui';

import type { CaseResolverCompileResult } from '../composer';

type CaseResolverLinkedPreviewModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  compiled: CaseResolverCompileResult;
};

export function CaseResolverLinkedPreviewModal({
  open,
  onOpenChange,
  compiled,
}: CaseResolverLinkedPreviewModalProps): React.JSX.Element {
  return (
    <AppModal
      open={open}
      onOpenChange={onOpenChange}
      title='Linked Nodes Preview'
      subtitle='Compilation starts from the selected node. If no node is selected, it starts from graph roots.'
      size='xl'
    >
      <div className='flex h-full min-h-0 flex-col'>
        <div className='mb-3 max-h-56 overflow-auto rounded border border-border/60 bg-card/30 p-2 text-xs text-gray-300'>
          {compiled.segments.length > 0 ? (
            compiled.segments.map((segment) => (
              <div key={segment.nodeId} className='mb-2 rounded border border-border/40 bg-card/30 p-2 last:mb-0'>
                <div className='flex items-center justify-between gap-2 text-[11px]'>
                  <span className='font-medium text-gray-100'>{segment.title}</span>
                  <span className='uppercase text-[10px] text-gray-400'>{segment.role}</span>
                </div>
                <div className='mt-1 line-clamp-3 text-[11px] text-gray-400'>
                  {segment.text || '(empty)'}
                </div>
              </div>
            ))
          ) : (
            <EmptyState
              title='No linked segments yet'
              description='Compilation starts from the selected node. If no node is selected, it starts from graph roots.'
              variant='compact'
              className='py-6'
            />
          )}
        </div>

        <div className='min-h-0 flex-1 overflow-auto rounded border border-border/60 bg-black/20 p-3 font-mono text-[12px] text-gray-100 whitespace-pre-wrap'>
          {compiled.prompt || 'Compiled prompt output will appear here.'}
        </div>
      </div>
    </AppModal>
  );
}
