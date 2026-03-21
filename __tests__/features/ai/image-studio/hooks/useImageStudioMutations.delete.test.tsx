import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@/__tests__/test-utils';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useDeleteStudioSlot } from '@/features/ai/image-studio/hooks/useImageStudioMutations';
import type { ImageStudioSlotRecord, StudioSlotsResponse } from '@/shared/contracts/image-studio';
import { api } from '@/shared/lib/api-client';
import { invalidateImageStudioSlots } from '@/shared/lib/query-invalidation';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

vi.mock('@/shared/lib/api-client', () => ({
  ApiError: class MockApiError extends Error {},
  api: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    patch: vi.fn(),
    patchFormData: vi.fn(),
    delete: vi.fn(),
  },
}));

vi.mock('@/shared/lib/query-invalidation', () => ({
  invalidateImageStudioProjects: vi.fn(async () => undefined),
  invalidateImageStudioSlots: vi.fn(async () => undefined),
  patchImageStudioSlotsCache: vi.fn(
    (
      queryClient: QueryClient,
      projectId: string,
      updater: (
        current: StudioSlotsResponse | undefined
      ) => StudioSlotsResponse | undefined
    ) => {
      const key = QUERY_KEYS.imageStudio.slots(projectId);
      const current = queryClient.getQueryData<StudioSlotsResponse>(key);
      const next = updater(current);
      if (next !== undefined) {
        queryClient.setQueryData(key, next);
      }
    }
  ),
}));

const createTestQueryClient = (): QueryClient =>
  new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

const createSlot = (id: string, projectId: string): ImageStudioSlotRecord => ({
  id,
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  projectId,
  name: id,
  folderPath: null,
  position: null,
  imageFileId: null,
  imageUrl: null,
  imageBase64: null,
  asset3dId: null,
  screenshotFileId: null,
  metadata: null,
  imageFile: null,
  screenshotFile: null,
  asset3d: null,
});

describe('useDeleteStudioSlot', () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = createTestQueryClient();
  });

  const wrapper = ({ children }: { children: React.ReactNode }): React.JSX.Element => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  it('deletes selected card and descendant slots from cache', async () => {
    const projectId = 'project-monika';
    const rootSlot = createSlot('slot-root', projectId);
    const childSlot = createSlot('slot-child', projectId);
    const keepSlot = createSlot('slot-keep', projectId);
    const slotsKey = QUERY_KEYS.imageStudio.slots(projectId);

    queryClient.setQueryData<StudioSlotsResponse>(slotsKey, {
      slots: [rootSlot, childSlot, keepSlot],
    });

    vi.mocked(api.delete).mockResolvedValueOnce({
      ok: true,
      deletedSlotIds: ['slot-root', 'slot-child'],
      timingsMs: { total: 25 },
    } as never);

    const { result } = renderHook(() => useDeleteStudioSlot(projectId), { wrapper });
    await result.current.mutateAsync('slot-root');

    expect(api.delete).toHaveBeenCalledWith(
      `/api/image-studio/slots/${encodeURIComponent('slot-root')}`,
      expect.objectContaining({
        timeout: 30000,
        params: { debug: '1' },
      })
    );

    const cached = queryClient.getQueryData<StudioSlotsResponse>(slotsKey);
    expect(cached?.slots.map((slot: ImageStudioSlotRecord) => slot.id)).toEqual(['slot-keep']);
    await waitFor(() => {
      expect(invalidateImageStudioSlots).toHaveBeenCalledWith(queryClient, projectId);
    });
  });

  it('keeps optimistic deletion and verifies via polling when delete request times out', async () => {
    const projectId = 'project-monika';
    const rootSlot = createSlot('slot-root', projectId);
    const keepSlot = createSlot('slot-keep', projectId);
    const slotsKey = QUERY_KEYS.imageStudio.slots(projectId);

    queryClient.setQueryData<StudioSlotsResponse>(slotsKey, {
      slots: [rootSlot, keepSlot],
    });

    vi.mocked(api.delete).mockRejectedValueOnce(new Error('Request timeout after 15000ms'));
    vi.mocked(api.get).mockResolvedValueOnce({
      slots: [keepSlot],
    } as StudioSlotsResponse);

    const { result } = renderHook(() => useDeleteStudioSlot(projectId), { wrapper });
    await result.current.mutateAsync('slot-root');

    await waitFor(() => {
      expect(api.get).toHaveBeenCalledWith(
        `/api/image-studio/projects/${encodeURIComponent(projectId)}/slots`,
        expect.objectContaining({
          cache: 'no-store',
          logError: false,
          timeout: 15000,
        })
      );
    });

    const cached = queryClient.getQueryData<StudioSlotsResponse>(slotsKey);
    expect(cached?.slots.map((slot: ImageStudioSlotRecord) => slot.id)).toEqual(['slot-keep']);
    await waitFor(() => {
      expect(invalidateImageStudioSlots).toHaveBeenCalledWith(queryClient, projectId);
    });
  });
});
