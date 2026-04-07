// @vitest-environment jsdom

import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { QUERY_KEYS } from '@/shared/lib/query-keys';

const createUpdateMutationV2Mock = vi.hoisted(() => vi.fn());
const apiPostMock = vi.hoisted(() => vi.fn());

vi.mock('@/shared/lib/query-factories-v2', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/shared/lib/query-factories-v2')>();
  return {
    ...actual,
    createUpdateMutationV2: createUpdateMutationV2Mock,
  };
});

vi.mock('@/shared/lib/api-client', () => ({
  api: {
    post: apiPostMock,
  },
}));

import {
  useUpdateDefaultTraderaConnection,
  useUpdateDefaultVintedConnection,
} from './useIntegrationMutations';

describe('useIntegrationMutations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createUpdateMutationV2Mock.mockReturnValue({ kind: 'mutation' });
    apiPostMock.mockResolvedValue({ connectionId: 'conn-tradera-1' });
  });

  it('posts Tradera preferred connection updates to the dedicated endpoint', async () => {
    const { result } = renderHook(() => useUpdateDefaultTraderaConnection());
    const config = createUpdateMutationV2Mock.mock.calls[0]?.[0];

    expect(result.current).toEqual({ kind: 'mutation' });
    expect(config.mutationKey).toEqual(QUERY_KEYS.integrations.selection.traderaDefaultConnection());

    await expect(config.mutationFn({ connectionId: 'conn-tradera-1' })).resolves.toEqual({
      connectionId: 'conn-tradera-1',
    });
    expect(apiPostMock).toHaveBeenCalledWith(
      '/api/v2/integrations/exports/tradera/default-connection',
      { connectionId: 'conn-tradera-1' }
    );
    expect(config.invalidateKeys).toEqual([
      QUERY_KEYS.integrations.selection.traderaDefaultConnection(),
    ]);
  });

  it('posts Vinted preferred connection updates to the dedicated endpoint', async () => {
    apiPostMock.mockResolvedValue({ connectionId: 'conn-vinted-1' });
    const { result } = renderHook(() => useUpdateDefaultVintedConnection());
    const config = createUpdateMutationV2Mock.mock.calls[0]?.[0];

    expect(result.current).toEqual({ kind: 'mutation' });
    expect(config.mutationKey).toEqual(QUERY_KEYS.integrations.selection.vintedDefaultConnection());

    await expect(config.mutationFn({ connectionId: 'conn-vinted-1' })).resolves.toEqual({
      connectionId: 'conn-vinted-1',
    });
    expect(apiPostMock).toHaveBeenCalledWith(
      '/api/v2/integrations/exports/vinted/default-connection',
      { connectionId: 'conn-vinted-1' }
    );
    expect(config.invalidateKeys).toEqual([
      QUERY_KEYS.integrations.selection.vintedDefaultConnection(),
    ]);
  });
});
