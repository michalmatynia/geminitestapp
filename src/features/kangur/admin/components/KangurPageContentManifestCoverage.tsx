import React, { useMemo } from 'react';

import { KANGUR_AI_TUTOR_PAGE_COVERAGE_READY_FOR_MONGO } from '@/features/kangur/ai-tutor-page-coverage-manifest';
import type { KangurPageContentStore } from '@/shared/contracts/kangur-page-content';
import { Alert, Badge } from '@/shared/ui';

interface KangurPageContentManifestCoverageProps {
  store: KangurPageContentStore;
}

type ManifestCoverageRow = {
  id: string;
  pageKey: string;
  title: string;
  missingEntry: boolean;
  disabled: boolean;
  missingGuideLinks: string[];
};

export function KangurPageContentManifestCoverage({
  store,
}: KangurPageContentManifestCoverageProps): React.JSX.Element {
  const manifestCoverage = useMemo(() => {
    const entriesById = new Map(store.entries.map((entry) => [entry.id, entry]));
    const rows: ManifestCoverageRow[] = KANGUR_AI_TUTOR_PAGE_COVERAGE_READY_FOR_MONGO.map(
      (section) => {
        const entry = entriesById.get(section.id);
        const missingGuideLinks = entry
          ? section.currentKnowledgeEntryIds.filter((guideId) => !entry.nativeGuideIds.includes(guideId))
          : [...section.currentKnowledgeEntryIds];

        return {
          id: section.id,
          pageKey: section.pageKey,
          title: section.title,
          missingEntry: !entry,
          disabled: entry?.enabled === false,
          missingGuideLinks,
        };
      }
    );
    const attentionRows = rows.filter(
      (row) => row.missingEntry || row.disabled || row.missingGuideLinks.length > 0
    );

    return {
      totalSections: rows.length,
      coveredSections: rows.length - attentionRows.length,
      attentionRows,
    };
  }, [store]);

  return (
    <div className='mt-4 rounded-2xl border border-border/60 bg-background/60 px-4 py-4 shadow-sm'>
      <div className='flex flex-wrap items-center gap-2'>
        <div className='text-sm font-semibold text-foreground'>Manifest coverage</div>
        <Badge
          variant={
            manifestCoverage.attentionRows.length > 0 ? 'warning' : 'secondary'
          }
        >
          {manifestCoverage.coveredSections} / {manifestCoverage.totalSections} tracked
          sections covered
        </Badge>
        <Badge variant='outline'>
          {manifestCoverage.attentionRows.length > 0
            ? `${manifestCoverage.attentionRows.length} need attention`
            : 'No manifest gaps'}
        </Badge>
      </div>
      {manifestCoverage.attentionRows.length > 0 ? (
        <div className='mt-3 space-y-2'>
          {manifestCoverage.attentionRows.map((row) => (
            <Alert
              key={row.id}
              variant={row.missingEntry || row.disabled ? 'warning' : 'default'}
              title={`${row.pageKey}: ${row.title}`}
              className='text-xs'
            >
              {row.missingEntry ? 'Missing page-content entry.' : null}
              {!row.missingEntry && row.disabled ? 'Entry is disabled.' : null}
              {row.missingGuideLinks.length > 0 ? (
                <div>
                  Missing native guide links: {row.missingGuideLinks.join(', ')}
                </div>
              ) : null}
            </Alert>
          ))}
        </div>
      ) : (
        <p className='mt-2 text-sm text-muted-foreground'>
          Every tracked Kangur section is backed by an enabled Mongo page-content entry with
          the expected native-guide links.
        </p>
      )}
    </div>
  );
}
