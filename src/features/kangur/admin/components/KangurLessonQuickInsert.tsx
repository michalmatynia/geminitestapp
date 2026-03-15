'use client';

import {
  Search,
} from 'lucide-react';
import React, { useMemo, useState } from 'react';

import { useQuickInsertActions } from '../hooks/useQuickInsertActions';
import type { KangurLessonPage, KangurLessonRootBlock } from '@/shared/contracts/kangur';
import { Input } from '@/shared/ui';

interface KangurLessonQuickInsertProps {
  activePage: KangurLessonPage | null;
  updateDocument: (nextBlocks: KangurLessonRootBlock[]) => void;
}

export function KangurLessonQuickInsert({
  activePage,
  updateDocument,
}: KangurLessonQuickInsertProps): React.JSX.Element {
  const [insertQuery, setInsertQuery] = useState('');
  const quickInsertActions = useQuickInsertActions(activePage, updateDocument);

  const filteredQuickInsertActions = useMemo(() => {
    const normalizedQuery = insertQuery.trim().toLowerCase();
    if (!normalizedQuery) {
      return quickInsertActions;
    }
    return quickInsertActions.filter((action) =>
      [action.label, action.description, action.group, ...action.keywords]
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery)
    );
  }, [insertQuery, quickInsertActions]);

  const groupedQuickInsertActions = useMemo(() => {
    const groups = new Map<string, typeof filteredQuickInsertActions>();
    for (const action of filteredQuickInsertActions) {
      const existing = groups.get(action.group) ?? [];
      existing.push(action);
      groups.set(action.group, existing);
    }
    return Array.from(groups.entries());
  }, [filteredQuickInsertActions]);

  return (
    <div className='mt-4 rounded-2xl border border-border/60 bg-card/30 p-4'>
      <div className='mb-3 flex flex-wrap items-start justify-between gap-3'>
        <div>
          <div className='text-sm font-semibold text-foreground'>Quick insert</div>
          <div className='text-xs text-muted-foreground'>
            Add the next teaching block by intent instead of scanning one long toolbar.
          </div>
        </div>
        <div className='relative min-w-[240px] max-w-sm flex-1'>
          <Search className='pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground' />
          <Input
            value={insertQuery}
            onChange={(event): void => setInsertQuery(event.target.value)}
            placeholder='Search insert actions...'
            className='h-9 pl-9'
            aria-label='Search insert actions...'
            title='Search insert actions...'
          />
        </div>
      </div>
      <div className='space-y-4'>
        {groupedQuickInsertActions.length === 0 ? (
          <div className='rounded-2xl border border-dashed border-border/70 bg-card/20 p-4 text-sm text-muted-foreground'>
            No insert actions match that search yet.
          </div>
        ) : (
          groupedQuickInsertActions.map(([group, actions]) => (
            <div key={group} className='space-y-2'>
              <div className='text-[11px] font-semibold uppercase tracking-[0.18em] text-muted-foreground'>
                {group}
              </div>
              <div className='grid gap-2 lg:grid-cols-2'>
                {actions.map((action) => (
                  <button
                    key={action.id}
                    type='button'
                    onClick={action.onClick}
                    disabled={!activePage}
                    aria-label={action.label}
                    className='flex cursor-pointer items-start gap-3 rounded-2xl border border-border/60 bg-background/60 px-3 py-3 text-left transition hover:border-primary/25 hover:bg-primary/5 disabled:pointer-events-none disabled:opacity-50'
                  >
                    <div className='rounded-xl border border-primary/20 bg-primary/10 p-2 text-primary'>
                      <action.Icon className='size-4' />
                    </div>
                    <div className='min-w-0'>
                      <div className='text-sm font-semibold text-foreground'>{action.label}</div>
                      <div className='mt-1 text-xs leading-relaxed text-muted-foreground'>
                        {action.description}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
