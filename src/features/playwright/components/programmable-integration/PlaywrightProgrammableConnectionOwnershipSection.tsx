'use client';

import React from 'react';

import type { PlaywrightProgrammableIntegrationPageModel } from '@/features/playwright/pages/playwright-programmable-integration-page.types';
import { PlaywrightProgrammableSessionPreviewSection } from '@/features/playwright/components/PlaywrightProgrammableSessionPreviewSection';
import { PlaywrightProgrammableConnectionRuntimeSettingsCard } from '@/features/playwright/components/programmable-integration/PlaywrightProgrammableConnectionRuntimeSettingsCard';
import { PlaywrightProgrammableLegacyMigrationAlert } from '@/features/playwright/components/programmable-integration/PlaywrightProgrammableLegacyMigrationAlert';
import { PlaywrightProgrammableOwnershipStatusCard } from '@/features/playwright/components/programmable-integration/PlaywrightProgrammableOwnershipStatusCard';

type Props = Pick<
  PlaywrightProgrammableIntegrationPageModel,
  | 'connectionName'
  | 'handleCleanupLegacyBrowserFields'
  | 'handlePromoteConnectionSettings'
  | 'importActionId'
  | 'importActionOptions'
  | 'importSessionPreview'
  | 'isBrowserBehaviorActionOwned'
  | 'isCleaningLegacyBrowserFields'
  | 'isPromotingConnectionSettings'
  | 'listingActionId'
  | 'listingActionOptions'
  | 'listingSessionPreview'
  | 'migrationInfo'
  | 'playwrightActionsQuery'
  | 'promotionProxyPassword'
  | 'sessionDiagnostics'
  | 'setConnectionName'
  | 'setImportActionId'
  | 'setListingActionId'
  | 'setPromotionProxyPassword'
>;

export function PlaywrightProgrammableConnectionOwnershipSection(
  props: Props
): React.JSX.Element {
  return (
    <>
      <PlaywrightProgrammableConnectionRuntimeSettingsCard {...props} />
      <PlaywrightProgrammableSessionPreviewSection
        diagnostics={props.sessionDiagnostics}
        listingPreview={props.listingSessionPreview}
        importPreview={props.importSessionPreview}
      />
      <PlaywrightProgrammableLegacyMigrationAlert {...props} />
      <PlaywrightProgrammableOwnershipStatusCard {...props} />
    </>
  );
}
