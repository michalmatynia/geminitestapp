'use client';

import { useId, useMemo, useState } from 'react';

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
  const searchInputId = useId();
  const indexHeadingId = useId();
  const indexDescriptionId = useId();
  const guideLibraryHeadingId = useId();
  const guideLibraryDescriptionId = useId();
  const tooltipCatalogHeadingId = useId();
  const tooltipCatalogDescriptionId = useId();
  const resultsStatusId = useId();

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

  const visibleTooltipDocCount = useMemo(
    () => groupedTooltipDocs.reduce((count, group) => count + group.entries.length, 0),
    [groupedTooltipDocs]
  );
  const resultSummary = normalizedQuery
    ? `Showing ${visibleGuides.length} guides and ${visibleTooltipDocCount} tooltip documents across ${groupedTooltipDocs.length} sections for "${query.trim()}".`
    : `Showing ${visibleGuides.length} guides and ${visibleTooltipDocCount} tooltip documents across ${groupedTooltipDocs.length} sections in the Kangur documentation center.`;

  return (
    <div className='space-y-6' data-doc-id='settings_documentation_library'>
      <div id={resultsStatusId} role='status' aria-live='polite' aria-atomic='true' className='sr-only'>
        {resultSummary}
      </div>
      <div className='grid gap-4 lg:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]'>
        <section
          className='rounded-2xl border border-border/60 bg-card/55 p-5 shadow-sm'
          aria-labelledby={indexHeadingId}
          aria-describedby={indexDescriptionId}
        >
          <h2 id={indexHeadingId} className='text-sm font-semibold text-foreground'>
            Kangur Documentation Index
          </h2>
          <p id={indexDescriptionId} className='mt-1 text-sm text-muted-foreground'>
            Search the central Kangur guides and the tooltip catalog that feeds the learner and
            admin UI.
          </p>
          <div className='mt-4' role='search' aria-label='Search Kangur documentation'>
            <label htmlFor={searchInputId} className='sr-only'>
              Search Kangur documentation
            </label>
            <SearchInput
              id={searchInputId}
              type='search'
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              onClear={() => setQuery('')}
              placeholder='Search Kangur docs, sections, or tooltip ids'
              size='sm'
              variant='default'
              aria-describedby={resultsStatusId}
              data-doc-id='settings_documentation_library'
            />
          </div>
          <div className='mt-4 grid gap-3 sm:grid-cols-3'>
            <div className='rounded-xl border border-border/60 bg-background/70 px-3 py-3'>
              <div className='text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground'>
                Guides
              </div>
              <div className='mt-1 text-2xl font-bold text-foreground'>{visibleGuides.length}</div>
            </div>
            <div className='rounded-xl border border-border/60 bg-background/70 px-3 py-3'>
              <div className='text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground'>
                Tooltip Docs
              </div>
              <div className='mt-1 text-2xl font-bold text-foreground'>{visibleTooltipDocCount}</div>
            </div>
            <div className='rounded-xl border border-border/60 bg-background/70 px-3 py-3'>
              <div className='text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground'>
                Sections
              </div>
              <div className='mt-1 text-2xl font-bold text-foreground'>
                {groupedTooltipDocs.length}
              </div>
            </div>
          </div>
        </section>

        <section aria-labelledby={guideLibraryHeadingId} aria-describedby={guideLibraryDescriptionId}>
          <h2 id={guideLibraryHeadingId} className='sr-only'>
            Guide library results
          </h2>
          <p id={guideLibraryDescriptionId} className='sr-only'>
            Guide cards from the Kangur documentation library that match the current search.
          </p>
          <ul className='grid gap-3 md:grid-cols-2'>
            {visibleGuides.map((guide) => (
              <li key={guide.id}>
                <article
                  aria-labelledby={`kangur-doc-guide-${guide.id}-title`}
                  className='rounded-2xl border border-border/60 bg-card/50 p-4 shadow-sm'
                >
                  <div className='flex items-start justify-between gap-3'>
                    <div>
                      <h3
                        id={`kangur-doc-guide-${guide.id}-title`}
                        className='text-sm font-semibold text-foreground'
                      >
                        {guide.title}
                      </h3>
                      <p className='mt-1 text-sm text-muted-foreground'>{guide.summary}</p>
                    </div>
                    <span className='rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-indigo-700'>
                      {formatAudience(guide.audience)}
                    </span>
                  </div>
                  <div className='mt-3 rounded-xl border border-border/60 bg-background/60 px-3 py-2 text-xs text-muted-foreground'>
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
                </article>
              </li>
            ))}
          </ul>
          {visibleGuides.length === 0 ? (
            <div className='rounded-2xl border border-dashed border-border/60 bg-background/50 p-4 text-sm text-muted-foreground md:col-span-2'>
              No Kangur guide matched the current search.
            </div>
          ) : null}
        </section>
      </div>

      <section aria-labelledby={tooltipCatalogHeadingId} aria-describedby={tooltipCatalogDescriptionId}>
        <h2 id={tooltipCatalogHeadingId} className='sr-only'>
          Tooltip catalog results
        </h2>
        <p id={tooltipCatalogDescriptionId} className='sr-only'>
          Grouped tooltip documentation entries that match the current search.
        </p>
        <div className='grid gap-4 xl:grid-cols-2'>
          {groupedTooltipDocs.map((group, groupIndex) => (
            <section
              key={group.section}
              aria-labelledby={`kangur-doc-tooltip-section-${groupIndex}-title`}
              className='rounded-2xl border border-border/60 bg-card/50 p-4 shadow-sm'
            >
              <div className='flex items-center justify-between gap-3'>
                <h3
                  id={`kangur-doc-tooltip-section-${groupIndex}-title`}
                  className='text-sm font-semibold text-foreground'
                >
                  {group.section}
                </h3>
                <span className='rounded-full bg-emerald-50 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-700'>
                  {group.entries.length} docs
                </span>
              </div>
              <ul className='mt-3 space-y-3'>
                {group.entries.map((entry) => (
                  <li key={entry.id}>
                    <article
                      aria-labelledby={`kangur-doc-tooltip-${entry.id}-title`}
                      className={cn(
                        'rounded-xl border border-border/60 bg-background/55 px-3 py-3',
                        'transition-colors hover:bg-background/70'
                      )}
                    >
                      <div className='flex flex-wrap items-start justify-between gap-3'>
                        <div>
                          <h4
                            id={`kangur-doc-tooltip-${entry.id}-title`}
                            className='text-sm font-semibold text-foreground'
                          >
                            {entry.title}
                          </h4>
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
                    </article>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
        {groupedTooltipDocs.length === 0 ? (
          <div className='rounded-2xl border border-dashed border-border/60 bg-background/50 p-4 text-sm text-muted-foreground xl:col-span-2'>
            No Kangur tooltip documentation matched the current search.
          </div>
        ) : null}
      </section>
    </div>
  );
}
