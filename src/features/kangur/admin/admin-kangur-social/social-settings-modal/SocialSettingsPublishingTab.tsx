'use client';

import React from 'react';

import { FormField, SelectSimple } from '@/features/kangur/shared/ui';
import { KangurAdminCard } from '../../components/KangurAdminCard';
import type {
  Integration,
  IntegrationConnection,
} from '@/shared/contracts/integrations';

export function SocialSettingsPublishingTab({
  linkedinConnectionId,
  handleLinkedInConnectionChange,
  linkedInOptions,
  linkedinIntegration,
  selectedLinkedInConnection,
  linkedInExpiryStatus,
  linkedInExpiryLabel,
  linkedInDaysRemaining,
  isRuntimeLocked,
}: {
  linkedinConnectionId: string | null;
  handleLinkedInConnectionChange: (val: string) => void;
  linkedInOptions: Array<{ value: string; label: string; description?: string; disabled?: boolean }>;
  linkedinIntegration: Integration | null;
  selectedLinkedInConnection: IntegrationConnection | null;
  linkedInExpiryStatus: 'expired' | 'warning' | 'ok' | null;
  linkedInExpiryLabel: string | null;
  linkedInDaysRemaining: number | null;
  isRuntimeLocked?: boolean;
}) {
  const placeholder = linkedinIntegration
    ? 'Select LinkedIn connection'
    : 'Create LinkedIn integration first';
  const connectionTitle = isRuntimeLocked
    ? 'Wait for the current Social runtime job to finish.'
    : !linkedinIntegration
      ? 'Create LinkedIn integration first'
      : linkedInOptions.length === 0
        ? 'Add a LinkedIn connection in Admin > Integrations to use it here.'
        : 'Default LinkedIn connection';

  let helperMessage: React.ReactNode =
    'Per-post editors now use the default publishing connection from this settings modal.';

  if (!linkedinIntegration) {
    helperMessage = 'Create the LinkedIn integration in Admin > Integrations to enable publishing.';
  } else if (linkedInOptions.length === 0) {
    helperMessage = 'Add a LinkedIn connection in Admin > Integrations to use it here.';
  } else if (selectedLinkedInConnection && !selectedLinkedInConnection.hasLinkedInAccessToken) {
    helperMessage = 'Selected connection is not authorized. Reconnect in Admin > Integrations.';
  } else if (linkedInExpiryStatus === 'expired') {
    helperMessage = `LinkedIn token expired${linkedInExpiryLabel ? ` on ${linkedInExpiryLabel}` : ''}.`;
  } else if (linkedInExpiryStatus === 'warning') {
    helperMessage = `LinkedIn token expires in ${linkedInDaysRemaining} day${linkedInDaysRemaining === 1 ? '' : 's'}${linkedInExpiryLabel ? ` (${linkedInExpiryLabel})` : ''}.`;
  }

  const helperClassName =
    !linkedinIntegration || linkedInOptions.length === 0
      ? 'mt-3 text-xs text-muted-foreground'
      : selectedLinkedInConnection && !selectedLinkedInConnection.hasLinkedInAccessToken
        ? 'mt-3 text-xs text-red-500'
        : linkedInExpiryStatus === 'expired'
          ? 'mt-3 text-xs text-red-500'
          : linkedInExpiryStatus === 'warning'
            ? 'mt-3 text-xs text-amber-500'
            : 'mt-3 text-xs text-muted-foreground';

  return (
    <KangurAdminCard>
      <FormField
        label='Default LinkedIn connection'
        description='Applies across StudiQ Social when saving or publishing posts.'
      >
        <SelectSimple
          value={linkedinConnectionId ?? undefined}
          onValueChange={handleLinkedInConnectionChange}
          options={linkedInOptions}
          placeholder={placeholder}
          disabled={!linkedinIntegration || linkedInOptions.length === 0 || isRuntimeLocked}
          size='sm'
          ariaLabel='Default LinkedIn connection'
          title={connectionTitle}
        />
      </FormField>

      <div className={helperClassName}>{helperMessage}</div>
    </KangurAdminCard>
  );
}
