import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { NextRequest } from 'next/server';

import type { ApiHandlerContext } from '@/shared/contracts/ui/api';
import {
  DEFAULT_ECOMMERCE_PROVIDER_SETTINGS,
  type EcommerceProviderSettingsInput,
} from '@/shared/contracts/integrations/ecommerce-provider-settings';

const mocks = vi.hoisted(() => ({
  getEcommerceProviderSettings: vi.fn(),
  getSessionUser: vi.fn(),
  saveEcommerceProviderSettings: vi.fn(),
}));

vi.mock('@/features/integrations/services/ecommerce-provider-settings', () => ({
  getEcommerceProviderSettings: mocks.getEcommerceProviderSettings,
  saveEcommerceProviderSettings: mocks.saveEcommerceProviderSettings,
}));

vi.mock('@/shared/lib/api/session-registry', () => ({
  getSessionUser: mocks.getSessionUser,
}));

import {
  ecommerceProviderSettingsSaveRequestSchema,
  getHandler,
  putHandler,
} from './handler';

const buildContext = (
  userId: string | null = 'user-1',
  body: unknown = undefined
): ApiHandlerContext => ({
  body,
  correlationId: 'correlation-1',
  getElapsedMs: () => 0,
  requestId: 'request-1',
  startTime: 0,
  traceId: 'trace-1',
  userId,
});

const makeSettings = (): EcommerceProviderSettingsInput => ({
  ...DEFAULT_ECOMMERCE_PROVIDER_SETTINGS,
  payment: {
    payu: {
      ...DEFAULT_ECOMMERCE_PROVIDER_SETTINGS.payment.payu,
      clientId: 'payu-client',
      enabled: true,
      posId: '123456',
    },
  },
});

describe('products ecommerce provider settings handler', () => {
  beforeEach(() => {
    mocks.getEcommerceProviderSettings.mockReset();
    mocks.getSessionUser.mockReset();
    mocks.getSessionUser.mockResolvedValue({
      id: 'admin-1',
      isElevated: true,
      permissions: ['settings.manage'],
    });
    mocks.saveEcommerceProviderSettings.mockReset();
  });

  it('returns provider settings for an authenticated user', async () => {
    const settings = makeSettings();
    mocks.getEcommerceProviderSettings.mockResolvedValue({
      key: 'payment_shipping_provider_settings_v1',
      lastPushedAt: null,
      settings,
      updatedAt: '2026-05-13T10:00:00.000Z',
      updatedBy: 'admin-1',
    });

    const response = await getHandler(
      new Request('http://localhost/api/v2/products/pages/provider-settings') as NextRequest,
      buildContext('admin-1')
    );
    const body = (await response.json()) as {
      ok: boolean;
      settings: EcommerceProviderSettingsInput;
    };

    expect(response.status).toBe(200);
    expect(response.headers.get('Cache-Control')).toBe('no-store');
    expect(body).toMatchObject({
      ok: true,
      settings: { payment: { payu: { clientId: 'payu-client', enabled: true } } },
    });
  });

  it('saves provider settings with the ecommerce push option', async () => {
    const settings = makeSettings();
    mocks.saveEcommerceProviderSettings.mockResolvedValue({
      key: 'payment_shipping_provider_settings_v1',
      lastPushedAt: '2026-05-13T10:00:00.000Z',
      pushed: true,
      settings,
      targets: [{ dbName: 'ecom_local', source: 'local' }],
      updatedAt: '2026-05-13T10:00:00.000Z',
      updatedBy: 'admin-1',
    });

    const response = await putHandler(
      new Request('http://localhost/api/v2/products/pages/provider-settings', {
        method: 'PUT',
      }) as NextRequest,
      buildContext('admin-1', { pushToEcommerce: true, settings })
    );
    const body = (await response.json()) as { ok: boolean; pushed: boolean };

    expect(mocks.saveEcommerceProviderSettings).toHaveBeenCalledWith(settings, {
      pushToEcommerce: true,
      userId: 'admin-1',
    });
    expect(body).toMatchObject({ ok: true, pushed: true });
  });

  it('rejects unauthenticated provider settings requests', async () => {
    await expect(
      getHandler(
        new Request('http://localhost/api/v2/products/pages/provider-settings') as NextRequest,
        buildContext(null)
      )
    ).rejects.toThrow('Unauthorized');
    expect(mocks.getEcommerceProviderSettings).not.toHaveBeenCalled();
  });

  it('rejects authenticated non-admin provider settings requests', async () => {
    mocks.getSessionUser.mockResolvedValue({
      id: 'user-1',
      isElevated: false,
      permissions: [],
    });

    await expect(
      getHandler(
        new Request('http://localhost/api/v2/products/pages/provider-settings') as NextRequest,
        buildContext('user-1')
      )
    ).rejects.toThrow('elevated admin session');
    expect(mocks.getEcommerceProviderSettings).not.toHaveBeenCalled();
  });

  it('validates provider settings payload shape', () => {
    expect(
      ecommerceProviderSettingsSaveRequestSchema.safeParse({
        pushToEcommerce: true,
        settings: makeSettings(),
      }).success
    ).toBe(true);
  });
});
