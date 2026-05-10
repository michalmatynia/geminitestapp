'use client';

import Link from 'next/link';
import React, { useEffect, useMemo } from 'react';

import { resolveStepSequencerActionHref } from '@/features/playwright/utils/step-sequencer-action-links';
import type { IntegrationWithConnections } from '@/shared/contracts/integrations/domain';
import { Badge } from '@/shared/ui/primitives.public';
import { ToggleRow } from '@/shared/ui/forms-and-actions.public';

import {
  resolveTraderaListingRuntimeActionKey,
  type TraderaListingActionInfo,
  useTraderaListingActionForRuntimeKey,
} from './hooks/useTraderaListingAction';

type TraderaListingActionBrowserModePanelProps = {
  onBlockingStateChange?: (blocking: boolean) => void;
  selectedConnectionId: string;
  selectedIntegration: IntegrationWithConnections;
};

type TraderaListingConnection = IntegrationWithConnections['connections'][number];

const resolveSelectedConnection = (
  selectedIntegration: IntegrationWithConnections,
  selectedConnectionId: string
): TraderaListingConnection | null =>
  selectedIntegration.connections.find((connection) => connection.id === selectedConnectionId) ??
  null;

const resolveStepCountLabel = (action: TraderaListingActionInfo): string | null =>
  action.enabledStepCount !== null && action.totalStepCount !== null
    ? `Steps: ${action.enabledStepCount}/${action.totalStepCount}`
    : null;

const isActionBlocking = (action: TraderaListingActionInfo): boolean =>
  action.loading || action.saving || action.hasUnsavedChanges;

function TraderaListingActionName({
  action,
}: {
  action: TraderaListingActionInfo;
}): React.JSX.Element {
  if (action.loading) {
    return <span className='text-xs font-medium text-foreground'>Loading…</span>;
  }

  return (
    <Link
      href={resolveStepSequencerActionHref(action.actionId)}
      className='text-xs font-medium text-foreground underline-offset-4 hover:underline'
    >
      {action.actionName ?? 'Runtime action'}
    </Link>
  );
}

function TraderaListingActionBadges({
  action,
  actionKey,
}: {
  action: TraderaListingActionInfo;
  actionKey: string;
}): React.JSX.Element {
  const stepCountLabel = resolveStepCountLabel(action);

  return (
    <>
      <Badge variant='secondary'>{actionKey}</Badge>
      {action.isSeedFallback ? <Badge variant='neutral'>Seed default</Badge> : null}
      {stepCountLabel !== null ? <Badge variant='secondary'>{stepCountLabel}</Badge> : null}
    </>
  );
}

function TraderaListingActionDescription({
  action,
}: {
  action: TraderaListingActionInfo;
}): React.JSX.Element | null {
  if (action.actionDescription === null) return null;
  return <p className='mt-2 text-xs text-muted-foreground'>{action.actionDescription}</p>;
}

function TraderaListingActionToggle({
  action,
}: {
  action: TraderaListingActionInfo;
}): React.JSX.Element {
  return (
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
  );
}

export function TraderaListingActionBrowserModePanel({
  onBlockingStateChange,
  selectedConnectionId,
  selectedIntegration,
}: TraderaListingActionBrowserModePanelProps): React.JSX.Element | null {
  const selectedConnection = useMemo(
    () => resolveSelectedConnection(selectedIntegration, selectedConnectionId),
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
  const actionBlocking = isActionBlocking(action);

  useEffect(() => {
    onBlockingStateChange?.(actionBlocking);
    return (): void => {
      onBlockingStateChange?.(false);
    };
  }, [actionBlocking, onBlockingStateChange]);

  if (actionKey === null) return null;

  return (
    <div className='rounded-md border border-border/40 bg-muted/10 px-3 py-2'>
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <div className='min-w-0'>
          <p className='text-[11px] font-medium uppercase tracking-wide text-muted-foreground'>
            Playwright Sequencer Action
          </p>
          <div className='mt-1 flex flex-wrap items-center gap-2'>
            <TraderaListingActionName action={action} />
            <TraderaListingActionBadges action={action} actionKey={actionKey} />
          </div>
        </div>
        <Badge variant='secondary'>{action.browserModeLabel}</Badge>
      </div>
      <TraderaListingActionDescription action={action} />
      <TraderaListingActionToggle action={action} />
    </div>
  );
}
