'use client';

import React from 'react';

import { useQuickInsertActions } from '../hooks/useQuickInsertActions';
import type { KangurLessonPage, KangurLessonRootBlock } from '@/features/kangur/shared/contracts/kangur';
import { Button } from '@/features/kangur/shared/ui';

interface KangurLessonEmptyStateProps {
  activePage: KangurLessonPage | null;
  updateDocument: (nextBlocks: KangurLessonRootBlock[]) => void;
}

export function KangurLessonEmptyState({
  activePage,
  updateDocument,
}: KangurLessonEmptyStateProps): React.JSX.Element | null {
  const quickInsertActions = useQuickInsertActions(activePage, updateDocument);
  const hasActivePage = Boolean(activePage);

  if (!activePage || activePage.blocks.length > 0) return null;

  return (
    <div className='rounded-2xl border border-dashed border-border/70 bg-card/20 p-6'>
      <div className='text-sm font-semibold text-foreground'>This page has no content yet.</div>
      <div className='mt-2 text-sm text-muted-foreground'>
        Start with a teaching explanation, a visual example, or a practice task.
      </div>
      <div className='mt-4 flex flex-wrap gap-2'>
        {quickInsertActions
          .filter((action) => ['text', 'svg', 'activity'].includes(action.id))
          .map((action) => (
            <Button
              key={action.id}
              type='button'
              size='sm'
              variant='outline'
              className='h-8 px-3'
              onClick={action.onClick}
              disabled={!hasActivePage}
            >
              <action.Icon className='mr-1 size-3.5' />
              {action.id === 'text'
                ? 'Start with text'
                : action.id === 'svg'
                  ? 'Start with SVG'
                  : 'Start with activity'}
            </Button>
          ))}
      </div>
    </div>
  );
}
