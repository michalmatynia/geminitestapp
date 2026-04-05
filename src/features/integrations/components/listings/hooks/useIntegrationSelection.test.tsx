// @vitest-environment jsdom

import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const createMultiQueryV2Mock = vi.hoisted(() => vi.fn());

vi.mock('@/shared/lib/query-factories-v2', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/lib/query-factories-v2')>();
  return {
    ...actual,
    createMultiQueryV2: createMultiQueryV2Mock,
  };
});

import { useIntegrationSelection } from './useIntegrationSelection';

describe('useIntegrationSelection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('prefers the Tradera default connection for Tradera integrations', async () => {
    createMultiQueryV2Mock.mockReturnValue([
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

  it('does not apply the Tradera browser default connection to Tradera API integrations', async () => {
    createMultiQueryV2Mock.mockReturnValue([
      { data: { connectionId: 'conn-base-1' } },
      { data: { connectionId: 'conn-tradera-browser-default' } },
      {
        data: [
          {
            id: 'integration-tradera-api-1',
            name: 'Tradera API',
            slug: 'tradera-api',
            connections: [
              { id: 'conn-tradera-api-1', name: 'API Alpha', integrationId: 'integration-tradera-api-1' },
              { id: 'conn-tradera-api-2', name: 'API Zulu', integrationId: 'integration-tradera-api-1' },
            ],
          },
        ],
        isPending: false,
      },
    ]);

    const { result } = renderHook(() => useIntegrationSelection('integration-tradera-api-1'));

    await waitFor(() => {
      expect(result.current.selectedConnectionId).toBe('conn-tradera-api-1');
    });
    expect(result.current.isTraderaIntegration).toBe(true);
  });

  it('filters the selection list to the requested marketplace scope', async () => {
    createMultiQueryV2Mock.mockReturnValue([
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
    createMultiQueryV2Mock.mockReturnValue([
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
});
