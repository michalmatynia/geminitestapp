import { describe, expect, it } from 'vitest';

import {
  areIssueMapsEquivalent,
  buildFieldIssues,
  mergeFieldIssueMaps,
} from '@/features/products/validation-engine/core';
import type { ProductValidationPattern } from '@/shared/types/domain/products';

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

describe('validation-engine/core', () => {
  it('suppresses no-op replacement proposals when enabled', () => {
    const issues = buildFieldIssues({
      values: { price: 4 },
      patterns: [
        basePattern({
          regex: '^4$',
          replacementValue: '4',
          skipNoopReplacementProposal: true,
        }),
      ],
      latestProductValues: null,
      validationScope: 'product_create',
    });

    expect(issues['price'] ?? []).toHaveLength(0);
  });

  it('keeps no-op replacement proposals when suppression is disabled', () => {
    const issues = buildFieldIssues({
      values: { price: 4 },
      patterns: [
        basePattern({
          regex: '^4$',
          replacementValue: '4',
          skipNoopReplacementProposal: false,
        }),
      ],
      latestProductValues: null,
      validationScope: 'product_create',
    });

    expect(issues['price'] ?? []).toHaveLength(1);
  });

  it('respects appliesToScopes gating', () => {
    const issues = buildFieldIssues({
      values: { price: 4 },
      patterns: [
        basePattern({
          appliesToScopes: ['product_create'],
        }),
      ],
      latestProductValues: null,
      validationScope: 'product_edit',
    });

    expect(issues['price'] ?? []).toHaveLength(0);
  });

  it('respects launch source conditions for form fields', () => {
    const issues = buildFieldIssues({
      values: { price: 4, name_en: 'Test | 4 cm | Metal | Pin | Lore' },
      patterns: [
        basePattern({
          launchEnabled: true,
          launchSourceMode: 'form_field',
          launchSourceField: 'name_en',
          launchOperator: 'contains',
          launchValue: 'Keychain',
        }),
      ],
      latestProductValues: null,
      validationScope: 'product_create',
    });

    expect(issues['price'] ?? []).toHaveLength(0);
  });

  it('merges issue maps deterministically and compares equivalence', () => {
    const left = {
      price: [basePattern({ id: 'a' })].map((pattern) => ({
        patternId: pattern.id,
        message: pattern.message,
        severity: pattern.severity,
        matchText: '4',
        index: 0,
        length: 1,
        regex: pattern.regex,
        flags: pattern.flags,
        replacementValue: '5',
        replacementApplyMode: 'replace_whole_field' as const,
        replacementScope: 'field' as const,
        replacementActive: true,
        postAcceptBehavior: 'revalidate' as const,
        debounceMs: 0,
      })),
    };
    const right = {
      stock: [
        {
          patternId: 'b',
          message: 'Stock',
          severity: 'warning' as const,
          matchText: '2',
          index: 0,
          length: 1,
          regex: '^2$',
          flags: null,
          replacementValue: '3',
          replacementApplyMode: 'replace_whole_field' as const,
          replacementScope: 'field' as const,
          replacementActive: true,
          postAcceptBehavior: 'revalidate' as const,
          debounceMs: 0,
        },
      ],
    };
    const merged = mergeFieldIssueMaps(left, right);

    expect(Object.keys(merged).sort()).toEqual(['price', 'stock']);
    expect(areIssueMapsEquivalent(merged, { ...merged })).toBe(true);
  });
});
