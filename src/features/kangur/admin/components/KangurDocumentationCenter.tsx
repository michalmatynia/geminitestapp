'use client';

import { useId, useMemo, useState } from 'react';

import {
  KANGUR_DOC_CATALOG,
  KANGUR_DOCUMENTATION_LIBRARY,
} from '@/shared/lib/documentation/catalogs/kangur';
import { Badge, Card, CompactEmptyState, ListPanel, PanelStats, SearchInput } from '@/features/kangur/shared/ui';
import { cn } from '@/features/kangur/shared/utils';

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

  const stats = useMemo(
    () => [
      { key: 'guides', label: 'Guides', value: String(visibleGuides.length) },
      { key: 'docs', label: 'Tooltip Docs', value: String(visibleTooltipDocCount) },
      { key: 'sections', label: 'Sections', value: String(groupedTooltipDocs.length) },
    ],
    [groupedTooltipDocs.length, visibleGuides.length, visibleTooltipDocCount]
  );

  const resultSummary = normalizedQuery
    ? `Showing ${visibleGuides.length} guides and ${visibleTooltipDocCount} tooltip documents across ${groupedTooltipDocs.length} sections for "${query.trim()}".`
    : `Showing ${visibleGuides.length} guides and ${visibleTooltipDocCount} tooltip documents across ${groupedTooltipDocs.length} sections in the Kangur documentation center.`;

  return (
    <div className='space-y-6' data-doc-id='settings_documentation_library'>
      <div id={resultsStatusId} role='status' aria-live='polite' aria-atomic='true' className='sr-only'>
        {resultSummary}
      </div>

      <Card
        variant='subtle'
        padding='lg'
        className='rounded-2xl border-border/60 bg-card/40 shadow-sm'
        aria-labelledby={indexHeadingId}
        aria-describedby={indexDescriptionId}
      >
        <div className='space-y-4'>
          <div>
            <h2 id={indexHeadingId} className='text-sm font-semibold text-foreground'>
              Kangur Documentation Index
            </h2>
            <p id={indexDescriptionId} className='mt-1 text-sm text-muted-foreground'>
              Search the central Kangur guides and the tooltip catalog that feeds the learner and
              admin UI.
            </p>
          </div>
          <div role='search' aria-label='Search Kangur documentation'>
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
              variant='subtle'
              aria-describedby={resultsStatusId}
              data-doc-id='settings_documentation_library'
            />
          </div>
          <PanelStats stats={stats} className='grid-cols-1 sm:grid-cols-3 lg:grid-cols-3' />
        </div>
      </Card>

      <div className='grid gap-4 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]'>
        <ListPanel
          header={
            <div>
              <h2 className='text-xl font-semibold text-foreground'>Guide Library</h2>
              <p className='mt-1 text-sm text-muted-foreground'>
                Canonical Kangur guides that back the tooltip catalog and admin reference copy.
              </p>
            </div>
          }
          className='rounded-2xl border-border/60 bg-card/40 shadow-sm'
          contentClassName='space-y-4'
        >
          {visibleGuides.length > 0 ? (
            <div className='grid gap-3 md:grid-cols-2'>
              {visibleGuides.map((guide) => (
                <Card
                  key={guide.id}
                  variant='subtle'
                  padding='md'
                  className='rounded-2xl border-border/60 bg-card/55 shadow-sm'
                >
                  <div className='flex items-start justify-between gap-3'>
                    <div>
                      <h3 className='text-sm font-semibold text-foreground'>{guide.title}</h3>
                      <p className='mt-1 text-sm text-muted-foreground'>{guide.summary}</p>
                    </div>
                    <Badge variant='secondary'>{formatAudience(guide.audience)}</Badge>
                  </div>
                  <div className='mt-3 flex flex-wrap gap-2'>
                    <Badge variant='outline'>{guide.docPath}</Badge>
                    {guide.sectionsCovered.map((section) => (
                      <Badge key={section} variant='outline'>
                        {section}
                      </Badge>
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <CompactEmptyState
              title='No Kangur guide matched the current search.'
              description='Try a broader phrase, a guide title, or a documentation path.'
              className='rounded-2xl border-border/60 bg-background/30'
             />
          )}
        </ListPanel>

        <ListPanel
          header={
            <div>
              <h2 className='text-xl font-semibold text-foreground'>Tooltip Catalog</h2>
              <p className='mt-1 text-sm text-muted-foreground'>
                Grouped documentation entries that map directly to Kangur UI surfaces.
              </p>
            </div>
          }
          className='rounded-2xl border-border/60 bg-card/40 shadow-sm'
          contentClassName='space-y-4'
        >
          {groupedTooltipDocs.length > 0 ? (
            <div className='space-y-4'>
              {groupedTooltipDocs.map((group, groupIndex) => (
                <Card
                  key={group.section}
                  variant='subtle'
                  padding='md'
                  className='rounded-2xl border-border/60 bg-card/55 shadow-sm'
                  aria-labelledby={`kangur-doc-tooltip-section-${groupIndex}-title`}
                >
                  <div className='flex items-center justify-between gap-3'>
                    <h3
                      id={`kangur-doc-tooltip-section-${groupIndex}-title`}
                      className='text-sm font-semibold text-foreground'
                    >
                      {group.section}
                    </h3>
                    <Badge variant='outline'>{group.entries.length} docs</Badge>
                  </div>
                  <div className='mt-3 space-y-3'>
                    {group.entries.map((entry) => (
                      <Card
                        key={entry.id}
                        variant='subtle'
                        padding='sm'
                        className={cn(
                          'rounded-xl border-border/60 bg-background/55 shadow-none',
                          'transition-colors hover:bg-background/70'
                        )}
                      >
                        <div className='flex flex-wrap items-start justify-between gap-3'>
                          <div>
                            <h4 className='text-sm font-semibold text-foreground'>{entry.title}</h4>
                            <p className='mt-1 text-sm text-muted-foreground'>{entry.summary}</p>
                          </div>
                          <Badge variant='outline'>{entry.id}</Badge>
                        </div>
                        <div className='mt-3 flex flex-wrap gap-2'>
                          <Badge variant='outline'>{entry.docPath}</Badge>
                          {entry.uiTargets?.slice(0, 3).map((target) => (
                            <Badge key={target} variant='outline'>
                              {target}
                            </Badge>
                          ))}
                        </div>
                      </Card>
                    ))}
                  </div>
                </Card>
              ))}
            </div>
          ) : (
            <CompactEmptyState
              title='No Kangur tooltip documentation matched the current search.'
              description='Try a guide name, tooltip id, or UI target to widen the result set.'
              className='rounded-2xl border-border/60 bg-background/30'
             />
          )}
        </ListPanel>
      </div>
    </div>
  );
}
