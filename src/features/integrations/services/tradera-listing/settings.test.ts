import { describe, expect, it } from 'vitest';

import { DEFAULT_TRADERA_SYSTEM_SETTINGS } from '@/features/integrations/constants/tradera';

import {
  buildRelistPolicy,
  resolveConnectionListingSettings,
  resolveEffectiveListingSettings,
} from './settings';
import type { IntegrationConnectionRecord, ProductListing } from '@/shared/contracts/integrations';

const makeConnection = (
  overrides: Partial<IntegrationConnectionRecord> = {}
): IntegrationConnectionRecord =>
  ({
    id: 'connection-1',
    integrationId: 'integration-1',
    name: 'Tradera',
    apiKey: null,
    apiSecret: null,
    accessToken: null,
    refreshToken: null,
    expiresAt: null,
    sellerId: null,
    type: 'tradera',
    baseUrl: null,
    active: true,
    createdAt: '2026-04-03T10:00:00.000Z',
    updatedAt: '2026-04-03T10:00:00.000Z',
    traderaDefaultDurationHours: null,
    traderaAutoRelistEnabled: null,
    traderaAutoRelistLeadMinutes: null,
    traderaDefaultTemplateId: null,
    ...overrides,
  }) as IntegrationConnectionRecord;

const makeListing = (overrides: Partial<ProductListing> = {}): ProductListing =>
  ({
    id: 'listing-1',
    productId: 'product-1',
    integrationId: 'integration-1',
    connectionId: 'connection-1',
    externalListingId: null,
    inventoryId: null,
    status: 'draft',
    listedAt: null,
    expiresAt: null,
    nextRelistAt: null,
    relistPolicy: null,
    relistAttempts: 0,
    lastRelistedAt: null,
    lastStatusCheckAt: null,
    marketplaceData: null,
    failureReason: null,
    exportHistory: null,
    createdAt: '2026-04-03T10:00:00.000Z',
    updatedAt: '2026-04-03T10:00:00.000Z',
    ...overrides,
  }) as ProductListing;

describe('tradera listing settings helpers', () => {
  it('builds connection defaults from connection overrides and system settings', () => {
    const resolved = resolveConnectionListingSettings(
      makeConnection({
        traderaDefaultDurationHours: 48,
        traderaAutoRelistEnabled: false,
        traderaAutoRelistLeadMinutes: 30,
        traderaDefaultTemplateId: 'tpl-1',
      }),
      DEFAULT_TRADERA_SYSTEM_SETTINGS
    );

    expect(resolved).toEqual({
      durationHours: 48,
      autoRelistEnabled: false,
      autoRelistLeadMinutes: 30,
      templateId: 'tpl-1',
    });
  });

  it('applies valid listing policy overrides on top of fallback settings', () => {
    const resolved = resolveEffectiveListingSettings(
      makeListing({
        relistPolicy: {
          enabled: true,
          durationHours: 24,
          leadMinutes: 15,
          templateId: ' listing-template ',
        },
      }),
      makeConnection({
        traderaDefaultDurationHours: 72,
        traderaAutoRelistEnabled: false,
        traderaAutoRelistLeadMinutes: 120,
        traderaDefaultTemplateId: 'fallback-template',
      }),
      DEFAULT_TRADERA_SYSTEM_SETTINGS
    );

    expect(resolved).toEqual({
      durationHours: 24,
      autoRelistEnabled: true,
      autoRelistLeadMinutes: 15,
      templateId: 'listing-template',
    });
  });

  it('falls back when policy values are invalid and treats none template ids as null', () => {
    const resolved = resolveEffectiveListingSettings(
      makeListing({
        relistPolicy: {
          enabled: 'invalid' as never,
          durationHours: 0,
          leadMinutes: -5,
          templateId: 'none',
        },
      }),
      makeConnection({
        traderaDefaultDurationHours: 96,
        traderaAutoRelistEnabled: true,
        traderaAutoRelistLeadMinutes: 180,
        traderaDefaultTemplateId: 'fallback-template',
      }),
      DEFAULT_TRADERA_SYSTEM_SETTINGS
    );

    expect(resolved).toEqual({
      durationHours: 96,
      autoRelistEnabled: true,
      autoRelistLeadMinutes: 180,
      templateId: null,
    });
  });

  it('builds relist policy payloads from resolved settings', () => {
    expect(
      buildRelistPolicy({
        durationHours: 48,
        autoRelistEnabled: true,
        autoRelistLeadMinutes: 30,
        templateId: 'tpl-1',
      })
    ).toEqual({
      enabled: true,
      durationHours: 48,
      leadMinutes: 30,
      templateId: 'tpl-1',
    });
  });
});
