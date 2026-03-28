'use client';

import React from 'react';
import { FormField, SelectSimple } from '@/features/kangur/shared/ui';
import { KangurAdminCard } from '../../components/KangurAdminCard';

export function SocialSettingsPublishingTab({
  linkedinConnectionId,
  handleLinkedInConnectionChange,
  linkedInOptions,
  linkedinIntegration,
  selectedLinkedInConnection,
  linkedInExpiryStatus,
  linkedInExpiryLabel,
  linkedInDaysRemaining,
}: {
  linkedinConnectionId: string | null;
  handleLinkedInConnectionChange: (val: string) => void;
  linkedInOptions: Array<{ value: string; label: string; description?: string; disabled?: boolean }>;
  linkedinIntegration: any;
  selectedLinkedInConnection: { hasLinkedInAccessToken?: boolean } | null;
  linkedInExpiryStatus: 'expired' | 'warning' | 'ok' | null;
  linkedInExpiryLabel: string | null;
  linkedInDaysRemaining: number | null;
}) {
  return (
    <KangurAdminCard>
      <FormField label='Default LinkedIn connection' description='Applies across StudiQ Social when saving or publishing posts.'>
        <SelectSimple
          value={linkedinConnectionId ?? undefined}
          onValueChange={handleLinkedInConnectionChange}
          options={linkedInOptions}
          placeholder={linkedinIntegration ? 'Select LinkedIn connection' : 'Create LinkedIn integration first'}
          disabled={!linkedinIntegration || linkedInOptions.length === 0}
          size='sm'
          ariaLabel='Default LinkedIn connection'
          title='Default LinkedIn connection'
        />
      </FormField>

      {!linkedinIntegration ? (
        <div className='mt-3 text-xs text-muted-foreground'>Create the LinkedIn integration in Admin &gt; Integrations to enable publishing.</div>
      ) : linkedInOptions.length === 0 ? (
        <div className='mt-3 text-xs text-muted-foreground'>Add a LinkedIn connection in Admin &gt; Integrations to use it here.</div>
      ) : selectedLinkedInConnection && !selectedLinkedInConnection.hasLinkedInAccessToken ? (
        <div className='mt-3 text-xs text-red-500'>Selected connection is not authorized. Reconnect in Admin &gt; Integrations.</div>
      ) : linkedInExpiryStatus === 'expired' ? (
        <div className='mt-3 text-xs text-red-500'>LinkedIn token expired{linkedInExpiryLabel ? ` on ${linkedInExpiryLabel}` : ''}.</div>
      ) : linkedInExpiryStatus === 'warning' ? (
        <div className='mt-3 text-xs text-amber-500'>LinkedIn token expires in {linkedInDaysRemaining} day{linkedInDaysRemaining === 1 ? '' : 's'}{linkedInExpiryLabel ? ` (${linkedInExpiryLabel})` : ''}.</div>
      ) : (
        <div className='mt-3 text-xs text-muted-foreground'>Per-post editors now use the default publishing connection from this settings modal.</div>
      )}
    </KangurAdminCard>
  );
}
