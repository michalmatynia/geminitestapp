import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  DEFAULT_ECOMMERCE_PROVIDER_SETTINGS,
  type EcommerceProviderSettingsInput,
} from '@/shared/contracts/integrations/ecommerce-provider-settings';

const mocks = vi.hoisted(() => ({
  apiGet: vi.fn(),
  apiPut: vi.fn(),
  toast: vi.fn(),
}));

vi.mock('@/shared/lib/api-client', () => ({
  api: {
    get: mocks.apiGet,
    put: mocks.apiPut,
  },
}));

vi.mock('@/shared/ui/primitives.public', async () => {
  const actual = await vi.importActual<typeof import('@/shared/ui/primitives.public')>(
    '@/shared/ui/primitives.public'
  );
  return {
    ...actual,
    useToast: () => ({ toast: mocks.toast }),
  };
});

import { EcommerceProviderSettingsPanel } from './EcommerceProviderSettingsPanel';

const renderPanel = (): ReturnType<typeof render> => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <EcommerceProviderSettingsPanel />
    </QueryClientProvider>
  );
};

const makeSettings = (): EcommerceProviderSettingsInput => ({
  ...DEFAULT_ECOMMERCE_PROVIDER_SETTINGS,
  payment: {
    ...DEFAULT_ECOMMERCE_PROVIDER_SETTINGS.payment,
    payu: {
      ...DEFAULT_ECOMMERCE_PROVIDER_SETTINGS.payment.payu,
      clientId: 'payu-client',
      enabled: true,
      posId: '123456',
    },
  },
  shipping: {
    ...DEFAULT_ECOMMERCE_PROVIDER_SETTINGS.shipping,
    inpost: {
      ...DEFAULT_ECOMMERCE_PROVIDER_SETTINGS.shipping.inpost,
      enabled: true,
      organizationId: 'org-1',
    },
  },
});

describe('EcommerceProviderSettingsPanel', () => {
  beforeEach(() => {
    mocks.apiGet.mockReset();
    mocks.apiPut.mockReset();
    mocks.toast.mockReset();
  });

  it('loads provider settings and saves them with ecommerce push enabled', async () => {
    const settings = makeSettings();
    mocks.apiGet.mockResolvedValue({
      key: 'payment_shipping_provider_settings_v1',
      lastPushedAt: null,
      ok: true,
      settings,
      updatedAt: '2026-05-13T10:00:00.000Z',
      updatedBy: 'admin-1',
    });
    mocks.apiPut.mockResolvedValue({
      key: 'payment_shipping_provider_settings_v1',
      lastPushedAt: '2026-05-13T10:10:00.000Z',
      ok: true,
      pushed: true,
      settings: {
        ...settings,
        payment: {
          ...settings.payment,
          payu: {
            ...settings.payment.payu,
            posId: '654321',
          },
        },
      },
      targets: [
        {
          dbName: 'ecom_local',
          matchedCount: 1,
          modifiedCount: 1,
          source: 'local',
          upsertedCount: 0,
        },
      ],
      updatedAt: '2026-05-13T10:10:00.000Z',
      updatedBy: 'admin-1',
    });

    renderPanel();

    expect(await screen.findByDisplayValue('123456')).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('POS ID'), { target: { value: '654321' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save settings' }));

    await waitFor(() => {
      expect(mocks.apiPut).toHaveBeenCalledWith(
        '/api/v2/products/pages/provider-settings',
        expect.objectContaining({
          pushToEcommerce: true,
          settings: expect.objectContaining({
            payment: expect.objectContaining({
              payu: expect.objectContaining({
                posId: '654321',
              }),
            }),
          }),
        }),
        { logError: false, timeout: 120_000 }
      );
    });
    expect(await screen.findByText('Local ecommerce')).toBeInTheDocument();
    expect(mocks.toast).toHaveBeenCalledWith(
      'Provider settings saved and pushed to ecommerce databases.',
      { variant: 'success' }
    );
  });
});
