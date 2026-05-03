import React from 'react';

import type {
  CategoryMapperFetchWarning,
  CategoryMapperIssueRow,
  CategoryMapperUIState,
} from '@/features/integrations/context/CategoryMapperContext.helpers';
import { Alert } from '@/shared/ui/primitives.public';
import { GenericMapperStats } from '@/shared/ui/templates.public';

import type { CategoryMapperFetchDiagnostics } from './CategoryMapperTable.fetch-diagnostics';

type CategoryMapperAlertsProps = {
  diagnostics: CategoryMapperFetchDiagnostics;
  isTraderaConnection: boolean;
  lastFetchWarning: CategoryMapperFetchWarning | null;
  nonLeafMappings: CategoryMapperIssueRow[];
  staleMappings: CategoryMapperIssueRow[];
  stats: CategoryMapperUIState['stats'];
};

const getIssueCategoryLabel = (mapping: CategoryMapperIssueRow): string => {
  const path = mapping.externalCategoryPath?.trim() ?? '';
  const name = mapping.externalCategoryName.trim();
  return path.length > 0 && path !== name ? path : name;
};

const getInternalCategorySuffix = (mapping: CategoryMapperIssueRow): string => {
  const label = mapping.internalCategoryLabel?.trim() ?? '';
  return label.length > 0 ? ` -> ${label}` : '';
};

function CategoryMapperFetchWarningAlert({
  diagnostics,
  lastFetchWarning,
}: Pick<CategoryMapperAlertsProps, 'diagnostics' | 'lastFetchWarning'>): React.JSX.Element | null {
  if (lastFetchWarning === null) return null;

  return (
    <Alert variant='warning' className='text-xs'>
      <div className='space-y-2'>
        <div>{lastFetchWarning.message}</div>
        <div>
          Stored categories kept: {diagnostics.preservedCategoryCount}. Current max depth:{' '}
          {diagnostics.preservedMaxDepth}. Rejected fetch max depth:{' '}
          {lastFetchWarning.fetchedMaxDepth ?? 0}.
        </div>
        {diagnostics.hasLoadedExternalCategories ? (
          <div>
            Current loaded tree roots: {diagnostics.derivedCategoryStats.rootCount}. Categories
            with parents: {diagnostics.derivedCategoryStats.withParentCount}.
          </div>
        ) : null}
      </div>
    </Alert>
  );
}

function CategoryMapperFetchSourceAlert({
  diagnostics,
}: Pick<CategoryMapperAlertsProps, 'diagnostics'>): React.JSX.Element | null {
  const { activeFetchSource, activeFetchStats } = diagnostics;
  if (activeFetchSource === null || activeFetchStats === null) return null;

  return (
    <Alert
      variant={diagnostics.usedTraderaPublicFallback ? 'warning' : 'info'}
      className='text-xs'
    >
      <div className='space-y-2'>
        <div>
          Category source: {activeFetchSource}. Loaded {diagnostics.activeCategoryCount} categories.
        </div>
        <div>
          Roots: {activeFetchStats.rootCount}. Categories with parents:{' '}
          {activeFetchStats.withParentCount}. Max depth: {activeFetchStats.maxDepth}.
        </div>
        {diagnostics.shallowTraderaFallbackGuidance !== null ? (
          <div>{diagnostics.shallowTraderaFallbackGuidance}</div>
        ) : null}
      </div>
    </Alert>
  );
}

function CategoryMapperIssueMappingsAlert({
  count,
  mappings,
  moreLabel,
  pluralMessage,
  singularMessage,
}: {
  count: number;
  mappings: CategoryMapperIssueRow[];
  moreLabel: string;
  pluralMessage: (count: number) => string;
  singularMessage: string;
}): React.JSX.Element | null {
  if (count === 0) return null;

  const moreCount = Math.max(0, mappings.length - 3);
  const message = count === 1 ? singularMessage : pluralMessage(count);

  return (
    <Alert variant='warning' className='text-xs'>
      <div className='space-y-2'>
        <div>{message}</div>
        <div className='space-y-1'>
          {mappings.slice(0, 3).map((mapping) => (
            <div key={mapping.externalCategoryId} className='font-mono text-[11px]'>
              {getIssueCategoryLabel(mapping)}
              {getInternalCategorySuffix(mapping)}
            </div>
          ))}
          {moreCount > 0 ? (
            <div className='text-[11px] text-yellow-200/90'>
              +{moreCount} more {moreLabel}
              {moreCount === 1 ? '' : 's'}
            </div>
          ) : null}
        </div>
      </div>
    </Alert>
  );
}

export function CategoryMapperTableAlerts({
  diagnostics,
  isTraderaConnection,
  lastFetchWarning,
  nonLeafMappings,
  staleMappings,
  stats,
}: CategoryMapperAlertsProps): React.JSX.Element {
  return (
    <div className='space-y-3'>
      <GenericMapperStats
        total={stats.total}
        mapped={stats.mapped}
        unmapped={stats.unmapped}
        pending={stats.pending}
        itemLabel='Categories'
      />
      <CategoryMapperFetchWarningAlert
        diagnostics={diagnostics}
        lastFetchWarning={lastFetchWarning}
      />
      <CategoryMapperFetchSourceAlert diagnostics={diagnostics} />
      <CategoryMapperIssueMappingsAlert
        count={stats.stale}
        mappings={staleMappings}
        moreLabel='stale mapping'
        singularMessage='1 saved mapping points to a missing marketplace category. Fetch categories and remap it before listing.'
        pluralMessage={(count) =>
          `${count} saved mappings point to missing marketplace categories. Fetch categories and remap them before listing.`
        }
      />
      {isTraderaConnection ? (
        <CategoryMapperIssueMappingsAlert
          count={stats.nonLeaf}
          mappings={nonLeafMappings}
          moreLabel='non-leaf mapping'
          singularMessage='1 saved Tradera mapping points to a parent category that still has child categories. Remap it to the deepest Tradera category before listing.'
          pluralMessage={(count) =>
            `${count} saved Tradera mappings point to parent categories that still have child categories. Remap them to the deepest Tradera categories before listing.`
          }
        />
      ) : null}
    </div>
  );
}
