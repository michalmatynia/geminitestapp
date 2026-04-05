import { describe, expect, it } from 'vitest';

import type { ProductValidationPattern } from '@/shared/contracts/products/validation';
import { encodeDynamicReplacementRecipe } from '@/shared/lib/products/utils/validator-replacement-recipe';
import { buildLatestFieldMirrorSemanticState } from '@/features/products/lib/validatorSemanticPresets';

import {
  REPLACEMENT_FIELD_OPTIONS,
  formatReplacementFields,
  getSourceFieldOptionsForTarget,
  isLatestFieldMirrorPattern,
  isNameSecondSegmentDimensionPattern,
} from './helpers';

const buildDynamicReplacementRecipe = (
  overrides: Partial<Parameters<typeof encodeDynamicReplacementRecipe>[0]>
) =>
  encodeDynamicReplacementRecipe({
    version: 1,
    sourceMode: 'latest_product_field',
    sourceField: 'price',
    sourceRegex: null,
    sourceFlags: null,
    sourceMatchGroup: null,
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
    ...overrides,
  });

const buildPattern = (overrides: Partial<ProductValidationPattern>): ProductValidationPattern => ({
  id: overrides.id ?? 'pattern-1',
  createdAt: overrides.createdAt ?? '',
  updatedAt: overrides.updatedAt ?? '',
  label: overrides.label ?? 'Pattern',
  target: overrides.target ?? 'price',
  locale: overrides.locale ?? null,
  regex: overrides.regex ?? '^.*$',
  flags: overrides.flags ?? null,
  message: overrides.message ?? 'Message',
  severity: overrides.severity ?? 'warning',
  enabled: overrides.enabled ?? true,
  replacementEnabled: overrides.replacementEnabled ?? true,
  replacementAutoApply: overrides.replacementAutoApply ?? false,
  skipNoopReplacementProposal: overrides.skipNoopReplacementProposal ?? true,
  replacementValue: overrides.replacementValue ?? null,
  replacementFields: overrides.replacementFields ?? ['price'],
  replacementAppliesToScopes: overrides.replacementAppliesToScopes ?? [
    'draft_template',
    'product_create',
    'product_edit',
  ],
  runtimeEnabled: overrides.runtimeEnabled ?? false,
  runtimeType: overrides.runtimeType ?? 'none',
  runtimeConfig: overrides.runtimeConfig ?? null,
  postAcceptBehavior: overrides.postAcceptBehavior ?? 'revalidate',
  denyBehaviorOverride: overrides.denyBehaviorOverride ?? null,
  validationDebounceMs: overrides.validationDebounceMs ?? 0,
  sequenceGroupId: overrides.sequenceGroupId ?? null,
  sequenceGroupLabel: overrides.sequenceGroupLabel ?? null,
  sequenceGroupDebounceMs: overrides.sequenceGroupDebounceMs ?? 0,
  sequence: overrides.sequence ?? null,
  chainMode: overrides.chainMode ?? 'continue',
  maxExecutions: overrides.maxExecutions ?? 1,
  passOutputToNext: overrides.passOutputToNext ?? true,
  launchEnabled: overrides.launchEnabled ?? false,
  launchAppliesToScopes: overrides.launchAppliesToScopes ?? [
    'draft_template',
    'product_create',
    'product_edit',
  ],
  launchScopeBehavior: overrides.launchScopeBehavior ?? 'gate',
  launchSourceMode: overrides.launchSourceMode ?? 'current_field',
  launchSourceField: overrides.launchSourceField ?? null,
  launchOperator: overrides.launchOperator ?? 'equals',
  launchValue: overrides.launchValue ?? null,
  launchFlags: overrides.launchFlags ?? null,
  appliesToScopes: overrides.appliesToScopes ?? ['draft_template', 'product_create', 'product_edit'],
  semanticState: overrides.semanticState,
});

describe('validator settings helpers', () => {
  it('formats replacement field labels using the shared field registry', () => {
    expect(formatReplacementFields(['price', 'categoryId'])).toBe('Price, Category');
    expect(REPLACEMENT_FIELD_OPTIONS).toEqual(
      expect.arrayContaining([
        { value: 'price', label: 'Price' },
        { value: 'categoryId', label: 'Category' },
      ])
    );
  });

  it('returns derived source field options for validator authoring', () => {
    expect(getSourceFieldOptionsForTarget('category')).toEqual(
      expect.arrayContaining([
        { value: 'nameEnSegment4', label: 'Name EN Segment #4' },
        { value: 'nameEnSegment4RegexEscaped', label: 'Name EN Segment #4 (Regex Escaped)' },
        { value: 'primaryCatalogId', label: 'Primary Catalog ID' },
      ])
    );
  });

  it('recognizes latest-field mirror patterns from explicit semantic state', () => {
    const pattern = buildPattern({
      target: 'price',
      semanticState: buildLatestFieldMirrorSemanticState('price'),
      replacementValue: null,
    });

    expect(isLatestFieldMirrorPattern(pattern, 'price')).toBe(true);
  });

  it('recognizes latest-field mirror patterns from inferred legacy semantics', () => {
    const pattern = buildPattern({
      target: 'price',
      semanticState: undefined,
      replacementValue: buildDynamicReplacementRecipe({
        sourceField: 'price',
      }),
    });

    expect(isLatestFieldMirrorPattern(pattern, 'price')).toBe(true);
  });

  it('recognizes legacy dimensions templates from inferred semantic identity', () => {
    const pattern = buildPattern({
      target: 'length',
      replacementEnabled: false,
      replacementValue: null,
      label: 'Name Segment: Dimensions',
      regex: '\\d+x\\d+',
      semanticState: undefined,
    });

    expect(isNameSecondSegmentDimensionPattern(pattern, 'length')).toBe(true);
  });
});
