'use client';

import { useMemo, useState } from 'react';

import {
  KANGUR_DOC_CATALOG,
  KANGUR_DOCUMENTATION_LIBRARY,
} from '@/shared/lib/documentation/catalogs/kangur';
import { SearchInput } from '@/shared/ui';
import { cn } from '@/shared/utils';

type GroupedTooltipDocs = {
  section: string;
  entries: typeof KANGUR_DOC_CATALOG;
};

const formatAudience = (
  value: (typeof KANGUR_DOCUMENTATION_LIBRARY)[number]['audience']
): string => {
  switch (value) {
    case 'learner':
      return 'Learner';
    case 'parent':
      return 'Parent';
    case 'admin':
      return 'Admin';
    case 'shared':
    default:
      return 'Shared';
  }
};

const matchesQuery = (parts: Array<string | undefined>, query: string): boolean => {
  if (!query) return true;
  const normalized = query.toLowerCase();
  return parts.some((part) => (part ?? '').toLowerCase().includes(normalized));
};

export function KangurDocumentationCenter(): React.JSX.Element {
  const [query, setQuery] = useState('');
  const normalizedQuery = query.trim().toLowerCase();

  const visibleGuides = useMemo(
    () =>
      KANGUR_DOCUMENTATION_LIBRARY.filter((guide) =>
        matchesQuery(
          [
            guide.title,
            guide.summary,
            guide.docPath,
            guide.audience,
            guide.sectionsCovered.join(' '),
          ],
          normalizedQuery
        )
      ),
    [normalizedQuery]
  );

  const groupedTooltipDocs = useMemo<GroupedTooltipDocs[]>(() => {
    const visibleEntries = KANGUR_DOC_CATALOG.filter((entry) =>
      matchesQuery(
        [
          entry.title,
          entry.summary,
          entry.section,
          entry.docPath,
          entry.aliases.join(' '),
          entry.tags?.join(' ') ?? '',
          entry.uiTargets?.join(' ') ?? '',
        ],
        normalizedQuery
      )
    );

    const grouped = new Map<string, typeof KANGUR_DOC_CATALOG>();

    for (const entry of visibleEntries) {
      const existing = grouped.get(entry.section) ?? [];
      existing.push(entry);
      grouped.set(entry.section, existing);
    }

    return Array.from(grouped.entries())
      .map(([section, entries]) => ({
        section,
        entries: [...entries].sort((left, right) => left.title.localeCompare(right.title)),
      }))
      .sort((left, right) => left.section.localeCompare(right.section));
  }, [normalizedQuery]);

  return (
    <div className='space-y-5' data-doc-id='settings_documentation_library'>
      <div className='grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]'>
        <div className='rounded-2xl border border-border/70 bg-muted/20 p-4'>
          <div className='text-sm font-semibold text-foreground'>Kangur Documentation Index</div>
          <p className='mt-1 text-sm text-muted-foreground'>
            Search the central Kangur guides and the tooltip catalog that feeds the learner and
            admin UI.
          </p>
          <div className='mt-4'>
            <SearchInput
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onClear={() => setQuery('')}
              placeholder='Search Kangur docs, sections, or tooltip ids'
              size='sm'
              variant='default'
              data-doc-id='settings_documentation_library'
            />
          </div>
          <div className='mt-4 grid gap-3 sm:grid-cols-3'>
            <div className='rounded-xl border border-border/60 bg-background/80 px-3 py-3'>
              <div className='text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground'>
                Guides
              </div>
              <div className='mt-1 text-2xl font-bold text-foreground'>{visibleGuides.length}</div>
            </div>
            <div className='rounded-xl border border-border/60 bg-background/80 px-3 py-3'>
              <div className='text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground'>
                Tooltip Docs
              </div>
              <div className='mt-1 text-2xl font-bold text-foreground'>
                {KANGUR_DOC_CATALOG.length}
              </div>
            </div>
            <div className='rounded-xl border border-border/60 bg-background/80 px-3 py-3'>
              <div className='text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground'>
                Sections
              </div>
              <div className='mt-1 text-2xl font-bold text-foreground'>
                {groupedTooltipDocs.length}
              </div>
            </div>
          </div>
        </div>

        <div className='grid gap-3 md:grid-cols-2'>
          {visibleGuides.map((guide) => (
            <div
              key={guide.id}
              className='rounded-2xl border border-border/70 bg-background/90 p-4 shadow-sm'
            >
              <div className='flex items-start justify-between gap-3'>
                <div>
                  <div className='text-sm font-semibold text-foreground'>{guide.title}</div>
                  <p className='mt-1 text-sm text-muted-foreground'>{guide.summary}</p>
                </div>
                <span className='rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-indigo-700'>
                  {formatAudience(guide.audience)}
                </span>
              </div>
              <div className='mt-3 rounded-xl border border-border/60 bg-muted/20 px-3 py-2 text-xs text-muted-foreground'>
                Source: <span className='font-mono text-foreground'>{guide.docPath}</span>
              </div>
              <div className='mt-3 flex flex-wrap gap-2'>
                {guide.sectionsCovered.map((section) => (
                  <span
                    key={section}
                    className='rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-700'
                  >
                    {section}
                  </span>
                ))}
              </div>
            </div>
          ))}
          {visibleGuides.length === 0 ? (
            <div className='rounded-2xl border border-dashed border-border/70 bg-background/60 p-4 text-sm text-muted-foreground md:col-span-2'>
              No Kangur guide matched the current search.
            </div>
          ) : null}
        </div>
      </div>

      <div className='grid gap-4 xl:grid-cols-2'>
        {groupedTooltipDocs.map((group) => (
          <div
            key={group.section}
            className='rounded-2xl border border-border/70 bg-background/90 p-4 shadow-sm'
          >
            <div className='flex items-center justify-between gap-3'>
              <div className='text-sm font-semibold text-foreground'>{group.section}</div>
              <span className='rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-700'>
                {group.entries.length} docs
              </span>
            </div>
            <div className='mt-3 space-y-3'>
              {group.entries.map((entry) => (
                <div
                  key={entry.id}
                  className={cn(
                    'rounded-xl border border-border/60 bg-muted/20 px-3 py-3',
                    'transition-colors hover:bg-muted/30'
                  )}
                >
                  <div className='flex flex-wrap items-start justify-between gap-3'>
                    <div>
                      <div className='text-sm font-semibold text-foreground'>{entry.title}</div>
                      <p className='mt-1 text-sm text-muted-foreground'>{entry.summary}</p>
                    </div>
                    <span className='rounded-full bg-white/90 px-2.5 py-1 font-mono text-[11px] text-slate-700 shadow-sm'>
                      {entry.id}
                    </span>
                  </div>
                  <div className='mt-3 text-xs text-muted-foreground'>
                    Source: <span className='font-mono text-foreground'>{entry.docPath}</span>
                  </div>
                  {entry.uiTargets?.length ? (
                    <div className='mt-3 flex flex-wrap gap-2'>
                      {entry.uiTargets.slice(0, 3).map((target) => (
                        <span
                          key={target}
                          className='rounded-full bg-sky-50 px-2.5 py-1 text-[11px] font-medium text-sky-700'
                        >
                          {target}
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ))}
        {groupedTooltipDocs.length === 0 ? (
          <div className='rounded-2xl border border-dashed border-border/70 bg-background/60 p-4 text-sm text-muted-foreground xl:col-span-2'>
            No Kangur tooltip documentation matched the current search.
          </div>
        ) : null}
      </div>
    </div>
  );
}
