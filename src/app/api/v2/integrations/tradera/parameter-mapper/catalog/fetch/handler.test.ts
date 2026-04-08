import { beforeEach, describe, expect, it, vi } from 'vitest';

const { parseJsonBodyMock, fetchAndStoreCatalogMock } = vi.hoisted(() => ({
  parseJsonBodyMock: vi.fn(),
  fetchAndStoreCatalogMock: vi.fn(),
}));

vi.mock('@/shared/lib/api/parse-json', () => ({
  parseJsonBody: (...args: unknown[]) => parseJsonBodyMock(...args),
}));

vi.mock(
  '@/features/integrations/services/tradera-listing/parameter-mapper-catalog',
  () => ({
    fetchAndStoreTraderaParameterMapperCatalog: (...args: unknown[]) =>
      fetchAndStoreCatalogMock(...args),
  })
);

import { POST_handler } from './handler';

describe('tradera parameter mapper catalog fetch handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    parseJsonBodyMock.mockResolvedValue({
      ok: true,
      data: {
        connectionId: 'connection-1',
        externalCategoryId: 'cat-jewellery',
      },
    });
    fetchAndStoreCatalogMock.mockResolvedValue({
      connectionId: 'connection-1',
      externalCategoryId: 'cat-jewellery',
      entries: [],
      message: 'No additional Tradera dropdown fields were detected.',
    });
  });

  it('parses the request and delegates to the Tradera catalog fetch service', async () => {
    const response = await POST_handler(
      new Request('http://localhost/api/v2/integrations/tradera/parameter-mapper/catalog/fetch', {
        method: 'POST',
      }) as never,
      {} as never
    );

    const payload = await response.json();

    expect(fetchAndStoreCatalogMock).toHaveBeenCalledWith({
      connectionId: 'connection-1',
      externalCategoryId: 'cat-jewellery',
    });
    expect(payload).toMatchObject({
      connectionId: 'connection-1',
      externalCategoryId: 'cat-jewellery',
      message: 'No additional Tradera dropdown fields were detected.',
    });
  });
});
