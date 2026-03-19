import { describe, expect, it } from 'vitest';

import type { ProductValidationPattern } from '@/shared/contracts/products';
import { encodeDynamicReplacementRecipe } from '@/shared/lib/products/utils/validator-replacement-recipe';

import { EMPTY_FORM } from './helpers';
import {
  buildAndSimulateValidatorPatternPreview,
  buildValidatorPatternSimulatorInputs,
  simulateValidatorPatternPreview,
} from './validator-pattern-simulator';

const buildPattern = (overrides: Partial<ProductValidationPattern>): ProductValidationPattern => ({
  id: overrides.id ?? `pattern-${Math.random().toString(36).slice(2, 8)}`,
  createdAt: overrides.createdAt ?? '',
  updatedAt: overrides.updatedAt ?? '',
  label: overrides.label ?? 'Pattern',
  target: overrides.target ?? 'name',
  locale: overrides.locale ?? 'en',
  regex: overrides.regex ?? '^.*$',
  flags: overrides.flags ?? null,
  message: overrides.message ?? 'Message',
  severity: overrides.severity ?? 'warning',
  enabled: overrides.enabled ?? true,
  replacementEnabled: overrides.replacementEnabled ?? true,
  replacementAutoApply: overrides.replacementAutoApply ?? false,
  skipNoopReplacementProposal: overrides.skipNoopReplacementProposal ?? true,
  replacementValue: overrides.replacementValue ?? null,
  replacementFields: overrides.replacementFields ?? ['name_en'],
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
});

describe('validator pattern simulator', () => {
  it('builds simulator inputs for current, source, and launch fields without duplicates', () => {
    expect(
      buildValidatorPatternSimulatorInputs({
        ...EMPTY_FORM,
        target: 'price',
        sourceMode: 'latest_product_field',
        sourceField: 'price',
        launchEnabled: true,
        launchSourceMode: 'form_field',
        launchSourceField: 'sku',
      })
    ).toEqual([
      {
        key: 'current_field:price',
        fieldName: 'price',
        sourceMode: 'current_field',
        label: 'Current Price',
        placeholder: 'Current field value',
      },
      {
        key: 'latest_product_field:price',
        fieldName: 'price',
        sourceMode: 'latest_product_field',
        label: 'Source Price',
        placeholder: 'Latest product source value',
      },
      {
        key: 'form_field:sku',
        fieldName: 'sku',
        sourceMode: 'form_field',
        label: 'Launch SKU',
        placeholder: 'Source value',
      },
    ]);
  });

  it('simulates a static text replacement preview', () => {
    const result = buildAndSimulateValidatorPatternPreview({
      formData: {
        ...EMPTY_FORM,
        label: 'Collapse spaces',
        target: 'name',
        locale: 'en',
        regex: '\\s{2,}',
        message: 'Collapse repeated spaces',
        replacementEnabled: true,
        replacementMode: 'static',
        replacementValue: ' ',
      },
      sequenceGroups: new Map(),
      orderedPatterns: [],
      editingPattern: null,
      modalSemanticState: null,
      simulatorValues: {
        'current_field:name_en': 'Red  Bag',
      },
      categoryFixturesText: '',
    });

    expect(result).toMatchObject({
      status: 'ready',
      launchMatched: true,
      regexMatched: true,
      replacementValue: ' ',
      applied: true,
      outputDisplayValue: 'Red Bag',
    });
  });

  it('simulates a dynamic numeric replacement from latest product data', () => {
    const result = buildAndSimulateValidatorPatternPreview({
      formData: {
        ...EMPTY_FORM,
        label: 'Mirror latest price',
        target: 'price',
        regex: '^.*$',
        message: 'Use latest price',
        replacementEnabled: true,
        replacementMode: 'dynamic',
        sourceMode: 'latest_product_field',
        sourceField: 'price',
        targetApply: 'replace_whole_field',
      },
      sequenceGroups: new Map(),
      orderedPatterns: [],
      editingPattern: null,
      modalSemanticState: null,
      simulatorValues: {
        'current_field:price': '0',
        'latest_product_field:price': '12.9',
      },
      categoryFixturesText: '',
    });

    expect(result).toMatchObject({
      status: 'ready',
      launchMatched: true,
      applied: true,
      outputValue: 12,
      outputDisplayValue: '12',
    });
  });

  it('applies inferred latest-field mirror semantics even when regex does not match', () => {
    const result = simulateValidatorPatternPreview({
      pattern: buildPattern({
        id: 'legacy-stock-mirror',
        target: 'stock',
        regex: '^$',
        replacementEnabled: true,
        replacementValue: encodeDynamicReplacementRecipe({
          version: 1,
          sourceMode: 'latest_product_field',
          sourceField: 'stock',
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
        }),
        replacementFields: ['stock'],
        locale: null,
      }),
      formData: {
        ...EMPTY_FORM,
        target: 'stock',
        regex: '^$',
        replacementEnabled: true,
        replacementMode: 'dynamic',
        sourceMode: 'latest_product_field',
        sourceField: 'stock',
        targetApply: 'replace_whole_field',
      },
      simulatorValues: {
        'current_field:stock': '0',
        'latest_product_field:stock': '7',
      },
      validationScope: 'product_edit',
      categoryFixturesText: '',
    });

    expect(result).toMatchObject({
      status: 'ready',
      regexMatched: false,
      allowWithoutRegexMatch: true,
      applied: true,
      outputValue: 7,
      outputDisplayValue: '7',
    });
  });

  it('simulates a category replacement when category fixtures are provided', () => {
    const result = buildAndSimulateValidatorPatternPreview({
      formData: {
        ...EMPTY_FORM,
        label: 'Name segment to category',
        target: 'category',
        regex: '^$',
        message: 'Infer category',
        replacementEnabled: true,
        replacementMode: 'dynamic',
        sourceMode: 'form_field',
        sourceField: 'nameEnSegment4',
        targetApply: 'replace_whole_field',
        launchEnabled: true,
        launchSourceMode: 'form_field',
        launchSourceField: 'nameEnSegment4',
        launchOperator: 'is_not_empty',
      },
      sequenceGroups: new Map(),
      orderedPatterns: [],
      editingPattern: null,
      modalSemanticState: null,
      simulatorValues: {
        'current_field:categoryId': '',
        'form_field:nameEnSegment4': 'Keychains',
      },
      categoryFixturesText: 'category-1|Keychains|Keychains|Breloki|Schlusselanhanger',
    });

    expect(result).toMatchObject({
      status: 'ready',
      launchMatched: true,
      regexMatched: true,
      replacementValue: 'Keychains',
      applied: true,
      outputValue: 'category-1',
      outputDisplayValue: 'Keychains',
    });
  });

  it('builds a per-step sequence trace for grouped patterns', () => {
    const existingPattern = buildPattern({
      id: 'pattern-1',
      label: 'Step 1',
      target: 'name',
      locale: 'en',
      regex: 'Red',
      replacementValue: 'Blue',
      replacementFields: ['name_en'],
      sequenceGroupId: 'seq-1',
      sequenceGroupLabel: 'Name EN Sequence',
      sequence: 10,
    });

    const result = buildAndSimulateValidatorPatternPreview({
      formData: {
        ...EMPTY_FORM,
        label: 'Step 2',
        target: 'name',
        locale: 'en',
        regex: 'Blue',
        message: 'Replace blue with green',
        replacementEnabled: true,
        replacementMode: 'static',
        replacementValue: 'Green',
        replacementFields: ['name_en'],
        sequenceGroupId: 'seq-1',
        sequence: '20',
      },
      sequenceGroups: new Map([
        [
          'seq-1',
          {
            id: 'seq-1',
            label: 'Name EN Sequence',
            debounceMs: 0,
            patternIds: ['pattern-1'],
          },
        ],
      ]),
      orderedPatterns: [existingPattern],
      editingPattern: null,
      modalSemanticState: null,
      simulatorValues: {
        'current_field:name_en': 'Red Bag',
      },
      categoryFixturesText: '',
    });

    expect(result.outputDisplayValue).toBe('Green Bag');
    expect(result.sequenceGroupLabel).toBe('Name EN Sequence');
    expect(result.sequenceTrace).toMatchObject([
      {
        label: 'Step 1',
        inputValue: 'Red Bag',
        outputValue: 'Blue Bag',
        applied: true,
      },
      {
        label: 'Step 2',
        inputValue: 'Blue Bag',
        outputValue: 'Green Bag',
        applied: true,
        isPreviewPattern: true,
      },
    ]);
  });
});
