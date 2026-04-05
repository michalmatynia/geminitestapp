import { describe, expect, it } from 'vitest';

import {
  assertBaseOrderImportConnectionExists,
  buildBaseOrderImportPersistResponse,
  isBaseOrderImportIntegrationSlug,
  resolveBaseOrderImportIntegrationId,
} from './handler.helpers';

describe('product orders-import import handler helpers', () => {
  it('matches supported Base integration slugs and resolves the integration id', () => {
    expect(isBaseOrderImportIntegrationSlug(' base ')).toBe(true);
    expect(isBaseOrderImportIntegrationSlug('baselinker')).toBe(true);
    expect(isBaseOrderImportIntegrationSlug('shopify')).toBe(false);

    expect(
      resolveBaseOrderImportIntegrationId([
        { id: 'integration-1', slug: 'shopify' },
        { id: 'integration-2', slug: 'base-com' },
      ])
    ).toBe('integration-2');

    expect(() =>
      resolveBaseOrderImportIntegrationId([{ id: 'integration-1', slug: 'shopify' }])
    ).toThrow('Base.com integration is not configured.');
  });

  it('requires a matching Base connection to exist', async () => {
    await expect(
      assertBaseOrderImportConnectionExists('connection-1', {
        listIntegrations: async () => [{ id: 'integration-1', slug: 'base' }],
        getConnectionByIdAndIntegration: async () => ({ id: 'connection-1' }),
      })
    ).resolves.toBeUndefined();

    await expect(
      assertBaseOrderImportConnectionExists('connection-1', {
        listIntegrations: async () => [{ id: 'integration-1', slug: 'base' }],
        getConnectionByIdAndIntegration: async () => null,
      })
    ).rejects.toMatchObject({
      message: 'Selected Base.com connection was not found.',
      httpStatus: 400,
    });
  });

  it('builds the persisted import response shape', () => {
    expect(
      buildBaseOrderImportPersistResponse({
        createdCount: 1,
        updatedCount: 2,
        syncedAt: '2026-03-27T12:00:00.000Z',
        results: [
          { baseOrderId: '1001', result: 'created' },
          { baseOrderId: '1002', result: 'updated' },
        ],
      })
    ).toEqual({
      importedCount: 3,
      createdCount: 1,
      updatedCount: 2,
      syncedAt: '2026-03-27T12:00:00.000Z',
      results: [
        { baseOrderId: '1001', result: 'created' },
        { baseOrderId: '1002', result: 'updated' },
      ],
    });
  });
});
