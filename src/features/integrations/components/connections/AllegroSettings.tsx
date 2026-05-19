'use client';

import {
  useIntegrationsActions,
  useIntegrationsData,
  useIntegrationsForm,
} from '@/features/integrations/context/IntegrationsContext';
import { Button, Card } from '@/shared/ui/primitives.public';
import { StatusBadge } from '@/shared/ui/data-display.public';
import { FormSection, FormActions, ToggleRow } from '@/shared/ui/forms-and-actions.public';
import { CompactEmptyState, MetadataItem } from '@/shared/ui/navigation-and-layout.public';

interface AllegroStatusProps {
  connected: boolean;
  expiresAt: string;
}

function AllegroStatus({ connected, expiresAt }: AllegroStatusProps): React.JSX.Element {
  return (
    <Card variant='glass' padding='md' className='bg-white/5 space-y-3'>
      <div className='flex items-center justify-between'>
        <span className='text-sm font-medium text-white'>Authorization status</span>
        <StatusBadge status={connected ? 'Connected' : 'Not connected'} />
      </div>
      <MetadataItem label='Expires' value={expiresAt} variant='minimal' />
    </Card>
  );
}

interface AllegroActionsProps {
  connected: boolean;
  useSandbox: boolean;
  saving: boolean;
  onAuthorize: () => void;
  onDisconnect: () => void;
  onSandboxConnect: () => void;
}

function AllegroActions(props: AllegroActionsProps): React.JSX.Element {
  const { connected, useSandbox, saving, onAuthorize, onDisconnect, onSandboxConnect } = props;
  
  return (
    <FormActions
      onSave={onAuthorize}
      saveText={connected ? 'Reauthorize' : 'Connect Allegro'}
      className='!justify-start gap-3'
    >
      <Button
        type='button'
        variant='outline'
        size='sm'
        onClick={onSandboxConnect}
        className='border-amber-500/50 text-amber-200 hover:border-amber-400'
        disabled={saving}
      >
        {saving ? 'Preparing...' : 'Test Sandbox Connection'}
      </Button>
      <StatusBadge
        status={useSandbox ? 'Sandbox' : 'Production'}
        variant={useSandbox ? 'warning' : 'neutral'}
        className='font-semibold'
      />
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

function AllegroSandboxToggle({ 
  activeConnection, 
  saving, 
  onToggle 
}: { 
  activeConnection: { allegroUseSandbox?: boolean | null } | null; 
  saving: boolean; 
  onToggle: (checked: boolean) => void 
}): React.JSX.Element | null {
  if (activeConnection === null) return null;
  
  return (
    <ToggleRow
      label='Use Allegro sandbox'
      description='Switches API + OAuth to sandbox endpoints.'
      checked={Boolean(activeConnection.allegroUseSandbox)}
      onCheckedChange={onToggle}
      disabled={saving}
      className='bg-white/5 border-white/5'
    />
  );
}

export function AllegroSettings(): React.JSX.Element {
  const { connections } = useIntegrationsData();
  const { savingAllegroSandbox } = useIntegrationsForm();
  const {
    handleAllegroSandboxToggle,
    handleAllegroAuthorize,
    handleAllegroDisconnect,
    handleAllegroSandboxConnect,
  } = useIntegrationsActions();

  const activeConnection = connections[0] ?? null;
  const allegroConnected = activeConnection !== null && Boolean(activeConnection.hasAllegroAccessToken);
  
  const rawExpiresAt = activeConnection?.allegroExpiresAt ?? '';
  const allegroExpiresAt = rawExpiresAt.length > 0
    ? new Date(rawExpiresAt).toLocaleString()
    : '—';

  return (
    <FormSection
      title='Allegro OAuth'
      description='Provide your Allegro client ID and client secret in the connection fields, then authorize access.'
      className='p-6'
    >
      <div className='space-y-6'>
        <AllegroSandboxToggle
          activeConnection={activeConnection}
          saving={savingAllegroSandbox}
          onToggle={(checked) => {
            void handleAllegroSandboxToggle(checked);
          }}
        />

        {activeConnection === null ? (
          <CompactEmptyState
            title='No connection'
            description='Add a connection first to enable Allegro authorization.'
            className='bg-card/20 py-8'
           />
        ) : (
          <div className='space-y-4'>
            <AllegroStatus connected={allegroConnected} expiresAt={allegroExpiresAt} />
            <AllegroActions
              connected={allegroConnected}
              useSandbox={Boolean(activeConnection.allegroUseSandbox)}
              saving={savingAllegroSandbox}
              onAuthorize={handleAllegroAuthorize}
              onDisconnect={() => {
                void handleAllegroDisconnect();
              }}
              onSandboxConnect={() => {
                void handleAllegroSandboxConnect();
              }}
            />
          </div>
        )}
      </div>
    </FormSection>
  );
}
