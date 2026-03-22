import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  dbActionMock,
  createProductMock,
  createNoteMock,
  buildDbQueryPayloadMock,
  buildFormDataMock,
  evaluateWriteOutcomeMock,
  resolveWriteOutcomePolicyMock,
} = vi.hoisted(() => ({
  dbActionMock: vi.fn(),
  createProductMock: vi.fn(),
  createNoteMock: vi.fn(),
  buildDbQueryPayloadMock: vi.fn(),
  buildFormDataMock: vi.fn((payload: unknown) => payload),
  evaluateWriteOutcomeMock: vi.fn(),
  resolveWriteOutcomePolicyMock: vi.fn(() => 'warn'),
}));

vi.mock('@/shared/lib/ai-paths/api', () => ({
  dbApi: {
    action: dbActionMock,
  },
  entityApi: {
    createProduct: createProductMock,
    createNote: createNoteMock,
  },
}));

vi.mock('@/shared/lib/ai-paths/core/runtime/handlers/../utils', () => ({
  buildDbQueryPayload: buildDbQueryPayloadMock,
  buildFormData: buildFormDataMock,
}));

vi.mock(
  '@/shared/lib/ai-paths/core/runtime/handlers/integration-database-write-guardrails',
  () => ({
    evaluateWriteOutcome: evaluateWriteOutcomeMock,
    resolveWriteOutcomePolicy: resolveWriteOutcomePolicyMock,
  })
);

import { executeDatabaseInsert } from '@/shared/lib/ai-paths/core/runtime/handlers/integration-database-insert-execution';

describe('executeDatabaseInsert', () => {
  beforeEach(() => {
    dbActionMock.mockReset();
    createProductMock.mockReset();
    createNoteMock.mockReset();
    buildDbQueryPayloadMock.mockReset();
    buildFormDataMock.mockClear();
    evaluateWriteOutcomeMock.mockReset();
    resolveWriteOutcomePolicyMock.mockReset();

    buildDbQueryPayloadMock.mockReturnValue({
      collection: 'custom_records',
      provider: 'mongodb',
      collectionMap: { product: 'products' },
    });
    resolveWriteOutcomePolicyMock.mockReturnValue('warn');
    evaluateWriteOutcomeMock.mockReturnValue({
      isZeroAffected: false,
      writeOutcome: {
        status: 'success',
        operation: 'insert',
      },
    });
  });

  it('returns a dry-run payload and marks the node as executed', async () => {
    const executed = { updater: new Set<string>() } as never;

    const result = await executeDatabaseInsert({
      node: { id: 'node-insert' } as never,
      executed,
      reportAiPathsError: vi.fn(),
      toast: vi.fn(),
      dbConfig: {} as never,
      queryConfig: {} as never,
      templateContext: {},
      dryRun: true,
      payload: { title: 'Ada' },
      entityType: 'product',
      configuredCollection: 'products',
      forceCollectionInsert: false,
    });

    expect(result).toEqual({
      dryRun: true,
      entityType: 'product',
      collection: 'products',
      payload: { title: 'Ada' },
      writeOutcome: {
        status: 'success',
        operation: 'insert',
      },
    });
    expect(executed.updater.has('node-insert')).toBe(true);
  });

  it('uses collection inserts when forced and suppresses success toast for warning outcomes', async () => {
    dbActionMock.mockResolvedValue({
      ok: true,
      data: {
        insertedId: 'record-1',
      },
    });
    evaluateWriteOutcomeMock.mockReturnValue({
      isZeroAffected: true,
      writeOutcome: {
        status: 'warning',
        operation: 'insert',
        message: 'Inserted but affected 0 rows.',
      },
    });

    const toast = vi.fn();

    const result = await executeDatabaseInsert({
      node: { id: 'node-insert' } as never,
      executed: { updater: new Set<string>() } as never,
      reportAiPathsError: vi.fn(),
      toast,
      dbConfig: {} as never,
      queryConfig: {} as never,
      templateContext: { value: 'Ada' },
      dryRun: false,
      payload: { title: 'Ada' },
      entityType: 'product',
      configuredCollection: 'custom_records',
      forceCollectionInsert: true,
    });

    expect(dbActionMock).toHaveBeenCalledWith({
      provider: 'mongodb',
      collectionMap: { product: 'products' },
      action: 'insertOne',
      collection: 'custom_records',
      document: { title: 'Ada' },
    });
    expect(result).toEqual({
      insertedId: 'record-1',
      writeOutcome: {
        status: 'warning',
        operation: 'insert',
        message: 'Inserted but affected 0 rows.',
      },
    });
    expect(toast).toHaveBeenCalledWith('Inserted but affected 0 rows.', {
      variant: 'warning',
    });
    expect(toast).not.toHaveBeenCalledWith('Inserted custom_records', { variant: 'success' });
  });

  it('reports product insert failures', async () => {
    createProductMock.mockResolvedValue({
      ok: false,
      error: 'bad request',
    });

    const reportAiPathsError = vi.fn();
    const toast = vi.fn();

    const result = await executeDatabaseInsert({
      node: { id: 'node-insert' } as never,
      executed: { updater: new Set<string>() } as never,
      reportAiPathsError,
      toast,
      dbConfig: {} as never,
      queryConfig: {} as never,
      templateContext: {},
      dryRun: false,
      payload: { title: 'Ada' },
      entityType: 'product',
      configuredCollection: '',
      forceCollectionInsert: false,
    });

    expect(buildFormDataMock).toHaveBeenCalledWith({ title: 'Ada' });
    expect(createProductMock).toHaveBeenCalled();
    expect(reportAiPathsError).toHaveBeenCalledWith(
      expect.any(Error),
      { action: 'insertEntity', entityType: 'product', nodeId: 'node-insert' },
      'Database insert failed:'
    );
    expect(toast).toHaveBeenCalledWith('Failed to insert product.', { variant: 'error' });
    expect(result).toEqual({
      title: 'Ada',
      writeOutcome: {
        status: 'success',
        operation: 'insert',
      },
    });
  });

  it('supports note inserts and generic custom-entity inserts', async () => {
    createNoteMock.mockResolvedValue({
      ok: true,
      data: {
        id: 'note-1',
      },
    });
    dbActionMock.mockResolvedValue({
      ok: true,
      data: {
        insertedId: 'custom-1',
      },
    });

    const noteToast = vi.fn();
    const noteResult = await executeDatabaseInsert({
      node: { id: 'node-note' } as never,
      executed: { updater: new Set<string>() } as never,
      reportAiPathsError: vi.fn(),
      toast: noteToast,
      dbConfig: {} as never,
      queryConfig: {} as never,
      templateContext: {},
      dryRun: false,
      payload: { title: 'Ada' },
      entityType: 'note',
      configuredCollection: '',
      forceCollectionInsert: false,
    });

    expect(createNoteMock).toHaveBeenCalledWith({ title: 'Ada' });
    expect(noteToast).toHaveBeenCalledWith('Inserted note', { variant: 'success' });
    expect(noteResult).toEqual({
      id: 'note-1',
      writeOutcome: {
        status: 'success',
        operation: 'insert',
      },
    });

    const customToast = vi.fn();
    const customResult = await executeDatabaseInsert({
      node: { id: 'node-custom' } as never,
      executed: { updater: new Set<string>() } as never,
      reportAiPathsError: vi.fn(),
      toast: customToast,
      dbConfig: {} as never,
      queryConfig: {
        collection: '',
      } as never,
      templateContext: {},
      dryRun: false,
      payload: { title: 'Ada' },
      entityType: 'custom_entity',
      configuredCollection: '',
      forceCollectionInsert: false,
    });

    expect(dbActionMock).toHaveBeenLastCalledWith({
      provider: 'mongodb',
      collectionMap: { product: 'products' },
      action: 'insertOne',
      collection: 'custom_records',
      document: { title: 'Ada' },
    });
    expect(customToast).toHaveBeenCalledWith('Inserted custom_records', { variant: 'success' });
    expect(customResult).toEqual({
      insertedId: 'custom-1',
      writeOutcome: {
        status: 'success',
        operation: 'insert',
      },
    });
  });
});
