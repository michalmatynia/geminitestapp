import { beforeEach, describe, expect, it, vi } from 'vitest';

const { apiFetchMock, apiPostMock, apiPatchMock, apiDeleteMock } = vi.hoisted(() => ({
  apiFetchMock: vi.fn(),
  apiPostMock: vi.fn(),
  apiPatchMock: vi.fn(),
  apiDeleteMock: vi.fn(),
}));

vi.mock('@/shared/lib/ai-paths/api/client/base', () => ({
  apiFetch: apiFetchMock,
  apiPost: apiPostMock,
  apiPatch: apiPatchMock,
  apiDelete: apiDeleteMock,
}));

import {
  cleanupFixtureTriggerButtons,
  createTriggerButton,
  deleteTriggerButton,
  fetchTriggerButtons,
  reorderTriggerButtons,
  updateTriggerButton,
} from '@/shared/lib/ai-paths/api/client/triggers';

describe('trigger-buttons client', () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
    apiPostMock.mockReset();
    apiPatchMock.mockReset();
    apiDeleteMock.mockReset();
  });

  it('builds trigger button list urls with optional entity filters', async () => {
    apiFetchMock.mockResolvedValue({ ok: true, data: [] });

    await fetchTriggerButtons();
    await fetchTriggerButtons({ entityType: 'product' });
    await fetchTriggerButtons({ entityType: 'product', entityId: 'prod-1' });

    expect(apiFetchMock).toHaveBeenNthCalledWith(1, '/api/ai-paths/trigger-buttons');
    expect(apiFetchMock).toHaveBeenNthCalledWith(
      2,
      '/api/ai-paths/trigger-buttons?entityType=product'
    );
    expect(apiFetchMock).toHaveBeenNthCalledWith(
      3,
      '/api/ai-paths/trigger-buttons?entityType=product&entityId=prod-1'
    );
  });

  it('targets the expected create, update, delete, reorder, and cleanup endpoints', async () => {
    apiPostMock.mockResolvedValue({ ok: true, data: {} });
    apiPatchMock.mockResolvedValue({ ok: true, data: {} });
    apiDeleteMock.mockResolvedValue({ ok: true, data: { success: true } });

    await createTriggerButton({
      label: 'Run path',
      entityType: 'product',
      entityId: 'prod-1',
      pathSlug: 'path-a',
    } as Parameters<typeof createTriggerButton>[0]);
    await updateTriggerButton('button-1', {
      label: 'Updated label',
    });
    await deleteTriggerButton('button-1');
    await reorderTriggerButtons({ orderedIds: ['button-2', 'button-1'] });
    await cleanupFixtureTriggerButtons();

    expect(apiPostMock).toHaveBeenNthCalledWith(1, '/api/ai-paths/trigger-buttons', {
      label: 'Run path',
      entityType: 'product',
      entityId: 'prod-1',
      pathSlug: 'path-a',
    });
    expect(apiPatchMock).toHaveBeenCalledWith('/api/ai-paths/trigger-buttons/button-1', {
      label: 'Updated label',
    });
    expect(apiDeleteMock).toHaveBeenCalledWith('/api/ai-paths/trigger-buttons/button-1');
    expect(apiPostMock).toHaveBeenNthCalledWith(
      2,
      '/api/ai-paths/trigger-buttons/reorder',
      { orderedIds: ['button-2', 'button-1'] }
    );
    expect(apiPostMock).toHaveBeenNthCalledWith(
      3,
      '/api/ai-paths/trigger-buttons/cleanup-fixtures',
      {}
    );
  });
});
