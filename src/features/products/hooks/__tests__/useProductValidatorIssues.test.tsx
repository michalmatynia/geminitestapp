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

import type { ProductValidationPattern } from '@/shared/contracts/products';

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
});
