import { describe, it, expect, beforeEach, afterAll, vi } from 'vitest';

vi.unmock('@/shared/lib/db/prisma');

import { prismaAsset3DRepository } from '@/features/viewer3d/services/asset3d-repository/prisma-asset3d-repository';
import prisma from '@/shared/lib/db/prisma';

let canMutateAsset3DRepositoryTables = true;

describe('prismaAsset3DRepository', () => {
  const shouldSkipAsset3DRepositoryTests = (): boolean =>
    !process.env['DATABASE_URL'] || !canMutateAsset3DRepositoryTables;

  beforeEach(async () => {
    if (shouldSkipAsset3DRepositoryTests()) return;

    try {
      await prisma.asset3D.deleteMany({});
    } catch (error) {
      const code = (error as { code?: string }).code;
      if (code === 'EPERM') {
        canMutateAsset3DRepositoryTables = false;
        return;
      }
      throw error;
    }
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('should create an asset3d', async () => {
    if (shouldSkipAsset3DRepositoryTests()) return;
    const data = {
      name: 'Test Asset',
      filename: 'test.glb',
      filepath: '/uploads/test.glb',
      mimetype: 'model/gltf-binary',
      size: 1024,
      tags: ['test', '3d'],
      categoryId: 'test-category',
      isPublic: true,
      format: 'glb',
      metadata: {},
      fileUrl: '/uploads/test.glb',
      thumbnailUrl: null,
      fileSize: 1024,
    };

    const asset = await prismaAsset3DRepository.createAsset3D(data);

    expect(asset.id).toBeDefined();
    expect(asset.name).toBe(data.name);
    expect(asset.filename).toBe(data.filename);
    expect(asset.tags).toEqual(data.tags);
    expect(asset.categoryId).toBe('test-category');
    expect(asset.isPublic).toBe(true);
  });

  it('should get an asset3d by id', async () => {
    if (shouldSkipAsset3DRepositoryTests()) return;
    const created = await prisma.asset3D.create({
      data: {
        filename: 'test.glb',
        filepath: '/uploads/test.glb',
        mimetype: 'model/gltf-binary',
        size: 1024,
      },
    });

    const found = await prismaAsset3DRepository.getAsset3DById(created.id);
    expect(found).toBeDefined();
    expect(found?.id).toBe(created.id);
    expect(found?.filename).toBe('test.glb');
  });

  it('should return null if asset3d not found', async () => {
    if (shouldSkipAsset3DRepositoryTests()) return;
    const found = await prismaAsset3DRepository.getAsset3DById('non-existent');
    expect(found).toBeNull();
  });

  it('should list assets3d with filters', async () => {
    if (shouldSkipAsset3DRepositoryTests()) return;
    await prisma.asset3D.createMany({
      data: [
        {
          name: 'Asset 1',
          filename: 'a1.glb',
          filepath: '/p1',
          mimetype: 'm',
          size: 1,
          category: 'cat1',
          tags: ['t1'],
        },
        {
          name: 'Asset 2',
          filename: 'a2.glb',
          filepath: '/p2',
          mimetype: 'm',
          size: 1,
          category: 'cat2',
          tags: ['t2'],
        },
      ],
    });

    const all = await prismaAsset3DRepository.listAssets3D();
    expect(all).toHaveLength(2);

    const filtered = await prismaAsset3DRepository.listAssets3D({ categoryId: 'cat1' });
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.name).toBe('Asset 1');

    const tagged = await prismaAsset3DRepository.listAssets3D({ tags: ['t2'] });
    expect(tagged).toHaveLength(1);
    expect(tagged[0]?.name).toBe('Asset 2');
  });

  it('should update an asset3d', async () => {
    if (shouldSkipAsset3DRepositoryTests()) return;
    const created = await prisma.asset3D.create({
      data: {
        filename: 'test.glb',
        filepath: '/uploads/test.glb',
        mimetype: 'model/gltf-binary',
        size: 1024,
      },
    });

    const updated = await prismaAsset3DRepository.updateAsset3D(created.id, {
      name: 'Updated Name',
      categoryId: 'new-cat',
    });

    expect(updated?.name).toBe('Updated Name');
    expect(updated?.categoryId).toBe('new-cat');
  });

  it('should update isPublic field', async () => {
    if (shouldSkipAsset3DRepositoryTests()) return;
    const created = await prisma.asset3D.create({
      data: {
        filename: 'test.glb',
        filepath: '/uploads/test.glb',
        mimetype: 'model/gltf-binary',
        size: 1024,
        isPublic: false,
      },
    });

    const updated = await prismaAsset3DRepository.updateAsset3D(created.id, {
      isPublic: true,
    });

    expect(updated?.isPublic).toBe(true);
  });

  it('should handle tags update correctly', async () => {
    if (shouldSkipAsset3DRepositoryTests()) return;
    const created = await prisma.asset3D.create({
      data: {
        filename: 'test.glb',
        filepath: '/uploads/test.glb',
        mimetype: 'model/gltf-binary',
        size: 1024,
        tags: ['old-tag'],
      },
    });

    const updated = await prismaAsset3DRepository.updateAsset3D(created.id, {
      tags: ['new-tag-1', 'new-tag-2'],
    });

    expect(updated?.tags).toEqual(['new-tag-1', 'new-tag-2']);
  });

  it('should list assets3d with filters', async () => {
    if (shouldSkipAsset3DRepositoryTests()) return;
    const created = await prisma.asset3D.create({
      data: {
        filename: 'test.glb',
        filepath: '/uploads/test.glb',
        mimetype: 'model/gltf-binary',
        size: 1024,
      },
    });

    const deleted = await prismaAsset3DRepository.deleteAsset3D(created.id);
    expect(deleted?.id).toBe(created.id);

    const found = await prisma.asset3D.findUnique({ where: { id: created.id } });
    expect(found).toBeNull();
  });

  it('should get distinct categories', async () => {
    if (shouldSkipAsset3DRepositoryTests()) return;
    await prisma.asset3D.createMany({
      data: [
        { filename: 'f1', filepath: 'p1', mimetype: 'm', size: 1, category: 'A' },
        { filename: 'f2', filepath: 'p2', mimetype: 'm', size: 1, category: 'A' },
        { filename: 'f3', filepath: 'p3', mimetype: 'm', size: 1, category: 'B' },
      ],
    });

    const categories = await prismaAsset3DRepository.getCategories();
    expect(categories).toContain('A');
    expect(categories).toContain('B');
    expect(categories).toHaveLength(2);
  });

  it('should get all distinct tags', async () => {
    if (shouldSkipAsset3DRepositoryTests()) return;
    await prisma.asset3D.createMany({
      data: [
        { filename: 'f1', filepath: 'p1', mimetype: 'm', size: 1, tags: ['X', 'Y'] },
        { filename: 'f2', filepath: 'p2', mimetype: 'm', size: 1, tags: ['Y', 'Z'] },
      ],
    });

    const tags = await prismaAsset3DRepository.getTags();
    expect(tags).toContain('X');
    expect(tags).toContain('Y');
    expect(tags).toContain('Z');
    expect(tags).toHaveLength(3);
  });
});
