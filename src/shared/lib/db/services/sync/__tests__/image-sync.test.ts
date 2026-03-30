import { describe, expect, it, vi } from 'vitest';

import {
  syncImageFiles,
  syncImageFilesPrismaToMongo,
  syncImageStudioSlots,
  syncImageStudioSlotsPrismaToMongo,
} from '@/shared/lib/db/services/sync/image-sync';

const createMongo = (docsByCollection: Record<string, unknown[]>) => {
  const collections = new Map<
    string,
    {
      find: ReturnType<typeof vi.fn>;
      deleteMany: ReturnType<typeof vi.fn>;
      insertMany: ReturnType<typeof vi.fn>;
    }
  >();

  const collection = vi.fn((name: string) => {
    if (!collections.has(name)) {
      collections.set(name, {
        find: vi.fn().mockReturnValue({
          toArray: vi.fn().mockResolvedValue(docsByCollection[name] ?? []),
        }),
        deleteMany: vi.fn().mockResolvedValue({ deletedCount: 3 }),
        insertMany: vi.fn().mockResolvedValue({ insertedCount: (docsByCollection[name] ?? []).length }),
      });
    }
    return collections.get(name)!;
  });

  return {
    mongo: { collection } as unknown as Parameters<typeof syncImageFiles>[0]['mongo'],
    collections,
  };
};

const baseContext = {
  normalizeId: (doc: Record<string, unknown>): string =>
    typeof doc._id === 'string' ? doc._id : typeof doc.id === 'string' ? doc.id : '',
  toDate: (value: unknown): Date | null => (value ? new Date(value as string | Date) : null),
  toObjectIdMaybe: (value: string) => value,
  toJsonValue: (value: unknown) => ({ wrapped: value }),
  currencyCodes: new Set<string>(),
  countryCodes: new Set<string>(),
};

describe('image-sync', () => {
  it('syncs image collections from Mongo to Prisma with warning paths', async () => {
    const createdAt = new Date('2026-03-25T21:00:00.000Z');
    const { mongo } = createMongo({
      image_files: [
        {
          _id: 'image-1',
          filename: 'hero.png',
          filepath: '/tmp/hero.png',
          mimetype: 'image/png',
          size: 123,
          width: 1200,
          height: 800,
          tags: ['hero'],
          createdAt,
          updatedAt: createdAt,
        },
        {
          filename: 'missing-id.png',
        },
      ],
      image_studio_slots: [
        {
          _id: 'slot-1',
          projectId: 'project-1',
          name: 'Hero slot',
          folderPath: '/hero',
          position: 1,
          imageFileId: 'image-1',
          screenshotFileId: 'missing-screenshot',
          asset3dId: 'asset-missing',
          imageUrl: 'https://example.test/hero.png',
          imageBase64: 'data:image/png;base64,abc',
          metadata: { crop: 'center' },
          createdAt: createdAt.toISOString(),
          updatedAt: createdAt.toISOString(),
        },
        {
          _id: 'slot-2',
          projectId: '',
        },
      ],
    });

    const prisma = {
      imageFile: {
        deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
        createMany: vi.fn().mockResolvedValue({ count: 1 }),
        findMany: vi.fn().mockResolvedValue([{ id: 'image-1' }]),
      },
      asset3D: {
        findMany: vi.fn().mockResolvedValue([{ id: 'asset-1' }]),
      },
      imageStudioSlot: {
        deleteMany: vi.fn().mockResolvedValue({ count: 1 }),
        createMany: vi.fn().mockResolvedValue({ count: 1 }),
      },
    } as unknown as Parameters<typeof syncImageFiles>[0]['prisma'];

    const imageFilesResult = await syncImageFiles({
      mongo,
      prisma,
      ...baseContext,
    });
    const imageSlotsResult = await syncImageStudioSlots({
      mongo,
      prisma,
      ...baseContext,
    });

    expect(imageFilesResult).toEqual({
      sourceCount: 1,
      targetDeleted: 1,
      targetInserted: 1,
    });
    expect(imageSlotsResult).toEqual({
      sourceCount: 1,
      targetDeleted: 1,
      targetInserted: 1,
      warnings: [
        'Image studio slot slot-1: missing screenshotFile missing-screenshot',
        'Image studio slot slot-1: missing asset3d asset-missing',
        'Image studio slot slot-2: missing projectId',
      ],
    });

    expect(prisma.imageFile.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          id: 'image-1',
          filename: 'hero.png',
          tags: ['hero'],
        }),
      ],
    });
    expect(prisma.imageStudioSlot.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          id: 'slot-1',
          imageFileId: 'image-1',
          screenshotFileId: null,
          asset3dId: null,
          metadata: { wrapped: { crop: 'center' } },
        }),
      ],
    });
  });

  it('syncs image collections from Prisma back to Mongo', async () => {
    const createdAt = new Date('2026-03-25T21:30:00.000Z');
    const { mongo, collections } = createMongo({});

    const prisma = {
      imageFile: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'image-1',
            filename: 'hero.png',
            filepath: '/tmp/hero.png',
            mimetype: 'image/png',
            size: 123,
            width: 1200,
            height: 800,
            tags: ['hero'],
            createdAt,
            updatedAt: createdAt,
          },
        ]),
      },
      imageStudioSlot: {
        findMany: vi.fn().mockResolvedValue([
          {
            id: 'slot-1',
            projectId: 'project-1',
            name: 'Hero slot',
            folderPath: '/hero',
            position: 1,
            imageFileId: 'image-1',
            imageUrl: 'https://example.test/hero.png',
            imageBase64: 'data:image/png;base64,abc',
            asset3dId: 'asset-1',
            screenshotFileId: 'image-2',
            metadata: { crop: 'center' },
            createdAt,
            updatedAt: createdAt,
          },
        ]),
      },
    } as unknown as Parameters<typeof syncImageFilesPrismaToMongo>[0]['prisma'];

    const imageFilesResult = await syncImageFilesPrismaToMongo({
      mongo,
      prisma,
      ...baseContext,
    });
    const imageSlotsResult = await syncImageStudioSlotsPrismaToMongo({
      mongo,
      prisma,
      ...baseContext,
    });

    expect(imageFilesResult).toEqual({
      sourceCount: 1,
      targetDeleted: 3,
      targetInserted: 1,
    });
    expect(imageSlotsResult).toEqual({
      sourceCount: 1,
      targetDeleted: 3,
      targetInserted: 1,
    });

    expect(collections.get('image_files')?.insertMany).toHaveBeenCalledWith([
      expect.objectContaining({
        _id: 'image-1',
        filepath: '/tmp/hero.png',
        tags: ['hero'],
      }),
    ]);
    expect(collections.get('image_studio_slots')?.insertMany).toHaveBeenCalledWith([
      expect.objectContaining({
        _id: 'slot-1',
        projectId: 'project-1',
        metadata: { crop: 'center' },
        createdAt: createdAt.toISOString(),
        updatedAt: createdAt.toISOString(),
      }),
    ]);
  });
});
