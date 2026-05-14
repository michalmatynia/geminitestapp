import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  assertDatabaseEngineManageAccess: vi.fn(),
  assertValidMongoBackupName: vi.fn(),
  close: vi.fn(),
  collection: vi.fn(),
  command: vi.fn(),
  countDocuments: vi.fn(),
  createManagedMongoClient: vi.fn(),
  ensureMongoBackupsDir: vi.fn(),
  estimatedDocumentCount: vi.fn(),
  find: vi.fn(),
  getArchMongoConnectionUrl: vi.fn(),
  getArchMongoDatabaseName: vi.fn(),
  getCmsBuilderMongoConnectionUrl: vi.fn(),
  getCmsBuilderMongoDatabaseName: vi.fn(),
  getEcommerceMongoConnectionUrl: vi.fn(),
  getEcommerceMongoDatabaseName: vi.fn(),
  getMongoBackupApplication: vi.fn(),
  getMongoConnectionUrl: vi.fn(),
  getMongoDatabaseName: vi.fn(),
  getMongoRestoreCommand: vi.fn(),
  getProductsMongoConnectionUrl: vi.fn(),
  getProductsMongoDatabaseName: vi.fn(),
  getStudiqMongoConnectionUrl: vi.fn(),
  getStudiqMongoDatabaseName: vi.fn(),
  indexes: vi.fn(),
  listCollections: vi.fn(),
  mongoExecFileAsync: vi.fn(),
  resolveMongoBackupPath: vi.fn(),
}));

vi.mock('@/features/database/server', () => ({
  assertDatabaseEngineManageAccess: mocks.assertDatabaseEngineManageAccess,
  assertValidMongoBackupName: mocks.assertValidMongoBackupName,
  ensureMongoBackupsDir: mocks.ensureMongoBackupsDir,
  getArchMongoConnectionUrl: mocks.getArchMongoConnectionUrl,
  getArchMongoDatabaseName: mocks.getArchMongoDatabaseName,
  getCmsBuilderMongoConnectionUrl: mocks.getCmsBuilderMongoConnectionUrl,
  getCmsBuilderMongoDatabaseName: mocks.getCmsBuilderMongoDatabaseName,
  getEcommerceMongoConnectionUrl: mocks.getEcommerceMongoConnectionUrl,
  getEcommerceMongoDatabaseName: mocks.getEcommerceMongoDatabaseName,
  getMongoBackupApplication: mocks.getMongoBackupApplication,
  getMongoConnectionUrl: mocks.getMongoConnectionUrl,
  getMongoDatabaseName: mocks.getMongoDatabaseName,
  getMongoRestoreCommand: mocks.getMongoRestoreCommand,
  getProductsMongoConnectionUrl: mocks.getProductsMongoConnectionUrl,
  getProductsMongoDatabaseName: mocks.getProductsMongoDatabaseName,
  getStudiqMongoConnectionUrl: mocks.getStudiqMongoConnectionUrl,
  getStudiqMongoDatabaseName: mocks.getStudiqMongoDatabaseName,
  mongoExecFileAsync: mocks.mongoExecFileAsync,
  resolveMongoBackupPath: mocks.resolveMongoBackupPath,
}));

vi.mock('@/shared/lib/db/services/managed-mongo-databases', () => ({
  createManagedMongoClient: mocks.createManagedMongoClient,
}));

import { postDatabasesPreviewHandler } from './handler';

describe('databases preview handler', () => {
  const mockContext = { source: 'test' } as never;

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.command.mockImplementation(async (command: Record<string, unknown>) =>
      command['dbStats'] === 1 ? { totalSize: 4096 } : { totalSize: 1024 }
    );
    mocks.listCollections.mockReturnValue({
      toArray: vi.fn().mockResolvedValue([{ name: 'catalog' }]),
    });
    mocks.countDocuments.mockResolvedValue(2);
    mocks.estimatedDocumentCount.mockResolvedValue(2);
    mocks.indexes.mockResolvedValue([{ name: '_id_', key: { _id: 1 } }]);
    mocks.find.mockImplementation(() => ({
      skip: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      toArray: vi.fn().mockResolvedValue([{ _id: '1', name: 'Widget' }]),
    }));
    mocks.collection.mockReturnValue({
      collectionName: 'catalog',
      countDocuments: mocks.countDocuments,
      estimatedDocumentCount: mocks.estimatedDocumentCount,
      find: mocks.find,
      indexes: mocks.indexes,
    });
    mocks.createManagedMongoClient.mockResolvedValue({
      client: { close: mocks.close },
      dbName: 'products_cloud',
      db: {
        command: mocks.command,
        collection: mocks.collection,
        listCollections: mocks.listCollections,
      },
    });
    mocks.close.mockResolvedValue(undefined);
  });

  it('loads current previews from the requested managed application source', async () => {
    const response = await postDatabasesPreviewHandler(
      new NextRequest('http://localhost/api/databases/preview', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          mode: 'current',
          type: 'mongodb',
          application: 'products',
          source: 'cloud',
          page: 1,
          pageSize: 20,
        }),
      }),
      mockContext
    );

    await expect(response.json()).resolves.toMatchObject({
      databaseSize: '4.00 KB',
      page: 1,
      pageSize: 20,
      tableDetails: [expect.objectContaining({ name: 'catalog' })],
    });
    expect(mocks.assertDatabaseEngineManageAccess).toHaveBeenCalled();
    expect(mocks.createManagedMongoClient).toHaveBeenCalledWith('products', 'cloud');
    expect(mocks.listCollections).toHaveBeenCalled();
    expect(mocks.collection).toHaveBeenCalledWith('catalog');
    expect(mocks.close).toHaveBeenCalled();
  });
});
