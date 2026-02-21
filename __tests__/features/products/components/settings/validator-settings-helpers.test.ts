import { describe, expect, it } from 'vitest';

import { buildSequenceGroups } from '@/features/products/components/settings/validator-settings/helpers';
import type { ProductValidationPattern } from '@/shared/contracts/products';

const basePattern = (
  id: string,
  overrides: Partial<ProductValidationPattern> = {}
): ProductValidationPattern => ({
  id,
  label: `Pattern ${id}`,
  target: 'name',
  locale: 'pl',
  regex: '^.*$',
  flags: null,
  message: 'Pattern mismatch',
  severity: 'warning',
  enabled: true,
  replacementEnabled: true,
  replacementAutoApply: false,
  skipNoopReplacementProposal: true,
  replacementValue: 'value',
  replacementFields: ['name_pl'],
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

describe('validator-settings/helpers.buildSequenceGroups', () => {
  it('does not group patterns that share sequenceGroupId but differ by target', () => {
    const patterns: ProductValidationPattern[] = [
      basePattern('p1', {
        target: 'size_length',
        locale: null,
        sequenceGroupId: 'seq_shared',
        sequenceGroupLabel: 'Shared',
      }),
      basePattern('p2', {
        target: 'length',
        locale: null,
        sequenceGroupId: 'seq_shared',
        sequenceGroupLabel: 'Shared',
      }),
    ];

    const groups = buildSequenceGroups(patterns);
    expect(groups.size).toBe(0);
  });

  it('groups only patterns that share sequenceGroupId, target, and locale', () => {
    const patterns: ProductValidationPattern[] = [
      basePattern('p1', {
        target: 'name',
        locale: 'pl',
        sequenceGroupId: 'seq_name_pl',
        sequenceGroupLabel: 'Name PL',
      }),
      basePattern('p2', {
        target: 'name',
        locale: 'pl',
        sequenceGroupId: 'seq_name_pl',
        sequenceGroupLabel: 'Name PL',
      }),
      basePattern('p3', {
        target: 'length',
        locale: null,
        sequenceGroupId: 'seq_name_pl',
        sequenceGroupLabel: 'Name PL',
      }),
    ];

    const groups = buildSequenceGroups(patterns);
    expect(groups.size).toBe(1);
    const group = groups.get('seq_name_pl');
    expect(group).not.toBeUndefined();
    expect(group?.patternIds).toEqual(['p1', 'p2']);
  });
});
