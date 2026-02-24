'use client';

import { Plus } from 'lucide-react';
import { memo, type ReactNode } from 'react';

import { Breadcrumbs, Button } from '@/shared/ui';

type CaseListHeaderProps = {
  filtersContent: ReactNode;
  onCreateCase: () => void;
  totalCount: number;
  filteredCount: number;
};

export const CaseListHeader = memo(function CaseListHeader({
  filtersContent,
  onCreateCase,
  totalCount,
  filteredCount,
}: CaseListHeaderProps): React.JSX.Element {
  return (
    <div className='space-y-4'>
      <div className='space-y-3 lg:hidden'>
        <div>
          <h1 className='text-3xl font-bold tracking-tight text-white'>Cases</h1>
          <Breadcrumbs
            items={[
              { label: 'Admin', href: '/admin' },
              { label: 'Case Resolver', href: '/admin/case-resolver' },
              { label: 'Cases' },
            ]}
            className='mt-1'
          />
          <div className='mt-3 flex flex-wrap items-center gap-2'>
            <Button onClick={onCreateCase} size='sm'>
              <Plus className='mr-2 size-4' />
              New Case
            </Button>
            <span className='text-xs text-muted-foreground'>
              {filteredCount} matches / {totalCount} total
            </span>
          </div>
        </div>
        {filtersContent}
      </div>

      <div className='hidden grid-cols-[minmax(0,1fr)_minmax(0,1.5fr)] items-start gap-4 lg:grid'>
        <div>
          <h1 className='text-3xl font-bold tracking-tight text-white'>Cases</h1>
          <Breadcrumbs
            items={[
              { label: 'Admin', href: '/admin' },
              { label: 'Case Resolver', href: '/admin/case-resolver' },
              { label: 'Cases' },
            ]}
            className='mt-1'
          />
          <div className='mt-3 flex flex-wrap items-center gap-2'>
            <Button onClick={onCreateCase} size='sm'>
              <Plus className='mr-2 size-4' />
              New Case
            </Button>
            <span className='text-xs text-muted-foreground'>
              {filteredCount} matches / {totalCount} total
            </span>
          </div>
        </div>
        <div>{filtersContent}</div>
      </div>
    </div>
  );
});
