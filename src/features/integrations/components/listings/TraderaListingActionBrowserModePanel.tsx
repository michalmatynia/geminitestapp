'use client';

import React, { useEffect, useMemo } from 'react';

import type { IntegrationWithConnections } from '@/shared/contracts/integrations/domain';
import { Badge } from '@/shared/ui/primitives.public';
import { ToggleRow } from '@/shared/ui/forms-and-actions.public';

import {
  resolveTraderaListingRuntimeActionKey,
  useTraderaListingActionForRuntimeKey,
} from './hooks/useTraderaListingAction';

type TraderaListingActionBrowserModePanelProps = {
  onBlockingStateChange?: (blocking: boolean) => void;
  selectedConnectionId: string;
  selectedIntegration: IntegrationWithConnections;
};

export function TraderaListingActionBrowserModePanel({
  onBlockingStateChange,
  selectedConnectionId,
  selectedIntegration,
}: TraderaListingActionBrowserModePanelProps): React.JSX.Element | null {
  const selectedConnection = useMemo(
    () =>
      selectedIntegration.connections.find((connection) => connection.id === selectedConnectionId) ??
      null,
    [selectedConnectionId, selectedIntegration.connections]
  );
  const actionKey = useMemo(
    () =>
      resolveTraderaListingRuntimeActionKey({
        integrationSlug: selectedIntegration.slug,
        traderaBrowserMode: selectedConnection?.traderaBrowserMode,
      }),
    [selectedIntegration.slug, selectedConnection?.traderaBrowserMode]
  );
  const action = useTraderaListingActionForRuntimeKey(actionKey);

  useEffect(() => {
    onBlockingStateChange?.(action.saving || action.hasUnsavedChanges);
    return (): void => {
      onBlockingStateChange?.(false);
    };
  }, [action.hasUnsavedChanges, action.saving, onBlockingStateChange]);

  if (actionKey === null) return null;

  return (
    <div className='rounded-md border border-border/40 bg-muted/10 px-3 py-2'>
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <div className='min-w-0'>
          <p className='text-[11px] font-medium uppercase tracking-wide text-muted-foreground'>
            Playwright Sequencer Action
          </p>
          <div className='mt-1 flex flex-wrap items-center gap-2'>
            <span className='text-xs font-medium text-foreground'>
              {action.loading ? 'Loading…' : action.actionName ?? 'Runtime action'}
            </span>
            <Badge variant='secondary'>{actionKey}</Badge>
            {action.isSeedFallback ? <Badge variant='neutral'>Seed default</Badge> : null}
          </div>
        </div>
        <Badge variant='secondary'>{action.browserModeLabel}</Badge>
      </div>
      {action.actionDescription ? (
        <p className='mt-2 text-xs text-muted-foreground'>{action.actionDescription}</p>
      ) : null}
      <ToggleRow
        checked={action.headless}
        onCheckedChange={action.setHeadless}
        label='Action browser mode'
        description='Quick export uses this action unless a queue run overrides browser mode.'
        disabled={action.loading || action.saving}
        loading={action.loading || action.saving}
        variant='switch'
        toggleOnRowClick
      >
        <div className='pt-1 text-[11px] font-medium text-foreground'>
          Current: {action.headless ? 'Headless' : 'Headed'}
          {action.hasUnsavedChanges ? ' · Unsaved' : ''}
        </div>
      </ToggleRow>
    </div>
  );
}
