import { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  assertDatabaseEngineManageAccess: vi.fn(async () => undefined),
  assertDatabaseEngineOperationEnabled: vi.fn(async () => undefined),
  assertValidMongoBackupName: vi.fn(),
  ensureMongoBackupsDir: vi.fn(async () => undefined),
  getMongoBackupApplication: vi.fn(),
  getProductsMongoConnectionUrl: vi.fn(),
  getProductsMongoDatabaseName: vi.fn(),
  getEcommerceMongoConnectionUrl: vi.fn(),
  getEcommerceMongoDatabaseName: vi.fn(),
  getMongoConnectionUrl: vi.fn(),
  getMongoDatabaseName: vi.fn(),
  getStudiqMongoConnectionUrl: vi.fn(),
  getStudiqMongoDatabaseName: vi.fn(),
  getCmsBuilderMongoConnectionUrl: vi.fn(),
  getCmsBuilderMongoDatabaseName: vi.fn(),
  getArchMongoConnectionUrl: vi.fn(),
  getArchMongoDatabaseName: vi.fn(),
  getMongoRestoreCommand: vi.fn(),
  mongoExecFileAsync: vi.fn(),
  resolveMongoBackupPath: vi.fn(),
  readFile: vi.fn(),
  writeFile: vi.fn(async () => undefined),
  captureException: vi.fn(),
  logWarning: vi.fn(),
  mongoClientClose: vi.fn(async () => undefined),
  mongoClientCollection: vi.fn(),
  mongoClientConnect: vi.fn(async () => undefined),
  mongoClientDb: vi.fn(),
  mongoClientListCollections: vi.fn(),
}));

vi.mock('fs', () => ({
  default: {
    promises: {
      readFile: mocks.readFile,
      writeFile: mocks.writeFile,
    },
  },
  promises: {
    readFile: mocks.readFile,
    writeFile: mocks.writeFile,
  },
}));

vi.mock('mongodb', () => ({
  MongoClient: vi.fn().mockImplementation(() => ({
    close: mocks.mongoClientClose,
    connect: mocks.mongoClientConnect,
    db: mocks.mongoClientDb,
  })),
}));

vi.mock('@/features/database/server', () => ({
  assertDatabaseEngineManageAccess: mocks.assertDatabaseEngineManageAccess,
  assertValidMongoBackupName: mocks.assertValidMongoBackupName,
  ensureMongoBackupsDir: mocks.ensureMongoBackupsDir,
  getMongoBackupApplication: mocks.getMongoBackupApplication,
  getProductsMongoConnectionUrl: mocks.getProductsMongoConnectionUrl,
  getProductsMongoDatabaseName: mocks.getProductsMongoDatabaseName,
  getEcommerceMongoConnectionUrl: mocks.getEcommerceMongoConnectionUrl,
  getEcommerceMongoDatabaseName: mocks.getEcommerceMongoDatabaseName,
  getMongoConnectionUrl: mocks.getMongoConnectionUrl,
  getMongoDatabaseName: mocks.getMongoDatabaseName,
  getStudiqMongoConnectionUrl: mocks.getStudiqMongoConnectionUrl,
  getStudiqMongoDatabaseName: mocks.getStudiqMongoDatabaseName,
  getCmsBuilderMongoConnectionUrl: mocks.getCmsBuilderMongoConnectionUrl,
  getCmsBuilderMongoDatabaseName: mocks.getCmsBuilderMongoDatabaseName,
  getArchMongoConnectionUrl: mocks.getArchMongoConnectionUrl,
  getArchMongoDatabaseName: mocks.getArchMongoDatabaseName,
  getMongoRestoreCommand: mocks.getMongoRestoreCommand,
  mongoExecFileAsync: mocks.mongoExecFileAsync,
  resolveMongoBackupPath: mocks.resolveMongoBackupPath,
}));

vi.mock('@/shared/lib/db/services/database-engine-operation-guards', () => ({
  assertDatabaseEngineOperationEnabled: mocks.assertDatabaseEngineOperationEnabled,
}));

vi.mock('@/shared/utils/observability/error-system', () => ({
  ErrorSystem: {
    captureException: mocks.captureException,
  },
}));

vi.mock('@/shared/lib/observability/system-logger', () => ({
  ErrorSystem: {
    logWarning: mocks.logWarning,
  },
}));

import { postDatabasesRestoreHandler } from './handler';

const buildRestoreRequest = (backupName: string): NextRequest =>
  new NextRequest('http://localhost/api/databases/restore?type=mongodb', {
    method: 'POST',
    body: JSON.stringify({ backupName }),
    headers: { 'content-type': 'application/json' },
  });

describe('databases restore handler', () => {
  const mockContext = { query: { type: 'mongodb' } } as never;

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getMongoBackupApplication.mockReturnValue('products');
    mocks.getProductsMongoConnectionUrl.mockReturnValue('mongodb://127.0.0.1:27017/products_local');
    mocks.getProductsMongoDatabaseName.mockReturnValue('products_local');
    mocks.getEcommerceMongoConnectionUrl.mockReturnValue('mongodb://127.0.0.1:27021/ecom_local');
    mocks.getEcommerceMongoDatabaseName.mockReturnValue('ecom_local');
    mocks.getMongoRestoreCommand.mockReturnValue('mongorestore');
    mocks.mongoExecFileAsync.mockResolvedValue({ stdout: 'restored', stderr: '' });
    mocks.resolveMongoBackupPath.mockImplementation(
      async (backupName: string) => `/tmp/mongo-backups/${backupName}`
    );
    mocks.readFile.mockResolvedValue('{}');
    mocks.mongoClientListCollections.mockReturnValue({ toArray: vi.fn(async () => []) });
    mocks.mongoClientDb.mockReturnValue({
      collection: mocks.mongoClientCollection,
      listCollections: mocks.mongoClientListCollections,
    });
  });

  it('restores Products backups into the shared Products MongoDB database', async () => {
    const response = await postDatabasesRestoreHandler(
      buildRestoreRequest('products/products-local.archive'),
      mockContext
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.message).toBe('Backup restored');
    expect(mocks.getProductsMongoConnectionUrl).toHaveBeenCalled();
    expect(mocks.getProductsMongoDatabaseName).toHaveBeenCalled();
    expect(mocks.getEcommerceMongoConnectionUrl).not.toHaveBeenCalled();
    expect(mocks.getEcommerceMongoDatabaseName).not.toHaveBeenCalled();
    expect(mocks.mongoExecFileAsync).toHaveBeenCalledWith('mongorestore', [
      '--uri',
      'mongodb://127.0.0.1:27017/products_local',
      '--db',
      'products_local',
      '--archive=/tmp/mongo-backups/products/products-local.archive',
      '--gzip',
      '--drop',
    ]);
  });
});
