import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { ObjectId } from 'mongodb';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { encodeDynamicReplacementRecipe } from '@/shared/lib/products/utils/validator-replacement-recipe';

const {
  createIndexMock,
  updateOneMock,
  toArrayMock,
  getMongoDbMock,
} = vi.hoisted(() => {
  const createIndexMock = vi.fn();
  const updateOneMock = vi.fn();
  const toArrayMock = vi.fn();
  const sortMock = vi.fn(() => ({ toArray: toArrayMock }));
  const findMock = vi.fn(() => ({ sort: sortMock }));
  const collectionMock = vi.fn(() => ({
    createIndex: createIndexMock,
    updateOne: updateOneMock,
    find: findMock,
  }));
  const getMongoDbMock = vi.fn(async () => ({
    collection: collectionMock,
  }));

  return {
    createIndexMock,
    updateOneMock,
    toArrayMock,
    getMongoDbMock,
  };
});

vi.mock('@/shared/lib/db/mongo-client', () => ({
  getMongoDb: getMongoDbMock,
}));

import { mongoValidationPatternRepository } from './mongo-validation-pattern-repository';

const currentDir = path.dirname(fileURLToPath(import.meta.url));
const repositoryPath = path.join(currentDir, 'mongo-validation-pattern-repository.ts');

describe('mongoValidationPatternRepository', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    createIndexMock.mockResolvedValue('ok');
  });

  it('keeps repository reads latest-only and does not auto-migrate semantics on read', async () => {
    toArrayMock.mockResolvedValue([
      {
        _id: new ObjectId('507f1f77bcf86cd799439011'),
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
        replacementValue: encodeDynamicReplacementRecipe({
          version: 1,
          sourceMode: 'latest_product_field',
          sourceField: 'price',
          sourceRegex: null,
          sourceFlags: null,
          sourceMatchGroup: null,
          mathOperation: 'none',
          mathOperand: null,
          roundMode: 'none',
          padLength: null,
          padChar: null,
          logicOperator: 'none',
          logicOperand: null,
          logicFlags: null,
          logicWhenTrueAction: 'keep',
          logicWhenTrueValue: null,
          logicWhenFalseAction: 'keep',
          logicWhenFalseValue: null,
          resultAssembly: 'segment_only',
          targetApply: 'replace_whole_field',
        }),
        replacementFields: [],
        replacementAppliesToScopes: [],
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
        launchScopeBehavior: 'all',
        launchSourceMode: 'current_field',
        launchSourceField: null,
        launchOperator: 'equals',
        launchValue: null,
        launchFlags: null,
        appliesToScopes: [],
        semanticState: null,
        semanticAudit: null,
        semanticAuditHistory: [],
        createdAt: new Date('2026-03-19T12:00:00.000Z'),
        updatedAt: new Date('2026-03-19T12:00:00.000Z'),
      },
    ]);

    const patterns = await mongoValidationPatternRepository.listPatterns();

    expect(updateOneMock).not.toHaveBeenCalled();
    expect(patterns).toHaveLength(1);
    expect(patterns[0]?.semanticState).toBeNull();
  });

  it('does not reintroduce read-time semantic migration helpers into the repository', () => {
    const source = readFileSync(repositoryPath, 'utf8');

    expect(source).not.toContain('buildProductValidationPatternSemanticMigrationSetPatch');
    expect(source).not.toContain('migratePatternDocumentSemantics');
    expect(source).not.toContain('getProductValidationSemanticState(currentRow)');
  });
});
