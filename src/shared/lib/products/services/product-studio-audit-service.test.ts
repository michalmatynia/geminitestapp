import { afterAll, beforeEach, describe, expect, it, vi } from 'vitest';

const {
  getMongoDbMock,
  collectionMock,
  createIndexMock,
  insertOneMock,
  findMock,
  sortMock,
  limitMock,
  toArrayMock,
} = vi.hoisted(() => {
  const createIndexMock = vi.fn().mockResolvedValue('ok');
  const insertOneMock = vi.fn().mockResolvedValue({ acknowledged: true });
  const toArrayMock = vi.fn().mockResolvedValue([]);
  const limitMock = vi.fn(() => ({ toArray: toArrayMock }));
  const sortMock = vi.fn(() => ({ limit: limitMock }));
  const findMock = vi.fn(() => ({ sort: sortMock }));
  const collectionMock = vi.fn(() => ({
    createIndex: createIndexMock,
    insertOne: insertOneMock,
    find: findMock,
  }));
  const getMongoDbMock = vi.fn(async () => ({
    collection: collectionMock,
  }));

  return {
    getMongoDbMock,
    collectionMock,
    createIndexMock,
    insertOneMock,
    findMock,
    sortMock,
    limitMock,
    toArrayMock,
  };
});

vi.mock('server-only', () => ({}));

vi.mock('@/shared/lib/db/mongo-client', () => ({
  getMongoDb: getMongoDbMock,
}));

import {
  createProductStudioRunAudit,
  listProductStudioRunAudit,
} from './product-studio-audit-service';

const originalMongoUri = process.env['MONGODB_URI'];

describe('product-studio-audit-service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env['MONGODB_URI'] = 'mongodb://unit-test';
    createIndexMock.mockResolvedValue('ok');
    insertOneMock.mockResolvedValue({ acknowledged: true });
    toArrayMock.mockResolvedValue([]);
  });

  afterAll(() => {
    if (originalMongoUri === undefined) {
      delete process.env['MONGODB_URI'];
      return;
    }
    process.env['MONGODB_URI'] = originalMongoUri;
  });

  it('returns early for invalid create/list input without hitting mongo', async () => {
    await createProductStudioRunAudit({
      productId: ' ',
      imageSlotIndex: 0,
      projectId: 'project-a',
      status: 'completed',
      requestedSequenceMode: 'auto',
      resolvedSequenceMode: 'auto',
      executionRoute: 'ai_direct_generation',
      runKind: 'generation',
      runId: null,
      sequenceRunId: null,
      dispatchMode: null,
      fallbackReason: null,
      warnings: [],
      settingsScope: 'default',
      settingsKey: null,
      projectSettingsKey: null,
      settingsScopeValid: true,
      sequenceSnapshotHash: null,
      stepOrderUsed: [],
      resolvedCropRect: null,
      sourceImageSize: null,
      timings: { totalMs: 1 },
      errorMessage: null,
    });

    await expect(listProductStudioRunAudit({ productId: ' ' })).resolves.toEqual([]);
    expect(getMongoDbMock).not.toHaveBeenCalled();
  });

  it('creates a normalized audit document and ensures indexes', async () => {
    await createProductStudioRunAudit({
      productId: ' prod-1 ',
      imageSlotIndex: -3.7,
      projectId: ' project-1 ',
      createdAt: '2026-03-27T12:00:00.000Z',
      status: 'completed',
      requestedSequenceMode: 'auto',
      resolvedSequenceMode: 'model_full_sequence',
      executionRoute: 'ai_direct_generation',
      runKind: 'generation',
      runId: '',
      sequenceRunId: ' seq-1 ',
      dispatchMode: 'inline',
      fallbackReason: ' fallback ',
      warnings: [' alpha ', '', 'beta'],
      settingsScope: 'invalid-scope' as never,
      settingsKey: ' settings-key ',
      projectSettingsKey: ' ',
      settingsScopeValid: undefined as unknown as boolean,
      sequenceSnapshotHash: ' hash-1 ',
      stepOrderUsed: [' import ', '', 'generate'],
      resolvedCropRect: { x: -0.1, y: 0.25, width: 1.7, height: 0.3333339 },
      sourceImageSize: { width: 400.8, height: 0.2 },
      timings: {
        importMs: 12.9,
        sourceSlotUpsertMs: -3,
        routeDecisionMs: Number.NaN,
        dispatchMs: 7.2,
        totalMs: 42.8,
      },
      errorMessage: ' failed softly ',
    });

    expect(collectionMock).toHaveBeenCalledWith('product_studio_run_audit');
    expect(createIndexMock).toHaveBeenCalledWith({ productId: 1, createdAt: -1 });
    expect(createIndexMock).toHaveBeenCalledWith({ productId: 1, imageSlotIndex: 1, createdAt: -1 });
    expect(insertOneMock).toHaveBeenCalledWith({
      id: expect.any(String),
      productId: 'prod-1',
      imageSlotIndex: 0,
      projectId: 'project-1',
      createdAt: '2026-03-27T12:00:00.000Z',
      status: 'completed',
      requestedSequenceMode: 'auto',
      resolvedSequenceMode: 'model_full_sequence',
      executionRoute: 'ai_direct_generation',
      runKind: 'generation',
      runId: '',
      sequenceRunId: ' seq-1 ',
      dispatchMode: 'inline',
      fallbackReason: 'fallback',
      warnings: ['alpha', 'beta'],
      settingsScope: 'default',
      settingsKey: 'settings-key',
      projectSettingsKey: null,
      settingsScopeValid: false,
      sequenceSnapshotHash: 'hash-1',
      stepOrderUsed: ['import', 'generate'],
      resolvedCropRect: {
        x: 0,
        y: 0.25,
        width: 1,
        height: 0.333334,
      },
      sourceImageSize: {
        width: 400,
        height: 1,
      },
      timings: {
        importMs: 12,
        sourceSlotUpsertMs: 0,
        routeDecisionMs: null,
        dispatchMs: 7,
        totalMs: 42,
      },
      errorMessage: 'failed softly',
    });
  });

  it('skips create writes when mongo is unavailable even with valid input', async () => {
    delete process.env['MONGODB_URI'];

    await createProductStudioRunAudit({
      productId: 'prod-2',
      imageSlotIndex: 1,
      projectId: 'project-2',
      status: 'failed',
      requestedSequenceMode: 'auto',
      resolvedSequenceMode: 'auto',
      executionRoute: 'ai_direct_generation',
      runKind: 'generation',
      runId: null,
      sequenceRunId: null,
      dispatchMode: null,
      fallbackReason: null,
      warnings: [],
      settingsScope: 'default',
      settingsKey: null,
      projectSettingsKey: null,
      settingsScopeValid: false,
      sequenceSnapshotHash: null,
      stepOrderUsed: [],
      resolvedCropRect: null,
      sourceImageSize: null,
      timings: { totalMs: 5 },
      errorMessage: null,
    });

    expect(getMongoDbMock).not.toHaveBeenCalled();
    expect(insertOneMock).not.toHaveBeenCalled();
  });

  it('returns an empty list when mongo is unavailable', async () => {
    delete process.env['MONGODB_URI'];

    await expect(listProductStudioRunAudit({ productId: 'prod-1' })).resolves.toEqual([]);
    expect(getMongoDbMock).not.toHaveBeenCalled();
  });

  it('lists normalized audit entries, clamps limits, and filters invalid rows', async () => {
    toArrayMock.mockResolvedValue([
      {
        _id: 'mongo-id-1',
        productId: 'prod-1',
        imageSlotIndex: 2.9,
        projectId: 'project-1',
        createdAt: '',
        status: 'completed',
        requestedSequenceMode: 'auto',
        resolvedSequenceMode: 'studio_prompt_then_sequence',
        executionRoute: 'studio_sequencer',
        runKind: 'sequence',
        runId: ' ',
        sequenceRunId: 'seq-2',
        dispatchMode: 'queued',
        fallbackReason: ' ',
        warnings: [' keep ', ''],
        settingsScope: 'project',
        settingsKey: ' scope-key ',
        projectSettingsKey: ' project-key ',
        settingsScopeValid: 'wrong-type',
        sequenceSnapshotHash: ' hash-2 ',
        stepOrderUsed: [' one ', '', 'two'],
        resolvedCropRect: { x: 0.1, y: 0.2, width: 0.3, height: 0.4 },
        sourceImageSize: { width: 512.9, height: 768.2 },
        timings: {
          importMs: 1.9,
          sourceSlotUpsertMs: 2.4,
          routeDecisionMs: 3.8,
          dispatchMs: null,
          totalMs: 9.7,
        },
        errorMessage: ' ',
      },
      {
        _id: 'mongo-id-2',
        productId: 'prod-1',
        projectId: 'project-1',
        status: 'pending',
        requestedSequenceMode: 'auto',
        resolvedSequenceMode: 'auto',
        executionRoute: 'ai_direct_generation',
        runKind: 'generation',
      },
    ]);

    const result = await listProductStudioRunAudit({
      productId: ' prod-1 ',
      imageSlotIndex: -2.2,
      limit: 500,
    });

    expect(findMock).toHaveBeenCalledWith({
      productId: 'prod-1',
      imageSlotIndex: 0,
    });
    expect(sortMock).toHaveBeenCalledWith({ createdAt: -1 });
    expect(limitMock).toHaveBeenCalledWith(200);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({
      id: 'mongo-id-1',
      productId: 'prod-1',
      imageSlotIndex: 2,
      projectId: 'project-1',
      createdAt: expect.any(String),
      status: 'completed',
      requestedSequenceMode: 'auto',
      resolvedSequenceMode: 'studio_prompt_then_sequence',
      executionRoute: 'studio_sequencer',
      runKind: 'sequence',
      runId: null,
      sequenceRunId: 'seq-2',
      dispatchMode: 'queued',
      fallbackReason: null,
      warnings: ['keep'],
      settingsScope: 'project',
      settingsKey: 'scope-key',
      projectSettingsKey: 'project-key',
      settingsScopeValid: true,
      sequenceSnapshotHash: 'hash-2',
      stepOrderUsed: ['one', 'two'],
      resolvedCropRect: { x: 0.1, y: 0.2, width: 0.3, height: 0.4 },
      sourceImageSize: { width: 512, height: 768 },
      timings: {
        importMs: 1,
        sourceSlotUpsertMs: 2,
        routeDecisionMs: 3,
        dispatchMs: null,
        totalMs: 9,
      },
      errorMessage: null,
    });
  });

  it('filters rows that fail the individual enum and identity guards during list normalization', async () => {
    toArrayMock.mockResolvedValue([
      { _id: 'missing-product', productId: ' ', projectId: 'project-1' },
      {
        _id: 'bad-requested',
        productId: 'prod-1',
        projectId: 'project-1',
        status: 'completed',
        requestedSequenceMode: 'bad-mode',
        resolvedSequenceMode: 'auto',
        executionRoute: 'ai_direct_generation',
        runKind: 'generation',
      },
      {
        _id: 'bad-resolved',
        productId: 'prod-1',
        projectId: 'project-1',
        status: 'completed',
        requestedSequenceMode: 'auto',
        resolvedSequenceMode: 'bad-mode',
        executionRoute: 'ai_direct_generation',
        runKind: 'generation',
      },
      {
        _id: 'bad-route',
        productId: 'prod-1',
        projectId: 'project-1',
        status: 'completed',
        requestedSequenceMode: 'auto',
        resolvedSequenceMode: 'auto',
        executionRoute: 'bad-route',
        runKind: 'generation',
      },
      {
        _id: 'bad-run-kind',
        productId: 'prod-1',
        projectId: 'project-1',
        status: 'completed',
        requestedSequenceMode: 'auto',
        resolvedSequenceMode: 'auto',
        executionRoute: 'ai_direct_generation',
        runKind: 'bad-kind',
      },
      {
        _id: 'bad-status',
        productId: 'prod-1',
        projectId: 'project-1',
        status: 'queued',
        requestedSequenceMode: 'auto',
        resolvedSequenceMode: 'auto',
        executionRoute: 'ai_direct_generation',
        runKind: 'generation',
      },
      {
        _id: 'valid-row',
        productId: 'prod-1',
        projectId: 'project-1',
        status: 'failed',
        requestedSequenceMode: 'auto',
        resolvedSequenceMode: 'auto',
        executionRoute: 'ai_direct_generation',
        runKind: 'generation',
        timings: { totalMs: 1 },
      },
    ]);

    await expect(listProductStudioRunAudit({ productId: 'prod-1', limit: 1 })).resolves.toEqual([
      expect.objectContaining({
        id: 'valid-row',
        status: 'failed',
      }),
    ]);
  });
});
