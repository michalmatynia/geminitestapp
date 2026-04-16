import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  apiFetch: vi.fn(),
  apiPost: vi.fn(),
  withApiCsrfHeaders: vi.fn(),
}));

vi.mock('./base', () => ({
  apiFetch: mocks.apiFetch,
  apiPost: mocks.apiPost,
  withApiCsrfHeaders: mocks.withApiCsrfHeaders,
}));

describe('database API client', () => {
  beforeEach(() => {
    mocks.apiFetch.mockReset().mockResolvedValue({ ok: true, data: {} });
    mocks.apiPost.mockReset();
    mocks.withApiCsrfHeaders.mockReset().mockResolvedValue(
      new Headers({
        'x-ai-paths-internal': 'internal-token',
      })
    );
  });

  it('adds server headers to schema fetches', async () => {
    const { fetchSchema } = await import('./database');

    await fetchSchema({ provider: 'all', includeCounts: true });

    expect(mocks.withApiCsrfHeaders).toHaveBeenCalledTimes(1);
    expect(mocks.apiFetch).toHaveBeenCalledWith(
      '/api/databases/schema?provider=all&includeCounts=true',
      expect.objectContaining({
        headers: expect.any(Headers),
      })
    );
  });

  it('adds server headers to browse requests', async () => {
    const { browseDatabase } = await import('./database');

    await browseDatabase({
      collection: 'product_categories',
      provider: 'auto',
      limit: 5,
      query: '{"catalogId":"catalog-1"}',
    });

    expect(mocks.withApiCsrfHeaders).toHaveBeenCalledTimes(1);
    expect(mocks.apiFetch).toHaveBeenCalledWith(
      '/api/databases/browse?collection=product_categories&provider=auto&limit=5&query=%7B%22catalogId%22%3A%22catalog-1%22%7D',
      expect.objectContaining({
        headers: expect.any(Headers),
      })
    );
  });
});
