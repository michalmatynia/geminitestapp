import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { apiPostMock, useOptionalContextRegistryPageEnvelopeMock } = vi.hoisted(() => ({
  apiPostMock: vi.fn(),
  useOptionalContextRegistryPageEnvelopeMock: vi.fn(),
}));

vi.mock('@/shared/lib/api-client', () => ({
  api: {
    post: apiPostMock,
  },
}));

vi.mock('@/shared/lib/ai-context-registry/page-context', () => ({
  useOptionalContextRegistryPageEnvelope: useOptionalContextRegistryPageEnvelopeMock,
}));

import type { ProductValidationPattern } from '@/shared/contracts/products/validation';
import { encodeDynamicReplacementRecipe } from '@/shared/lib/products/utils/validator-replacement-recipe';
import {
  buildNameSegmentDimensionsSemanticState,
  buildNameSegmentDimensionsTemplatePayload,
} from '@/features/products/lib/validatorSemanticPresets';
import {
  PRODUCT_VALIDATION_SOURCE_FIELD_IDS,
  buildProductValidationSourceValues,
} from '@/features/products/lib/validatorSourceFields';

import { useProductValidatorIssues } from '../useProductValidatorIssues';

const createRuntimePattern = (): ProductValidationPattern =>
  ({
    id: 'pattern-runtime-1',
    label: 'AI validation',
    target: 'name',
    locale: 'en',
    regex: '.*',
    flags: null,
    message: 'Validation failed.',
    severity: 'warning',
    enabled: true,
    replacementEnabled: false,
    replacementAutoApply: false,
    skipNoopReplacementProposal: true,
    replacementValue: null,
    replacementFields: [],
    replacementAppliesToScopes: ['product_edit'],
    runtimeEnabled: true,
    runtimeType: 'ai_prompt',
    runtimeConfig: JSON.stringify({
      version: 2,
      responseFormat: 'json',
      promptTemplate: 'Validate [fieldName]',
    }),
    postAcceptBehavior: 'revalidate',
    denyBehaviorOverride: null,
    validationDebounceMs: 0,
    sequenceGroupId: null,
    sequenceGroupLabel: null,
    sequenceGroupDebounceMs: 0,
    sequence: null,
    chainMode: 'continue',
    maxExecutions: 1,
    passOutputToNext: false,
    launchEnabled: false,
    launchAppliesToScopes: ['product_edit'],
    launchScopeBehavior: 'gate',
    launchSourceMode: 'current_field',
    launchSourceField: null,
    launchOperator: 'contains',
    launchValue: null,
    launchFlags: null,
    appliesToScopes: ['product_edit'],
  }) as ProductValidationPattern;

const createNameSegmentSizeLengthPattern = (): ProductValidationPattern =>
  ({
    id: 'pattern-name-segment-size-length',
    label: 'Name segment size length',
    target: 'size_length',
    locale: null,
    regex: '^0$',
    flags: null,
    message: 'Propose Length (sizeLength) from Name segment #2',
    severity: 'warning',
    enabled: true,
    replacementEnabled: true,
    replacementAutoApply: true,
    skipNoopReplacementProposal: false,
    replacementValue: encodeDynamicReplacementRecipe({
      version: 1,
      sourceMode: 'form_field',
      sourceField: PRODUCT_VALIDATION_SOURCE_FIELD_IDS.nameEnSegment2,
      sourceRegex: '([+-]?\\d+(?:[.,]\\d+)?)',
      sourceFlags: null,
      sourceMatchGroup: 1,
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
    replacementFields: ['sizeLength'],
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
    sequence: null,
    chainMode: 'continue',
    maxExecutions: 1,
    passOutputToNext: true,
    launchEnabled: true,
    launchAppliesToScopes: ['product_edit'],
    launchScopeBehavior: 'gate',
    launchSourceMode: 'form_field',
    launchSourceField: PRODUCT_VALIDATION_SOURCE_FIELD_IDS.nameEnSegment2,
    launchOperator: 'is_not_empty',
    launchValue: null,
    launchFlags: null,
    appliesToScopes: ['product_edit'],
    semanticState: buildNameSegmentDimensionsSemanticState(),
  }) as ProductValidationPattern;

const createNameSegmentDimensionsTemplatePattern = (): ProductValidationPattern => {
  const payload = buildNameSegmentDimensionsTemplatePayload();
  return {
    id: 'pattern-name-segment-dimensions-template',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
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
    replacementAppliesToScopes: payload.replacementAppliesToScopes ?? ['product_edit'],
    runtimeEnabled: payload.runtimeEnabled ?? false,
    runtimeType: payload.runtimeType ?? 'none',
    runtimeConfig: payload.runtimeConfig ?? null,
    postAcceptBehavior: payload.postAcceptBehavior ?? 'revalidate',
    denyBehaviorOverride: payload.denyBehaviorOverride ?? null,
    validationDebounceMs: payload.validationDebounceMs ?? 0,
    sequenceGroupId: payload.sequenceGroupId ?? null,
    sequenceGroupLabel: payload.sequenceGroupLabel ?? null,
    sequenceGroupDebounceMs: payload.sequenceGroupDebounceMs ?? 0,
    sequence: payload.sequence ?? null,
    chainMode: payload.chainMode ?? 'continue',
    maxExecutions: payload.maxExecutions ?? 1,
    passOutputToNext: payload.passOutputToNext ?? true,
    launchEnabled: payload.launchEnabled ?? false,
    launchAppliesToScopes: payload.launchAppliesToScopes ?? ['product_edit'],
    launchScopeBehavior: payload.launchScopeBehavior ?? 'gate',
    launchSourceMode: payload.launchSourceMode ?? 'current_field',
    launchSourceField: payload.launchSourceField ?? null,
    launchOperator: payload.launchOperator ?? 'equals',
    launchValue: payload.launchValue ?? null,
    launchFlags: payload.launchFlags ?? null,
    appliesToScopes: payload.appliesToScopes ?? ['product_edit'],
    semanticState: payload.semanticState ?? null,
    semanticAudit: null,
    semanticAuditHistory: [],
  } as ProductValidationPattern;
};

describe('useProductValidatorIssues', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    apiPostMock.mockResolvedValue({ issues: {} });
    useOptionalContextRegistryPageEnvelopeMock.mockReturnValue({
      refs: [
        { id: 'page:product-editor', kind: 'static_node' },
        {
          id: 'runtime:product-editor:workspace:product-1',
          kind: 'runtime_document',
          providerId: 'product-editor-local',
          entityType: 'product_editor_workspace_state',
        },
      ],
      engineVersion: 'page-context:v1',
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('forwards the page context registry when evaluating runtime validator issues', async () => {
    renderHook(() =>
      useProductValidatorIssues({
        values: { name_en: 'Vintage Lamp' },
        patterns: [createRuntimePattern()],
        latestProductValues: null,
        validationScope: 'product_edit',
        validatorEnabled: true,
        isIssueDenied: () => false,
        isIssueAccepted: () => false,
        runtimeDebounceMs: 10,
        source: 'ProductForm',
      })
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });

    expect(apiPostMock).toHaveBeenCalledWith(
      '/api/v2/products/validator-runtime/evaluate',
      expect.objectContaining({
        values: { name_en: 'Vintage Lamp' },
        validationScope: 'product_edit',
        contextRegistry: expect.objectContaining({
          refs: [
            expect.objectContaining({ id: 'page:product-editor' }),
            expect.objectContaining({
              id: 'runtime:product-editor:workspace:product-1',
            }),
          ],
        }),
      }),
      { logError: false }
    );
  });

  it('omits contextRegistry from the runtime validator request when no page envelope is available', async () => {
    useOptionalContextRegistryPageEnvelopeMock.mockReturnValue(null);

    renderHook(() =>
      useProductValidatorIssues({
        values: { name_en: 'Vintage Lamp' },
        patterns: [createRuntimePattern()],
        latestProductValues: null,
        validationScope: 'product_edit',
        validatorEnabled: true,
        isIssueDenied: () => false,
        isIssueAccepted: () => false,
        runtimeDebounceMs: 10,
        source: 'ProductForm',
      })
    );

    await act(async () => {
      await vi.advanceTimersByTimeAsync(10);
    });

    expect(apiPostMock).toHaveBeenCalledWith(
      '/api/v2/products/validator-runtime/evaluate',
      expect.not.objectContaining({
        contextRegistry: expect.anything(),
      }),
      { logError: false }
    );
  });

  it('shows source-driven Length validation from the pasted English name Size segment', () => {
    const { result } = renderHook(() =>
      useProductValidatorIssues({
        values: buildProductValidationSourceValues({
          baseValues: {
            name_en: 'Darth Vader | 13 cm | Eko-Skóra | Movie Wallet | Star Wars',
            sizeLength: Number.NaN,
          },
        }),
        patterns: [createNameSegmentSizeLengthPattern()],
        latestProductValues: null,
        validationScope: 'product_edit',
        validatorEnabled: true,
        isIssueDenied: () => false,
        isIssueAccepted: () => false,
        source: 'ProductForm',
      })
    );

    expect(result.current.visibleFieldIssues['sizeLength']?.[0]).toMatchObject({
      patternId: 'pattern-name-segment-size-length',
      message: 'Propose Length (sizeLength) from Name segment #2',
      replacementValue: '13',
      replacementActive: true,
    });
  });

  it('shows the default dimensions template proposal for the pasted English name Size segment', () => {
    const { result } = renderHook(() =>
      useProductValidatorIssues({
        values: buildProductValidationSourceValues({
          baseValues: {
            name_en: 'Darth Vader | 13 cm | Eko-Skóra | Movie Wallet | Star Wars',
            sizeLength: Number.NaN,
          },
        }),
        patterns: [createNameSegmentDimensionsTemplatePattern()],
        latestProductValues: null,
        validationScope: 'product_edit',
        validatorEnabled: true,
        isIssueDenied: () => false,
        isIssueAccepted: () => false,
        source: 'ProductForm',
      })
    );

    expect(result.current.visibleFieldIssues['sizeLength']?.[0]).toMatchObject({
      patternId: 'pattern-name-segment-dimensions-template',
      message: 'Use Name EN segment #2 as Length when the current Length differs.',
      replacementValue: '13',
      replacementActive: true,
    });
  });
});
