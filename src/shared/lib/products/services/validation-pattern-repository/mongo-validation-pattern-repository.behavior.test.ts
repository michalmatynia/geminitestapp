import { ObjectId } from 'mongodb';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  PRODUCT_FORMATTER_ENABLED_BY_DEFAULT_SETTING_KEY,
  PRODUCT_VALIDATOR_ENABLED_BY_DEFAULT_SETTING_KEY,
  PRODUCT_VALIDATOR_INSTANCE_DENY_BEHAVIOR_SETTING_KEY,
} from '@/shared/lib/products/constants';

const {
  getMongoDbMock,
  collectionMock,
  patternCreateIndexMock,
  patternFindMock,
  patternFindOneMock,
  patternInsertOneMock,
  patternUpdateOneMock,
  patternDeleteOneMock,
  patternToArrayMock,
  patternNextMock,
  settingsFindOneMock,
  settingsUpdateOneMock,
  logClientErrorMock,
} = vi.hoisted(() => {
  const patternCreateIndexMock = vi.fn();
  const patternFindOneMock = vi.fn();
  const patternInsertOneMock = vi.fn();
  const patternUpdateOneMock = vi.fn();
  const patternDeleteOneMock = vi.fn();
  const patternToArrayMock = vi.fn();
  const patternNextMock = vi.fn();
  const settingsFindOneMock = vi.fn();
  const settingsUpdateOneMock = vi.fn();
  const logClientErrorMock = vi.fn();

  let patternFindChain: {
    project: ReturnType<typeof vi.fn>;
    sort: ReturnType<typeof vi.fn>;
    limit: ReturnType<typeof vi.fn>;
    toArray: ReturnType<typeof vi.fn>;
    next: ReturnType<typeof vi.fn>;
  };

  const projectMock = vi.fn(() => patternFindChain);
  const sortMock = vi.fn(() => patternFindChain);
  const limitMock = vi.fn(() => patternFindChain);

  patternFindChain = {
    project: projectMock,
    sort: sortMock,
    limit: limitMock,
    toArray: patternToArrayMock,
    next: patternNextMock,
  };

  const patternFindMock = vi.fn(() => patternFindChain);
  const patternCollection = {
    createIndex: patternCreateIndexMock,
    find: patternFindMock,
    findOne: patternFindOneMock,
    insertOne: patternInsertOneMock,
    updateOne: patternUpdateOneMock,
    deleteOne: patternDeleteOneMock,
  };
  const settingsCollection = {
    findOne: settingsFindOneMock,
    updateOne: settingsUpdateOneMock,
  };
  const collectionMock = vi.fn((name: string) =>
    name === 'settings' ? settingsCollection : patternCollection
  );
  const getMongoDbMock = vi.fn(async () => ({
    collection: collectionMock,
  }));

  return {
    getMongoDbMock,
    collectionMock,
    patternCreateIndexMock,
    patternFindMock,
    patternFindOneMock,
    patternInsertOneMock,
    patternUpdateOneMock,
    patternDeleteOneMock,
    patternToArrayMock,
    patternNextMock,
    settingsFindOneMock,
    settingsUpdateOneMock,
    logClientErrorMock,
  };
});

vi.mock('@/shared/lib/db/mongo-client', () => ({
  getMongoDb: getMongoDbMock,
}));

vi.mock('@/shared/utils/observability/client-error-logger', () => ({
  logClientError: (error: unknown) => logClientErrorMock(error),
}));

import { mongoValidationPatternRepository } from './mongo-validation-pattern-repository';

const patternId = '507f1f77bcf86cd799439011';
const insertedId = new ObjectId('507f1f77bcf86cd799439012');

const createDoc = (overrides: Record<string, unknown> = {}) => ({
  _id: new ObjectId(patternId),
  label: 'Price from latest product',
  target: 'price',
  locale: null,
  regex: '^\\s*$',
  flags: null,
  message: 'Use latest price from the newest product when current price is empty.',
  severity: 'warning',
  enabled: true,
  replacementEnabled: true,
  replacementAutoApply: false,
  skipNoopReplacementProposal: true,
  replacementValue: null,
  replacementFields: ['sku'],
  replacementAppliesToScopes: ['product_edit'],
  runtimeEnabled: false,
  runtimeType: 'none',
  runtimeConfig: null,
  postAcceptBehavior: 'revalidate',
  denyBehaviorOverride: null,
  validationDebounceMs: 0,
  sequenceGroupId: null,
  sequenceGroupLabel: null,
  sequenceGroupDebounceMs: 0,
  sequence: 10,
  chainMode: 'continue',
  maxExecutions: 1,
  passOutputToNext: true,
  launchEnabled: false,
  launchAppliesToScopes: [],
  launchScopeBehavior: 'gate',
  launchSourceMode: 'current_field',
  launchSourceField: null,
  launchOperator: 'equals',
  launchValue: null,
  launchFlags: null,
  appliesToScopes: ['product_create'],
  semanticState: null,
  semanticAudit: null,
  semanticAuditHistory: [],
  createdAt: new Date('2026-03-19T12:00:00.000Z'),
  updatedAt: new Date('2026-03-19T12:00:00.000Z'),
  ...overrides,
});

describe('mongoValidationPatternRepository behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    patternCreateIndexMock.mockResolvedValue('ok');
    patternToArrayMock.mockResolvedValue([]);
    patternNextMock.mockResolvedValue(null);
    patternFindOneMock.mockResolvedValue(null);
    patternInsertOneMock.mockResolvedValue({ insertedId });
    patternUpdateOneMock.mockResolvedValue({ matchedCount: 1 });
    patternDeleteOneMock.mockResolvedValue({ deletedCount: 1 });
    settingsFindOneMock.mockResolvedValue(null);
    settingsUpdateOneMock.mockResolvedValue({ acknowledged: true });
  });

  it('creates patterns with normalized defaults and a fallback sequence', async () => {
    patternNextMock.mockResolvedValue({ sequence: 20 });

    const created = await mongoValidationPatternRepository.createPattern({
      label: 'Normalize price',
      target: 'price',
      locale: '  pl  ',
      regex: '^\\s*$',
      flags: 'gi',
      message: 'Message',
      replacementEnabled: true,
      replacementAutoApply: true,
      replacementValue: ' 42 ',
      replacementFields: ['sku', 'sku', 'bad-field'],
      replacementAppliesToScopes: ['product_edit', 'unknown'],
      runtimeEnabled: true,
      runtimeType: 'database_query',
      runtimeConfig: '  select 1  ',
      validationDebounceMs: 90_000,
      sequenceGroupId: ' group-1 ',
      sequenceGroupLabel: ' Group 1 ',
      sequenceGroupDebounceMs: -5,
      maxExecutions: 999,
      launchEnabled: true,
      launchAppliesToScopes: ['product_create', 'bad'],
      launchScopeBehavior: 'condition_only',
      launchSourceMode: 'form_field',
      launchSourceField: ' sourceField ',
      launchOperator: 'regex',
      launchValue: 'needle',
      launchFlags: ' gi ',
      appliesToScopes: ['draft_template', 'bad'],
    });

    expect(patternInsertOneMock).toHaveBeenCalledWith(
      expect.objectContaining({
        label: 'Normalize price',
        locale: 'pl',
        replacementValue: '42',
        replacementFields: ['sku'],
        replacementAppliesToScopes: ['product_edit'],
        runtimeEnabled: true,
        runtimeType: 'database_query',
        runtimeConfig: 'select 1',
        validationDebounceMs: 30_000,
        sequenceGroupId: 'group-1',
        sequenceGroupLabel: 'Group 1',
        sequenceGroupDebounceMs: 0,
        sequence: 30,
        maxExecutions: 20,
        launchAppliesToScopes: ['product_create'],
        launchScopeBehavior: 'condition_only',
        launchSourceMode: 'form_field',
        launchSourceField: 'sourceField',
        launchOperator: 'regex',
        launchFlags: 'gi',
        appliesToScopes: ['draft_template'],
      })
    );
    expect(created.id).toBe(insertedId.toString());
    expect(created.sequence).toBe(30);
    expect(created.semanticAuditHistory).toHaveLength(1);
    expect(created.semanticAudit?.trigger).toBe('create');
  });

  it('rejects invalid update timestamps and invalid delete ids', async () => {
    await expect(
      mongoValidationPatternRepository.updatePattern(patternId, {
        expectedUpdatedAt: 'definitely-not-a-date',
      })
    ).rejects.toMatchObject({
      code: 'BAD_REQUEST',
      meta: expect.objectContaining({
        patternId,
        expectedUpdatedAt: 'definitely-not-a-date',
      }),
    });

    await expect(mongoValidationPatternRepository.deletePattern('bad-id')).rejects.toMatchObject({
      code: 'BAD_REQUEST',
      meta: expect.objectContaining({
        patternId: 'bad-id',
      }),
    });
  });

  it('reports optimistic update conflicts with the latest persisted timestamp', async () => {
    const currentRow = createDoc({
      updatedAt: new Date('2026-03-19T12:00:00.000Z'),
    });
    patternFindOneMock.mockResolvedValueOnce(currentRow).mockResolvedValueOnce(currentRow);
    patternUpdateOneMock.mockResolvedValue({ matchedCount: 0 });

    await expect(
      mongoValidationPatternRepository.updatePattern(patternId, {
        label: 'Updated label',
        expectedUpdatedAt: '2026-03-18T12:00:00.000Z',
      })
    ).rejects.toMatchObject({
      code: 'CONFLICT',
      meta: expect.objectContaining({
        patternId,
        expectedUpdatedAt: '2026-03-18T12:00:00.000Z',
        actualUpdatedAt: '2026-03-19T12:00:00.000Z',
      }),
    });
  });

  it('lists patterns, resolves valid ids, and ignores invalid ids', async () => {
    patternToArrayMock.mockResolvedValueOnce([
      createDoc({
        locale: '',
        replacementFields: ['sku', 'name', 'sku'],
        runtimeType: 'unknown',
        runtimeConfig: '   ',
        launchFlags: ' gi ',
        semanticAuditHistory: [{ source: 'manual_save', trigger: 'create', changedAt: 'bad-date' }],
      }),
    ]);
    patternFindOneMock.mockResolvedValueOnce(createDoc());

    const listed = await mongoValidationPatternRepository.listPatterns();
    expect(patternFindMock).toHaveBeenCalledWith({});
    expect(listed[0]).toEqual(
      expect.objectContaining({
        id: patternId,
        locale: '',
        replacementFields: ['sku'],
        runtimeType: 'none',
        runtimeConfig: null,
        launchFlags: 'gi',
      })
    );

    await expect(mongoValidationPatternRepository.getPatternById('bad-id')).resolves.toBeNull();
    await expect(mongoValidationPatternRepository.getPatternById(patternId)).resolves.toEqual(
      expect.objectContaining({ id: patternId, label: 'Price from latest product' })
    );
  });

  it('throws when updating missing patterns and normalizes successful updates with semantic audit history', async () => {
    patternFindOneMock.mockResolvedValueOnce(null);
    await expect(
      mongoValidationPatternRepository.updatePattern(patternId, {
        label: 'Missing pattern',
      })
    ).rejects.toMatchObject({
      code: 'NOT_FOUND',
      meta: expect.objectContaining({ patternId }),
    });
    patternUpdateOneMock.mockClear();

    const currentRow = createDoc({
      semanticState: {
        version: 2,
        operation: 'mirror_latest_field',
        sourceField: 'name',
        targetField: 'price',
      },
      semanticAuditHistory: [],
      updatedAt: new Date('2026-03-19T12:00:00.000Z'),
    });
    const updatedRow = createDoc({
      label: 'Updated label',
      locale: 'pl',
      replacementValue: 'replacement',
      replacementFields: ['name'],
      replacementAppliesToScopes: ['product_edit'],
      runtimeEnabled: true,
      runtimeType: 'database_query',
      runtimeConfig: 'select *',
      postAcceptBehavior: 'stop_after_accept',
      denyBehaviorOverride: 'ask_again',
      validationDebounceMs: 30_000,
      sequenceGroupId: 'group-a',
      sequenceGroupLabel: 'Group A',
      sequenceGroupDebounceMs: 30_000,
      sequence: 5,
      chainMode: 'stop_on_replace',
      maxExecutions: 20,
      passOutputToNext: false,
      launchEnabled: true,
      launchAppliesToScopes: ['product_create'],
      launchScopeBehavior: 'condition_only',
      launchSourceMode: 'form_field',
      launchSourceField: 'launchField',
      launchOperator: 'regex',
      launchValue: 'needle',
      launchFlags: 'gi',
      appliesToScopes: ['draft_template'],
      semanticState: {
        version: 2,
        operation: 'mirror_latest_field',
        sourceField: 'description',
        targetField: 'price',
      },
      semanticAudit: {
        source: 'import',
        trigger: 'update',
        transition: 'updated',
        previous: {
          version: 2,
          operation: 'mirror_latest_field',
          sourceField: 'name',
          targetField: 'price',
        },
        current: {
          version: 2,
          operation: 'mirror_latest_field',
          sourceField: 'description',
          targetField: 'price',
        },
        recordedAt: new Date('2026-03-19T12:01:00.000Z').toISOString(),
      },
      semanticAuditHistory: [
        {
          source: 'manual_save',
          trigger: 'create',
          transition: 'recognized',
          previous: null,
          current: {
            version: 2,
            operation: 'mirror_latest_field',
            sourceField: 'name',
            targetField: 'price',
          },
          recordedAt: new Date('2026-03-19T12:00:00.000Z').toISOString(),
        },
        {
          source: 'import',
          trigger: 'update',
          transition: 'updated',
          previous: {
            version: 2,
            operation: 'mirror_latest_field',
            sourceField: 'name',
            targetField: 'price',
          },
          current: {
            version: 2,
            operation: 'mirror_latest_field',
            sourceField: 'description',
            targetField: 'price',
          },
          recordedAt: new Date('2026-03-19T12:01:00.000Z').toISOString(),
        },
      ],
      updatedAt: new Date('2026-03-19T12:01:00.000Z'),
    });

    patternFindOneMock.mockResolvedValueOnce(currentRow).mockResolvedValueOnce(updatedRow);
    patternUpdateOneMock.mockResolvedValueOnce({ matchedCount: 1 });

    const updated = await mongoValidationPatternRepository.updatePattern(
      patternId,
      {
        label: 'Updated label',
        locale: ' pl ',
        replacementValue: ' replacement ',
        replacementFields: ['name', 'bad-field'],
        replacementAppliesToScopes: ['product_edit', 'bad'],
        runtimeEnabled: true,
        runtimeType: 'database_query',
        runtimeConfig: '  select *  ',
        postAcceptBehavior: 'stop_after_accept',
        denyBehaviorOverride: 'ask_again',
        validationDebounceMs: 35_000,
        sequenceGroupId: ' group-a ',
        sequenceGroupLabel: ' Group A ',
        sequenceGroupDebounceMs: 45_000,
        sequence: 5.9,
        chainMode: 'stop_on_replace',
        maxExecutions: 999,
        passOutputToNext: false,
        launchEnabled: true,
        launchAppliesToScopes: ['product_create', 'bad'],
        launchScopeBehavior: 'condition_only',
        launchSourceMode: 'form_field',
        launchSourceField: ' launchField ',
        launchOperator: 'regex',
        launchValue: 'needle',
        launchFlags: ' gi ',
        appliesToScopes: ['draft_template', 'bad'],
        semanticState: {
          version: 2,
          operation: 'mirror_latest_field',
          sourceField: 'description',
          targetField: 'price',
        },
      },
      { semanticAuditSource: 'import' }
    );

    expect(patternUpdateOneMock).toHaveBeenCalledWith({ _id: new ObjectId(patternId) }, expect.any(Object));
    const updateArg = patternUpdateOneMock.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(updateArg).toMatchObject({
      $set: {
        label: 'Updated label',
        locale: 'pl',
        replacementValue: 'replacement',
        replacementFields: [],
        replacementAppliesToScopes: ['product_edit'],
        runtimeEnabled: true,
        runtimeType: 'database_query',
        runtimeConfig: 'select *',
        postAcceptBehavior: 'stop_after_accept',
        denyBehaviorOverride: 'ask_again',
        validationDebounceMs: 30_000,
        sequenceGroupId: 'group-a',
        sequenceGroupLabel: 'Group A',
        sequenceGroupDebounceMs: 30_000,
        sequence: 5,
        chainMode: 'stop_on_replace',
        maxExecutions: 20,
        passOutputToNext: false,
        launchEnabled: true,
        launchAppliesToScopes: ['product_create'],
        launchScopeBehavior: 'condition_only',
        launchSourceMode: 'form_field',
        launchSourceField: 'launchField',
        launchOperator: 'regex',
        launchValue: 'needle',
        launchFlags: 'gi',
        appliesToScopes: ['draft_template'],
        semanticState: {
          version: 2,
          operation: 'mirror_latest_field',
          sourceField: 'description',
          targetField: 'price',
          presetId: null,
        },
        semanticAudit: expect.objectContaining({
          source: 'import',
          trigger: 'update',
          previous: expect.objectContaining({
            operation: 'mirror_latest_field',
            sourceField: 'name',
          }),
          current: expect.objectContaining({
            operation: 'mirror_latest_field',
            sourceField: 'description',
          }),
        }),
      },
      $push: {
        semanticAuditHistory: {
          $each: [
            expect.objectContaining({
              source: 'import',
              trigger: 'update',
              previous: expect.objectContaining({
                operation: 'mirror_latest_field',
                sourceField: 'name',
              }),
              current: expect.objectContaining({
                operation: 'mirror_latest_field',
                sourceField: 'description',
              }),
            }),
          ],
        },
      },
    });
    expect(updated).toEqual(
      expect.objectContaining({
        id: patternId,
        label: 'Updated label',
        semanticState: expect.objectContaining({
          operation: 'mirror_latest_field',
          sourceField: 'description',
        }),
      })
    );
  });

  it('reads and writes validator settings with normalization and error fallback', async () => {
    settingsFindOneMock.mockResolvedValueOnce({ value: 'false' });
    await expect(mongoValidationPatternRepository.getEnabledByDefault()).resolves.toBe(false);

    settingsFindOneMock.mockResolvedValueOnce(null);
    await expect(mongoValidationPatternRepository.getFormatterEnabledByDefault()).resolves.toBe(
      false
    );

    settingsFindOneMock.mockResolvedValueOnce({ value: '{bad-json' });
    await expect(mongoValidationPatternRepository.getInstanceDenyBehavior()).resolves.toEqual({
      draft_template: 'mute_session',
      product_create: 'mute_session',
      product_edit: 'mute_session',
    });
    expect(logClientErrorMock).toHaveBeenCalledTimes(1);

    await expect(
      mongoValidationPatternRepository.setEnabledByDefault(true)
    ).resolves.toBe(true);
    await expect(
      mongoValidationPatternRepository.setFormatterEnabledByDefault(false)
    ).resolves.toBe(false);

    await expect(
      mongoValidationPatternRepository.setInstanceDenyBehavior({
        draft_template: 'ask_again',
        product_create: 'mute_session',
        product_edit: 'ask_again',
      })
    ).resolves.toEqual({
      draft_template: 'ask_again',
      product_create: 'mute_session',
      product_edit: 'ask_again',
    });

    expect(settingsUpdateOneMock).toHaveBeenCalledWith(
      expect.objectContaining({
        $or: [{ key: PRODUCT_VALIDATOR_ENABLED_BY_DEFAULT_SETTING_KEY }, { _id: PRODUCT_VALIDATOR_ENABLED_BY_DEFAULT_SETTING_KEY }],
      }),
      expect.objectContaining({
        $set: expect.objectContaining({
          key: PRODUCT_VALIDATOR_ENABLED_BY_DEFAULT_SETTING_KEY,
          value: 'true',
        }),
      }),
      { upsert: true }
    );
    expect(settingsUpdateOneMock).toHaveBeenCalledWith(
      expect.objectContaining({
        $or: [{ key: PRODUCT_FORMATTER_ENABLED_BY_DEFAULT_SETTING_KEY }, { _id: PRODUCT_FORMATTER_ENABLED_BY_DEFAULT_SETTING_KEY }],
      }),
      expect.objectContaining({
        $set: expect.objectContaining({
          key: PRODUCT_FORMATTER_ENABLED_BY_DEFAULT_SETTING_KEY,
          value: 'false',
        }),
      }),
      { upsert: true }
    );
    expect(settingsUpdateOneMock).toHaveBeenCalledWith(
      expect.objectContaining({
        $or: [{ key: PRODUCT_VALIDATOR_INSTANCE_DENY_BEHAVIOR_SETTING_KEY }, { _id: PRODUCT_VALIDATOR_INSTANCE_DENY_BEHAVIOR_SETTING_KEY }],
      }),
      expect.objectContaining({
        $set: expect.objectContaining({
          key: PRODUCT_VALIDATOR_INSTANCE_DENY_BEHAVIOR_SETTING_KEY,
          value: JSON.stringify({
            draft_template: 'ask_again',
            product_create: 'mute_session',
            product_edit: 'ask_again',
          }),
        }),
      }),
      { upsert: true }
    );
  });
});
