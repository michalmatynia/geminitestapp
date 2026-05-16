'use client';

import { useRouter } from 'nextjs-toploader/app';
import { startTransition, useCallback, useMemo, useState } from 'react';

import { useSettingsStore } from '@/shared/providers/SettingsStoreProvider';

import { useAdminFilemakerOrganizationEditPageStateContext } from '../../context/AdminFilemakerOrganizationEditPageContext';
import {
  FILEMAKER_EMAIL_CAMPAIGNS_KEY,
  FILEMAKER_EMAIL_CAMPAIGN_DELIVERIES_KEY,
  parseFilemakerEmailCampaignDeliveryRegistry,
  parseFilemakerEmailCampaignRegistry,
} from '../../settings';

import type {
  OrganizationCampaignDeliveryActiveGroup,
  OrganizationCampaignDeliveryGroup,
  OrganizationCampaignDeliveryViewMode,
} from './OrganizationCampaignDeliveriesSection.types';
import type {
  FilemakerEmail,
  FilemakerEmailCampaign,
  FilemakerEmailCampaignDelivery,
  FilemakerOrganization,
} from '../../types';

export type OrganizationCampaignDeliveriesModel = {
  organization: FilemakerOrganization | null;
  emails: FilemakerEmail[];
  mode: OrganizationCampaignDeliveryViewMode;
  setMode: (mode: OrganizationCampaignDeliveryViewMode) => void;
  expandedKey: string | null;
  setExpandedKey: (value: string | null) => void;
  orgDeliveries: FilemakerEmailCampaignDelivery[];
  activeGroups: OrganizationCampaignDeliveryActiveGroup[];
  campaignsById: Map<string, FilemakerEmailCampaign>;
  navigateToRun: (runId: string) => void;
  navigateToCampaign: (campaignId: string) => void;
  navigateToEmail: (emailId: string) => void;
};

const parseSafeTimestamp = (value: string | null | undefined): number => {
  const parsed = Date.parse(value ?? '');
  return Number.isNaN(parsed) ? 0 : parsed;
};

const resolveDeliveryTimestamp = (delivery: FilemakerEmailCampaignDelivery): number =>
  parseSafeTimestamp(delivery.sentAt ?? delivery.updatedAt ?? delivery.createdAt);

export const compareDeliveriesByDateDesc = (
  left: FilemakerEmailCampaignDelivery,
  right: FilemakerEmailCampaignDelivery
): number => resolveDeliveryTimestamp(right) - resolveDeliveryTimestamp(left);

const useCampaignsById = (rawCampaigns: string | null): Map<string, FilemakerEmailCampaign> =>
  useMemo(() => {
    const registry = parseFilemakerEmailCampaignRegistry(rawCampaigns);
    return new Map(registry.campaigns.map((entry) => [entry.id, entry]));
  }, [rawCampaigns]);

const useOrganizationDeliveries = (
  organization: FilemakerOrganization | null,
  emails: FilemakerEmail[],
  rawDeliveries: string | null
): FilemakerEmailCampaignDelivery[] =>
  useMemo(() => {
    if (organization === null) return [];
    const registry = parseFilemakerEmailCampaignDeliveryRegistry(rawDeliveries);
    const linkedEmailAddresses = new Set(
      emails.map((email: FilemakerEmail): string => email.email.trim().toLowerCase())
    );
    const linkedEmailIds = new Set(emails.map((email: FilemakerEmail): string => email.id));
    return registry.deliveries
      .filter((delivery: FilemakerEmailCampaignDelivery): boolean =>
        isDeliveryLinkedToOrganization(delivery, organization.id, linkedEmailIds, linkedEmailAddresses)
      )
      .slice()
      .sort(compareDeliveriesByDateDesc);
  }, [emails, organization, rawDeliveries]);

const isDeliveryLinkedToOrganization = (
  delivery: FilemakerEmailCampaignDelivery,
  organizationId: string,
  linkedEmailIds: Set<string>,
  linkedEmailAddresses: Set<string>
): boolean => {
  if (delivery.partyKind !== 'organization' || delivery.partyId !== organizationId) return false;
  const matchesEmailId =
    typeof delivery.emailId === 'string' && linkedEmailIds.has(delivery.emailId);
  const normalizedAddress = delivery.emailAddress.trim().toLowerCase();
  return matchesEmailId || linkedEmailAddresses.has(normalizedAddress);
};

const useGroupsByEmail = (
  emails: FilemakerEmail[],
  orgDeliveries: FilemakerEmailCampaignDelivery[]
): OrganizationCampaignDeliveryGroup<FilemakerEmail>[] =>
  useMemo(() => {
    const map = new Map<string, OrganizationCampaignDeliveryGroup<FilemakerEmail>>();
    emails.forEach((email: FilemakerEmail): void => {
      map.set(email.id, { key: email.id, entity: email, deliveries: [] });
    });
    orgDeliveries.forEach((delivery: FilemakerEmailCampaignDelivery): void => {
      const matchingEmail = findDeliveryEmail(delivery, emails);
      if (matchingEmail === null) return;
      map.get(matchingEmail.id)?.deliveries.push(delivery);
    });
    return Array.from(map.values()).filter((group) => group.deliveries.length > 0);
  }, [emails, orgDeliveries]);

const findDeliveryEmail = (
  delivery: FilemakerEmailCampaignDelivery,
  emails: FilemakerEmail[]
): FilemakerEmail | null =>
  emails.find(
    (email: FilemakerEmail): boolean =>
      email.id === delivery.emailId ||
      email.email.trim().toLowerCase() === delivery.emailAddress.trim().toLowerCase()
  ) ?? null;

const useGroupsByCampaign = (
  orgDeliveries: FilemakerEmailCampaignDelivery[],
  campaignsById: Map<string, FilemakerEmailCampaign>
): OrganizationCampaignDeliveryGroup<FilemakerEmailCampaign | null>[] =>
  useMemo(() => {
    const map = new Map<string, OrganizationCampaignDeliveryGroup<FilemakerEmailCampaign | null>>();
    orgDeliveries.forEach((delivery: FilemakerEmailCampaignDelivery): void => {
      const existing = map.get(delivery.campaignId);
      if (existing !== undefined) {
        existing.deliveries.push(delivery);
        return;
      }
      map.set(delivery.campaignId, {
        key: delivery.campaignId,
        entity: campaignsById.get(delivery.campaignId) ?? null,
        deliveries: [delivery],
      });
    });
    return Array.from(map.values()).sort(compareDeliveryGroupsByLatestDelivery);
  }, [campaignsById, orgDeliveries]);

const compareDeliveryGroupsByLatestDelivery = (
  left: OrganizationCampaignDeliveryGroup<FilemakerEmailCampaign | null>,
  right: OrganizationCampaignDeliveryGroup<FilemakerEmailCampaign | null>
): number => {
  const leftDelivery = left.deliveries[0] ?? null;
  const rightDelivery = right.deliveries[0] ?? null;
  if (leftDelivery === null || rightDelivery === null) return 0;
  return compareDeliveriesByDateDesc(leftDelivery, rightDelivery);
};

const useDeliveryNavigation = (): Pick<
  OrganizationCampaignDeliveriesModel,
  'navigateToRun' | 'navigateToCampaign' | 'navigateToEmail'
> => {
  const router = useRouter();
  return {
    navigateToRun: useCallback((runId: string): void => {
      if (runId.length === 0) return;
      startTransition(() => { router.push(`/admin/filemaker/campaigns/runs/${encodeURIComponent(runId)}`); });
    }, [router]),
    navigateToCampaign: useCallback((campaignId: string): void => {
      if (campaignId.length === 0) return;
      startTransition(() => { router.push(`/admin/filemaker/campaigns/${encodeURIComponent(campaignId)}`); });
    }, [router]),
    navigateToEmail: useCallback((emailId: string): void => {
      if (emailId.length === 0) return;
      startTransition(() => { router.push(`/admin/filemaker/emails/${encodeURIComponent(emailId)}`); });
    }, [router]),
  };
};

export const useOrganizationCampaignDeliveriesModel = (): OrganizationCampaignDeliveriesModel => {
  const { organization, emails } = useAdminFilemakerOrganizationEditPageStateContext();
  const settingsStore = useSettingsStore();
  const [mode, setMode] = useState<OrganizationCampaignDeliveryViewMode>('by_email');
  const [expandedKey, setExpandedKey] = useState<string | null>(null);
  const rawCampaigns = settingsStore.get(FILEMAKER_EMAIL_CAMPAIGNS_KEY);
  const rawDeliveries = settingsStore.get(FILEMAKER_EMAIL_CAMPAIGN_DELIVERIES_KEY);
  const campaignsById = useCampaignsById(rawCampaigns ?? null);
  const orgDeliveries = useOrganizationDeliveries(organization, emails, rawDeliveries ?? null);
  const groupsByEmail = useGroupsByEmail(emails, orgDeliveries);
  const groupsByCampaign = useGroupsByCampaign(orgDeliveries, campaignsById);
  const navigation = useDeliveryNavigation();
  return {
    organization,
    emails,
    mode,
    setMode,
    expandedKey,
    setExpandedKey,
    orgDeliveries,
    activeGroups: mode === 'by_email' ? groupsByEmail : groupsByCampaign,
    campaignsById,
    ...navigation,
  };
};
