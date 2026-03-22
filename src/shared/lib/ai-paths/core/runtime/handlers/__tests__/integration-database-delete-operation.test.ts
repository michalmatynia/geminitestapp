import { beforeEach, describe, expect, it, vi } from 'vitest';

const { deleteProductMock, deleteNoteMock } = vi.hoisted(() => ({
  deleteProductMock: vi.fn(),
  deleteNoteMock: vi.fn(),
}));

vi.mock('@/shared/lib/ai-paths/api', () => ({
  entityApi: {
    deleteProduct: deleteProductMock,
    deleteNote: deleteNoteMock,
  },
}));

import { handleDatabaseDeleteOperation } from '@/shared/lib/ai-paths/core/runtime/handlers/integration-database-delete-operation';

describe('handleDatabaseDeleteOperation', () => {
  beforeEach(() => {
    deleteProductMock.mockReset();
    deleteNoteMock.mockReset();
  });

  it('reports and returns an error bundle when no entity id can be resolved', async () => {
    const reportAiPathsError = vi.fn();
    const toast = vi.fn();

    const result = await handleDatabaseDeleteOperation({
      node: { id: 'node-delete' } as never,
      nodeInputs: {},
      executed: { updater: new Set<string>() } as never,
      reportAiPathsError,
      toast,
      simulationEntityType: null,
      simulationEntityId: null,
      dbConfig: {
        entityType: 'product',
      } as never,
      dryRun: false,
      aiPrompt: 'delete prompt',
    });

    expect(reportAiPathsError).toHaveBeenCalledWith(
      expect.any(Error),
      { action: 'deleteEntity', nodeId: 'node-delete' },
      'Database delete missing entity id:'
    );
    expect(toast).toHaveBeenCalledWith('Database delete needs an entity ID input.', {
      variant: 'error',
    });
    expect(result).toEqual({
      result: null,
      bundle: { error: 'Missing entity id' },
      aiPrompt: 'delete prompt',
    });
  });

  it('returns a dry-run payload and records the node as executed', async () => {
    const executed = { updater: new Set<string>() } as never;

    const result = await handleDatabaseDeleteOperation({
      node: { id: 'node-delete' } as never,
      nodeInputs: {},
      executed,
      reportAiPathsError: vi.fn(),
      toast: vi.fn(),
      simulationEntityType: 'product',
      simulationEntityId: 'prod-1',
      dbConfig: {
        entityType: 'product',
      } as never,
      dryRun: true,
      aiPrompt: 'delete prompt',
    });

    expect(result).toEqual({
      result: { ok: true, dryRun: true, entityId: 'prod-1', entityType: 'product' },
      bundle: { ok: true, dryRun: true, entityId: 'prod-1', entityType: 'product' },
      aiPrompt: 'delete prompt',
    });
    expect(executed.updater.has('node-delete')).toBe(true);
    expect(deleteProductMock).not.toHaveBeenCalled();
  });

  it('deletes products once and reports product delete failures', async () => {
    deleteProductMock.mockResolvedValueOnce({ ok: false, error: 'boom' });

    const executed = { updater: new Set<string>() } as never;
    const reportAiPathsError = vi.fn();
    const toast = vi.fn();

    const result = await handleDatabaseDeleteOperation({
      node: { id: 'node-delete' } as never,
      nodeInputs: { entityId: 'prod-1' },
      executed,
      reportAiPathsError,
      toast,
      simulationEntityType: null,
      simulationEntityId: null,
      dbConfig: {
        entityType: 'product',
      } as never,
      dryRun: false,
      aiPrompt: 'delete prompt',
    });

    expect(deleteProductMock).toHaveBeenCalledWith('prod-1');
    expect(reportAiPathsError).toHaveBeenCalledWith(
      expect.any(Error),
      { action: 'deleteEntity', entityType: 'product', entityId: 'prod-1', nodeId: 'node-delete' },
      'Database delete failed:'
    );
    expect(toast).toHaveBeenCalledWith('Failed to delete product.', { variant: 'error' });
    expect(result).toEqual({
      result: { ok: false },
      bundle: { ok: false },
      aiPrompt: 'delete prompt',
    });

    deleteProductMock.mockClear();

    const skippedResult = await handleDatabaseDeleteOperation({
      node: { id: 'node-delete' } as never,
      nodeInputs: { entityId: 'prod-1' },
      executed,
      reportAiPathsError,
      toast,
      simulationEntityType: null,
      simulationEntityId: null,
      dbConfig: {
        entityType: 'product',
      } as never,
      dryRun: false,
      aiPrompt: 'delete prompt',
    });

    expect(deleteProductMock).not.toHaveBeenCalled();
    expect(skippedResult).toEqual({
      result: { ok: false },
      bundle: { ok: false },
      aiPrompt: 'delete prompt',
    });
  });

  it('supports note deletes and custom unsupported entity types', async () => {
    deleteNoteMock.mockResolvedValueOnce({ ok: true });

    const toast = vi.fn();
    const reportAiPathsError = vi.fn();

    const noteResult = await handleDatabaseDeleteOperation({
      node: { id: 'node-delete-note' } as never,
      nodeInputs: { entityId: 'note-1' },
      executed: { updater: new Set<string>() } as never,
      reportAiPathsError,
      toast,
      simulationEntityType: null,
      simulationEntityId: null,
      dbConfig: {
        entityType: 'note',
      } as never,
      dryRun: false,
      aiPrompt: 'delete note prompt',
    });

    expect(deleteNoteMock).toHaveBeenCalledWith('note-1');
    expect(noteResult).toEqual({
      result: { ok: true, entityId: 'note-1' },
      bundle: { ok: true, entityId: 'note-1' },
      aiPrompt: 'delete note prompt',
    });
    expect(toast).toHaveBeenCalledWith('Deleted note note-1', { variant: 'success' });
    expect(reportAiPathsError).not.toHaveBeenCalled();

    const customToast = vi.fn();
    const customResult = await handleDatabaseDeleteOperation({
      node: { id: 'node-delete-custom' } as never,
      nodeInputs: { entityId: 'entity-9' },
      executed: { updater: new Set<string>() } as never,
      reportAiPathsError: vi.fn(),
      toast: customToast,
      simulationEntityType: null,
      simulationEntityId: null,
      dbConfig: {
        entityType: 'custom_entity',
      } as never,
      dryRun: false,
      aiPrompt: 'custom prompt',
    });

    expect(customToast).toHaveBeenCalledWith('Custom deletes are not supported yet.', {
      variant: 'error',
    });
    expect(customResult).toEqual({
      result: { ok: false },
      bundle: { ok: false, entityId: 'entity-9' },
      aiPrompt: 'custom prompt',
    });
  });
});
