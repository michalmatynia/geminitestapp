/* eslint-disable complexity, max-lines-per-function, @typescript-eslint/consistent-type-assertions, @typescript-eslint/require-await */
import { describe, expect, it, vi } from 'vitest';

import type { ProductValidationPatternRepository } from '@/shared/contracts/products/drafts';
import type {
  CreateProductValidationPatternInput,
  ProductValidationPattern,
} from '@/shared/contracts/products/validation';
import { buildTraderaParseActionValidationPatternPayloads } from '@/features/products/lib/parseActionsValidationPatterns';

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
    replacementValue: payload.replacementValue ?? null,
    replacementFields: payload.replacementFields ?? [],
    maxExecutions: payload.maxExecutions ?? 1,
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
    expect(result.createdPatternIds).toHaveLength(5);
    expect(result.patterns.map((pattern) => pattern.label)).toEqual(
      expect.arrayContaining([
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
    const createPattern = vi.fn();

    const result = await ensureDefaultProductValidationPatterns({
      repository: buildRepository({
        listPatterns: async () => [producerPattern, ...buildExistingParseActionPatterns()],
        createPattern,
      }),
    });

    expect(createPattern).not.toHaveBeenCalled();
    expect(result.createdPatternIds).toEqual([]);
    expect(result.patterns).toHaveLength(5);
  });
});
