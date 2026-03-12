import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';

vi.unmock('@/shared/lib/db/legacy-sql-client');

import { getCategoryMappingRepository } from '@/features/integrations/services/category-mapping-repository';
import legacySqlClient from '@/shared/lib/db/legacy-sql-client';

let canMutateCategoryMappingTables = true;

describe('CategoryMappingRepository', () => {
  const shouldSkipCategoryMappingTests = (): boolean =>
    !process.env['DATABASE_URL'] || !canMutateCategoryMappingTables;
  const repo = getCategoryMappingRepository();

  beforeEach(async () => {
    if (shouldSkipCategoryMappingTests()) return;

    // Clean up DB
    try {
      await legacySqlClient.categoryMapping.deleteMany({});
      await legacySqlClient.externalCategory.deleteMany({});
      await legacySqlClient.category.deleteMany({});
      await legacySqlClient.integrationConnection.deleteMany({});
      await legacySqlClient.integration.deleteMany({});
      await legacySqlClient.catalog.deleteMany({});
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code === 'EPERM') {
        canMutateCategoryMappingTables = false;
        return;
      }
      throw error;
    }
  });

  afterAll(async () => {
    await legacySqlClient.$disconnect();
  });

  const setupData = async () => {
    const integration = await legacySqlClient.integration.create({
      data: { name: 'Test', slug: 'test-' + Math.random() },
    });
    const connection = await legacySqlClient.integrationConnection.create({
      data: { name: 'Conn 1', integrationId: integration.id, username: 'test', password: 'test' },
    });
    const catalog = await legacySqlClient.catalog.create({
      data: { name: 'Cat 1' },
    });
    const internalCat = await legacySqlClient.productCategory.create({
      data: { name: 'Int 1', catalogId: catalog.id },
    });
    const externalCat = await legacySqlClient.externalCategory.create({
      data: { name: 'Ext 1', externalId: 'e1', connectionId: connection.id },
    });

    return { connection, catalog, internalCat, externalCat };
  };

  it('creates a mapping', async () => {
    if (shouldSkipCategoryMappingTests()) return;
    const { connection, catalog, internalCat, externalCat } = await setupData();

    const input = {
      connectionId: connection.id,
      externalCategoryId: externalCat.id,
      internalCategoryId: internalCat.id,
      catalogId: catalog.id,
    };

    const result = await repo.create(input);
    expect(result.id).toBeDefined();
    expect(result.connectionId).toBe(connection.id);
  });

  it('updates a mapping', async () => {
    if (shouldSkipCategoryMappingTests()) return;
    const { connection, catalog, internalCat, externalCat } = await setupData();
    const mapping = await repo.create({
      connectionId: connection.id,
      externalCategoryId: externalCat.id,
      internalCategoryId: internalCat.id,
      catalogId: catalog.id,
    });

    const result = await repo.update(mapping.id, { isActive: false });
    expect(result.isActive).toBe(false);
  });

  it('deletes a mapping', async () => {
    if (shouldSkipCategoryMappingTests()) return;
    const { connection, catalog, internalCat, externalCat } = await setupData();
    const mapping = await repo.create({
      connectionId: connection.id,
      externalCategoryId: externalCat.id,
      internalCategoryId: internalCat.id,
      catalogId: catalog.id,
    });

    await repo.delete(mapping.id);
    const found = await legacySqlClient.categoryMapping.findUnique({ where: { id: mapping.id } });
    expect(found).toBeNull();
  });

  it('gets by id', async () => {
    if (shouldSkipCategoryMappingTests()) return;
    const { connection, catalog, internalCat, externalCat } = await setupData();
    const mapping = await repo.create({
      connectionId: connection.id,
      externalCategoryId: externalCat.id,
      internalCategoryId: internalCat.id,
      catalogId: catalog.id,
    });

    const result = await repo.getById(mapping.id);
    expect(result?.id).toBe(mapping.id);
  });

  it('lists by connection', async () => {
    if (shouldSkipCategoryMappingTests()) return;
    const { connection, catalog, internalCat, externalCat } = await setupData();
    await repo.create({
      connectionId: connection.id,
      externalCategoryId: externalCat.id,
      internalCategoryId: internalCat.id,
      catalogId: catalog.id,
    });

    const result = await repo.listByConnection(connection.id);
    expect(result.length).toBe(1);
    expect(result[0]!.externalCategory.name).toBe('Ext 1');
    expect(result[0]!.internalCategory!.name).toBe('Int 1');
  });

  it('bulk upserts mappings', async () => {
    if (shouldSkipCategoryMappingTests()) return;
    const { connection, catalog, internalCat, externalCat } = await setupData();

    const mappings = [{ externalCategoryId: externalCat.id, internalCategoryId: internalCat.id }];

    const count = await repo.bulkUpsert(connection.id, catalog.id, mappings);
    expect(count).toBe(1);

    const all = await legacySqlClient.categoryMapping.findMany({ where: { connectionId: connection.id } });
    expect(all.length).toBe(1);
  });
});
