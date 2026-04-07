// @vitest-environment jsdom

import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { integrationKeys } from '@/shared/lib/query-key-exports';

const createListQueryV2Mock = vi.hoisted(() => vi.fn());
const createSingleQueryV2Mock = vi.hoisted(() => vi.fn());
const apiGetMock = vi.hoisted(() => vi.fn());
const apiPostMock = vi.hoisted(() => vi.fn());

vi.mock('@/shared/lib/query-factories-v2', () => ({
  createListQueryV2: createListQueryV2Mock,
  createSingleQueryV2: createSingleQueryV2Mock,
}));

vi.mock('@/shared/lib/api-client', () => ({
  api: {
    get: apiGetMock,
    post: apiPostMock,
  },
  ApiError: class ApiError extends Error {},
}));

import {
  useDefaultTraderaConnection,
  useDefaultVintedConnection,
  useIntegrationConnections,
  useIntegrations,
} from './useIntegrationQueries';

describe('useIntegrationQueries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createListQueryV2Mock.mockReturnValue({ kind: 'list-query' });
    createSingleQueryV2Mock.mockReturnValue({ kind: 'single-query' });
    apiGetMock.mockResolvedValue([]);
  });

  it('uses an extended timeout for integrations list requests', async () => {
    const { result } = renderHook(() => useIntegrations());
    const config = createListQueryV2Mock.mock.calls[0]?.[0];

    expect(result.current).toEqual({ kind: 'list-query' });
    expect(config.queryKey).toEqual(integrationKeys.all);

    await expect(config.queryFn()).resolves.toEqual([]);
    expect(apiGetMock).toHaveBeenCalledWith('/api/v2/integrations', {
      timeout: 30_000,
    });
  });

  it('supports disabling integrations list and connections queries explicitly', () => {
    renderHook(() => useIntegrations({ enabled: false }));
    const integrationsConfig = createListQueryV2Mock.mock.calls[0]?.[0];

    expect(integrationsConfig.enabled).toBe(false);

    renderHook(() => useIntegrationConnections('integration-1', { enabled: false }));
    const connectionsConfig = createListQueryV2Mock.mock.calls[1]?.[0];

    expect(connectionsConfig.enabled).toBe(false);
  });

  it('uses the extended timeout for integration connections and skips empty ids', async () => {
    const withId = renderHook(() => useIntegrationConnections('integration-1'));
    const withIdConfig = createListQueryV2Mock.mock.calls[0]?.[0];

    expect(withId.result.current).toEqual({ kind: 'list-query' });
    expect(withIdConfig.queryKey).toEqual(integrationKeys.connections('integration-1'));
    expect(withIdConfig.enabled).toBe(true);

    await expect(withIdConfig.queryFn()).resolves.toEqual([]);
    expect(apiGetMock).toHaveBeenCalledWith('/api/v2/integrations/integration-1/connections', {
      timeout: 30_000,
    });

    apiGetMock.mockClear();

    renderHook(() => useIntegrationConnections(undefined));
    const withoutIdConfig = createListQueryV2Mock.mock.calls[1]?.[0];

    expect(withoutIdConfig.enabled).toBe(false);
    await expect(withoutIdConfig.queryFn()).resolves.toEqual([]);
    expect(apiGetMock).not.toHaveBeenCalled();
  });

  it('loads the default Tradera connection from the dedicated preference endpoint', async () => {
    apiGetMock.mockResolvedValue({ connectionId: 'conn-tradera-1' });

    const { result } = renderHook(() => useDefaultTraderaConnection());
    const config = createSingleQueryV2Mock.mock.calls[0]?.[0];

    expect(result.current).toEqual({ kind: 'single-query' });
    expect(config.queryKey).toEqual(integrationKeys.selection.traderaDefaultConnection());

    await expect(config.queryFn()).resolves.toEqual({ connectionId: 'conn-tradera-1' });
    expect(apiGetMock).toHaveBeenCalledWith(
      '/api/v2/integrations/exports/tradera/default-connection'
    );
  });

  it('loads the default Vinted connection from the dedicated preference endpoint', async () => {
    apiGetMock.mockResolvedValue({ connectionId: 'conn-vinted-1' });

    const { result } = renderHook(() => useDefaultVintedConnection());
    const config = createSingleQueryV2Mock.mock.calls[0]?.[0];

    expect(result.current).toEqual({ kind: 'single-query' });
    expect(config.queryKey).toEqual(integrationKeys.selection.vintedDefaultConnection());

    await expect(config.queryFn()).resolves.toEqual({ connectionId: 'conn-vinted-1' });
    expect(apiGetMock).toHaveBeenCalledWith(
      '/api/v2/integrations/exports/vinted/default-connection'
    );
  });
});
