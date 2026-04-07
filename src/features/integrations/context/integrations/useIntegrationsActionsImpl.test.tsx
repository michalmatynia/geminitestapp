// @vitest-environment jsdom

import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import type { IntegrationConnection } from '@/shared/contracts/integrations/connections';
import type { Integration } from '@/shared/contracts/integrations/base';
import { defaultPlaywrightSettings } from '@/shared/lib/playwright/settings';

const {
  toastMock,
  upsertConnectionMutateAsyncMock,
} = vi.hoisted(() => ({
  toastMock: vi.fn(),
  upsertConnectionMutateAsyncMock: vi.fn(),
}));

vi.mock('@/shared/ui/primitives.public', () => ({
  useToast: () => ({ toast: toastMock }),
}));

vi.mock('@/features/integrations/hooks/useIntegrationMutations', () => ({
  useCreateIntegration: () => ({ mutateAsync: vi.fn() }),
  useUpsertConnection: () => ({
    mutateAsync: (...args: unknown[]) => upsertConnectionMutateAsyncMock(...args),
  }),
  useDeleteConnection: () => ({ mutateAsync: vi.fn() }),
  useDisconnectAllegro: () => ({ mutateAsync: vi.fn() }),
  useDisconnectLinkedIn: () => ({ mutateAsync: vi.fn() }),
  useTestConnection: () => ({ mutateAsync: vi.fn() }),
  useBaseApiRequest: () => ({ mutateAsync: vi.fn() }),
  useAllegroApiRequest: () => ({ mutateAsync: vi.fn() }),
}));

import { createEmptyConnectionForm } from '../integrations-context-types';
import { useIntegrationsActionsImpl } from './useIntegrationsActionsImpl';

const createIntegration = (slug: string): Integration =>
  ({
    id: `integration-${slug}`,
    name: slug,
    slug,
    createdAt: '2026-04-02T00:00:00.000Z',
    updatedAt: '2026-04-02T00:00:00.000Z',
  }) as Integration;

const createArgs = (activeIntegration: Integration) => ({
  integrations: [activeIntegration],
  activeIntegration,
  setActiveIntegration: vi.fn(),
  connections: [] as IntegrationConnection[],
  editingConnectionId: null,
  setEditingConnectionId: vi.fn(),
  setIsModalOpen: vi.fn(),
  setConnectionToDelete: vi.fn(),
  connectionToDelete: null,
  setIsTesting: vi.fn(),
  setTestLog: vi.fn(),
  setSelectedStep: vi.fn(),
  setShowTestLogModal: vi.fn(),
  setShowTestErrorModal: vi.fn(),
  setTestError: vi.fn(),
  setTestErrorMeta: vi.fn(),
  setShowTestSuccessModal: vi.fn(),
  setTestSuccessMessage: vi.fn(),
  playwrightPersonas: [],
  setPlaywrightPersonaId: vi.fn(),
  setPlaywrightSettings: vi.fn(),
  playwrightPersonaId: null,
  playwrightSettings: {} as never,
  setShowSessionModal: vi.fn(),
  baseApiMethod: 'GET',
  baseApiParams: '',
  setBaseApiResponse: vi.fn(),
  setBaseApiError: vi.fn(),
  setBaseApiLoading: vi.fn(),
  allegroApiMethod: 'GET' as never,
  allegroApiBody: '',
  allegroApiPath: '',
  setAllegroApiResponse: vi.fn(),
  setAllegroApiError: vi.fn(),
  setAllegroApiLoading: vi.fn(),
  integrationsQuery: {
    isFetching: false,
    data: [activeIntegration],
    refetch: vi.fn(),
  } as never,
});

describe('useIntegrationsActionsImpl', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    upsertConnectionMutateAsyncMock.mockResolvedValue({ id: 'connection-1' });
  });

  it('persists scripted Tradera browser mode and Playwright script', async () => {
    const activeIntegration = createIntegration('tradera');
    const args = createArgs(activeIntegration);
    const { result } = renderHook(() => useIntegrationsActionsImpl(args));
    const form = {
      ...createEmptyConnectionForm(),
      name: 'Tradera Browser',
      username: 'seller@example.com',
      password: 'secret',
      traderaBrowserMode: 'scripted' as const,
      playwrightListingScript: 'export default async function run() {}',
    };

    await result.current.handleSaveConnection({
      mode: 'create',
      formData: form,
    });

    expect(upsertConnectionMutateAsyncMock).toHaveBeenCalledWith(
      expect.objectContaining({
        integrationId: activeIntegration.id,
        payload: expect.objectContaining({
          name: 'Tradera Browser',
          username: 'seller@example.com',
          password: 'secret',
          traderaBrowserMode: 'scripted',
          playwrightListingScript: 'export default async function run() {}',
        }),
      })
    );
  });

  it('allows scripted Tradera mode with an empty script (runtime falls back to managed default)', async () => {
    const activeIntegration = createIntegration('tradera');
    const args = createArgs(activeIntegration);
    const { result } = renderHook(() => useIntegrationsActionsImpl(args));
    const form = {
      ...createEmptyConnectionForm(),
      name: 'Tradera Browser',
      username: 'seller@example.com',
      password: 'secret',
      traderaBrowserMode: 'scripted' as const,
      playwrightListingScript: '   ',
    };

    await result.current.handleSaveConnection({
      mode: 'create',
      formData: form,
    });

    expect(upsertConnectionMutateAsyncMock).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({
          traderaBrowserMode: 'scripted',
          playwrightListingScript: null,
        }),
      })
    );
  });

  it('maps Playwright settings to connection payload fields when saving browser settings', async () => {
    const activeIntegration = createIntegration('tradera');
    const connection = {
      id: 'connection-1',
      integrationId: activeIntegration.id,
      name: 'Tradera browser',
      username: 'seller@example.com',
      createdAt: '2026-04-02T00:00:00.000Z',
      updatedAt: '2026-04-02T00:00:00.000Z',
    } as IntegrationConnection;
    const args = {
      ...createArgs(activeIntegration),
      connections: [connection],
      editingConnectionId: connection.id,
      playwrightPersonaId: 'persona-1',
      playwrightSettings: {
        ...defaultPlaywrightSettings,
        headless: false,
        slowMo: 125,
        timeout: 45000,
        navigationTimeout: 60000,
        humanizeMouse: true,
        mouseJitter: 12,
        clickDelayMin: 40,
        clickDelayMax: 160,
        inputDelayMin: 35,
        inputDelayMax: 140,
        actionDelayMin: 300,
        actionDelayMax: 1100,
        proxyEnabled: true,
        proxyServer: 'http://proxy.example.test',
        proxyUsername: 'proxy-user',
        proxyPassword: 'proxy-pass',
        emulateDevice: true,
        deviceName: 'iPhone 14 Pro',
      },
    };
    const { result } = renderHook(() => useIntegrationsActionsImpl(args));

    await result.current.handleSavePlaywrightSettings();

    expect(upsertConnectionMutateAsyncMock).toHaveBeenCalledWith(
      expect.objectContaining({
        integrationId: activeIntegration.id,
        connectionId: connection.id,
        payload: expect.objectContaining({
          name: connection.name,
          username: connection.username,
          playwrightPersonaId: 'persona-1',
          playwrightHeadless: false,
          playwrightSlowMo: 125,
          playwrightTimeout: 45000,
          playwrightNavigationTimeout: 60000,
          playwrightHumanizeMouse: true,
          playwrightMouseJitter: 12,
          playwrightClickDelayMin: 40,
          playwrightClickDelayMax: 160,
          playwrightInputDelayMin: 35,
          playwrightInputDelayMax: 140,
          playwrightActionDelayMin: 300,
          playwrightActionDelayMax: 1100,
          playwrightProxyEnabled: true,
          playwrightProxyServer: 'http://proxy.example.test',
          playwrightProxyUsername: 'proxy-user',
          playwrightProxyPassword: 'proxy-pass',
          playwrightEmulateDevice: true,
          playwrightDeviceName: 'iPhone 14 Pro',
        }),
      })
    );

    const [{ payload }] = upsertConnectionMutateAsyncMock.mock.calls.at(-1) as [
      { payload: Record<string, unknown> },
    ];

    expect(payload).not.toHaveProperty('headless');
    expect(payload).not.toHaveProperty('slowMo');
    expect(payload).not.toHaveProperty('proxyPassword');
  });

  it('allows creating a Vinted browser connection without username or password', async () => {
    const activeIntegration = createIntegration('vinted');
    const args = createArgs(activeIntegration);
    const { result } = renderHook(() => useIntegrationsActionsImpl(args));
    const form = {
      ...createEmptyConnectionForm(),
      name: 'Vinted Browser',
      username: '   ',
      password: '   ',
    };

    await result.current.handleSaveConnection({
      mode: 'create',
      formData: form,
    });

    const [{ payload }] = upsertConnectionMutateAsyncMock.mock.calls.at(-1) as [
      { payload: Record<string, unknown> },
    ];

    expect(upsertConnectionMutateAsyncMock).toHaveBeenCalledWith(
      expect.objectContaining({
        integrationId: activeIntegration.id,
        payload: expect.objectContaining({
          name: 'Vinted Browser',
        }),
      })
    );
    expect(payload).not.toHaveProperty('username');
    expect(payload).not.toHaveProperty('password');
  });
});
