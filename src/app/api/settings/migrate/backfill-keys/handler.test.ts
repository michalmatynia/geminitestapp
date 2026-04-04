import { NextRequest } from 'next/server';
import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ApiHandlerContext } from '@/shared/contracts/ui';

const {
  authMock,
  parseJsonBodyMock,
  getDatabaseEnginePolicyMock,
  getMongoDbMock,
  assertDatabaseEngineOperationEnabledMock,
} = vi.hoisted(() => ({
  authMock: vi.fn(),
  parseJsonBodyMock: vi.fn(),
  getDatabaseEnginePolicyMock: vi.fn(),
  getMongoDbMock: vi.fn(),
  assertDatabaseEngineOperationEnabledMock: vi.fn(),
}));

vi.mock('@/features/auth/server', () => ({
  auth: authMock,
}));

vi.mock('@/shared/lib/api/parse-json', () => ({
  parseJsonBody: parseJsonBodyMock,
}));

vi.mock('@/shared/lib/db/database-engine-policy', () => ({
  getDatabaseEnginePolicy: getDatabaseEnginePolicyMock,
}));

vi.mock('@/shared/lib/db/mongo-client', () => ({
  getMongoDb: getMongoDbMock,
}));

vi.mock('@/shared/lib/db/services/database-engine-operation-guards', () => ({
  assertDatabaseEngineOperationEnabled: assertDatabaseEngineOperationEnabledMock,
}));

import { POST_handler } from './handler';

const createCursor = (rows: Array<{ _id: string }>) => ({
  limit: vi.fn().mockReturnValue({
    toArray: vi.fn().mockResolvedValue(rows),
  }),
});

describe('settings migrate backfill-keys handler', () => {
  const originalMongoUri = process.env['MONGODB_URI'];

  beforeEach(() => {
    vi.clearAllMocks();
    process.env['MONGODB_URI'] = 'mongodb://localhost/test';

    authMock.mockResolvedValue({
      user: {
        permissions: ['settings.manage'],
      },
    });
    parseJsonBodyMock.mockResolvedValue({
      ok: true,
      data: {
        dryRun: false,
        manual: true,
        limit: 500,
      },
    });
    getDatabaseEnginePolicyMock.mockResolvedValue({
      allowAutomaticBackfill: true,
    });
    assertDatabaseEngineOperationEnabledMock.mockResolvedValue(undefined);
  });

  afterAll(() => {
    if (originalMongoUri === undefined) {
      delete process.env['MONGODB_URI'];
      return;
    }
    process.env['MONGODB_URI'] = originalMongoUri;
  });

  it('returns dry-run counts and sample ids without mutating records', async () => {
    const countDocumentsMock = vi.fn().mockResolvedValue(7);
    const bulkWriteMock = vi.fn();
    const findMock = vi.fn().mockReturnValue(createCursor([{ _id: 'a-1' }, { _id: 'a-2' }]));

    parseJsonBodyMock.mockResolvedValue({
      ok: true,
      data: {
        dryRun: true,
        manual: true,
        limit: 5,
      },
    });
    getMongoDbMock.mockResolvedValue({
      collection: vi.fn().mockReturnValue({
        countDocuments: countDocumentsMock,
        find: findMock,
        bulkWrite: bulkWriteMock,
      }),
    });

    const response = await POST_handler(
      new NextRequest('http://localhost/api/settings/migrate/backfill-keys', { method: 'POST' }),
      {} as ApiHandlerContext
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      matched: 7,
      modified: 0,
      remaining: 7,
      sampleIds: ['a-1', 'a-2'],
    });
    expect(countDocumentsMock).toHaveBeenCalledTimes(1);
    expect(bulkWriteMock).not.toHaveBeenCalled();
  });

  it('rejects automatic runs when database-engine policy requires manual mode', async () => {
    parseJsonBodyMock.mockResolvedValue({
      ok: true,
      data: {
        dryRun: false,
        manual: false,
        limit: 5,
      },
    });
    getDatabaseEnginePolicyMock.mockResolvedValue({
      allowAutomaticBackfill: false,
    });

    await expect(
      POST_handler(
        new NextRequest('http://localhost/api/settings/migrate/backfill-keys', { method: 'POST' }),
        {} as ApiHandlerContext
      )
    ).rejects.toThrow('Automatic backfill is disabled by Database Engine policy.');

    expect(getMongoDbMock).not.toHaveBeenCalled();
  });

  it('updates missing keys and reports remaining documents', async () => {
    const docs = [{ _id: 's-1' }, { _id: 's-2' }];
    const countDocumentsMock = vi.fn().mockResolvedValue(1);
    const bulkWriteMock = vi.fn().mockResolvedValue({ modifiedCount: 2 });
    const findMock = vi.fn().mockReturnValue(createCursor(docs));

    getMongoDbMock.mockResolvedValue({
      collection: vi.fn().mockReturnValue({
        countDocuments: countDocumentsMock,
        find: findMock,
        bulkWrite: bulkWriteMock,
      }),
    });

    const response = await POST_handler(
      new NextRequest('http://localhost/api/settings/migrate/backfill-keys', { method: 'POST' }),
      {} as ApiHandlerContext
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      matched: 2,
      modified: 2,
      remaining: 1,
    });
    expect(bulkWriteMock).toHaveBeenCalledWith(
      [
        {
          updateOne: {
            filter: { _id: 's-1' },
            update: { $set: { key: 's-1' } },
          },
        },
        {
          updateOne: {
            filter: { _id: 's-2' },
            update: { $set: { key: 's-2' } },
          },
        },
      ],
      { ordered: false }
    );
    expect(countDocumentsMock).toHaveBeenCalledTimes(1);
  });
});
