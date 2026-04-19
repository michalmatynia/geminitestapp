'use client';

import Link from 'next/link';
import React from 'react';

import { FormSection, Hint, SearchInput } from '@/shared/ui/forms-and-actions.public';
import { EmptyState, ListPanel, UI_STACK_RELAXED_CLASSNAME } from '@/shared/ui/navigation-and-layout.public';
import { Badge, Card } from '@/shared/ui/primitives.public';
import { cn } from '@/shared/utils/ui-utils';

import type { RouteMapEntry, RouteMapGroup } from './admin-route-map-data';

type AdminRouteMapContentProps = {
  entries: RouteMapEntry[];
  filtered: RouteMapEntry[];
  grouped: RouteMapGroup[];
  onQueryChange: (value: string) => void;
  query: string;
};

const getRouteHref = (entry: RouteMapEntry): string => entry.href ?? '#';

const getRouteParentLabel = (entry: RouteMapEntry): string => {
  const parentLabel = entry.parents[entry.parents.length - 1];
  return parentLabel ?? 'Root';
};

function RouteMapFilters({
  entries,
  filtered,
  onQueryChange,
  query,
}: Pick<AdminRouteMapContentProps, 'entries' | 'filtered' | 'onQueryChange' | 'query'>): React.JSX.Element {
  return (
    <div className={cn(UI_STACK_RELAXED_CLASSNAME, 'md:flex-row md:items-center md:justify-between')}>
      <div className='flex flex-col gap-1'>
        <div className='text-sm text-gray-200'>Routes indexed</div>
        <Hint variant='muted' size='xs'>
          Showing {filtered.length} of {entries.length} routes
        </Hint>
      </div>
      <div className='w-full max-w-sm'>
        <SearchInput
          value={query}
          onChange={(event: React.ChangeEvent<HTMLInputElement>) => onQueryChange(event.target.value)}
          onClear={() => onQueryChange('')}
          placeholder='Search routes, labels, keywords...'
          size='sm'
        />
      </div>
    </div>
  );
}

function RouteMapCard({ entry }: { entry: RouteMapEntry }): React.JSX.Element {
  return (
    <Card className='border-border bg-card/60 p-4 transition-colors hover:bg-card/80'>
      <div className='flex items-start justify-between gap-3'>
        <div className='min-w-0'>
          <Link
            href={getRouteHref(entry)}
            className='text-sm font-semibold text-white transition-colors hover:text-primary'
          >
            {entry.label}
          </Link>
          <div className='mt-1 truncate font-mono text-[11px] text-cyan-200/70'>{entry.href}</div>
        </div>
        <Badge variant='secondary' className='shrink-0 text-[10px]'>
          {getRouteParentLabel(entry)}
        </Badge>
      </div>
      <p className='mt-2 text-xs leading-relaxed text-gray-300'>{entry.description}</p>
      <Hint uppercase size='xs' variant='muted' className='mt-2 font-semibold'>
        {entry.breadcrumb}
      </Hint>
    </Card>
  );
}

function RouteMapSection({
  section,
  sectionEntries,
}: {
  section: string;
  sectionEntries: RouteMapEntry[];
}): React.JSX.Element {
  return (
    <FormSection
      title={section}
      actions={
        <Badge variant='outline' className='text-[10px]'>
          {sectionEntries.length}
        </Badge>
      }
      variant='subtle'
    >
      <div className='grid gap-3 md:grid-cols-2'>
        {sectionEntries.map((entry: RouteMapEntry) => (
          <RouteMapCard key={entry.id} entry={entry} />
        ))}
      </div>
    </FormSection>
  );
}

export function AdminRouteMapContent({
  entries,
  filtered,
  grouped,
  onQueryChange,
  query,
}: AdminRouteMapContentProps): React.JSX.Element {
  return (
    <ListPanel filters={<RouteMapFilters entries={entries} filtered={filtered} onQueryChange={onQueryChange} query={query} />}>
      {grouped.length === 0 ? (
        <EmptyState
          title='No routes found'
          description='No routes match your search criteria. Try different keywords or labels.'
        />
      ) : (
        <div className='space-y-8'>
          {grouped.map(([section, sectionEntries]: RouteMapGroup) => (
            <RouteMapSection key={section} section={section} sectionEntries={sectionEntries} />
          ))}
        </div>
      )}
    </ListPanel>
  );
}
