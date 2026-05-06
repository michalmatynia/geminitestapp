'use client';

import {
  useIntegrationsActions,
  useIntegrationsData,
} from '@/features/integrations/context/IntegrationsContext';
import type { IntegrationConnection } from '@/shared/contracts/integrations/connections';
import { GoogleOAuthCredentialsSettings } from '@/shared/lib/oauth/components/GoogleOAuthCredentialsSettings';
import { Button, Card } from '@/shared/ui/primitives.public';
import { StatusBadge } from '@/shared/ui/data-display.public';
import { FormSection, FormActions } from '@/shared/ui/forms-and-actions.public';
import { CompactEmptyState, MetadataItem } from '@/shared/ui/navigation-and-layout.public';

const getPrimaryConnection = (
  connections: IntegrationConnection[]
): IntegrationConnection | null => connections.at(0) ?? null;

const formatOptionalDateTime = (value: string | null | undefined): string => {
  const normalized = value?.trim() ?? '';
  return normalized.length > 0 ? new Date(normalized).toLocaleString() : '—';
};

const formatOptionalText = (value: string | null | undefined): string => {
  const normalized = value?.trim() ?? '';
  return normalized.length > 0 ? normalized : '—';
};

type GoogleOAuthSettingsView = {
  googleConnected: boolean;
  googleExpiresAt: string;
  googleTokenUpdatedAt: string;
  googleScope: string;
};

const resolveGoogleOAuthSettingsView = (
  connection: IntegrationConnection | null
): GoogleOAuthSettingsView => ({
  googleConnected: connection?.hasGoogleAccessToken === true,
  googleExpiresAt: formatOptionalDateTime(connection?.googleExpiresAt),
  googleTokenUpdatedAt: formatOptionalDateTime(connection?.googleTokenUpdatedAt),
  googleScope: formatOptionalText(connection?.googleScope),
});

export function GoogleOAuthSettings(): React.JSX.Element {
  const { connections } = useIntegrationsData();
  const { handleGoogleAuthorize, handleGoogleDisconnect } = useIntegrationsActions();

  const activeConnection = getPrimaryConnection(connections);
  const { googleConnected, googleExpiresAt, googleTokenUpdatedAt, googleScope } =
    resolveGoogleOAuthSettingsView(activeConnection);

  return (
    <div className='space-y-4'>
      <GoogleOAuthCredentialsSettings />
      <FormSection
        title='Google account authorization'
        description='Authorize a Google account for this integration connection.'
        className='p-6'
      >
        <div className='space-y-6'>
          {activeConnection === null ? (
            <CompactEmptyState
              title='No connection'
              description='Add a connection first to enable Google authorization.'
              className='bg-card/20 py-8'
            />
          ) : (
            <div className='space-y-4'>
              <Card variant='glass' padding='md' className='bg-white/5 space-y-3'>
                <div className='flex items-center justify-between'>
                  <span className='text-sm font-medium text-white'>Authorization status</span>
                  <StatusBadge status={googleConnected ? 'Connected' : 'Not connected'} />
                </div>
                <MetadataItem label='Scopes' value={googleScope} variant='minimal' />
                <MetadataItem label='Expires' value={googleExpiresAt} variant='minimal' />
                <MetadataItem label='Updated' value={googleTokenUpdatedAt} variant='minimal' />
              </Card>

              <FormActions
                onSave={() => handleGoogleAuthorize()}
                saveText={googleConnected ? 'Reauthorize Google' : 'Connect Google'}
                className='!justify-start gap-3'
              >
                {googleConnected && (
                  <Button
                    type='button'
                    variant='outline'
                    size='sm'
                    onClick={() => {
                      void handleGoogleDisconnect();
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
    </div>
  );
}
