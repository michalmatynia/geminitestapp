import { beforeEach, describe, expect, it, vi } from 'vitest';

const { dbActionMock, dbUpdateMock, entityUpdateMock } = vi.hoisted(() => ({
  dbActionMock: vi.fn(),
  dbUpdateMock: vi.fn(),
  entityUpdateMock: vi.fn(),
}));

vi.mock('@/shared/lib/ai-paths/api', () => ({
  dbApi: {
    action: dbActionMock,
    update: dbUpdateMock,
  },
  entityApi: {
    update: entityUpdateMock,
  },
}));

import { executeDatabaseUpdate } from '@/shared/lib/ai-paths/core/runtime/handlers/integration-database-update-execution';

describe('executeDatabaseUpdate custom payload mode', () => {
  beforeEach(() => {
    dbActionMock.mockReset();
    dbUpdateMock.mockReset();
    entityUpdateMock.mockReset();
  });

  it('uses db-action updateOne with raw update doc in custom mode', async () => {
    dbActionMock.mockResolvedValue({
      ok: true,
      data: {
        matchedCount: 1,
        modifiedCount: 1,
        provider: 'mongodb',
      },
    });

    const result = await executeDatabaseUpdate({
      nodeId: 'node-1',
      executed: {
        notification: new Set(),
        updater: new Set(),
        http: new Set(),
        delay: new Set(),
        poll: new Set(),
        ai: new Set(),
        schema: new Set(),
        mapper: new Set(),
      },
      reportAiPathsError: vi.fn(),
      toast: vi.fn(),
      dryRun: false,
      resolvedInputs: {
        value: 'input-id',
      },
      dbConfig: {
        operation: 'update',
        mode: 'replace',
        writeOutcomePolicy: {
          onZeroAffected: 'fail',
        },
      },
      queryConfig: {
        provider: 'auto',
        collection: 'products',
        mode: 'custom',
        preset: 'by_id',
        field: 'id',
        idType: 'string',
        queryTemplate: '{"id":"{{value}}"}',
        limit: 20,
        sort: '',
        projection: '',
        single: true,
      },
      updates: {
        content_en: 'should-not-be-used',
      },
      updateStrategy: 'one',
      entityType: 'product',
      shouldUseEntityUpdate: true,
      entityId: 'input-id',
      configuredCollection: 'products',
      updatePayloadMode: 'custom',
      customFilter: { id: 'input-id' },
      customUpdateDoc: {
        $set: {
          content_en: 'updated',
        },
      },
    });

    expect(result.skipped).toBe(false);
    if (result.skipped) {
      throw new Error('Expected update execution to run.');
    }

    expect(dbActionMock).toHaveBeenCalledTimes(1);
    expect(dbActionMock).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'updateOne',
        collection: 'products',
        filter: { id: 'input-id' },
        update: {
          $set: {
            content_en: 'updated',
          },
        },
      })
    );
    expect(dbUpdateMock).not.toHaveBeenCalled();
    expect(entityUpdateMock).not.toHaveBeenCalled();
    expect(result.executionMeta).toEqual(
      expect.objectContaining({
        mode: 'custom',
        action: 'updateOne',
        collection: 'products',
      })
    );
    expect(result.writeOutcome).toEqual(
      expect.objectContaining({
        status: 'success',
        operation: 'update',
      })
    );
  });

  it('fails when 0 records are affected and policy is fail', async () => {
    dbActionMock.mockResolvedValue({
      ok: true,
      data: {
        matchedCount: 0,
        modifiedCount: 0,
        provider: 'mongodb',
      },
    });

    await expect(
      executeDatabaseUpdate({
        nodeId: 'node-1',
        executed: {
          notification: new Set(),
          updater: new Set(),
          http: new Set(),
          delay: new Set(),
          poll: new Set(),
          ai: new Set(),
          schema: new Set(),
          mapper: new Set(),
        },
        reportAiPathsError: vi.fn(),
        toast: vi.fn(),
        dryRun: false,
        resolvedInputs: {
          value: 'input-id',
        },
        dbConfig: {
          operation: 'update',
          mode: 'replace',
          writeOutcomePolicy: {
            onZeroAffected: 'fail',
          },
        },
        queryConfig: {
          provider: 'auto',
          collection: 'products',
          mode: 'custom',
          preset: 'by_id',
          field: 'id',
          idType: 'string',
          queryTemplate: '{"id":"{{value}}"}',
          limit: 20,
          sort: '',
          projection: '',
          single: true,
        },
        updates: {
          content_en: 'updated',
        },
        updateStrategy: 'one',
        entityType: 'product',
        shouldUseEntityUpdate: true,
        entityId: 'input-id',
        configuredCollection: 'products',
        updatePayloadMode: 'custom',
        customFilter: { id: 'input-id' },
        customUpdateDoc: {
          $set: {
            content_en: 'updated',
          },
        },
      })
    ).rejects.toThrow('affected 0 records');
  });

  it('returns warning writeOutcome when 0 records are affected and policy is warn', async () => {
    const toast = vi.fn();
    dbActionMock.mockResolvedValue({
      ok: true,
      data: {
        matchedCount: 0,
        modifiedCount: 0,
        provider: 'mongodb',
      },
    });

    const result = await executeDatabaseUpdate({
      nodeId: 'node-1',
      executed: {
        notification: new Set(),
        updater: new Set(),
        http: new Set(),
        delay: new Set(),
        poll: new Set(),
        ai: new Set(),
        schema: new Set(),
        mapper: new Set(),
      },
      reportAiPathsError: vi.fn(),
      toast,
      dryRun: false,
      resolvedInputs: {
        value: 'input-id',
      },
      dbConfig: {
        operation: 'update',
        mode: 'replace',
        writeOutcomePolicy: {
          onZeroAffected: 'warn',
        },
      },
      queryConfig: {
        provider: 'auto',
        collection: 'products',
        mode: 'custom',
        preset: 'by_id',
        field: 'id',
        idType: 'string',
        queryTemplate: '{"id":"{{value}}"}',
        limit: 20,
        sort: '',
        projection: '',
        single: true,
      },
      updates: {
        content_en: 'updated',
      },
      updateStrategy: 'one',
      entityType: 'product',
      shouldUseEntityUpdate: true,
      entityId: 'input-id',
      configuredCollection: 'products',
      updatePayloadMode: 'custom',
      customFilter: { id: 'input-id' },
      customUpdateDoc: {
        $set: {
          content_en: 'updated',
        },
      },
    });

    expect(result.skipped).toBe(false);
    if (result.skipped) throw new Error('Expected update execution to run.');
    expect(result.writeOutcome).toEqual(
      expect.objectContaining({
        status: 'warning',
        code: 'zero_affected',
      })
    );
    expect(toast).toHaveBeenCalledWith(expect.stringContaining('affected 0 records'), {
      variant: 'warning',
    });
  });
});
