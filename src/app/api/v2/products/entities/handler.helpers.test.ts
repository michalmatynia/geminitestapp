import { NextRequest } from 'next/server';
import { describe, expect, it, vi } from 'vitest';

const { parseObjectJsonBodyMock } = vi.hoisted(() => ({
  parseObjectJsonBodyMock: vi.fn(),
}));

vi.mock('@/shared/lib/api/parse-json', () => ({
  parseObjectJsonBody: (...args: unknown[]) => parseObjectJsonBodyMock(...args),
}));

import {
  parseProductsEntityCatalogUpdatePayload,
  resolveProductsEntityCollectionType,
  resolveProductsEntityDeleteType,
  resolveProductsEntityReadType,
  resolveProductsEntityUpdatePayload,
  resolveProductsEntityUpdateType,
} from './handler.helpers';

describe('product entities handler helpers', () => {
  it('resolves valid entity types for each operation and rejects invalid ones', () => {
    expect(resolveProductsEntityCollectionType('catalogs', 'GET')).toBe('catalogs');
    expect(resolveProductsEntityCollectionType('catalogs', 'POST')).toBe('catalogs');
    expect(resolveProductsEntityReadType('drafts')).toBe('drafts');
    expect(resolveProductsEntityUpdateType('catalogs')).toBe('catalogs');
    expect(resolveProductsEntityDeleteType('catalogs')).toBe('catalogs');
    expect(resolveProductsEntityDeleteType('drafts')).toBe('drafts');

    expect(() => resolveProductsEntityCollectionType('drafts', 'GET')).toThrow(
      'Invalid products entity type for GET: drafts'
    );
    expect(() => resolveProductsEntityReadType('catalogs')).toThrow(
      'Invalid products entity type for GET: catalogs'
    );
  });

  it('reuses provided payloads or returns the parser response', async () => {
    await expect(
      resolveProductsEntityUpdatePayload(
        new NextRequest('http://localhost'),
        { name: 'Catalog name' }
      )
    ).resolves.toEqual({
      ok: true,
      payload: { name: 'Catalog name' },
    });

    const parseResponse = new Response(JSON.stringify({ error: 'Invalid JSON payload' }), {
      status: 400,
    });
    parseObjectJsonBodyMock.mockResolvedValueOnce({
      ok: false,
      response: parseResponse,
    });

    await expect(
      resolveProductsEntityUpdatePayload(new NextRequest('http://localhost'), undefined)
    ).resolves.toEqual({
      ok: false,
      response: parseResponse,
    });
  });

  it('validates catalog update payloads', () => {
    expect(parseProductsEntityCatalogUpdatePayload({ name: 'Catalog name' })).toEqual({
      name: 'Catalog name',
    });
    expect(() => parseProductsEntityCatalogUpdatePayload({ isDefault: 'yes' })).toThrow(
      'Invalid catalog payload.'
    );
  });
});
