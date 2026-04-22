import { describe, expect, it, vi } from 'vitest';

import type { ProductValidationPatternRepository } from '@/shared/contracts/products/drafts';
import type { ProductValidationPattern } from '@/shared/contracts/products/validation';

import { ensureDefaultProductValidationPatterns } from './validation-pattern-defaults';

const buildPattern = (
  overrides: Partial<ProductValidationPattern> = {}
): ProductValidationPattern => ({
  id: 'pattern-1',
  label: 'Existing Pattern',
  target: 'name',
  locale: null,
  regex: '^$',
  flags: null,
  message: 'Existing',
  severity: 'warning',
  enabled: true,
  replacementEnabled: false,
  replacementAutoApply: false,
  skipNoopReplacementProposal: true,
  replacementValue: null,
  replacementFields: [],
  replacementAppliesToScopes: ['draft_template', 'product_create', 'product_edit'],
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
  launchAppliesToScopes: ['draft_template', 'product_create', 'product_edit'],
  launchScopeBehavior: 'gate',
  launchSourceMode: 'current_field',
  launchSourceField: null,
  launchOperator: 'equals',
  launchValue: null,
  launchFlags: null,
  appliesToScopes: ['draft_template', 'product_create', 'product_edit'],
  semanticState: null,
  semanticAudit: null,
  semanticAuditHistory: [],
  createdAt: '2026-04-21T00:00:00.000Z',
  updatedAt: '2026-04-21T00:00:00.000Z',
  ...overrides,
});

const buildRepository = ({
  listPatterns,
  createPattern,
}: {
  listPatterns: () => Promise<ProductValidationPattern[]>;
  createPattern?: ProductValidationPatternRepository['createPattern'];
}): ProductValidationPatternRepository =>
  ({
    listPatterns,
    createPattern:
      createPattern ??
      vi.fn(async () => {
        throw new Error('createPattern should not be called');
      }),
  }) as ProductValidationPatternRepository;

describe('ensureDefaultProductValidationPatterns', () => {
  it('creates the StarGater producer pattern when it is missing', async () => {
    const existingPattern = buildPattern();
    const createdPattern = buildPattern({
      id: 'pattern-producer',
      label: 'Producer -> StarGater.net',
      target: 'producer',
      replacementEnabled: true,
      replacementAutoApply: true,
      replacementValue: 'StarGater.net',
      replacementFields: ['producerIds'],
      sequence: 20,
    });
    const createPattern = vi.fn(async () => createdPattern);

    const result = await ensureDefaultProductValidationPatterns({
      repository: buildRepository({
        listPatterns: async () => [existingPattern],
        createPattern,
      }),
    });

    expect(createPattern).toHaveBeenCalledWith(
      expect.objectContaining({
        label: 'Producer -> StarGater.net',
        target: 'producer',
        replacementValue: 'StarGater.net',
        replacementFields: ['producerIds'],
      }),
      { semanticAuditSource: 'template' }
    );
    expect(result.createdPatternIds).toEqual(['pattern-producer']);
    expect(result.patterns.map((pattern) => pattern.id)).toEqual(['pattern-1', 'pattern-producer']);
  });

  it('does not create a duplicate when an equivalent StarGater producer rule already exists', async () => {
    const producerPattern = buildPattern({
      id: 'pattern-producer',
      label: 'My Custom Producer Default',
      target: 'producer',
      replacementEnabled: true,
      replacementAutoApply: true,
      replacementValue: 'StarGater.net',
      replacementFields: ['producerIds'],
      sequence: 20,
    });
    const createPattern = vi.fn();

    const result = await ensureDefaultProductValidationPatterns({
      repository: buildRepository({
        listPatterns: async () => [producerPattern],
        createPattern,
      }),
    });

    expect(createPattern).not.toHaveBeenCalled();
    expect(result.createdPatternIds).toEqual([]);
    expect(result.patterns).toEqual([producerPattern]);
  });
});
