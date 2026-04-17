// @vitest-environment jsdom

import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import type { IntegrationConnection } from '@/shared/contracts/integrations/connections';
import type { Integration } from '@/shared/contracts/integrations/base';

const {
  toastMock,
  upsertConnectionMutateAsyncMock,
  testConnectionMutateAsyncMock,
} = vi.hoisted(() => ({
  toastMock: vi.fn(),
  upsertConnectionMutateAsyncMock: vi.fn(),
  testConnectionMutateAsyncMock: vi.fn(),
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
  useTestConnection: () => ({
    mutateAsync: (...args: unknown[]) => testConnectionMutateAsyncMock(...args),
  }),
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
    testConnectionMutateAsyncMock.mockResolvedValue({
      ok: true,
      steps: [],
      sessionReady: true,
    });
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

  it('persists 1688 profile fields without requiring credentials', async () => {
    const activeIntegration = createIntegration('1688');
    const args = createArgs(activeIntegration);
    const { result } = renderHook(() => useIntegrationsActionsImpl(args));
    const form = {
      ...createEmptyConnectionForm(),
      name: '1688 Browser',
      username: '   ',
      password: '   ',
      scanner1688StartUrl: 'https://detail.1688.com/',
      scanner1688LoginMode: 'manual_login' as const,
      scanner1688DefaultSearchMode: 'image_url_fallback' as const,
      scanner1688CandidateResultLimit: '12',
      scanner1688MinimumCandidateScore: '8',
      scanner1688MaxExtractedImages: '14',
      scanner1688AllowUrlImageSearchFallback: true,
    };

    await result.current.handleSaveConnection({
      mode: 'create',
      formData: form,
    });

    expect(upsertConnectionMutateAsyncMock).toHaveBeenCalledWith(
      expect.objectContaining({
        integrationId: activeIntegration.id,
        payload: expect.objectContaining({
          name: '1688 Browser',
          scanner1688StartUrl: 'https://detail.1688.com/',
          scanner1688LoginMode: 'manual_login',
          scanner1688DefaultSearchMode: 'image_url_fallback',
          scanner1688CandidateResultLimit: 12,
          scanner1688MinimumCandidateScore: 8,
          scanner1688MaxExtractedImages: 14,
          scanner1688AllowUrlImageSearchFallback: true,
        }),
      })
    );

    const [{ payload }] = upsertConnectionMutateAsyncMock.mock.calls.at(-1) as [
      { payload: Record<string, unknown> },
    ];

    expect(payload).not.toHaveProperty('username');
    expect(payload).not.toHaveProperty('password');
  });

  it('starts the 1688 manual login flow with the extended timeout', async () => {
    const activeIntegration = createIntegration('1688');
    const connection = {
      id: 'connection-1688',
      integrationId: activeIntegration.id,
      name: '1688 Browser',
      username: '',
      createdAt: '2026-04-02T00:00:00.000Z',
      updatedAt: '2026-04-02T00:00:00.000Z',
    } as IntegrationConnection;
    const args = {
      ...createArgs(activeIntegration),
      connections: [connection],
    };
    const { result } = renderHook(() => useIntegrationsActionsImpl(args));

    await result.current.handle1688ManualLogin(connection);

    expect(testConnectionMutateAsyncMock).toHaveBeenCalledWith({
      integrationId: activeIntegration.id,
      connectionId: 'connection-1688',
      type: 'test',
      body: {
        mode: 'manual',
        manualTimeoutMs: 300000,
      },
      timeoutMs: 360000,
    });
  });

  it('does not persist browser preference through the integration save path', async () => {
    const activeIntegration = createIntegration('tradera');
    const { result } = renderHook(() => useIntegrationsActionsImpl(createArgs(activeIntegration)));

    await result.current.handleSaveConnection({
      mode: 'update',
      connectionId: 'connection-1',
      formData: {
        ...createEmptyConnectionForm(),
        name: 'Tradera Browser',
        username: 'seller@example.com',
      },
    });

    expect(upsertConnectionMutateAsyncMock).toHaveBeenCalledWith(
      expect.objectContaining({
        connectionId: 'connection-1',
        payload: expect.not.objectContaining({
          playwrightBrowser: expect.anything(),
        }),
      })
    );
  });
});
