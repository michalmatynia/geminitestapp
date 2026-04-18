'use client';

import Link from 'next/link';
import React from 'react';

import {
  getProgrammableConnectionOptions,
} from '@/features/playwright/pages/playwright-programmable-integration-page.helpers';
import type { PlaywrightProgrammableIntegrationPageModel } from '@/features/playwright/pages/playwright-programmable-integration-page.types';
import { resolveStepSequencerActionHref } from '@/features/playwright/utils/step-sequencer-action-links';
import { FormField, SelectSimple } from '@/shared/ui/forms-and-actions.public';
import { Alert, Button, Card } from '@/shared/ui/primitives.public';
import { Plus } from 'lucide-react';

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
                variant='outline'
                disabled={isPromotingConnectionSettings || upsertConnection.isPending}
                onClick={toAsyncClickHandler(() =>
                  handleCreateConnectionFromImportHint(
                    importSelectionHint.importActionId,
                    'preview'
                  )
                )}
              >
                Create preview connection
              </Button>
              <Button
                type='button'
                size='sm'
                variant='outline'
                disabled={isPromotingConnectionSettings || upsertConnection.isPending}
                onClick={toAsyncClickHandler(() =>
                  handleCreateConnectionFromImportHint(
                    importSelectionHint.importActionId,
                    'draft'
                  )
                )}
              >
                Create draft flow connection
              </Button>
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
