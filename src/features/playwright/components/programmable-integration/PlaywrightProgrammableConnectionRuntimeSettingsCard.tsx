'use client';

import React from 'react';

import type { PlaywrightProgrammableIntegrationPageModel } from '@/features/playwright/pages/playwright-programmable-integration-page.types';
import { FormField, SelectSimple } from '@/shared/ui/forms-and-actions.public';
import { Alert, Card, Input } from '@/shared/ui/primitives.public';

type Props = Pick<
  PlaywrightProgrammableIntegrationPageModel,
  | 'connectionName'
  | 'importActionId'
  | 'importActionOptions'
  | 'isBrowserBehaviorActionOwned'
  | 'listingActionId'
  | 'listingActionOptions'
  | 'migrationInfo'
  | 'setConnectionName'
  | 'setImportActionId'
  | 'setListingActionId'
>;

function ConnectionStatusAlert({
  hasLegacyBrowserBehavior,
}: {
  hasLegacyBrowserBehavior: boolean;
}): React.JSX.Element {
  return (
    <Alert variant={hasLegacyBrowserBehavior ? 'warning' : 'info'} className='text-xs'>
      {hasLegacyBrowserBehavior
        ? 'This connection still has legacy browser behavior stored on the connection model. It is read-only here now. Promote it into action drafts to keep editing browser posture in the Step Sequencer.'
        : 'This connection no longer owns persona or browser overrides. Browser behavior now comes from the selected listing and import session actions. Edit those actions in the Step Sequencer to change persona, headed or headless mode, browser choice, or browser_preparation.'}
    </Alert>
  );
}

export function PlaywrightProgrammableConnectionRuntimeSettingsCard({
  connectionName,
  importActionId,
  importActionOptions,
  isBrowserBehaviorActionOwned,
  listingActionId,
  listingActionOptions,
  migrationInfo,
  setConnectionName,
  setImportActionId,
  setListingActionId,
}: Props): React.JSX.Element {
  return (
    <Card variant='subtle' padding='md' className='border-border bg-card/40'>
      <div className='grid gap-4 lg:grid-cols-2'>
        <FormField label='Connection Name'>
          <Input
            value={connectionName}
            onChange={(event) => setConnectionName(event.target.value)}
            placeholder='Playwright Connection'
            aria-label='Playwright connection name'
          />
        </FormField>
        <ConnectionStatusAlert hasLegacyBrowserBehavior={migrationInfo?.hasLegacyBrowserBehavior === true} />
      </div>

      <div className='mt-4 grid gap-4 lg:grid-cols-2'>
        <FormField
          label='Listing Runtime Action'
          description='Select which Step Sequencer action owns browser mode and browser_preparation for programmable listing runs on this connection.'
        >
          <SelectSimple
            value={listingActionId}
            onValueChange={setListingActionId}
            options={listingActionOptions}
            ariaLabel='Programmable listing runtime action'
            title='Programmable listing runtime action'
          />
        </FormField>
        <FormField
          label='Import Runtime Action'
          description='Select which Step Sequencer action owns browser mode and browser_preparation for programmable import runs on this connection.'
        >
          <SelectSimple
            value={importActionId}
            onValueChange={setImportActionId}
            options={importActionOptions}
            ariaLabel='Programmable import runtime action'
            title='Programmable import runtime action'
          />
        </FormField>
      </div>

      {isBrowserBehaviorActionOwned ? (
        <p className='mt-4 text-xs text-gray-400'>
          Saving this connection keeps legacy Playwright browser fields cleared. The selected
          session actions remain the only browser-behavior editor for this connection.
        </p>
      ) : null}
    </Card>
  );
}
