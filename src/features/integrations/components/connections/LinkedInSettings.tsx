'use client';

import {
  useIntegrationsActions,
  useIntegrationsData,
} from '@/features/integrations/context/IntegrationsContext';
import type { IntegrationConnection } from '@/shared/contracts/integrations/connections';
import { Button, Card } from '@/shared/ui/primitives.public';
import { StatusBadge } from '@/shared/ui/data-display.public';
import { FormSection, FormActions } from '@/shared/ui/forms-and-actions.public';
import { CompactEmptyState, MetadataItem } from '@/shared/ui/navigation-and-layout.public';

interface LinkedInStatusProps {
  connected: boolean;
  expiresAt: string;
  memberUrn: string;
  profileUrl: string | null;
}

function LinkedInStatus({ connected, expiresAt, memberUrn, profileUrl }: LinkedInStatusProps): React.JSX.Element {
  return (
    <Card variant='glass' padding='md' className='bg-white/5 space-y-3'>
      <div className='flex items-center justify-between'>
        <span className='text-sm font-medium text-white'>Authorization status</span>
        <StatusBadge status={connected ? 'Connected' : 'Not connected'} />
      </div>
      <MetadataItem label='Expires' value={expiresAt} variant='minimal' />
      <MetadataItem label='Member URN' value={memberUrn} variant='minimal' />
      {profileUrl !== null && profileUrl.length > 0 && (
        <MetadataItem label='Profile' value={profileUrl} variant='minimal' />
      )}
    </Card>
  );
}

interface LinkedInActionsProps {
  connected: boolean;
  onAuthorize: () => void;
  onDisconnect: () => void;
}

function LinkedInActions({ connected, onAuthorize, onDisconnect }: LinkedInActionsProps): React.JSX.Element {
  return (
    <FormActions
      onSave={onAuthorize}
      saveText={connected ? 'Reauthorize' : 'Connect LinkedIn'}
      className='!justify-start gap-3'
    >
      {connected && (
        <Button
          type='button'
          variant='outline'
          size='sm'
          onClick={onDisconnect}
        >
          Disconnect
        </Button>
      )}
    </FormActions>
  );
}

function LinkedInSettingsContent({ 
  activeConnection,
  onAuthorize,
  onDisconnect
}: { 
  activeConnection: IntegrationConnection;
  onAuthorize: () => void;
  onDisconnect: () => void;
}): React.JSX.Element {
  const connected = Boolean(activeConnection.hasLinkedInAccessToken);
  const rawExpiresAt = activeConnection.linkedinExpiresAt ?? '';
  const expiresAt = rawExpiresAt.length > 0 ? new Date(rawExpiresAt).toLocaleString() : '—';
  
  return (
    <div className='space-y-4'>
      <LinkedInStatus 
        connected={connected} 
        expiresAt={expiresAt} 
        memberUrn={activeConnection.linkedinPersonUrn ?? '—'} 
        profileUrl={activeConnection.linkedinProfileUrl ?? null} 
      />
      <LinkedInActions connected={connected} onAuthorize={onAuthorize} onDisconnect={onDisconnect} />
    </div>
  );
}

export function LinkedInSettings(): React.JSX.Element {
  const { connections } = useIntegrationsData();
  const { handleLinkedInAuthorize, handleLinkedInDisconnect } = useIntegrationsActions();
  const activeConnection = connections[0] ?? null;

  return (
    <FormSection
      title='LinkedIn OAuth'
      description='Provide your LinkedIn client ID and client secret in the connection fields, or set LINKEDIN_APP_KEY_SECRET and LINKEDIN_APP_CLIENT_SECRET in .env, then authorize access.'
      className='p-6'
    >
      <div className='space-y-6'>
        {activeConnection === null ? (
          <CompactEmptyState
            title='No connection'
            description='Add a connection first to enable LinkedIn authorization.'
            className='bg-card/20 py-8'
          />
        ) : (
          <LinkedInSettingsContent 
            activeConnection={activeConnection}
            onAuthorize={handleLinkedInAuthorize}
            onDisconnect={() => { void handleLinkedInDisconnect(); }}
          />
        )}
      </div>
    </FormSection>
  );
}
