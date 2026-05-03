'use client';

import Link from 'next/link';
import React from 'react';

import type { PlaywrightProgrammableIntegrationPageModel } from '@/features/playwright/pages/playwright-programmable-integration-page.types';
import { resolveStepSequencerActionHref } from '@/features/playwright/utils/step-sequencer-action-links';
import { Card } from '@/shared/ui/primitives.public';

type Props = Pick<
  PlaywrightProgrammableIntegrationPageModel,
  'importSessionPreview' | 'listingSessionPreview' | 'migrationInfo'
>;

function LegacyStatusText({
  migrationInfo,
}: {
  migrationInfo: NonNullable<Props['migrationInfo']>;
}): React.JSX.Element {
  return migrationInfo.canCleanupPersistedLegacyBrowserFields ? (
    <>
      This programmable connection already points at{' '}
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
      </Link>. Clear the stored legacy browser fields to finish the ownership cleanup.
    </>
  ) : (
    <>
      Connection-scoped Playwright browser settings are now read-only on the programmable
      connection. Promote the stored legacy behavior into{' '}
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
      </Link>, then continue editing browser posture in the Step Sequencer.
    </>
  );
}

function ActionOwnedStatusText({
  importSessionPreview,
  listingSessionPreview,
}: Pick<Props, 'importSessionPreview' | 'listingSessionPreview'>): React.JSX.Element {
  return (
    <>
      Connection-scoped Playwright persona and override fields are disabled for this connection.
      Update{' '}
      <Link
        href={resolveStepSequencerActionHref(listingSessionPreview.action.id)}
        className='font-semibold underline underline-offset-2 transition hover:text-white'
      >
        {listingSessionPreview.action.name}
      </Link>{' '}
      and{' '}
      <Link
        href={resolveStepSequencerActionHref(importSessionPreview.action.id)}
        className='font-semibold underline underline-offset-2 transition hover:text-white'
      >
        {importSessionPreview.action.name}
      </Link>{' '}
      in the Step Sequencer when you need to change browser posture.
    </>
  );
}

export function PlaywrightProgrammableOwnershipStatusCard({
  importSessionPreview,
  listingSessionPreview,
  migrationInfo,
}: Props): React.JSX.Element {
  const hasLegacyBrowserBehavior = migrationInfo?.hasLegacyBrowserBehavior === true;
  let title = 'Browser behavior owned by selected actions';

  if (hasLegacyBrowserBehavior) {
    title = migrationInfo.canCleanupPersistedLegacyBrowserFields
      ? 'Stored browser fields can be cleared'
      : 'Legacy browser settings require promotion';
  }
  const body = hasLegacyBrowserBehavior ? (
    <LegacyStatusText migrationInfo={migrationInfo} />
  ) : (
    <ActionOwnedStatusText
      importSessionPreview={importSessionPreview}
      listingSessionPreview={listingSessionPreview}
    />
  );

  return (
    <Card variant='subtle' padding='md' className='border-border bg-card/40'>
      <div className='space-y-2'>
        <h2 className='text-base font-semibold text-white'>{title}</h2>
        <p className='text-sm text-gray-400'>{body}</p>
      </div>
    </Card>
  );
}
