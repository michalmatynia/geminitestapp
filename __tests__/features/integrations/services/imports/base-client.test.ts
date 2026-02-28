import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/features/observability/server', () => ({
  withTransientRecovery: vi.fn(async (operation: () => Promise<unknown>) => operation()),
}));

import { fetchBaseCategories } from '@/shared/lib/integrations/services/imports/base-client';

const jsonResponse = (payload: Record<string, unknown>): Response =>
  new Response(JSON.stringify(payload), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });

describe('fetchBaseCategories', () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('does not stop at root-only global categories when preferred inventory has hierarchy', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          categories: {
            '1': { category_id: '1', name: 'Root', parent_id: 0 },
          },
        })
      )
      .mockResolvedValueOnce(
        jsonResponse({
          categories: {
            '1': { category_id: '1', name: 'Root', parent_id: 0 },
            '2': { category_id: '2', name: 'Child', parent_id: '1' },
          },
        })
      );
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const categories = await fetchBaseCategories('test-token', { inventoryId: 'inv-1' });

    expect(categories).toEqual([
      { id: '1', name: 'Root', parentId: null },
      { id: '2', name: 'Child', parentId: '1' },
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it('falls back to inventory-scoped fetch when earlier attempts only return root categories', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          categories: {
            '1': { category_id: '1', name: 'Root', parent_id: 0 },
          },
        })
      )
      .mockResolvedValueOnce(
        jsonResponse({
          inventories: [{ inventory_id: 'inv-2', name: 'Main inventory' }],
        })
      )
      .mockResolvedValueOnce(
        jsonResponse({
          categories: {
            '1': { category_id: '1', name: 'Root', parent_id: 0 },
            '2': { category_id: '2', name: 'Child', parent_id: '1' },
          },
        })
      );
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const categories = await fetchBaseCategories('test-token');

    expect(categories).toEqual([
      { id: '1', name: 'Root', parentId: null },
      { id: '2', name: 'Child', parentId: '1' },
    ]);
    expect(fetchMock).toHaveBeenCalledTimes(3);
  });
});
