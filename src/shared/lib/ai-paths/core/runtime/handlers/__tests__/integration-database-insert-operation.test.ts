import { beforeEach, describe, expect, it, vi } from 'vitest';

const { resolveDatabaseInsertPayloadMock, executeDatabaseInsertMock } = vi.hoisted(() => ({
  resolveDatabaseInsertPayloadMock: vi.fn(),
  executeDatabaseInsertMock: vi.fn(),
}));

vi.mock(
  '@/shared/lib/ai-paths/core/runtime/handlers/integration-database-insert-payload',
  () => ({
    resolveDatabaseInsertPayload: resolveDatabaseInsertPayloadMock,
  })
);

vi.mock(
  '@/shared/lib/ai-paths/core/runtime/handlers/integration-database-insert-execution',
  () => ({
    executeDatabaseInsert: executeDatabaseInsertMock,
  })
);

import { handleDatabaseInsertOperation } from '@/shared/lib/ai-paths/core/runtime/handlers/integration-database-insert-operation';

describe('handleDatabaseInsertOperation', () => {
  beforeEach(() => {
    resolveDatabaseInsertPayloadMock.mockReset();
    executeDatabaseInsertMock.mockReset();
  });

  it('returns a short-circuit output from payload resolution without executing an insert', async () => {
    resolveDatabaseInsertPayloadMock.mockReturnValue({
      output: {
        result: null,
        bundle: { error: 'Blocked' },
        aiPrompt: 'insert prompt',
      },
    });

    const result = await handleDatabaseInsertOperation({
      node: { id: 'node-insert' } as never,
      nodeInputs: {},
      executed: { updater: new Set<string>() } as never,
      reportAiPathsError: vi.fn(),
      toast: vi.fn(),
      dbConfig: {} as never,
      queryConfig: {} as never,
      dryRun: false,
      writeSourcePath: '',
      templateInputValue: null,
      templateContext: {},
      aiPrompt: 'insert prompt',
    });

    expect(result).toEqual({
      result: null,
      bundle: { error: 'Blocked' },
      aiPrompt: 'insert prompt',
    });
    expect(executeDatabaseInsertMock).not.toHaveBeenCalled();
  });

  it('executes inserts and normalizes object results into runtime output fields', async () => {
    resolveDatabaseInsertPayloadMock.mockReturnValue({
      payload: { title: 'Ada' },
      entityType: 'product',
      configuredCollection: '',
      forceCollectionInsert: false,
    });
    executeDatabaseInsertMock.mockResolvedValue({
      id: 'prod-1',
      content_en: 'Saved content',
      writeOutcome: {
        status: 'warning',
        operation: 'insert',
      },
    });

    const result = await handleDatabaseInsertOperation({
      node: { id: 'node-insert' } as never,
      nodeInputs: {},
      executed: { updater: new Set<string>() } as never,
      reportAiPathsError: vi.fn(),
      toast: vi.fn(),
      dbConfig: {} as never,
      queryConfig: {} as never,
      dryRun: true,
      writeSourcePath: '',
      templateInputValue: null,
      templateContext: { value: 'Ada' },
      aiPrompt: 'insert prompt',
    });

    expect(executeDatabaseInsertMock).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: { title: 'Ada' },
        entityType: 'product',
        configuredCollection: '',
        forceCollectionInsert: false,
        dryRun: true,
      })
    );
    expect(result).toEqual({
      result: {
        id: 'prod-1',
        content_en: 'Saved content',
        writeOutcome: {
          status: 'warning',
          operation: 'insert',
        },
      },
      bundle: {
        id: 'prod-1',
        content_en: 'Saved content',
        writeOutcome: {
          status: 'warning',
          operation: 'insert',
        },
      },
      writeOutcome: {
        status: 'warning',
        operation: 'insert',
      },
      content_en: 'Saved content',
      aiPrompt: 'insert prompt',
    });
  });
});
