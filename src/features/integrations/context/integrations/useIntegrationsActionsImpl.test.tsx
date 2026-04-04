// @vitest-environment jsdom

import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';

import type { IntegrationConnection, Integration } from '@/shared/contracts/integrations';

const {
  toastMock,
  upsertConnectionMutateAsyncMock,
} = vi.hoisted(() => ({
  toastMock: vi.fn(),
  upsertConnectionMutateAsyncMock: vi.fn(),
}));

vi.mock('@/shared/ui', () => ({
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
});
