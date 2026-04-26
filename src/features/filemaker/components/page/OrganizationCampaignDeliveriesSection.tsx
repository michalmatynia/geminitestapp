'use client';

import { Megaphone } from 'lucide-react';
import React, { useMemo, useState } from 'react';

import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';
import { Badge, Button } from '@/shared/ui/primitives.public';
import { FormSection } from '@/shared/ui/forms-and-actions.public';

import { useAdminFilemakerOrganizationEditPageStateContext } from '../../context/AdminFilemakerOrganizationEditPageContext';
import {
  FILEMAKER_EMAIL_CAMPAIGNS_KEY,
  FILEMAKER_EMAIL_CAMPAIGN_DELIVERIES_KEY,
  parseFilemakerEmailCampaignDeliveryRegistry,
  parseFilemakerEmailCampaignRegistry,
} from '../../settings';
import type {
  FilemakerEmail,
  FilemakerEmailCampaign,
  FilemakerEmailCampaignDelivery,
} from '../../types';
import { formatTimestamp } from '../../pages/filemaker-page-utils';

type ViewMode = 'by_email' | 'by_campaign';

interface DeliveryGroup<TKeyEntity> {
  key: string;
  entity: TKeyEntity;
  deliveries: FilemakerEmailCampaignDelivery[];
}

const DELIVERY_STATUS_VARIANT: Record<
  FilemakerEmailCampaignDelivery['status'],
  'default' | 'outline' | 'destructive'
> = {
  sent: 'default',
  queued: 'outline',
  skipped: 'outline',
  failed: 'destructive',
  bounced: 'destructive',
};

const compareDeliveriesByDateDesc = (
  left: FilemakerEmailCampaignDelivery,
  right: FilemakerEmailCampaignDelivery
): number => {
  const leftAt = Date.parse(left.sentAt ?? left.updatedAt ?? left.createdAt ?? '');
  const rightAt = Date.parse(right.sentAt ?? right.updatedAt ?? right.createdAt ?? '');
  const safeLeft = Number.isNaN(leftAt) ? 0 : leftAt;
  const safeRight = Number.isNaN(rightAt) ? 0 : rightAt;
  return safeRight - safeLeft;
};

export function OrganizationCampaignDeliveriesSection(): React.JSX.Element | null {
  const { organization, emails } = useAdminFilemakerOrganizationEditPageStateContext();
  const settingsStore = useSettingsStore();
  const [mode, setMode] = useState<ViewMode>('by_email');
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  const rawCampaigns = settingsStore.get(FILEMAKER_EMAIL_CAMPAIGNS_KEY);
  const rawDeliveries = settingsStore.get(FILEMAKER_EMAIL_CAMPAIGN_DELIVERIES_KEY);

  const campaignsById = useMemo<Map<string, FilemakerEmailCampaign>>(() => {
    const registry = parseFilemakerEmailCampaignRegistry(rawCampaigns);
    return new Map(registry.campaigns.map((entry) => [entry.id, entry]));
  }, [rawCampaigns]);

  const orgDeliveries = useMemo<FilemakerEmailCampaignDelivery[]>(() => {
    if (!organization) return [];
    const registry = parseFilemakerEmailCampaignDeliveryRegistry(rawDeliveries);
    const linkedEmailAddresses = new Set(
      emails.map((email: FilemakerEmail): string => email.email.trim().toLowerCase())
    );
    const linkedEmailIds = new Set(emails.map((email: FilemakerEmail): string => email.id));
    return registry.deliveries
      .filter((delivery: FilemakerEmailCampaignDelivery): boolean => {
        if (delivery.partyKind !== 'organization' || delivery.partyId !== organization.id) {
          return false;
        }
        // Defence in depth: a delivery for this org should also resolve to one of its linked emails.
        const matchesEmailId = delivery.emailId !== null && linkedEmailIds.has(delivery.emailId);
        const matchesAddress = linkedEmailAddresses.has(delivery.emailAddress.trim().toLowerCase());
        return matchesEmailId || matchesAddress;
      })
      .slice()
      .sort(compareDeliveriesByDateDesc);
  }, [emails, organization, rawDeliveries]);

  const groupsByEmail = useMemo<DeliveryGroup<FilemakerEmail>[]>(() => {
    const map = new Map<string, DeliveryGroup<FilemakerEmail>>();
    emails.forEach((email: FilemakerEmail) => {
      map.set(email.id, { key: email.id, entity: email, deliveries: [] });
    });
    orgDeliveries.forEach((delivery: FilemakerEmailCampaignDelivery) => {
      const matchingEmail =
        emails.find(
          (email: FilemakerEmail): boolean =>
            email.id === delivery.emailId ||
            email.email.trim().toLowerCase() === delivery.emailAddress.trim().toLowerCase()
        ) ?? null;
      if (!matchingEmail) return;
      const group = map.get(matchingEmail.id);
      if (!group) return;
      group.deliveries.push(delivery);
    });
    return Array.from(map.values()).filter((group) => group.deliveries.length > 0);
  }, [emails, orgDeliveries]);

  const groupsByCampaign = useMemo<DeliveryGroup<FilemakerEmailCampaign | null>[]>(() => {
    const map = new Map<string, DeliveryGroup<FilemakerEmailCampaign | null>>();
    orgDeliveries.forEach((delivery: FilemakerEmailCampaignDelivery) => {
      const existing = map.get(delivery.campaignId);
      if (existing) {
        existing.deliveries.push(delivery);
        return;
      }
      const campaign = campaignsById.get(delivery.campaignId) ?? null;
      map.set(delivery.campaignId, {
        key: delivery.campaignId,
        entity: campaign,
        deliveries: [delivery],
      });
    });
    return Array.from(map.values()).sort((left, right) =>
      compareDeliveriesByDateDesc(left.deliveries[0]!, right.deliveries[0]!)
    );
  }, [orgDeliveries, campaignsById]);

  if (!organization) return null;

  const activeGroups: Array<DeliveryGroup<FilemakerEmail | FilemakerEmailCampaign | null>> =
    mode === 'by_email' ? groupsByEmail : groupsByCampaign;

  return (
    <FormSection
      title={
        <span className='flex items-center gap-2'>
          <Megaphone className='h-3.5 w-3.5 text-gray-400' aria-hidden='true' />
          Campaign delivery log
        </span>
      }
      className='space-y-4 p-4'
    >
      <div className='flex flex-wrap items-center justify-between gap-2 text-xs text-gray-400'>
        <div>
          {orgDeliveries.length === 0
            ? 'No campaign deliveries recorded for emails linked to this organization.'
            : `${orgDeliveries.length} delivery ${orgDeliveries.length === 1 ? 'record' : 'records'} for ${emails.length} linked email ${emails.length === 1 ? 'address' : 'addresses'}.`}
        </div>
        <div className='flex items-center gap-1' role='tablist' aria-label='View mode'>
          <Button
            type='button'
            variant={mode === 'by_email' ? 'default' : 'outline'}
            size='sm'
            className='h-7 text-[11px]'
            role='tab'
            aria-selected={mode === 'by_email'}
            onClick={(): void => {
              setMode('by_email');
              setExpandedKey(null);
            }}
          >
            By email
          </Button>
          <Button
            type='button'
            variant={mode === 'by_campaign' ? 'default' : 'outline'}
            size='sm'
            className='h-7 text-[11px]'
            role='tab'
            aria-selected={mode === 'by_campaign'}
            onClick={(): void => {
              setMode('by_campaign');
              setExpandedKey(null);
            }}
          >
            By campaign
          </Button>
        </div>
      </div>

      {activeGroups.length === 0 ? (
        <div className='rounded-md border border-dashed border-border/60 p-4 text-center text-xs text-gray-500'>
          {mode === 'by_email'
            ? 'No campaigns have been sent to any email linked to this organization yet.'
            : 'No campaigns have reached this organization yet.'}
        </div>
      ) : (
        <ul className='divide-y divide-border/40 rounded-md border border-border/60 bg-card/20'>
          {activeGroups.map((group) => (
            <DeliveryGroupRow
              key={group.key}
              mode={mode}
              group={group}
              campaignsById={campaignsById}
              expanded={expandedKey === group.key}
              onToggle={(): void => {
                setExpandedKey((current) => (current === group.key ? null : group.key));
              }}
            />
          ))}
        </ul>
      )}
    </FormSection>
  );
}

function DeliveryGroupRow({
  mode,
  group,
  campaignsById,
  expanded,
  onToggle,
}: {
  mode: ViewMode;
  group: DeliveryGroup<FilemakerEmail | FilemakerEmailCampaign | null>;
  campaignsById: Map<string, FilemakerEmailCampaign>;
  expanded: boolean;
  onToggle: () => void;
}): React.JSX.Element {
  const lastDelivery = group.deliveries[0] ?? null;
  const headerLabel = mode === 'by_email'
    ? (group.entity as FilemakerEmail | null)?.email ?? '—'
    : (group.entity as FilemakerEmailCampaign | null)?.name ?? `Deleted campaign (${group.key})`;
  const headerSecondary = mode === 'by_email'
    ? `${group.deliveries.length} delivery ${group.deliveries.length === 1 ? 'record' : 'records'}`
    : (group.entity as FilemakerEmailCampaign | null)?.subject || '';

  return (
    <li className='flex flex-col'>
      <button
        type='button'
        onClick={onToggle}
        className='flex w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-card/40'
        aria-expanded={expanded}
      >
        <div className='min-w-0'>
          <div className='truncate text-sm text-white'>{headerLabel}</div>
          {headerSecondary ? (
            <div className='truncate text-[11px] text-gray-500'>{headerSecondary}</div>
          ) : null}
        </div>
        <div className='flex shrink-0 items-center gap-2'>
          {lastDelivery ? (
            <Badge variant={DELIVERY_STATUS_VARIANT[lastDelivery.status]} className='text-[10px]'>
              {lastDelivery.status}
            </Badge>
          ) : null}
          <span className='text-[11px] text-gray-500'>
            {formatTimestamp(lastDelivery?.sentAt ?? lastDelivery?.updatedAt ?? null)}
          </span>
          <span className='text-[11px] text-gray-400'>{expanded ? '▾' : '▸'}</span>
        </div>
      </button>
      {expanded ? (
        <ul className='space-y-1 border-t border-border/30 bg-card/10 p-3 text-[11px]'>
          {group.deliveries.map((delivery: FilemakerEmailCampaignDelivery) => {
            const campaign = campaignsById.get(delivery.campaignId) ?? null;
            const detailLabel = mode === 'by_email'
              ? campaign?.name ?? `Deleted campaign (${delivery.campaignId})`
              : delivery.emailAddress;
            const detailSecondary = mode === 'by_email'
              ? campaign?.subject ?? null
              : null;
            return (
              <li
                key={delivery.id}
                className='flex flex-wrap items-center justify-between gap-2 rounded border border-border/30 bg-card/20 px-2 py-1.5'
              >
                <div className='min-w-0'>
                  <div className='truncate text-white'>{detailLabel}</div>
                  {detailSecondary ? (
                    <div className='truncate text-[10px] text-gray-500'>{detailSecondary}</div>
                  ) : null}
                </div>
                <div className='flex items-center gap-2'>
                  {delivery.failureCategory ? (
                    <Badge variant='outline' className='text-[10px]'>
                      {delivery.failureCategory}
                    </Badge>
                  ) : null}
                  <Badge variant={DELIVERY_STATUS_VARIANT[delivery.status]} className='text-[10px]'>
                    {delivery.status}
                  </Badge>
                  <span className='text-gray-500'>
                    {formatTimestamp(delivery.sentAt ?? delivery.updatedAt ?? null)}
                  </span>
                </div>
              </li>
            );
          })}
        </ul>
      ) : null}
    </li>
  );
}
