import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  getValidationPatternRepositoryMock,
  validateAndNormalizeRuntimeConfigMock,
  invalidateValidationPatternRuntimeCacheMock,
} = vi.hoisted(() => ({
  getValidationPatternRepositoryMock: vi.fn(),
  validateAndNormalizeRuntimeConfigMock: vi.fn(
    ({ runtimeConfig }: { runtimeConfig: string | null }) => runtimeConfig
  ),
  invalidateValidationPatternRuntimeCacheMock: vi.fn(),
}));

vi.mock('@/features/products/server', () => ({
  getValidationPatternRepository: () => getValidationPatternRepositoryMock(),
  validateAndNormalizeRuntimeConfig: (input: { runtimeConfig: string | null }) =>
    validateAndNormalizeRuntimeConfigMock(input),
}));

vi.mock('@/shared/lib/products/services/validation-pattern-runtime-cache', () => ({
  invalidateValidationPatternRuntimeCache: () => invalidateValidationPatternRuntimeCacheMock(),
}));

import {
  postValidatorPatternsImportHandler,
  postValidatorPatternsImportSchema,
} from './handler';

describe('validator-patterns import handler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('exports the supported handlers and schema', () => {
    expect(typeof postValidatorPatternsImportHandler).toBe('function');
    expect(typeof postValidatorPatternsImportSchema.safeParse).toBe('function');
  });

  it('includes semantic audit previews in dry-run import operations', async () => {
    getValidationPatternRepositoryMock.mockResolvedValue({
      listPatterns: vi.fn(async () => [
        {
          id: 'pattern-1',
          label: 'Price from latest product',
          target: 'price',
          locale: null,
          regex: '^$',
          flags: null,
          message: 'Old message',
          severity: 'error',
          enabled: true,
          replacementEnabled: true,
          replacementAutoApply: true,
          skipNoopReplacementProposal: true,
          replacementValue: 'old',
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
          sequence: null,
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
          semanticState: {
            version: 2,
            presetId: 'products.latest-field-mirror.v2',
            operation: 'mirror_latest_field',
            sourceField: 'price',
            targetField: 'price',
          },
          semanticAudit: null,
          semanticAuditHistory: [],
          createdAt: '2026-03-19T09:00:00.000Z',
          updatedAt: '2026-03-19T09:00:00.000Z',
        },
      ]),
    });

    const response = await postValidatorPatternsImportHandler(
      {} as never,
      {
        body: {
          version: 2,
          scope: 'products',
          mode: 'upsert',
          dryRun: true,
          patterns: [
            {
              id: 'pattern-1',
              code: 'price-from-latest',
              label: 'Price from latest product',
              target: 'price',
              locale: null,
              regex: '^$',
              flags: null,
              message: 'Mirror latest price',
              severity: 'error',
              enabled: true,
              replacementEnabled: true,
              replacementAutoApply: true,
              skipNoopReplacementProposal: true,
              replacementValue: 'latest',
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
              sequence: null,
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
              semanticState: {
                version: 2,
                presetId: 'products.name-mirror-polish.base.v2',
                operation: 'mirror_name_locale',
                sourceField: 'name_en',
                targetField: 'name_pl',
              },
            },
          ],
        },
      } as never
    );

    await expect(response.json()).resolves.toMatchObject({
      ok: true,
      dryRun: true,
      operations: [
        {
          action: 'update',
          code: 'price-from-latest',
          semanticAudit: {
            source: 'import',
            trigger: 'update',
            transition: 'migrated',
            summary:
              'Migrated semantic operation from "Mirror Latest Field" to "Mirror Name Locale".',
          },
        },
      ],
    });
  });
});
