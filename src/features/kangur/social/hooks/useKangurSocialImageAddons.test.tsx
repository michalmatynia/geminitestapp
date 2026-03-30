/**
 * @vitest-environment jsdom
 */

import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { QUERY_KEYS } from '@/shared/lib/query-keys';

import { useKangurSocialImageAddons } from './useKangurSocialImageAddons';

const createListQueryV2Mock = vi.hoisted(() => vi.fn());
const createUpdateMutationV2Mock = vi.hoisted(() => vi.fn());
const apiGetMock = vi.hoisted(() => vi.fn());
const apiPostMock = vi.hoisted(() => vi.fn());

vi.mock('@/shared/lib/query-factories-v2', () => ({
  createListQueryV2: createListQueryV2Mock,
  createUpdateMutationV2: createUpdateMutationV2Mock,
}));

vi.mock('@/shared/lib/api-client', () => ({
  api: {
    get: apiGetMock,
    post: apiPostMock,
  },
}));

const addonPayload = [
  {
    id: 'addon-1',
    title: 'Recent capture',
    description: '',
    sourceUrl: 'https://example.com/capture',
    sourceLabel: 'Capture',
    imageAsset: {
      id: 'image-1',
      url: 'https://example.com/image-1.png',
      filename: 'image-1.png',
      width: 1200,
      height: 800,
    },
    presetId: 'preset-home',
    previousAddonId: null,
    playwrightRunId: 'run-1',
    playwrightArtifact: null,
    playwrightPersonaId: null,
    playwrightCaptureRouteId: 'route-home',
    playwrightCaptureRouteTitle: 'Home',
    captureAppearanceMode: 'default',
    createdBy: null,
    updatedBy: null,
    createdAt: '2026-03-30T10:00:00.000Z',
    updatedAt: '2026-03-30T10:00:00.000Z',
  },
];

describe('useKangurSocialImageAddons', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createListQueryV2Mock.mockReturnValue({ kind: 'list-query' });
    createUpdateMutationV2Mock.mockReturnValue({ kind: 'mutation' });
    apiGetMock.mockResolvedValue(addonPayload);
    apiPostMock.mockResolvedValue({});
  });

  it('normalizes selected ids into the query key and request params', async () => {
    const { result } = renderHook(() =>
      useKangurSocialImageAddons({
        limit: 12,
        ids: [' addon-2 ', '', 'addon-1', 'addon-2 '],
      })
    );

    const config = createListQueryV2Mock.mock.calls[0]?.[0];

    expect(result.current).toEqual({ kind: 'list-query' });
    expect(config.queryKey).toEqual(
      QUERY_KEYS.kangur.socialImageAddons({
        limit: 12,
        ids: ['addon-2', 'addon-1'],
      })
    );

    await expect(config.queryFn()).resolves.toEqual(addonPayload);
    expect(apiGetMock).toHaveBeenCalledWith('/api/kangur/social-image-addons', {
      params: {
        limit: 12,
        ids: 'addon-2,addon-1',
        scope: 'admin',
      },
      timeout: 60_000,
    });
  });

  it('omits ids from the request when normalization removes every value', async () => {
    renderHook(() =>
      useKangurSocialImageAddons({
        ids: ['   ', ''],
      })
    );

    const config = createListQueryV2Mock.mock.calls[0]?.[0];

    expect(config.queryKey).toEqual(
      QUERY_KEYS.kangur.socialImageAddons({
        limit: null,
        ids: [],
      })
    );

    await expect(config.queryFn()).resolves.toEqual(addonPayload);
    expect(apiGetMock).toHaveBeenCalledWith('/api/kangur/social-image-addons', {
      params: {
        limit: undefined,
        ids: undefined,
        scope: 'admin',
      },
      timeout: 60_000,
    });
  });
});
