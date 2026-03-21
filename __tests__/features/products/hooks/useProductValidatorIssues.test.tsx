import { act, renderHook } from '@/__tests__/test-utils';
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';

import { useProductValidatorIssues } from '@/features/products/hooks/useProductValidatorIssues';
import type { ProductValidationPattern } from '@/shared/contracts/products';

const { postMock, logClientErrorMock } = vi.hoisted(() => ({
  postMock: vi.fn(),
  logClientErrorMock: vi.fn(),
}));

vi.mock('@/shared/lib/api-client', () => ({
  api: {
    post: postMock,
  },
}));

vi.mock('@/shared/utils/observability/client-error-logger', () => ({
  logClientError: logClientErrorMock,
}));

const basePattern = (
  overrides: Partial<ProductValidationPattern> = {}
): ProductValidationPattern => ({
  id: 'pattern-1',
  label: 'Pattern',
  target: 'price',
  locale: null,
  regex: '^.*$',
  flags: null,
  message: 'Pattern mismatch',
  severity: 'warning',
  enabled: true,
  replacementEnabled: true,
  replacementAutoApply: false,
  skipNoopReplacementProposal: true,
  replacementValue: '4',
  replacementFields: ['price'],
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
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  ...overrides,
});

describe('useProductValidatorIssues', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('returns static issues from validation engine', () => {
    const { result } = renderHook(() =>
      useProductValidatorIssues({
        values: { price: 1 },
        patterns: [
          basePattern({
            regex: '^1$',
            replacementValue: '9',
          }),
        ],
        latestProductValues: null,
        validationScope: 'product_create',
        validatorEnabled: true,
        isIssueDenied: () => false,
        isIssueAccepted: () => false,
        source: 'test',
      })
    );

    expect(result.current.fieldIssues['price'] ?? []).toHaveLength(1);
    expect(result.current.visibleFieldIssues['price'] ?? []).toHaveLength(1);
  });

  it('merges runtime issues from runtime evaluate endpoint', async () => {
    vi.useFakeTimers();

    const runtimeIssue = {
      patternId: 'runtime-1',
      message: 'Runtime issue',
      severity: 'warning' as const,
      matchText: '1',
      index: 0,
      length: 1,
      regex: '^1$',
      flags: null,
      replacementValue: '2',
      replacementApplyMode: 'replace_whole_field' as const,
      replacementScope: 'field' as const,
      replacementActive: true,
      postAcceptBehavior: 'revalidate' as const,
      debounceMs: 0,
    };
    postMock.mockResolvedValueOnce({
      issues: {
        price: [runtimeIssue],
      },
    });

    const pattern = basePattern({
      id: 'runtime-pattern',
      runtimeEnabled: true,
      runtimeType: 'database_query',
      runtimeConfig: '{}',
    });

    const { result } = renderHook(() =>
      useProductValidatorIssues({
        values: { price: 1 },
        patterns: [pattern],
        latestProductValues: null,
        validationScope: 'product_create',
        validatorEnabled: true,
        isIssueDenied: () => false,
        isIssueAccepted: () => false,
        runtimeDebounceMs: 10,
        source: 'test',
      })
    );

    act(() => {
      vi.advanceTimersByTime(20);
    });
    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.fieldIssues['price'] ?? []).toHaveLength(1);

    expect(postMock).toHaveBeenCalledWith(
      '/api/v2/products/validator-runtime/evaluate',
      expect.objectContaining({
        patternIds: ['runtime-pattern'],
        validationScope: 'product_create',
      }),
      { logError: false }
    );
  });

  it('applies per-issue debounce before showing visible issues', async () => {
    vi.useFakeTimers();
    let changedAt = 0;

    const pattern = basePattern({
      id: 'debounce-pattern',
      regex: '^\\d+$',
      replacementValue: '42',
      validationDebounceMs: 300,
    });

    const { result, rerender } = renderHook(
      (props: { values: Record<string, unknown> }) =>
        useProductValidatorIssues({
          values: props.values,
          patterns: [pattern],
          latestProductValues: null,
          validationScope: 'product_create',
          validatorEnabled: true,
          isIssueDenied: () => false,
          isIssueAccepted: () => false,
          resolveChangedAt: () => changedAt,
          source: 'test',
        }),
      {
        initialProps: { values: { price: 1 } },
      }
    );

    changedAt = Date.now();
    rerender({ values: { price: 2 } });

    expect(result.current.fieldIssues['price'] ?? []).toHaveLength(1);
    expect(result.current.visibleFieldIssues['price'] ?? []).toHaveLength(0);

    act(() => {
      vi.advanceTimersByTime(320);
    });
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.visibleFieldIssues['price'] ?? []).toHaveLength(1);
  });

  it('hides accepted stop_after_accept issues', () => {
    const pattern = basePattern({
      id: 'accepted-pattern',
      regex: '^1$',
      replacementValue: '2',
      postAcceptBehavior: 'stop_after_accept',
    });

    const { result } = renderHook(() =>
      useProductValidatorIssues({
        values: { price: 1 },
        patterns: [pattern],
        latestProductValues: null,
        validationScope: 'product_create',
        validatorEnabled: true,
        isIssueDenied: () => false,
        isIssueAccepted: (fieldName: string, patternId: string) =>
          fieldName === 'price' && patternId === 'accepted-pattern',
        source: 'test',
      })
    );

    expect(result.current.fieldIssues['price'] ?? []).toHaveLength(1);
    expect(result.current.visibleFieldIssues['price'] ?? []).toHaveLength(0);
  });
});
