// @vitest-environment jsdom

import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const useQueriesMock = vi.hoisted(() => vi.fn());

vi.mock('@tanstack/react-query', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-query')>();
  return {
    ...actual,
    useQueries: useQueriesMock,
  };
});

import { useIntegrationSelection } from './useIntegrationSelection';

describe('useIntegrationSelection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('prefers the Tradera default connection for Tradera integrations', async () => {
    useQueriesMock.mockReturnValue([
      { data: { connectionId: 'conn-base-1' } },
      { data: { connectionId: 'conn-tradera-2' } },
      {
        data: [
          {
            id: 'integration-tradera-1',
            name: 'Tradera',
            slug: 'tradera',
            connections: [
              { id: 'conn-tradera-1', name: 'Alpha', integrationId: 'integration-tradera-1' },
              { id: 'conn-tradera-2', name: 'Zulu', integrationId: 'integration-tradera-1' },
            ],
          },
        ],
        isPending: false,
      },
    ]);

    const { result } = renderHook(() => useIntegrationSelection('integration-tradera-1'));

    await waitFor(() => {
      expect(result.current.selectedConnectionId).toBe('conn-tradera-2');
    });
    expect(result.current.isTraderaIntegration).toBe(true);
  });

  it('filters the selection list to the requested marketplace scope', async () => {
    useQueriesMock.mockReturnValue([
      { data: { connectionId: 'conn-base-1' } },
      { data: { connectionId: 'conn-tradera-2' } },
      {
        data: [
          {
            id: 'integration-base-1',
            name: 'Base.com',
            slug: 'baselinker',
            connections: [{ id: 'conn-base-1', name: 'Base account', integrationId: 'integration-base-1' }],
          },
          {
            id: 'integration-tradera-1',
            name: 'Tradera',
            slug: 'tradera',
            connections: [
              { id: 'conn-tradera-1', name: 'Alpha', integrationId: 'integration-tradera-1' },
              { id: 'conn-tradera-2', name: 'Zulu', integrationId: 'integration-tradera-1' },
            ],
          },
        ],
        isPending: false,
      },
    ]);

    const { result } = renderHook(() =>
      useIntegrationSelection(undefined, undefined, { filterIntegrationSlug: 'tradera' })
    );

    await waitFor(() => {
      expect(result.current.integrations).toHaveLength(1);
    });

    expect(result.current.integrations[0]?.slug).toBe('tradera');
    expect(result.current.selectedIntegrationId).toBe('integration-tradera-1');
    expect(result.current.selectedConnectionId).toBe('conn-tradera-2');
  });

  it('updates the selected Tradera target when the initial recovery ids change after mount', async () => {
    useQueriesMock.mockReturnValue([
      { data: { connectionId: 'conn-base-1' } },
      { data: { connectionId: 'conn-tradera-1' } },
      {
        data: [
          {
            id: 'integration-tradera-1',
            name: 'Tradera A',
            slug: 'tradera',
            connections: [
              { id: 'conn-tradera-1', name: 'Alpha', integrationId: 'integration-tradera-1' },
            ],
          },
          {
            id: 'integration-tradera-2',
            name: 'Tradera B',
            slug: 'tradera',
            connections: [
              { id: 'conn-tradera-2', name: 'Bravo', integrationId: 'integration-tradera-2' },
            ],
          },
        ],
        isPending: false,
      },
    ]);

    const { result, rerender } = renderHook(
      ({
        integrationId,
        connectionId,
      }: {
        integrationId: string | null;
        connectionId: string | null;
      }) =>
        useIntegrationSelection(integrationId, connectionId, {
          filterIntegrationSlug: 'tradera',
        }),
      {
        initialProps: {
          integrationId: 'integration-tradera-1',
          connectionId: 'conn-tradera-1',
        },
      }
    );

    await waitFor(() => {
      expect(result.current.selectedIntegrationId).toBe('integration-tradera-1');
    });
    expect(result.current.selectedConnectionId).toBe('conn-tradera-1');

    rerender({
      integrationId: 'integration-tradera-2',
      connectionId: 'conn-tradera-2',
    });

    await waitFor(() => {
      expect(result.current.selectedIntegrationId).toBe('integration-tradera-2');
    });
    expect(result.current.selectedConnectionId).toBe('conn-tradera-2');
  });

  it('prefers the Vinted default connection for Vinted integrations', async () => {
    useQueriesMock.mockReturnValue([
      { data: { connectionId: 'conn-base-1' } },
      { data: { connectionId: 'conn-tradera-2' } },
      {
        data: [
          {
            id: 'integration-vinted-1',
            name: 'Vinted',
            slug: 'vinted',
            connections: [
              { id: 'conn-vinted-1', name: 'Alpha', integrationId: 'integration-vinted-1' },
              { id: 'conn-vinted-2', name: 'Zulu', integrationId: 'integration-vinted-1' },
            ],
          },
        ],
        isPending: false,
      },
      { data: { connectionId: 'conn-vinted-2' } },
    ]);

    const { result } = renderHook(() => useIntegrationSelection('integration-vinted-1'));

    await waitFor(() => {
      expect(result.current.selectedConnectionId).toBe('conn-vinted-2');
    });
  });
});
