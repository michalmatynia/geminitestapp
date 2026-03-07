import { describe, expect, it } from 'vitest';

import type { ProductValidationPattern } from '@/shared/contracts/products';
import {
  areIssueMapsEquivalent,
  buildFieldIssues,
} from '@/features/products/validation-engine/core';

// --- helpers -----------------------------------------------------------

let _seq = 0;
function makePattern(
  overrides: Partial<ProductValidationPattern> & { regex: string; target: string }
): ProductValidationPattern {
  _seq += 1;
  const base: ProductValidationPattern = {
    id: `pat-${_seq}`,
    label: `Pattern ${_seq}`,
    target: 'name',
    locale: null,
    regex: overrides.regex,
    flags: null,
    message: `Issue from pattern ${_seq}`,
    severity: 'error',
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
  };
  return { ...base, ...overrides, target: overrides.target as ProductValidationPattern['target'] };
}

const SCOPE = 'product_edit' as const;

// -----------------------------------------------------------------------

describe('buildFieldIssues', () => {
  it('returns empty object for empty values', () => {
    const issues = buildFieldIssues({
      values: {},
      patterns: [makePattern({ regex: 'x', target: 'name' })],
      latestProductValues: null,
      validationScope: SCOPE,
    });
    expect(issues).toEqual({});
  });

  it('returns empty object for empty patterns', () => {
    const issues = buildFieldIssues({
      values: { name_en: 'hello' },
      patterns: [],
      latestProductValues: null,
      validationScope: SCOPE,
    });
    expect(issues).toEqual({});
  });

  it('returns empty object when no pattern matches', () => {
    const issues = buildFieldIssues({
      values: { name_en: 'hello' },
      patterns: [makePattern({ regex: '^\\d+$', target: 'name' })],
      latestProductValues: null,
      validationScope: SCOPE,
    });
    expect(issues).toEqual({});
  });

  it('generates an issue for a matching pattern', () => {
    const pattern = makePattern({ regex: 'hello', target: 'name', message: 'no hello' });
    const issues = buildFieldIssues({
      values: { name_en: 'hello world' },
      patterns: [pattern],
      latestProductValues: null,
      validationScope: SCOPE,
    });
    expect(issues['name_en']).toHaveLength(1);
    expect(issues['name_en']![0]!.patternId).toBe(pattern.id);
    expect(issues['name_en']![0]!.message).toBe('no hello');
    expect(issues['name_en']![0]!.matchText).toBe('hello');
  });

  it('ignores disabled patterns', () => {
    const issues = buildFieldIssues({
      values: { name_en: 'hello' },
      patterns: [makePattern({ regex: 'hello', target: 'name', enabled: false })],
      latestProductValues: null,
      validationScope: SCOPE,
    });
    expect(issues).toEqual({});
  });

  it('ignores patterns for wrong target', () => {
    const issues = buildFieldIssues({
      values: { name_en: 'ABC123' },
      patterns: [makePattern({ regex: '[A-Z]', target: 'sku' })],
      latestProductValues: null,
      validationScope: SCOPE,
    });
    expect(issues).toEqual({});
  });

  it('filters patterns by locale — matching locale produces issue', () => {
    const enPattern = makePattern({ regex: 'bad', target: 'name', locale: 'en' });
    const issues = buildFieldIssues({
      values: { name_en: 'bad word' },
      patterns: [enPattern],
      latestProductValues: null,
      validationScope: SCOPE,
    });
    expect(issues['name_en']).toHaveLength(1);
  });

  it('filters patterns by locale — mismatched locale produces no issue', () => {
    const dePattern = makePattern({ regex: 'bad', target: 'name', locale: 'de' });
    const issues = buildFieldIssues({
      values: { name_en: 'bad word' },
      patterns: [dePattern],
      latestProductValues: null,
      validationScope: SCOPE,
    });
    expect(issues).toEqual({});
  });

  it('includes replacement value in issue when replacementEnabled', () => {
    const pattern = makePattern({
      regex: 'foo',
      target: 'name',
      replacementEnabled: true,
      replacementValue: 'bar',
      skipNoopReplacementProposal: false,
    });
    const issues = buildFieldIssues({
      values: { name_en: 'foo baz' },
      patterns: [pattern],
      latestProductValues: null,
      validationScope: SCOPE,
    });
    expect(issues['name_en']![0]!.replacementValue).toBe('bar');
    expect(issues['name_en']![0]!.replacementActive).toBe(true);
  });

  it('suppresses noop replacement proposal when skipNoopReplacementProposal is true', () => {
    // replacement value === match text → noop
    const pattern = makePattern({
      regex: 'foo',
      target: 'name',
      replacementEnabled: true,
      replacementValue: 'foo',
      skipNoopReplacementProposal: true,
    });
    const issues = buildFieldIssues({
      values: { name_en: 'foo' },
      patterns: [pattern],
      latestProductValues: null,
      validationScope: SCOPE,
    });
    expect(issues).toEqual({});
  });

  it('respects appliesToScopes — pattern excluded from scope emits no issue', () => {
    const pattern = makePattern({
      regex: 'bad',
      target: 'name',
      appliesToScopes: ['product_create'],
    });
    const issues = buildFieldIssues({
      values: { name_en: 'bad word' },
      patterns: [pattern],
      latestProductValues: null,
      validationScope: 'product_edit',
    });
    expect(issues).toEqual({});
  });

  it('emits issue for pattern matching with scope included', () => {
    const pattern = makePattern({
      regex: 'bad',
      target: 'name',
      appliesToScopes: ['product_edit'],
    });
    const issues = buildFieldIssues({
      values: { name_en: 'bad word' },
      patterns: [pattern],
      latestProductValues: null,
      validationScope: 'product_edit',
    });
    expect(issues['name_en']).toHaveLength(1);
  });

  it('handles SKU field', () => {
    const pattern = makePattern({ regex: '^\\s', target: 'sku' });
    const issues = buildFieldIssues({
      values: { sku: ' leading-space' },
      patterns: [pattern],
      latestProductValues: null,
      validationScope: SCOPE,
    });
    expect(issues['sku']).toHaveLength(1);
  });

  it('handles numeric field value converted to string', () => {
    const pattern = makePattern({ regex: '^0$', target: 'price' });
    const issues = buildFieldIssues({
      values: { price: 0 },
      patterns: [pattern],
      latestProductValues: null,
      validationScope: SCOPE,
    });
    expect(issues['price']).toHaveLength(1);
  });

  it('emits sequence group aggregate issue when replacement transforms value', () => {
    const groupId = 'grp-1';
    // A sequence group requires 2+ patterns with the same group+target+locale scope key.
    // isPatternInSequenceGroup returns true only when count > 1.
    const p1 = makePattern({
      regex: 'foo',
      target: 'name',
      sequenceGroupId: groupId,
      sequenceGroupLabel: 'My Group',
      sequenceGroupDebounceMs: 0,
      sequence: 10,
      replacementEnabled: true,
      replacementValue: 'bar',
      skipNoopReplacementProposal: false,
      chainMode: 'continue',
      passOutputToNext: true,
    });
    // p2 won't match the input but is required to trigger the group detection (count > 1)
    const p2 = makePattern({
      regex: 'zzz_no_match',
      target: 'name',
      sequenceGroupId: groupId,
      sequenceGroupLabel: 'My Group',
      sequenceGroupDebounceMs: 0,
      sequence: 20,
      replacementEnabled: false,
      chainMode: 'continue',
      passOutputToNext: true,
    });
    const issues = buildFieldIssues({
      values: { name_en: 'foo' },
      patterns: [p1, p2],
      latestProductValues: null,
      validationScope: SCOPE,
    });
    // Sequence aggregate should surface since p1 transformed 'foo' → 'bar'
    const fieldIssues = issues['name_en'] ?? [];
    const seqIssue = fieldIssues.find((i) => i.patternId.startsWith('sequence:'));
    expect(seqIssue).toBeDefined();
    expect(seqIssue!.replacementValue).toBe('bar');
    expect(seqIssue!.replacementApplyMode).toBe('replace_whole_field');
  });

  it('respects stop_on_match in sequence group — only first pattern processed', () => {
    const groupId = 'grp-stop';
    const p1 = makePattern({
      regex: 'a',
      target: 'name',
      sequenceGroupId: groupId,
      sequenceGroupLabel: null,
      sequenceGroupDebounceMs: 0,
      sequence: 10,
      replacementEnabled: true,
      replacementValue: 'X',
      skipNoopReplacementProposal: false,
      chainMode: 'stop_on_match',
      passOutputToNext: true,
    });
    const p2 = makePattern({
      regex: 'X',
      target: 'name',
      sequenceGroupId: groupId,
      sequenceGroupLabel: null,
      sequenceGroupDebounceMs: 0,
      sequence: 20,
      replacementEnabled: true,
      replacementValue: 'Y',
      skipNoopReplacementProposal: false,
      chainMode: 'continue',
      passOutputToNext: true,
    });
    const issues = buildFieldIssues({
      values: { name_en: 'abc' },
      patterns: [p1, p2],
      latestProductValues: null,
      validationScope: SCOPE,
    });
    const fieldIssues = issues['name_en'] ?? [];
    const seqIssue = fieldIssues.find((i) => i.patternId.startsWith('sequence:'));
    // p1 replaces a→X, then stop_on_match fires, p2 never runs
    // so final value should be 'Xbc', not 'Ybc'
    expect(seqIssue?.replacementValue).toBe('Xbc');
  });

  it('handles empty string field — skips non-external-launch patterns', () => {
    const pattern = makePattern({ regex: '.*', target: 'name' });
    const issues = buildFieldIssues({
      values: { name_en: '' },
      patterns: [pattern],
      latestProductValues: null,
      validationScope: SCOPE,
    });
    expect(issues).toEqual({});
  });

  it('severity warning is preserved in issue', () => {
    const pattern = makePattern({
      regex: 'warn',
      target: 'name',
      severity: 'warning',
    });
    const issues = buildFieldIssues({
      values: { name_en: 'warn me' },
      patterns: [pattern],
      latestProductValues: null,
      validationScope: SCOPE,
    });
    expect(issues['name_en']![0]!.severity).toBe('warning');
  });
});

// -----------------------------------------------------------------------

describe('areIssueMapsEquivalent', () => {
  it('returns true for identical references', () => {
    const map = { name_en: [] };
    expect(areIssueMapsEquivalent(map, map)).toBe(true);
  });

  it('returns true for two empty maps', () => {
    expect(areIssueMapsEquivalent({}, {})).toBe(true);
  });

  it('returns false when key counts differ', () => {
    expect(areIssueMapsEquivalent({ name_en: [] }, {})).toBe(false);
  });

  it('returns false when issue counts differ for same key', () => {
    const pattern = makePattern({ regex: 'x', target: 'name' });
    const issue = buildFieldIssues({
      values: { name_en: 'x' },
      patterns: [pattern],
      latestProductValues: null,
      validationScope: SCOPE,
    })['name_en']!;
    expect(areIssueMapsEquivalent({ name_en: issue }, { name_en: [] })).toBe(false);
  });

  it('returns true for structurally equal maps produced by two separate calls', () => {
    const pattern = makePattern({ regex: 'x', target: 'name' });
    const args = {
      values: { name_en: 'x' },
      patterns: [pattern],
      latestProductValues: null,
      validationScope: SCOPE,
    };
    const a = buildFieldIssues(args);
    const b = buildFieldIssues(args);
    expect(areIssueMapsEquivalent(a, b)).toBe(true);
  });
});
