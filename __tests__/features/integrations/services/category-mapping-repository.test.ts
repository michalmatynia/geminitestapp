import { describe, it, expect, vi, beforeEach, afterAll } from 'vitest';

vi.unmock('@/shared/lib/db/prisma');

import { getCategoryMappingRepository } from '@/features/integrations/services/category-mapping-repository';
import prisma from '@/shared/lib/db/prisma';

describe('CategoryMappingRepository', () => {
  const repo = getCategoryMappingRepository();

  beforeEach(async () => {
    if (!process.env['DATABASE_URL']) return;
    
    // Clean up DB
    await prisma.categoryMapping.deleteMany({});
    await prisma.externalCategory.deleteMany({});
    await prisma.category.deleteMany({});
    await prisma.integrationConnection.deleteMany({});
    await prisma.integration.deleteMany({});
    await prisma.catalog.deleteMany({});
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  const setupData = async () => {
    const integration = await prisma.integration.create({
      data: { name: 'Test', slug: 'test-' + Math.random() }
    });
    const connection = await prisma.integrationConnection.create({
      data: { name: 'Conn 1', integrationId: integration.id, username: 'test', password: 'test' }
    });
    const catalog = await prisma.catalog.create({
      data: { name: 'Cat 1' }
    });
    const internalCat = await prisma.productCategory.create({
      data: { name: 'Int 1', catalogId: catalog.id }
    });
    const externalCat = await prisma.externalCategory.create({
      data: { name: 'Ext 1', externalId: 'e1', connectionId: connection.id }
    });

    return { connection, catalog, internalCat, externalCat };
  };

  it('creates a mapping', async () => {
    if (!process.env['DATABASE_URL']) return;
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
    if (!process.env['DATABASE_URL']) return;
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
    if (!process.env['DATABASE_URL']) return;
    const { connection, catalog, internalCat, externalCat } = await setupData();
    const mapping = await repo.create({
      connectionId: connection.id,
      externalCategoryId: externalCat.id,
      internalCategoryId: internalCat.id,
      catalogId: catalog.id,
    });

    await repo.delete(mapping.id);
    const found = await prisma.categoryMapping.findUnique({ where: { id: mapping.id } });
    expect(found).toBeNull();
  });

  it('gets by id', async () => {
    if (!process.env['DATABASE_URL']) return;
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
    if (!process.env['DATABASE_URL']) return;
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
    if (!process.env['DATABASE_URL']) return;
    const { connection, catalog, internalCat, externalCat } = await setupData();
    
    const mappings = [
      { externalCategoryId: externalCat.id, internalCategoryId: internalCat.id },
    ];
    
    const count = await repo.bulkUpsert(connection.id, catalog.id, mappings);
    expect(count).toBe(1);
    
    const all = await prisma.categoryMapping.findMany({ where: { connectionId: connection.id } });
    expect(all.length).toBe(1);
  });
});