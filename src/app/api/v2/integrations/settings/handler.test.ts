import { NextRequest, NextResponse } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TRADERA_SETTINGS_KEYS } from '@/features/integrations/constants/tradera';

const mocks = vi.hoisted(() => ({
  listIntegrationSettingValuesMock: vi.fn(),
  parseJsonBodyMock: vi.fn(),
  startTraderaRelistSchedulerQueueMock: vi.fn(),
  writeIntegrationSettingValueMock: vi.fn(),
}));

vi.mock('@/features/integrations/services/integration-settings-store', () => {
  const keys = [
    'tradera_default_duration_hours',
    'tradera_auto_relist_enabled',
    'tradera_auto_relist_lead_minutes',
    'tradera_relist_scheduler_enabled',
    'tradera_relist_scheduler_interval_ms',
    'tradera_allow_simulated_success',
    'tradera_listing_form_url',
    'tradera_selector_profile',
    'tradera_listing_price_currency_code',
    'tradera_export_default_connection_id',
    'vinted_export_default_connection_id',
    'scanner_1688_default_connection_id',
    'base_sync_poll_interval_minutes',
    'product_sync_profiles',
  ];
  const keySet = new Set(keys);

  return {
    INTEGRATION_SETTINGS_KEYS: keys,
    isIntegrationSettingKey: (key: string) => keySet.has(key),
    listIntegrationSettingValues: mocks.listIntegrationSettingValuesMock,
    writeIntegrationSettingValue: mocks.writeIntegrationSettingValueMock,
  };
});

vi.mock('@/features/integrations/server', () => ({
  startTraderaRelistSchedulerQueue: mocks.startTraderaRelistSchedulerQueueMock,
}));

vi.mock('@/shared/lib/api/parse-json', () => ({
  parseJsonBody: mocks.parseJsonBodyMock,
}));

import { getHandler, integrationSettingsSavePayloadSchema, postHandler } from './handler';

const createContext = (query?: unknown): Parameters<typeof getHandler>[1] => ({
  correlationId: 'correlation-1',
  getElapsedMs: () => 0,
  query,
  requestId: 'request-1',
  startTime: 0,
  traceId: 'trace-1',
});

const createRequest = (method: 'GET' | 'POST' = 'GET'): NextRequest =>
  new NextRequest('http://localhost/api/v2/integrations/settings', { method });

describe('integrations settings handler', () => {
  beforeEach(() => {
    mocks.listIntegrationSettingValuesMock.mockReset().mockResolvedValue(
      new Map<string, string>([
        [TRADERA_SETTINGS_KEYS.selectorProfile, 'default'],
        [TRADERA_SETTINGS_KEYS.listingPriceCurrencyCode, 'EUR'],
      ])
    );
    mocks.parseJsonBodyMock.mockReset().mockResolvedValue({
      data: {
        settings: [
          {
            key: TRADERA_SETTINGS_KEYS.selectorProfile,
            value: 'default',
          },
        ],
      },
      ok: true,
    });
    mocks.startTraderaRelistSchedulerQueueMock.mockReset();
    mocks.writeIntegrationSettingValueMock.mockReset().mockResolvedValue(undefined);
  });

  it('dedupes requested keys and reads only global integration settings', async () => {
    const response = await getHandler(
      createRequest(),
      createContext({
        keys: ` ${TRADERA_SETTINGS_KEYS.selectorProfile},${TRADERA_SETTINGS_KEYS.selectorProfile}, ${TRADERA_SETTINGS_KEYS.listingPriceCurrencyCode} `,
      })
    );

    await expect(response.json()).resolves.toEqual({
      settings: {
        [TRADERA_SETTINGS_KEYS.listingPriceCurrencyCode]: 'EUR',
        [TRADERA_SETTINGS_KEYS.selectorProfile]: 'default',
      },
    });
    expect(response.status).toBe(200);
    expect(mocks.listIntegrationSettingValuesMock).toHaveBeenCalledWith([
      TRADERA_SETTINGS_KEYS.selectorProfile,
      TRADERA_SETTINGS_KEYS.listingPriceCurrencyCode,
    ]);
  });

  it('rejects unsupported integration setting keys', async () => {
    const response = await getHandler(
      createRequest(),
      createContext({ keys: `${TRADERA_SETTINGS_KEYS.selectorProfile},unknown_key` })
    );

    await expect(response.json()).resolves.toEqual({
      error: 'Unsupported integration settings key.',
      keys: ['unknown_key'],
    });
    expect(response.status).toBe(400);
    expect(mocks.listIntegrationSettingValuesMock).not.toHaveBeenCalled();
  });

  it('writes supported integration settings and returns refreshed values', async () => {
    const response = await postHandler(createRequest('POST'), createContext());

    await expect(response.json()).resolves.toEqual({
      settings: {
        [TRADERA_SETTINGS_KEYS.listingPriceCurrencyCode]: 'EUR',
        [TRADERA_SETTINGS_KEYS.selectorProfile]: 'default',
      },
    });
    expect(response.status).toBe(200);
    expect(mocks.parseJsonBodyMock).toHaveBeenCalledWith(
      expect.any(NextRequest),
      integrationSettingsSavePayloadSchema,
      expect.objectContaining({ logPrefix: 'integrations.settings.POST' })
    );
    expect(mocks.writeIntegrationSettingValueMock).toHaveBeenCalledWith(
      TRADERA_SETTINGS_KEYS.selectorProfile,
      'default'
    );
    expect(mocks.listIntegrationSettingValuesMock).toHaveBeenCalledWith([
      TRADERA_SETTINGS_KEYS.selectorProfile,
    ]);
  });

  it('restarts the Tradera relist scheduler when scheduler settings change', async () => {
    mocks.parseJsonBodyMock.mockResolvedValueOnce({
      data: {
        settings: [
          {
            key: TRADERA_SETTINGS_KEYS.schedulerEnabled,
            value: 'true',
          },
        ],
      },
      ok: true,
    });

    const response = await postHandler(createRequest('POST'), createContext());

    expect(response.status).toBe(200);
    expect(mocks.writeIntegrationSettingValueMock).toHaveBeenCalledWith(
      TRADERA_SETTINGS_KEYS.schedulerEnabled,
      'true'
    );
    expect(mocks.startTraderaRelistSchedulerQueueMock).toHaveBeenCalledTimes(1);
  });

  it('returns parse failures without writing settings', async () => {
    const parseResponse = NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    mocks.parseJsonBodyMock.mockResolvedValueOnce({
      ok: false,
      response: parseResponse,
    });

    const response = await postHandler(createRequest('POST'), createContext());

    expect(response.status).toBe(400);
    expect(response).toBe(parseResponse);
    expect(mocks.writeIntegrationSettingValueMock).not.toHaveBeenCalled();
    expect(mocks.startTraderaRelistSchedulerQueueMock).not.toHaveBeenCalled();
  });
});
