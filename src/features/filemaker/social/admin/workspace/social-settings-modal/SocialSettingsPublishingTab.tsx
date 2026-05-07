import React from 'react';

import { FormField, SelectSimple } from '@/shared/ui';
import { KangurAdminCard } from '@/features/kangur/admin/components/KangurAdminCard';
import { useSocialPostContext } from '../SocialPostContext';
import { useSocialSettingsModalContext } from './SocialSettingsModalContext';

const isSocialRuntimeJobInFlight = (status: string | null | undefined): boolean => {
  const normalized = status?.trim().toLowerCase();
  if (!normalized) return false;
  return normalized !== 'completed' && normalized !== 'failed';
};

export function SocialSettingsPublishingTab() {
  const context = useSocialPostContext();
  const state = useSocialSettingsModalContext();

  const {
    publishingConnectionId,
    handlePublishingConnectionChange,
    currentGenerationJob,
    currentPipelineJob,
    currentVisualAnalysisJob,
  } = context;

  const {
    linkedInOptions,
    linkedinIntegration,
    selectedLinkedInConnection,
    linkedInExpiryStatus,
    linkedInExpiryLabel,
    linkedInDaysRemaining,
  } = state;

  const isRuntimeLocked =
    isSocialRuntimeJobInFlight(currentVisualAnalysisJob?.status) ||
    isSocialRuntimeJobInFlight(currentGenerationJob?.status) ||
    isSocialRuntimeJobInFlight(currentPipelineJob?.status);

  const placeholder = linkedinIntegration
    ? 'Select publishing connection'
    : 'Create LinkedIn integration first';
  const connectionTitle = isRuntimeLocked
    ? 'Wait for the current Social runtime job to finish.'
      : !linkedinIntegration
        ? 'Create LinkedIn integration first'
      : linkedInOptions.length === 0
        ? 'Add a publishing connection in Admin > Integrations to use it here.'
        : 'Default publishing connection';

  let helperMessage: React.ReactNode =
    'Per-post editors now use the default publishing connection from this settings modal.';

  if (!linkedinIntegration) {
    helperMessage = 'Create the LinkedIn integration in Admin > Integrations to enable publishing.';
  } else if (linkedInOptions.length === 0) {
    helperMessage = 'Add a publishing connection in Admin > Integrations to use it here.';
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
        label='Default publishing connection'
        description='Applies across Social Publishing. LinkedIn is the currently available channel adapter.'
      >
        <SelectSimple
          value={publishingConnectionId ?? undefined}
          onValueChange={(id) => {
            handlePublishingConnectionChange(id);
          }}
          options={linkedInOptions}
          placeholder={placeholder}
          disabled={!linkedinIntegration || linkedInOptions.length === 0 || isRuntimeLocked}
          size='sm'
          ariaLabel='Default publishing connection'
          title={connectionTitle}
        />
      </FormField>

      <div className={helperClassName}>{helperMessage}</div>
    </KangurAdminCard>
  );
}
