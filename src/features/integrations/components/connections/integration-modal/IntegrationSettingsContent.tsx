'use client';

import React from 'react';

import { Button } from '@/shared/ui/primitives.public';
import type { IntegrationConnection } from '@/shared/contracts/integrations/connections';

import { AllegroSettings } from '../AllegroSettings';
import { BaselinkerSettings } from '../BaselinkerSettings';
import { LinkedInSettings } from '../LinkedInSettings';
import { ConnectionEditModal } from '../manager/ConnectionEditModal';
import { PlaywrightTabContent } from '../PlaywrightTabContent';
import { useIntegrationModalViewContext } from './IntegrationModalViewContext';

type SessionMeta = {
  hasPlaywrightStorageState: boolean;
  playwrightStorageStateUpdatedAt: string | number | Date | null;
};

type BrowserSessionCardProps = {
  sessionMeta: SessionMeta;
  onOpenSessionModal: () => void;
};

const resolveSessionMeta = (connection: unknown): SessionMeta => {
  if (!connection || typeof connection !== 'object') {
    return {
      hasPlaywrightStorageState: false,
      playwrightStorageStateUpdatedAt: null,
    };
  }

  const record = connection as Record<string, unknown>;
  const hasPlaywrightStorageState = record['hasPlaywrightStorageState'] === true;
  const updatedAtValue = record['playwrightStorageStateUpdatedAt'];
  const playwrightStorageStateUpdatedAt =
    typeof updatedAtValue === 'string' ||
    typeof updatedAtValue === 'number' ||
    updatedAtValue instanceof Date
      ? updatedAtValue
      : null;

  return {
    hasPlaywrightStorageState,
    playwrightStorageStateUpdatedAt,
  };
};

type TraderaBrowserSettingsSnapshot = {
  hasPlaywrightListingScript: boolean;
  traderaBrowserMode: 'builtin' | 'scripted';
  traderaDefaultTemplateId: string | null;
  traderaDefaultDurationHours: number | null;
  traderaAutoRelistEnabled: boolean;
  traderaAutoRelistLeadMinutes: number | null;
};

type Scanner1688SettingsSnapshot = {
  startUrl: string | null;
  loginMode: 'session_required' | 'manual_login';
  defaultSearchMode: 'local_image' | 'image_url_fallback';
  candidateResultLimit: number | null;
  minimumCandidateScore: number | null;
  maxExtractedImages: number | null;
  allowUrlImageSearchFallback: boolean | null;
};

const resolveTraderaBrowserSettings = (connection: unknown): TraderaBrowserSettingsSnapshot => {
  if (!connection || typeof connection !== 'object') {
    return {
      hasPlaywrightListingScript: false,
      traderaBrowserMode: 'builtin',
      traderaDefaultTemplateId: null,
      traderaDefaultDurationHours: null,
      traderaAutoRelistEnabled: true,
      traderaAutoRelistLeadMinutes: null,
    };
  }

  const record = connection as Record<string, unknown>;
  const mode = record['traderaBrowserMode'];
  const templateId = record['traderaDefaultTemplateId'];
  const duration = record['traderaDefaultDurationHours'];
  const autoRelistEnabled = record['traderaAutoRelistEnabled'];
  const autoRelistLead = record['traderaAutoRelistLeadMinutes'];
  const playwrightListingScript = record['playwrightListingScript'];

  return {
    hasPlaywrightListingScript:
      typeof playwrightListingScript === 'string' && playwrightListingScript.trim().length > 0,
    traderaBrowserMode: mode === 'scripted' ? 'scripted' : 'builtin',
    traderaDefaultTemplateId: typeof templateId === 'string' && templateId.trim() ? templateId : null,
    traderaDefaultDurationHours: typeof duration === 'number' ? duration : null,
    traderaAutoRelistEnabled: autoRelistEnabled === false ? false : true,
    traderaAutoRelistLeadMinutes: typeof autoRelistLead === 'number' ? autoRelistLead : null,
  };
};

const resolve1688Settings = (connection: unknown): Scanner1688SettingsSnapshot => {
  if (!connection || typeof connection !== 'object') {
    return {
      startUrl: null,
      loginMode: 'session_required',
      defaultSearchMode: 'local_image',
      candidateResultLimit: null,
      minimumCandidateScore: null,
      maxExtractedImages: null,
      allowUrlImageSearchFallback: null,
    };
  }

  const record = connection as Record<string, unknown>;
  return {
    startUrl:
      typeof record['scanner1688StartUrl'] === 'string' && record['scanner1688StartUrl'].trim()
        ? String(record['scanner1688StartUrl'])
        : null,
    loginMode:
      record['scanner1688LoginMode'] === 'manual_login' ? 'manual_login' : 'session_required',
    defaultSearchMode:
      record['scanner1688DefaultSearchMode'] === 'image_url_fallback'
        ? 'image_url_fallback'
        : 'local_image',
    candidateResultLimit:
      typeof record['scanner1688CandidateResultLimit'] === 'number'
        ? (record['scanner1688CandidateResultLimit'])
        : null,
    minimumCandidateScore:
      typeof record['scanner1688MinimumCandidateScore'] === 'number'
        ? (record['scanner1688MinimumCandidateScore'])
        : null,
    maxExtractedImages:
      typeof record['scanner1688MaxExtractedImages'] === 'number'
        ? (record['scanner1688MaxExtractedImages'])
        : null,
    allowUrlImageSearchFallback:
      typeof record['scanner1688AllowUrlImageSearchFallback'] === 'boolean'
        ? (record['scanner1688AllowUrlImageSearchFallback'])
        : null,
  };
};

function BrowserSessionCard({
  sessionMeta,
  onOpenSessionModal,
}: BrowserSessionCardProps): React.JSX.Element {
  return (
    <div className='rounded-md border border-border/60 bg-card/40 p-3'>
      <div className='flex items-center justify-between gap-3'>
        <p>
          <span className='text-gray-400'>Session cookie:</span>{' '}
          {sessionMeta.hasPlaywrightStorageState ? 'Retained' : 'Not stored'}
        </p>
        <Button
          type='button'
          onClick={onOpenSessionModal}
          disabled={!sessionMeta.hasPlaywrightStorageState}
          className='text-xs text-emerald-200 hover:text-emerald-100 disabled:cursor-not-allowed disabled:text-gray-600'
        >
          View details
        </Button>
      </div>
      <p className='mt-1'>
        <span className='text-gray-400'>Obtained:</span>{' '}
        {sessionMeta.playwrightStorageStateUpdatedAt
          ? new Date(sessionMeta.playwrightStorageStateUpdatedAt).toLocaleString()
          : '—'}
      </p>
    </div>
  );
}

export function IntegrationSettingsContent(): React.JSX.Element {
  const {
    isAllegro,
    isLinkedIn,
    isBaselinker,
    isTradera,
    isVinted,
    is1688,
    showPlaywright,
    activeConnection,
    onOpenSessionModal,
  } = useIntegrationModalViewContext();
  const [editingConnection, setEditingConnection] = React.useState<IntegrationConnection | null>(null);
  const sessionMeta = resolveSessionMeta(activeConnection);
  const traderaBrowserSettings = resolveTraderaBrowserSettings(activeConnection);
  const scanner1688Settings = resolve1688Settings(activeConnection);
  const activeConnectionRecord =
    activeConnection && typeof activeConnection === 'object'
      ? (activeConnection as IntegrationConnection)
      : null;
  const showTraderaBrowserSettings = isTradera && showPlaywright && Boolean(activeConnection);
  const showVintedBrowserSettings = isVinted && showPlaywright && Boolean(activeConnection);
  const show1688BrowserSettings = is1688 && showPlaywright && Boolean(activeConnection);
  const showBrowserAutomationSettings =
    showTraderaBrowserSettings || showVintedBrowserSettings || show1688BrowserSettings;

  return (
    <div>
      {isAllegro ? (
        <AllegroSettings />
      ) : isLinkedIn ? (
        <LinkedInSettings />
      ) : isBaselinker ? (
        <BaselinkerSettings />
      ) : (
        <div className='min-h-[220px]' />
      )}

      {showTraderaBrowserSettings && (
        <>
          <div className='mt-4 space-y-4 rounded-md border border-border/60 bg-card/30 p-4 text-xs text-gray-300'>
            <div className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
              <div className='space-y-1'>
                <p className='text-sm font-semibold text-white'>Tradera browser automation</p>
                <p>
                  Playwright runtime settings stay available here. Connection-specific fields like
                  the listing script, browser mode, and relist defaults can be edited directly
                  from the active connection.
                </p>
              </div>
              {activeConnectionRecord && (
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  onClick={(): void => setEditingConnection(activeConnectionRecord)}
                >
                  Edit active connection
                </Button>
              )}
            </div>

            <div className='grid gap-2 sm:grid-cols-2 xl:grid-cols-3'>
              <div className='rounded-md border border-border/60 bg-card/40 px-3 py-2'>
                <div className='text-[10px] uppercase tracking-wide text-gray-400'>Browser mode</div>
                <div className='mt-1 text-white'>
                  {traderaBrowserSettings.traderaBrowserMode === 'scripted'
                    ? 'Playwright script'
                    : 'Built-in form automation'}
                </div>
              </div>
              <div className='rounded-md border border-border/60 bg-card/40 px-3 py-2'>
                <div className='text-[10px] uppercase tracking-wide text-gray-400'>Listing script</div>
                <div className='mt-1 text-white'>
                  {traderaBrowserSettings.hasPlaywrightListingScript ? 'Configured' : 'Managed default'}
                </div>
              </div>
              <div className='rounded-md border border-border/60 bg-card/40 px-3 py-2'>
                <div className='text-[10px] uppercase tracking-wide text-gray-400'>Default template</div>
                <div className='mt-1 text-white'>
                  {traderaBrowserSettings.traderaDefaultTemplateId ?? '—'}
                </div>
              </div>
              <div className='rounded-md border border-border/60 bg-card/40 px-3 py-2'>
                <div className='text-[10px] uppercase tracking-wide text-gray-400'>Default duration</div>
                <div className='mt-1 text-white'>
                  {traderaBrowserSettings.traderaDefaultDurationHours
                    ? `${traderaBrowserSettings.traderaDefaultDurationHours} hours`
                    : '—'}
                </div>
              </div>
              <div className='rounded-md border border-border/60 bg-card/40 px-3 py-2'>
                <div className='text-[10px] uppercase tracking-wide text-gray-400'>Auto relist</div>
                <div className='mt-1 text-white'>
                  {traderaBrowserSettings.traderaAutoRelistEnabled ? 'Enabled' : 'Disabled'}
                </div>
              </div>
              <div className='rounded-md border border-border/60 bg-card/40 px-3 py-2'>
                <div className='text-[10px] uppercase tracking-wide text-gray-400'>Relist lead</div>
                <div className='mt-1 text-white'>
                  {typeof traderaBrowserSettings.traderaAutoRelistLeadMinutes === 'number'
                    ? `${traderaBrowserSettings.traderaAutoRelistLeadMinutes} min`
                    : '—'}
                </div>
              </div>
            </div>

            <BrowserSessionCard
              sessionMeta={sessionMeta}
              onOpenSessionModal={onOpenSessionModal}
            />
          </div>
          <div className='mt-4'>
            <PlaywrightTabContent />
          </div>
        </>
      )}

      {showVintedBrowserSettings && (
        <>
          <div className='mt-4 space-y-4 rounded-md border border-border/60 bg-card/30 p-4 text-xs text-gray-300'>
            <div className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
              <div className='space-y-1'>
                <p className='text-sm font-semibold text-white'>Vinted browser automation</p>
                <p>
                  Reusable Playwright session storage stays here. Use the login window once,
                  retain the verified browser session, and reuse it for later Vinted quicklist runs.
                </p>
              </div>
              {activeConnectionRecord && (
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  onClick={(): void => setEditingConnection(activeConnectionRecord)}
                >
                  Edit active connection
                </Button>
              )}
            </div>

            <div className='grid gap-2 sm:grid-cols-2 xl:grid-cols-3'>
              <div className='rounded-md border border-border/60 bg-card/40 px-3 py-2'>
                <div className='text-[10px] uppercase tracking-wide text-gray-400'>Login method</div>
                <div className='mt-1 text-white'>
                  {activeConnectionRecord?.username?.trim()
                    ? 'Credentials + reusable session'
                    : 'Session-only browser login'}
                </div>
              </div>
              <div className='rounded-md border border-border/60 bg-card/40 px-3 py-2'>
                <div className='text-[10px] uppercase tracking-wide text-gray-400'>Browser session</div>
                <div className='mt-1 text-white'>
                  {sessionMeta.hasPlaywrightStorageState ? 'Stored' : 'Missing'}
                </div>
              </div>
              <div className='rounded-md border border-border/60 bg-card/40 px-3 py-2'>
                <div className='text-[10px] uppercase tracking-wide text-gray-400'>Session updated</div>
                <div className='mt-1 text-white'>
                  {sessionMeta.playwrightStorageStateUpdatedAt
                    ? new Date(sessionMeta.playwrightStorageStateUpdatedAt).toLocaleString()
                    : '—'}
                </div>
              </div>
            </div>

            <BrowserSessionCard
              sessionMeta={sessionMeta}
              onOpenSessionModal={onOpenSessionModal}
            />
          </div>
          <div className='mt-4'>
            <PlaywrightTabContent />
          </div>
        </>
      )}

      {show1688BrowserSettings && (
        <>
          <div className='mt-4 space-y-4 rounded-md border border-border/60 bg-card/30 p-4 text-xs text-gray-300'>
            <div className='flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between'>
              <div className='space-y-1'>
                <p className='text-sm font-semibold text-white'>1688 browser automation</p>
                <p>
                  Reuse a stored Playwright session for supplier scans and keep 1688-specific
                  search overrides on the connection profile.
                </p>
              </div>
              {activeConnectionRecord && (
                <Button
                  type='button'
                  variant='outline'
                  size='sm'
                  onClick={(): void => setEditingConnection(activeConnectionRecord)}
                >
                  Edit active connection
                </Button>
              )}
            </div>

            <div className='grid gap-2 sm:grid-cols-2 xl:grid-cols-3'>
              <div className='rounded-md border border-border/60 bg-card/40 px-3 py-2'>
                <div className='text-[10px] uppercase tracking-wide text-gray-400'>Start URL</div>
                <div className='mt-1 break-all text-white'>
                  {scanner1688Settings.startUrl ?? 'https://www.1688.com/'}
                </div>
              </div>
              <div className='rounded-md border border-border/60 bg-card/40 px-3 py-2'>
                <div className='text-[10px] uppercase tracking-wide text-gray-400'>Login mode</div>
                <div className='mt-1 text-white'>
                  {scanner1688Settings.loginMode === 'manual_login'
                    ? 'Manual login window'
                    : 'Stored session required'}
                </div>
              </div>
              <div className='rounded-md border border-border/60 bg-card/40 px-3 py-2'>
                <div className='text-[10px] uppercase tracking-wide text-gray-400'>Search mode</div>
                <div className='mt-1 text-white'>
                  {scanner1688Settings.defaultSearchMode === 'image_url_fallback'
                    ? 'Local image + URL fallback'
                    : 'Local image only'}
                </div>
              </div>
              <div className='rounded-md border border-border/60 bg-card/40 px-3 py-2'>
                <div className='text-[10px] uppercase tracking-wide text-gray-400'>Candidate cap</div>
                <div className='mt-1 text-white'>
                  {scanner1688Settings.candidateResultLimit ?? 'Global default'}
                </div>
              </div>
              <div className='rounded-md border border-border/60 bg-card/40 px-3 py-2'>
                <div className='text-[10px] uppercase tracking-wide text-gray-400'>Minimum score</div>
                <div className='mt-1 text-white'>
                  {scanner1688Settings.minimumCandidateScore ?? 'Global default'}
                </div>
              </div>
              <div className='rounded-md border border-border/60 bg-card/40 px-3 py-2'>
                <div className='text-[10px] uppercase tracking-wide text-gray-400'>Extracted images</div>
                <div className='mt-1 text-white'>
                  {scanner1688Settings.maxExtractedImages ?? 'Global default'}
                </div>
              </div>
            </div>

            <BrowserSessionCard
              sessionMeta={sessionMeta}
              onOpenSessionModal={onOpenSessionModal}
            />
          </div>
          <div className='mt-4'>
            <PlaywrightTabContent />
          </div>
        </>
      )}

      {showBrowserAutomationSettings && (
        <ConnectionEditModal
          connection={editingConnection}
          onClose={() => setEditingConnection(null)}
        />
      )}
    </div>
  );
}
