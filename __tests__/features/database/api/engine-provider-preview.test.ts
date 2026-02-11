/**
 * @vitest-environment node
 */

import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { GET } from '@/app/api/databases/engine/provider-preview/route';
import { getDatabaseEngineProviderPreview } from '@/features/database/services/database-engine-provider-preview';

vi.mock('@/shared/lib/api/api-handler', () => ({
  apiHandler:
    (handler: (req: NextRequest, ctx: unknown) => Promise<Response>) =>
      async (req: NextRequest): Promise<Response> =>
        handler(req, {
          requestId: 'test-request-id',
        }),
}));

vi.mock('@/features/database/services/database-engine-provider-preview', () => ({
  getDatabaseEngineProviderPreview: vi.fn(),
}));

const previewPayload = {
  timestamp: '2026-02-10T00:00:00.000Z',
  policy: {
    requireExplicitServiceRouting: true,
    requireExplicitCollectionRouting: true,
    allowAutomaticFallback: false,
    allowAutomaticBackfill: false,
    allowAutomaticMigrations: false,
    strictProviderAvailability: true,
  },
  appProvider: 'prisma' as const,
  appProviderError: null,
  collections: [
    {
      collection: 'products',
      configuredProvider: 'mongodb' as const,
      effectiveProvider: 'mongodb' as const,
      source: 'collection_route' as const,
      error: null,
    },
  ],
};

describe('GET /api/databases/engine/provider-preview', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getDatabaseEngineProviderPreview).mockResolvedValue(previewPayload);
  });

  it('parses collections query and returns no-store payload', async () => {
    const req = new NextRequest(
      'http://localhost/api/databases/engine/provider-preview?collections=products,settings'
    );

    const res = await GET(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(res.headers.get('Cache-Control')).toBe('no-store');
    expect(getDatabaseEngineProviderPreview).toHaveBeenCalledWith({
      collections: ['products', 'settings'],
    });
    expect(body).toEqual(previewPayload);
  });

  it('passes undefined collections when query param is missing', async () => {
    const req = new NextRequest('http://localhost/api/databases/engine/provider-preview');

    const res = await GET(req);
    expect(res.status).toBe(200);
    expect(getDatabaseEngineProviderPreview).toHaveBeenCalledWith({});
  });
});
