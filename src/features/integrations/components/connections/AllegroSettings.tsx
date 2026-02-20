'use client';

import { useIntegrationsContext } from '@/features/integrations/context/IntegrationsContext';
import { Button, Checkbox, StatusBadge, FormSection, EmptyState } from '@/shared/ui';

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
      className='space-y-4 text-sm text-gray-200'
    >
      <FormSection variant='subtle' className='p-3 text-xs text-gray-300'>
        <div className='flex items-center justify-between gap-3'>
          <div className='flex flex-col'>
            <span>Use Allegro sandbox</span>
            <span className='text-[11px] text-gray-500'>
              Switches API + OAuth to sandbox endpoints.
            </span>
          </div>
          <Checkbox
            className='h-4 w-4 accent-emerald-400'
            checked={Boolean(activeConnection?.allegroUseSandbox)}
            onCheckedChange={(checked: boolean) => { void handleAllegroSandboxToggle(Boolean(checked)); }}
            disabled={!activeConnection || savingAllegroSandbox}
          />
        </div>
      </FormSection>

      {!activeConnection ? (
        <EmptyState
          title='No connection'
          description='Add a connection first to enable Allegro authorization.'
          variant='compact'
          className='bg-card/20 py-8'
        />
      ) : (
        <div className='space-y-3'>
          <FormSection variant='subtle' className='p-3 text-xs text-gray-300'>
            <div className='flex items-center justify-between'>
              <span>Authorization status</span>
              <StatusBadge status={allegroConnected ? 'Connected' : 'Not connected'} />
            </div>
            <p className='mt-2'>
              <span className='text-gray-400'>Expires:</span> {allegroExpiresAt}
            </p>
          </FormSection>
          <div className='flex flex-wrap items-center gap-3'>
            <Button
              type='button'
              variant='default'
              onClick={handleAllegroAuthorize}
            >
              {allegroConnected ? 'Reauthorize' : 'Connect Allegro'}
            </Button>
            <Button
              type='button'
              variant='outline'
              onClick={() => { void handleAllegroSandboxConnect(); }}
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
                onClick={() => { void handleAllegroDisconnect(); }}
              >
                Disconnect
              </Button>
            )}
          </div>
        </div>
      )}
    </FormSection>
  );
}
