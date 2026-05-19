/* eslint-disable complexity, max-lines-per-function, @typescript-eslint/consistent-type-assertions, @typescript-eslint/require-await */
import { describe, expect, it, vi } from 'vitest';

import type { ProductValidationPatternRepository } from '@/shared/contracts/products/drafts';
import type {
  CreateProductValidationPatternInput,
  ProductValidationPattern,
} from '@/shared/contracts/products/validation';
import { buildTraderaParseActionValidationPatternPayloads } from '@/features/products/lib/parseActionsValidationPatterns';
import { buildNameSegmentDimensionsTemplatePayload } from '@/features/products/lib/validatorSemanticPresets';

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
  updatePattern,
}: {
  listPatterns: () => Promise<ProductValidationPattern[]>;
  createPattern?: ProductValidationPatternRepository['createPattern'];
  updatePattern?: ProductValidationPatternRepository['updatePattern'];
}): ProductValidationPatternRepository =>
  ({
    listPatterns,
    createPattern:
      createPattern ??
      vi.fn(async () => {
        throw new Error('createPattern should not be called');
    }),
    updatePattern:
      updatePattern ??
      vi.fn(async () => {
        throw new Error('updatePattern should not be called');
      }),
  }) as ProductValidationPatternRepository;

const buildPatternFromPayload = (
  payload: CreateProductValidationPatternInput,
  index: number
): ProductValidationPattern =>
  buildPattern({
    id: `payload-pattern-${index + 1}`,
    label: payload.label,
    target: payload.target,
    locale: payload.locale ?? null,
    regex: payload.regex,
    flags: payload.flags ?? null,
    message: payload.message,
    severity: payload.severity ?? 'warning',
    enabled: payload.enabled ?? true,
    replacementEnabled: payload.replacementEnabled ?? false,
    replacementAutoApply: payload.replacementAutoApply ?? false,
    skipNoopReplacementProposal: payload.skipNoopReplacementProposal ?? true,
    replacementValue: payload.replacementValue ?? null,
    replacementFields: payload.replacementFields ?? [],
    replacementAppliesToScopes: payload.replacementAppliesToScopes ?? [
      'draft_template',
      'product_create',
      'product_edit',
    ],
    postAcceptBehavior: payload.postAcceptBehavior ?? 'revalidate',
    validationDebounceMs: payload.validationDebounceMs ?? 0,
    maxExecutions: payload.maxExecutions ?? 1,
    launchEnabled: payload.launchEnabled ?? false,
    launchAppliesToScopes: payload.launchAppliesToScopes ?? [
      'draft_template',
      'product_create',
      'product_edit',
    ],
    launchScopeBehavior: payload.launchScopeBehavior ?? 'gate',
    launchSourceMode: payload.launchSourceMode ?? 'current_field',
    launchSourceField: payload.launchSourceField ?? null,
    launchOperator: payload.launchOperator ?? 'equals',
    launchValue: payload.launchValue ?? null,
    launchFlags: payload.launchFlags ?? null,
    appliesToScopes: payload.appliesToScopes ?? ['draft_template', 'product_create', 'product_edit'],
    semanticState: payload.semanticState ?? null,
    sequence: payload.sequence ?? null,
  });

const buildExistingParseActionPatterns = (): ProductValidationPattern[] =>
  buildTraderaParseActionValidationPatternPayloads().map(buildPatternFromPayload);

describe('ensureDefaultProductValidationPatterns', () => {
  it('creates the StarGater producer pattern when it is missing', async () => {
    const existingPattern = buildPattern();
    let createdCount = 0;
    const createPattern = vi.fn(async (payload: CreateProductValidationPatternInput) => {
      createdCount += 1;
      return buildPatternFromPayload(payload, createdCount);
    });

    const result = await ensureDefaultProductValidationPatterns({
      repository: buildRepository({
        listPatterns: async () => [existingPattern],
        createPattern,
      }),
    });

    expect(createPattern).toHaveBeenCalledWith(
      expect.objectContaining({
        label: 'Name Segment: Dimensions',
        target: 'size_length',
        replacementFields: ['sizeLength'],
        launchSourceField: 'nameEnSegment2',
      }),
      { semanticAuditSource: 'template' }
    );
    expect(createPattern).toHaveBeenCalledWith(
      expect.objectContaining({
        label: 'Producer -> StarGater.net',
        target: 'producer',
        replacementValue: 'StarGater.net',
        replacementFields: ['producerIds'],
      }),
      { semanticAuditSource: 'template' }
    );
    expect(createPattern).toHaveBeenCalledWith(
      expect.objectContaining({
        label: 'Parse Actions: Tradera listing row',
        target: 'description',
      }),
      { semanticAuditSource: 'template' }
    );
    expect(result.createdPatternIds).toHaveLength(6);
    expect(result.patterns.map((pattern) => pattern.label)).toEqual(
      expect.arrayContaining([
        'Name Segment: Dimensions',
        'Producer -> StarGater.net',
        'Parse Actions: Tradera listing row',
      ])
    );
  });

  it('does not create duplicates when equivalent default rules already exist', async () => {
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
    const dimensionsPattern = buildPatternFromPayload(
      buildNameSegmentDimensionsTemplatePayload(),
      100
    );
    const createPattern = vi.fn();

    const result = await ensureDefaultProductValidationPatterns({
      repository: buildRepository({
        listPatterns: async () => [
          dimensionsPattern,
          producerPattern,
          ...buildExistingParseActionPatterns(),
        ],
        createPattern,
      }),
    });

    expect(createPattern).not.toHaveBeenCalled();
    expect(result.createdPatternIds).toEqual([]);
    expect(result.patterns).toHaveLength(6);
  });

  it('updates legacy dimensions templates to the Length replacement pattern', async () => {
    const legacyDimensionsPattern = buildPattern({
      id: 'pattern-dimensions',
      label: 'Name Segment: Dimensions',
      target: 'name',
      regex: '\\d+x\\d+',
      semanticState: {
        version: 2,
        presetId: 'products.name-segment-dimensions.v2',
        operation: 'validate_name_contains_dimensions_token',
        sourceField: 'name_en',
        targetField: 'name',
      },
    });
    const producerPattern = buildPattern({
      id: 'pattern-producer',
      label: 'Producer -> StarGater.net',
      target: 'producer',
      replacementEnabled: true,
      replacementAutoApply: true,
      replacementValue: 'StarGater.net',
      replacementFields: ['producerIds'],
    });
    const updatePattern = vi.fn(async (_id: string, payload: CreateProductValidationPatternInput) =>
      buildPatternFromPayload(payload, 50)
    );

    const result = await ensureDefaultProductValidationPatterns({
      repository: buildRepository({
        listPatterns: async () => [
          legacyDimensionsPattern,
          producerPattern,
          ...buildExistingParseActionPatterns(),
        ],
        updatePattern,
      }),
    });

    expect(updatePattern).toHaveBeenCalledWith(
      'pattern-dimensions',
      expect.objectContaining({
        target: 'size_length',
        replacementEnabled: true,
        replacementFields: ['sizeLength'],
        launchSourceField: 'nameEnSegment2',
      }),
      { semanticAuditSource: 'template' }
    );
    expect(result.createdPatternIds).toEqual([]);
    expect(result.patterns.some((pattern) => pattern.target === 'size_length')).toBe(true);
  });
});
