'use client';

import { useIntegrationsContext } from '@/features/integrations/context/IntegrationsContext';
import {
  Button,
  StatusBadge,
  FormSection,
  EmptyState,
  FormActions,
  ToggleRow,
  MetadataItem,
  Card,
} from '@/shared/ui';

export function AllegroSettings(): React.JSX.Element {
  const {
    connections,
    savingAllegroSandbox,
    handleAllegroSandboxToggle,
    handleAllegroAuthorize,
    handleAllegroDisconnect,
    handleAllegroSandboxConnect,
  } = useIntegrationsContext();

  const activeConnection = connections[0] || null;
  const allegroConnected = Boolean(activeConnection?.hasAllegroAccessToken);
  const allegroExpiresAt = activeConnection?.allegroExpiresAt
    ? new Date(activeConnection.allegroExpiresAt).toLocaleString()
    : '—';

  return (
    <FormSection
      title='Allegro OAuth'
      description='Provide your Allegro client ID and client secret in the connection fields, then authorize access.'
      className='p-6'
    >
      <div className='space-y-6'>
        <ToggleRow
          label='Use Allegro sandbox'
          description='Switches API + OAuth to sandbox endpoints.'
          checked={Boolean(activeConnection?.allegroUseSandbox)}
          onCheckedChange={(checked: boolean) => {
            void handleAllegroSandboxToggle(Boolean(checked));
          }}
          disabled={!activeConnection || savingAllegroSandbox}
          className='bg-white/5 border-white/5'
        />

        {!activeConnection ? (
          <EmptyState
            title='No connection'
            description='Add a connection first to enable Allegro authorization.'
            variant='compact'
            className='bg-card/20 py-8'
          />
        ) : (
          <div className='space-y-4'>
            <Card variant='glass' padding='md' className='bg-white/5 space-y-3'>
              <div className='flex items-center justify-between'>
                <span className='text-sm font-medium text-white'>Authorization status</span>
                <StatusBadge status={allegroConnected ? 'Connected' : 'Not connected'} />
              </div>
              <MetadataItem label='Expires' value={allegroExpiresAt} variant='minimal' />
            </Card>

            <FormActions
              onSave={handleAllegroAuthorize}
              saveText={allegroConnected ? 'Reauthorize' : 'Connect Allegro'}
              className='!justify-start gap-3'
            >
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={() => {
                  void handleAllegroSandboxConnect();
                }}
                className='border-amber-500/50 text-amber-200 hover:border-amber-400'
                disabled={savingAllegroSandbox}
              >
                {savingAllegroSandbox ? 'Preparing...' : 'Test Sandbox Connection'}
              </Button>
              <StatusBadge
                status={activeConnection?.allegroUseSandbox ? 'Sandbox' : 'Production'}
                variant={activeConnection?.allegroUseSandbox ? 'warning' : 'neutral'}
                className='font-semibold'
              />
              {allegroConnected && (
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  onClick={() => {
                    void handleAllegroDisconnect();
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
