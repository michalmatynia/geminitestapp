'use client';

import { useIntegrationsContext } from '@/features/integrations/context/IntegrationsContext';
import { Button, Checkbox, StatusBadge, FormSection } from '@/shared/ui';

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
        <div className='rounded-md border border-dashed border-border p-4 text-xs text-gray-400'>
          Add a connection first to enable Allegro authorization.
        </div>
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
              onClick={handleAllegroAuthorize}
              className='rounded-md bg-white px-3 py-2 text-sm font-semibold text-gray-900 hover:bg-gray-200'
            >
              {allegroConnected ? 'Reauthorize' : 'Connect Allegro'}
            </Button>
            <Button
              type='button'
              onClick={() => { void handleAllegroSandboxConnect(); }}
              className='rounded-md border border-amber-500/50 px-3 py-2 text-sm font-semibold text-amber-200 hover:border-amber-400'
              disabled={savingAllegroSandbox}
            >
              {savingAllegroSandbox ? 'Preparing...' : 'Test Sandbox Connection'}
            </Button>
            <span className='rounded-full border bg-card/60 px-2 py-1 text-[10px] font-semibold text-gray-300'>
              {activeConnection?.allegroUseSandbox ? 'Sandbox' : 'Production'}
            </span>
            {allegroConnected && (
              <Button
                type='button'
                onClick={() => { void handleAllegroDisconnect(); }}
                className='rounded-md border px-3 py-2 text-sm text-gray-200 hover:border-gray-500'
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
