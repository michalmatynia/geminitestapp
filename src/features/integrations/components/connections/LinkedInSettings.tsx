'use client';

import {
  useIntegrationsActions,
  useIntegrationsData,
} from '@/features/integrations/context/IntegrationsContext';
import { Button, Card } from '@/shared/ui/primitives.public';
import { StatusBadge } from '@/shared/ui/data-display.public';
import { FormSection, FormActions } from '@/shared/ui/forms-and-actions.public';
import { CompactEmptyState, MetadataItem } from '@/shared/ui/navigation-and-layout.public';

export function LinkedInSettings(): React.JSX.Element {
  const { connections } = useIntegrationsData();
  const { handleLinkedInAuthorize, handleLinkedInDisconnect } = useIntegrationsActions();

  const activeConnection = connections[0] || null;
  const linkedInConnected = Boolean(activeConnection?.hasLinkedInAccessToken);
  const linkedInExpiresAt = activeConnection?.linkedinExpiresAt
    ? new Date(activeConnection.linkedinExpiresAt).toLocaleString()
    : '—';
  const linkedInPersonUrn = activeConnection?.linkedinPersonUrn ?? '—';
  const linkedInProfileUrl = activeConnection?.linkedinProfileUrl ?? null;

  return (
    <FormSection
      title='LinkedIn OAuth'
      description='Provide your LinkedIn client ID and client secret in the connection fields, or set LINKEDIN_APP_KEY_SECRET and LINKEDIN_APP_CLIENT_SECRET in .env, then authorize access.'
      className='p-6'
    >
      <div className='space-y-6'>
        {!activeConnection ? (
          <CompactEmptyState
            title='No connection'
            description='Add a connection first to enable LinkedIn authorization.'
            className='bg-card/20 py-8'
          />
        ) : (
          <div className='space-y-4'>
            <Card variant='glass' padding='md' className='bg-white/5 space-y-3'>
              <div className='flex items-center justify-between'>
                <span className='text-sm font-medium text-white'>Authorization status</span>
                <StatusBadge status={linkedInConnected ? 'Connected' : 'Not connected'} />
              </div>
              <MetadataItem label='Expires' value={linkedInExpiresAt} variant='minimal' />
              <MetadataItem label='Member URN' value={linkedInPersonUrn} variant='minimal' />
              {linkedInProfileUrl ? (
                <MetadataItem label='Profile' value={linkedInProfileUrl} variant='minimal' />
              ) : null}
            </Card>

            <FormActions
              onSave={handleLinkedInAuthorize}
              saveText={linkedInConnected ? 'Reauthorize' : 'Connect LinkedIn'}
              className='!justify-start gap-3'
            >
              {linkedInConnected && (
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  onClick={() => {
                    void handleLinkedInDisconnect();
                  }}
                >
                  Disconnect
                </Button>
              )}
            </FormActions>
          </div>
        )}
      </div>
    </FormSection>
  );
}
