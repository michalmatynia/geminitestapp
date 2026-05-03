'use client';

import Link from 'next/link';
import React from 'react';
import { Plus } from 'lucide-react';

import {
  collectProgrammableDraftMapperSampleSourcePaths,
  getProgrammableDraftMapperSignalMatches,
  getProgrammableConnectionOptions,
  sortProgrammableDraftMapperSourcePathsBySignal,
} from '@/features/playwright/pages/playwright-programmable-integration-page.helpers';
import { usePlaywrightActionRun } from '@/features/playwright/hooks/usePlaywrightActionRuns';
import type { PlaywrightProgrammableIntegrationPageModel } from '@/features/playwright/pages/playwright-programmable-integration-page.types';
import { resolveStepSequencerActionHref } from '@/features/playwright/utils/step-sequencer-action-links';
import { getPlaywrightActionRunScrapedItems } from '@/shared/lib/playwright/action-run-scrape-results';
import { FormField, SelectSimple } from '@/shared/ui/forms-and-actions.public';
import { Alert, Button, Card } from '@/shared/ui/primitives.public';

const toObjectRecord = (value: unknown): Record<string, unknown> | null =>
  value !== null && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const getRetainedRunSampleRecord = (run: {
  result?: unknown;
  scrapedItems?: unknown[] | null;
} | null): Record<string, unknown> | null => {
  if (run === null) {
    return null;
  }

  const rawItems =
    Array.isArray(run.scrapedItems) && run.scrapedItems.length > 0
      ? run.scrapedItems
      : getPlaywrightActionRunScrapedItems(run.result);

  return rawItems.map(toObjectRecord).find((item) => item !== null) ?? null;
};

const getRetainedRunSamplePaths = (
  run: {
    result?: unknown;
    scrapedItems?: unknown[] | null;
  } | null
): string[] => {
  const sample = getRetainedRunSampleRecord(run);
  if (sample === null) {
    return [];
  }

  return collectProgrammableDraftMapperSampleSourcePaths(sample, { maxPaths: 6 });
};

const formatFieldEvidence = (fields: string[]): string =>
  fields.map((field) => `"${field}"`).join(' + ');

const getHintedImportSampleFields = (
  run: {
    result?: unknown;
    scrapedItems?: unknown[] | null;
  } | null
): string[] => getRetainedRunSamplePaths(run);

const inferHintedImportFlowMode = (
  run: {
    result?: unknown;
    scrapedItems?: unknown[] | null;
  } | null
): 'preview' | 'draft' => {
  const samplePaths = getRetainedRunSamplePaths(run);
  if (samplePaths.length === 0) {
    return 'preview';
  }

  const { primaryMatches, secondaryMatches } = getProgrammableDraftMapperSignalMatches(samplePaths);
  const hasPrimaryKey = primaryMatches.length > 0;
  const hasSecondaryKey = secondaryMatches.length > 0;

  return hasPrimaryKey && hasSecondaryKey ? 'draft' : 'preview';
};

const getHintedImportRecommendationReason = (
  run: {
    result?: unknown;
    scrapedItems?: unknown[] | null;
  } | null
): string => {
  const samplePaths = getRetainedRunSamplePaths(run);
  if (samplePaths.length === 0) {
    return 'Recommended because no retained scrape sample is available yet, so preview setup is the safer first step.';
  }

  const { primaryMatches, secondaryMatches } = getProgrammableDraftMapperSignalMatches(samplePaths);
  const hasPrimaryKey = primaryMatches.length > 0;
  const hasSecondaryKey = secondaryMatches.length > 0;

  if (hasPrimaryKey && hasSecondaryKey) {
    return `Recommended because this retained run already looks product-like (found ${formatFieldEvidence([
      primaryMatches[0]!,
      secondaryMatches[0]!,
    ])}).`;
  }

  if (hasPrimaryKey) {
    return `Recommended because this retained run currently only exposes ${formatFieldEvidence([
      primaryMatches[0]!,
    ])} without pricing, imagery, or product identifiers yet.`;
  }

  if (hasSecondaryKey) {
    return `Recommended because this retained run exposes ${formatFieldEvidence([
      secondaryMatches[0]!,
    ])} but no product title or name field yet.`;
  }

  return `Recommended because this retained run currently only exposes sample fields like ${formatFieldEvidence(
    samplePaths.slice(0, 2)
  )}.`;
};

type CleanupReadyPreviewItem =
  PlaywrightProgrammableIntegrationPageModel['cleanupReadyPreviewItems'][number];

const toAsyncClickHandler = (action: () => Promise<void>) => (): void => {
  action().catch(() => undefined);
};

function CleanupPreviewItem({
  item,
  onSelectConnection,
}: {
  item: CleanupReadyPreviewItem;
  onSelectConnection: (connectionId: string) => void;
}): React.JSX.Element {
  return (
    <div>
      <button
        type='button'
        className='font-semibold underline underline-offset-2 transition hover:text-white'
        onClick={() => {
          onSelectConnection(item.id);
        }}
      >
        {item.name}
      </button>
      :{' '}
      <Link
        href={resolveStepSequencerActionHref(item.listingDraftActionId)}
        className='underline underline-offset-2 transition hover:text-white'
      >
        {item.listingDraftActionName}
      </Link>{' '}
      and{' '}
      <Link
        href={resolveStepSequencerActionHref(item.importDraftActionId)}
        className='underline underline-offset-2 transition hover:text-white'
      >
        {item.importDraftActionName}
      </Link>
    </div>
  );
}

type PlaywrightProgrammableConnectionControlsSectionProps = Pick<
  PlaywrightProgrammableIntegrationPageModel,
  | 'cleanupReadyConnections'
  | 'cleanupReadyPreviewItems'
  | 'connections'
  | 'handleCleanupAllLegacyBrowserFields'
  | 'handleCreateConnection'
  | 'handleCreateConnectionFromImportHint'
  | 'isCleaningAllLegacyBrowserFields'
  | 'importSelectionHint'
  | 'isPromotingConnectionSettings'
  | 'runningTestType'
  | 'saveCurrentConnection'
  | 'selectedConnection'
  | 'selectedConnectionId'
  | 'setSelectedConnectionId'
  | 'upsertConnection'
>;

function ConnectionSelectorCard({
  connections,
  handleCreateConnectionFromImportHint,
  importSelectionHint,
  isPromotingConnectionSettings,
  onCreateConnection,
  onSaveConnection,
  runningTestType,
  selectedConnection,
  selectedConnectionId,
  setSelectedConnectionId,
  upsertConnection,
}: {
  connections: PlaywrightProgrammableConnectionControlsSectionProps['connections'];
  handleCreateConnectionFromImportHint: PlaywrightProgrammableConnectionControlsSectionProps['handleCreateConnectionFromImportHint'];
  importSelectionHint: PlaywrightProgrammableConnectionControlsSectionProps['importSelectionHint'];
  isPromotingConnectionSettings: boolean;
  onCreateConnection: () => Promise<void>;
  onSaveConnection: () => Promise<void>;
  runningTestType: PlaywrightProgrammableConnectionControlsSectionProps['runningTestType'];
  selectedConnection: PlaywrightProgrammableConnectionControlsSectionProps['selectedConnection'];
  selectedConnectionId: string;
  setSelectedConnectionId: (value: string) => void;
  upsertConnection: PlaywrightProgrammableConnectionControlsSectionProps['upsertConnection'];
}): React.JSX.Element {
  const hasUnmatchedImportSelectionHint =
    importSelectionHint !== null && importSelectionHint.matchedConnectionId === null;
  const [showOtherHintedSetup, setShowOtherHintedSetup] = React.useState(false);
  const retainedRunQuery = usePlaywrightActionRun(importSelectionHint?.retainedRunId ?? null, {
    enabled: hasUnmatchedImportSelectionHint && importSelectionHint?.retainedRunId !== null,
  });
  const recommendedFlowMode = React.useMemo(
    () => inferHintedImportFlowMode(retainedRunQuery.data?.run ?? null),
    [retainedRunQuery.data?.run]
  );
  const recommendedSampleFields = React.useMemo(
    () => getHintedImportSampleFields(retainedRunQuery.data?.run ?? null),
    [retainedRunQuery.data?.run]
  );
  const matchedSampleKeys = React.useMemo(
    () => getProgrammableDraftMapperSignalMatches(recommendedSampleFields),
    [recommendedSampleFields]
  );
  const orderedSampleFields = React.useMemo(
    () => sortProgrammableDraftMapperSourcePathsBySignal(recommendedSampleFields, matchedSampleKeys),
    [matchedSampleKeys, recommendedSampleFields]
  );
  const recommendedFlowReason = React.useMemo(
    () => getHintedImportRecommendationReason(retainedRunQuery.data?.run ?? null),
    [retainedRunQuery.data?.run]
  );
  const primaryFlowMode = recommendedFlowMode;
  const secondaryFlowMode = recommendedFlowMode === 'preview' ? 'draft' : 'preview';

  React.useEffect(() => {
    setShowOtherHintedSetup(false);
  }, [hasUnmatchedImportSelectionHint, importSelectionHint?.importActionId, recommendedFlowMode]);

  return (
    <Card variant='subtle' padding='md' className='space-y-4 border-border bg-card/40'>
      {hasUnmatchedImportSelectionHint ? (
        <Alert variant='warning' className='text-xs'>
          <div className='flex flex-col gap-3 md:flex-row md:items-start md:justify-between'>
            <div>
              No programmable connection matches import action{' '}
              <code>{importSelectionHint.importActionId}</code>
              {importSelectionHint.retainedRunId !== null ? (
                <>
                  {' '}
                  from retained run <code>{importSelectionHint.retainedRunId}</code>
                </>
              ) : null}
              . Showing{' '}
              <strong>
                {selectedConnection?.name ?? connections[0]?.name ?? 'the first available connection'}
              </strong>{' '}
              instead.
            </div>
            <div className='flex flex-wrap gap-2'>
              <Button
                type='button'
                size='sm'
                disabled={isPromotingConnectionSettings || upsertConnection.isPending}
                onClick={toAsyncClickHandler(() =>
                  handleCreateConnectionFromImportHint(
                    importSelectionHint.importActionId,
                    primaryFlowMode
                  )
                )}
              >
                {primaryFlowMode === 'preview'
                  ? 'Create preview connection (Recommended)'
                  : 'Create draft flow connection (Recommended)'}
              </Button>
              <Button
                type='button'
                size='sm'
                variant='ghost'
                disabled={isPromotingConnectionSettings || upsertConnection.isPending}
                onClick={() => setShowOtherHintedSetup((current) => !current)}
              >
                {showOtherHintedSetup ? 'Hide other setup' : 'Other setup'}
              </Button>
              {showOtherHintedSetup ? (
                <Button
                  type='button'
                  size='sm'
                  variant='outline'
                  disabled={isPromotingConnectionSettings || upsertConnection.isPending}
                  onClick={toAsyncClickHandler(() =>
                    handleCreateConnectionFromImportHint(
                      importSelectionHint.importActionId,
                      secondaryFlowMode
                    )
                  )}
                >
                  {secondaryFlowMode === 'preview'
                    ? 'Create preview connection'
                    : 'Create draft flow connection'}
                </Button>
              ) : null}
            </div>
            <div className='space-y-2 text-[11px] text-amber-100/90 md:max-w-xs'>
              <div>{recommendedFlowReason}</div>
              {orderedSampleFields.length > 0 ? (
              <div className='space-y-1'>
                  <div className='uppercase tracking-wide text-amber-100/70'>
                    Retained sample fields
                  </div>
                  <div className='text-[11px] text-amber-100/70'>
                    Click a field to seed the first mapper row with that source path.
                  </div>
                  <div className='flex flex-wrap gap-1.5'>
                    {orderedSampleFields.map((field) => {
                      const isMatched =
                        matchedSampleKeys.primaryMatches.includes(field) ||
                        matchedSampleKeys.secondaryMatches.includes(field);

                      return (
                        <button
                          type='button'
                          key={field}
                          aria-label={field}
                          disabled={isPromotingConnectionSettings || upsertConnection.isPending}
                          onClick={toAsyncClickHandler(() =>
                            handleCreateConnectionFromImportHint(
                              importSelectionHint.importActionId,
                              primaryFlowMode,
                              field
                            )
                          )}
                          className={
                            isMatched
                              ? 'inline-flex items-center gap-1 rounded-full border border-amber-300/40 bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-100 transition hover:bg-amber-500/20 disabled:cursor-not-allowed disabled:opacity-60'
                              : 'rounded-full border border-border/40 bg-background/40 px-2 py-0.5 text-[11px] text-gray-300 transition hover:bg-background/60 disabled:cursor-not-allowed disabled:opacity-60'
                          }
                        >
                          {field}
                          {isMatched ? (
                            <span className='rounded-full border border-amber-200/40 bg-amber-200/10 px-1.5 py-0 text-[9px] font-semibold uppercase tracking-wide text-amber-50'>
                              Signal
                            </span>
                          ) : null}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </Alert>
      ) : null}
      <div className='grid gap-4 md:grid-cols-[minmax(0,1fr)_auto] md:items-end'>
        <FormField
          label='Connection'
          description='Each programmable connection stores its own scripts, import routes, field mapping, persona selection, and selected listing or import session actions.'
        >
          <SelectSimple
            value={selectedConnectionId}
            onValueChange={setSelectedConnectionId}
            options={getProgrammableConnectionOptions(connections)}
            placeholder={connections.length > 0 ? 'Select connection' : 'No connections yet'}
            ariaLabel='Programmable Playwright connection'
            title='Programmable Playwright connection'
          />
        </FormField>
        <div className='flex gap-2'>
          <Button type='button' variant='outline' onClick={toAsyncClickHandler(onCreateConnection)}>
            <Plus className='mr-1.5 h-3.5 w-3.5' />
            New Connection
          </Button>
          <Button
            type='button'
            onClick={toAsyncClickHandler(onSaveConnection)}
            loading={
              !isPromotingConnectionSettings &&
              upsertConnection.isPending &&
              runningTestType === null
            }
          >
            Save Connection
          </Button>
        </div>
      </div>
    </Card>
  );
}

function BulkCleanupAlert({
  cleanupReadyConnections,
  cleanupReadyPreviewItems,
  handleCleanupAllLegacyBrowserFields,
  isCleaningAllLegacyBrowserFields,
  setSelectedConnectionId,
}: Pick<
  PlaywrightProgrammableConnectionControlsSectionProps,
  | 'cleanupReadyConnections'
  | 'cleanupReadyPreviewItems'
  | 'handleCleanupAllLegacyBrowserFields'
  | 'isCleaningAllLegacyBrowserFields'
  | 'setSelectedConnectionId'
>): React.JSX.Element | null {
  return cleanupReadyConnections.length > 1 ? (
    <Alert variant='warning' className='text-xs'>
      <div className='flex flex-col gap-3 md:flex-row md:items-start md:justify-between'>
        <div className='space-y-2'>
          <strong>{cleanupReadyConnections.length}</strong> programmable connections already point
          at their generated Step Sequencer drafts and still carry stale browser fields in the
          connection record. Clear those stored fields in one pass.
          <div className='space-y-1 text-[11px] text-amber-100/90'>
            {cleanupReadyPreviewItems.map((item) => (
              <CleanupPreviewItem
                key={item.id}
                item={item}
                onSelectConnection={setSelectedConnectionId}
              />
            ))}
          </div>
        </div>
        <Button
          type='button'
          size='sm'
          onClick={toAsyncClickHandler(handleCleanupAllLegacyBrowserFields)}
          loading={isCleaningAllLegacyBrowserFields}
        >
          Clear all safe stored browser fields
        </Button>
      </div>
    </Alert>
  ) : null;
}

export function PlaywrightProgrammableConnectionControlsSection({
  cleanupReadyConnections,
  cleanupReadyPreviewItems,
  connections,
  handleCleanupAllLegacyBrowserFields,
  handleCreateConnection,
  handleCreateConnectionFromImportHint,
  importSelectionHint,
  isCleaningAllLegacyBrowserFields,
  isPromotingConnectionSettings,
  runningTestType,
  saveCurrentConnection,
  selectedConnection,
  selectedConnectionId,
  setSelectedConnectionId,
  upsertConnection,
}: PlaywrightProgrammableConnectionControlsSectionProps): React.JSX.Element {
  return (
    <>
      <ConnectionSelectorCard
        connections={connections}
        handleCreateConnectionFromImportHint={handleCreateConnectionFromImportHint}
        importSelectionHint={importSelectionHint}
        isPromotingConnectionSettings={isPromotingConnectionSettings}
        onCreateConnection={handleCreateConnection}
        onSaveConnection={() => saveCurrentConnection(true).then(() => undefined)}
        runningTestType={runningTestType}
        selectedConnection={selectedConnection}
        selectedConnectionId={selectedConnectionId}
        setSelectedConnectionId={setSelectedConnectionId}
        upsertConnection={upsertConnection}
      />
      <BulkCleanupAlert
        cleanupReadyConnections={cleanupReadyConnections}
        cleanupReadyPreviewItems={cleanupReadyPreviewItems}
        handleCleanupAllLegacyBrowserFields={handleCleanupAllLegacyBrowserFields}
        isCleaningAllLegacyBrowserFields={isCleaningAllLegacyBrowserFields}
        setSelectedConnectionId={setSelectedConnectionId}
      />
    </>
  );
}
