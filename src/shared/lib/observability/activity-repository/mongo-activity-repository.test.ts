import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Db } from 'mongodb';

import {
  OBSERVABILITY_ACTIVITY_LOG_RETENTION_SECONDS,
  OBSERVABILITY_ACTIVITY_LOG_TTL_INDEX_NAME,
} from '@/shared/lib/observability/observability-retention';

const { getMongoDbMock } = vi.hoisted(() => ({
  getMongoDbMock: vi.fn(),
}));

const {
  getStudiqMongoDbMock,
  getCmsBuilderMongoDbMock,
  getEcommerceMongoDbMock,
  getArchMongoDbMock,
} = vi.hoisted(() => ({
  getStudiqMongoDbMock: vi.fn(),
  getCmsBuilderMongoDbMock: vi.fn(),
  getEcommerceMongoDbMock: vi.fn(),
  getArchMongoDbMock: vi.fn(),
}));

vi.mock('@/shared/lib/db/mongo-client', () => ({
  getMongoDb: getMongoDbMock,
}));

vi.mock('@/shared/lib/db/studiq-mongo-client', () => ({
  getMongoDb: getStudiqMongoDbMock,
}));

vi.mock('@/shared/lib/db/cms-builder-mongo-client', () => ({
  getMongoDb: getCmsBuilderMongoDbMock,
}));

vi.mock('@/shared/lib/db/ecommerce-mongo-client', () => ({
  getMongoDb: getEcommerceMongoDbMock,
}));

vi.mock('@/shared/lib/db/arch-mongo-client', () => ({
  getMongoDb: getArchMongoDbMock,
}));

describe('mongo-activity-repository', () => {
  const collectionMock = {
    find: vi.fn().mockReturnThis(),
    sort: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    skip: vi.fn().mockReturnThis(),
    toArray: vi.fn().mockResolvedValue([]),
    countDocuments: vi.fn().mockResolvedValue(0),
    insertOne: vi.fn().mockResolvedValue({ insertedId: { toString: () => '507f1f77bcf86cd799439011' } }),
    updateOne: vi.fn().mockResolvedValue({ upsertedCount: 1 }),
    deleteOne: vi.fn().mockResolvedValue({ deletedCount: 1 }),
    deleteMany: vi.fn().mockResolvedValue({ deletedCount: 3 }),
    createIndex: vi.fn().mockResolvedValue('index_name'),
  };

  const dbMock = {
    databaseName: 'app',
    collection: vi.fn().mockReturnValue(collectionMock),
  };
  const studiqCollectionMock = {
    find: vi.fn().mockReturnThis(),
    sort: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    skip: vi.fn().mockReturnThis(),
    toArray: vi.fn().mockResolvedValue([]),
    countDocuments: vi.fn().mockResolvedValue(0),
    insertOne: vi.fn().mockResolvedValue({ insertedId: { toString: () => '507f1f77bcf86cd799439012' } }),
    updateOne: vi.fn().mockResolvedValue({ upsertedCount: 1 }),
    deleteOne: vi.fn().mockResolvedValue({ deletedCount: 1 }),
    deleteMany: vi.fn().mockResolvedValue({ deletedCount: 0 }),
    createIndex: vi.fn().mockResolvedValue('index_name'),
  };
  const studiqDbMock = {
    databaseName: 'studiq_local',
    collection: vi.fn().mockReturnValue(studiqCollectionMock),
  };
  const cmsBuilderCollectionMock = {
    find: vi.fn().mockReturnThis(),
    sort: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    skip: vi.fn().mockReturnThis(),
    toArray: vi.fn().mockResolvedValue([]),
    countDocuments: vi.fn().mockResolvedValue(0),
    insertOne: vi.fn().mockResolvedValue({ insertedId: { toString: () => '507f1f77bcf86cd799439015' } }),
    updateOne: vi.fn().mockResolvedValue({ upsertedCount: 1 }),
    deleteOne: vi.fn().mockResolvedValue({ deletedCount: 1 }),
    deleteMany: vi.fn().mockResolvedValue({ deletedCount: 0 }),
    createIndex: vi.fn().mockResolvedValue('index_name'),
  };
  const cmsBuilderDbMock = {
    databaseName: 'cms_builder_local',
    collection: vi.fn().mockReturnValue(cmsBuilderCollectionMock),
  };
  const ecommerceCollectionMock = {
    find: vi.fn().mockReturnThis(),
    sort: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    skip: vi.fn().mockReturnThis(),
    toArray: vi.fn().mockResolvedValue([]),
    countDocuments: vi.fn().mockResolvedValue(0),
    insertOne: vi.fn().mockResolvedValue({ insertedId: { toString: () => '507f1f77bcf86cd799439013' } }),
    updateOne: vi.fn().mockResolvedValue({ upsertedCount: 1 }),
    deleteOne: vi.fn().mockResolvedValue({ deletedCount: 1 }),
    deleteMany: vi.fn().mockResolvedValue({ deletedCount: 0 }),
    createIndex: vi.fn().mockResolvedValue('index_name'),
  };
  const ecommerceDbMock = {
    databaseName: 'ecom_local',
    collection: vi.fn().mockReturnValue(ecommerceCollectionMock),
  };
  const archCollectionMock = {
    find: vi.fn().mockReturnThis(),
    sort: vi.fn().mockReturnThis(),
    limit: vi.fn().mockReturnThis(),
    skip: vi.fn().mockReturnThis(),
    toArray: vi.fn().mockResolvedValue([]),
    countDocuments: vi.fn().mockResolvedValue(0),
    insertOne: vi.fn().mockResolvedValue({ insertedId: { toString: () => '507f1f77bcf86cd799439014' } }),
    updateOne: vi.fn().mockResolvedValue({ upsertedCount: 1 }),
    deleteOne: vi.fn().mockResolvedValue({ deletedCount: 1 }),
    deleteMany: vi.fn().mockResolvedValue({ deletedCount: 0 }),
    createIndex: vi.fn().mockResolvedValue('index_name'),
  };
  const archDbMock = {
    databaseName: 'arch_web_local',
    collection: vi.fn().mockReturnValue(archCollectionMock),
  };

  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    getMongoDbMock.mockResolvedValue(dbMock as unknown as Db);
    getStudiqMongoDbMock.mockResolvedValue(studiqDbMock as unknown as Db);
    getCmsBuilderMongoDbMock.mockResolvedValue(cmsBuilderDbMock as unknown as Db);
    getEcommerceMongoDbMock.mockResolvedValue(ecommerceDbMock as unknown as Db);
    getArchMongoDbMock.mockResolvedValue(archDbMock as unknown as Db);
  });

  it('ensures activity indexes including TTL before listing activity', async () => {
    const { mongoActivityRepository } = await import('./mongo-activity-repository');

    await mongoActivityRepository.listActivity({});

    expect(collectionMock.createIndex).toHaveBeenCalledWith(
      { createdAt: 1 },
      {
        name: OBSERVABILITY_ACTIVITY_LOG_TTL_INDEX_NAME,
        expireAfterSeconds: OBSERVABILITY_ACTIVITY_LOG_RETENTION_SECONDS,
      }
    );
    expect(collectionMock.find).toHaveBeenCalledWith({});
    expect(collectionMock.sort).toHaveBeenCalledWith({ createdAt: -1 });
  });

  it('writes StudiQ activity locally without mirroring it to the central activity log', async () => {
    const { mongoActivityRepository } = await import('./mongo-activity-repository');

    const result = await mongoActivityRepository.createActivity({
      type: 'auth.login',
      description: 'Parent logged into Kangur.',
      userId: 'user-1',
      metadata: {
        surface: 'kangur',
        service: 'kangur-auth',
      },
    });

    expect(result).toEqual(
      expect.objectContaining({
        applicationId: 'studiq',
        applicationName: 'StudiQ',
        originDatabase: 'studiq_local',
        sourceService: 'kangur-auth',
      })
    );
    expect(studiqDbMock.collection).toHaveBeenCalledWith('activity_logs');
    expect(studiqCollectionMock.insertOne).toHaveBeenCalledWith(
      expect.objectContaining({
        applicationId: 'studiq',
        originDatabase: 'studiq_local',
        metadata: expect.objectContaining({ surface: 'kangur' }),
      })
    );
    expect(collectionMock.updateOne).not.toHaveBeenCalled();
  });

  it('writes CMS Builder activity to the CMS Builder local activity log', async () => {
    const { mongoActivityRepository } = await import('./mongo-activity-repository');

    const result = await mongoActivityRepository.createActivity({
      applicationId: 'cms-builder',
      sourceService: 'cms.pages',
      type: 'cms.page_updated',
      description: 'CMS Builder page was updated.',
      entityType: 'cms_page',
    });

    expect(result).toEqual(
      expect.objectContaining({
        applicationId: 'cms-builder',
        applicationName: 'CMS Builder',
        originDatabase: 'cms_builder_local',
        sourceService: 'cms.pages',
      })
    );
    expect(cmsBuilderDbMock.collection).toHaveBeenCalledWith('activity_logs');
    expect(cmsBuilderCollectionMock.insertOne).toHaveBeenCalledWith(
      expect.objectContaining({
        applicationId: 'cms-builder',
        originDatabase: 'cms_builder_local',
      })
    );
    expect(collectionMock.updateOne).not.toHaveBeenCalled();
  });

  it('writes Milkbar activity to the Arch local activity log', async () => {
    const { mongoActivityRepository } = await import('./mongo-activity-repository');

    const result = await mongoActivityRepository.createActivity({
      type: 'milkbar.cms.save',
      description: 'Milkbar Designers CMS was saved.',
      entityType: 'milkbar-cms',
      metadata: {
        surface: 'milkbardesigners',
      },
    });

    expect(result).toEqual(
      expect.objectContaining({
        applicationId: 'arch',
        applicationName: 'Milkbar Designers',
        originDatabase: 'arch_web_local',
      })
    );
    expect(archDbMock.collection).toHaveBeenCalledWith('activity_logs');
    expect(archCollectionMock.insertOne).toHaveBeenCalledWith(
      expect.objectContaining({
        applicationId: 'arch',
        originDatabase: 'arch_web_local',
      })
    );
    expect(collectionMock.updateOne).not.toHaveBeenCalled();
  });

  it('clears activity logs after ensuring indexes', async () => {
    const { clearActivityLogs } = await import('./mongo-activity-repository');

    const result = await clearActivityLogs({
      before: new Date('2026-04-01T00:00:00.000Z'),
    });

    expect(collectionMock.deleteMany).toHaveBeenCalledWith({
      createdAt: { $lte: new Date('2026-04-01T00:00:00.000Z') },
    });
    expect(result).toEqual({ deleted: 3 });
  });
});
