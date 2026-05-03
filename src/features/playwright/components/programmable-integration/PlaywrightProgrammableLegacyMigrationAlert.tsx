'use client';

import Link from 'next/link';
import React from 'react';

import type { PlaywrightProgrammableIntegrationPageModel } from '@/features/playwright/pages/playwright-programmable-integration-page.types';
import { resolveStepSequencerActionHref } from '@/features/playwright/utils/step-sequencer-action-links';
import { FormField } from '@/shared/ui/forms-and-actions.public';
import { Alert, Button, Input } from '@/shared/ui/primitives.public';

type Props = Pick<
  PlaywrightProgrammableIntegrationPageModel,
  | 'handleCleanupLegacyBrowserFields'
  | 'handlePromoteConnectionSettings'
  | 'isCleaningLegacyBrowserFields'
  | 'isPromotingConnectionSettings'
  | 'migrationInfo'
  | 'playwrightActionsQuery'
  | 'promotionProxyPassword'
  | 'setPromotionProxyPassword'
>;

const toAsyncClickHandler = (action: () => Promise<void>) => (): void => {
  action().catch(() => undefined);
};

function MigrationDescription({
  migrationInfo,
}: {
  migrationInfo: NonNullable<Props['migrationInfo']>;
}): React.JSX.Element {
  return migrationInfo.canCleanupPersistedLegacyBrowserFields ? (
    <>
      {' '}cleanup path is to clear those stored fields now. This connection already points at its
      generated action drafts:{' '}
      <Link
        href={resolveStepSequencerActionHref(migrationInfo.listingDraftActionId)}
        className='font-semibold underline underline-offset-2 transition hover:text-white'
      >
        {migrationInfo.listingDraftActionName}
      </Link>{' '}
      and{' '}
      <Link
        href={resolveStepSequencerActionHref(migrationInfo.importDraftActionId)}
        className='font-semibold underline underline-offset-2 transition hover:text-white'
      >
        {migrationInfo.importDraftActionName}
      </Link>.
    </>
  ) : (
    <>
      {' '}migration path is to fork the selected session actions into connection-owned drafts and
      clear the connection-level Playwright settings afterward. Planned drafts:{' '}
      <Link
        href={resolveStepSequencerActionHref(migrationInfo.listingDraftActionId)}
        className='font-semibold underline underline-offset-2 transition hover:text-white'
      >
        {migrationInfo.listingDraftActionName}
      </Link>{' '}
      and{' '}
      <Link
        href={resolveStepSequencerActionHref(migrationInfo.importDraftActionId)}
        className='font-semibold underline underline-offset-2 transition hover:text-white'
      >
        {migrationInfo.importDraftActionName}
      </Link>.
    </>
  );
}

function MigrationAction({
  handleCleanupLegacyBrowserFields,
  handlePromoteConnectionSettings,
  isCleaningLegacyBrowserFields,
  isPromotingConnectionSettings,
  migrationInfo,
  playwrightActionsQuery,
}: Pick<
  Props,
  | 'handleCleanupLegacyBrowserFields'
  | 'handlePromoteConnectionSettings'
  | 'isCleaningLegacyBrowserFields'
  | 'isPromotingConnectionSettings'
  | 'migrationInfo'
  | 'playwrightActionsQuery'
>): React.JSX.Element {
  if (migrationInfo?.canCleanupPersistedLegacyBrowserFields === true) {
    return (
      <Button
        type='button'
        size='sm'
        onClick={toAsyncClickHandler(handleCleanupLegacyBrowserFields)}
        loading={isCleaningLegacyBrowserFields}
      >
        Clear stored browser fields
      </Button>
    );
  }

  return (
    <Button
      type='button'
      size='sm'
      onClick={toAsyncClickHandler(handlePromoteConnectionSettings)}
      disabled={
        playwrightActionsQuery.isPending ||
        migrationInfo?.requiresManualProxyPasswordInput === true
      }
      loading={isPromotingConnectionSettings}
    >
      Promote to action drafts
    </Button>
  );
}

export function PlaywrightProgrammableLegacyMigrationAlert({
  handleCleanupLegacyBrowserFields,
  handlePromoteConnectionSettings,
  isCleaningLegacyBrowserFields,
  isPromotingConnectionSettings,
  migrationInfo,
  playwrightActionsQuery,
  promotionProxyPassword,
  setPromotionProxyPassword,
}: Props): React.JSX.Element | null {
  if (migrationInfo?.hasLegacyBrowserBehavior !== true) {
    return null;
  }

  return (
    <Alert variant='warning' className='text-xs'>
      <div className='flex flex-col gap-3 md:flex-row md:items-start md:justify-between'>
        <div>
          This programmable connection still stores browser behavior on the connection model:{' '}
          <strong>{migrationInfo.legacySummary.join(', ')}</strong>. The safe
          <MigrationDescription migrationInfo={migrationInfo} />
        </div>
        <MigrationAction
          handleCleanupLegacyBrowserFields={handleCleanupLegacyBrowserFields}
          handlePromoteConnectionSettings={handlePromoteConnectionSettings}
          isCleaningLegacyBrowserFields={isCleaningLegacyBrowserFields}
          isPromotingConnectionSettings={isPromotingConnectionSettings}
          migrationInfo={migrationInfo}
          playwrightActionsQuery={playwrightActionsQuery}
        />
      </div>
      {migrationInfo.requiresManualProxyPasswordInput &&
      migrationInfo.canCleanupPersistedLegacyBrowserFields !== true ? (
        <div className='grid gap-3 md:grid-cols-[minmax(0,1fr)_320px] md:items-end'>
          <div className='text-[11px] text-amber-200/90'>
            Re-enter the proxy password before promotion. The stored password is masked in the
            connection payload and cannot be copied into the action drafts unless you provide it
            again here.
          </div>
          <FormField label='Proxy Password'>
            <Input
              type='password'
              value={promotionProxyPassword}
              onChange={(event) => setPromotionProxyPassword(event.target.value)}
              aria-label='Proxy password for promotion'
            />
          </FormField>
        </div>
      ) : null}
    </Alert>
  );
}
