import { describe, expect, it } from 'vitest';

import type { ProductValidationPattern } from '@/shared/contracts/products';
import { encodeDynamicReplacementRecipe } from '@/shared/lib/products/utils/validator-replacement-recipe';
import { buildLatestFieldMirrorSemanticState } from '@/features/products/lib/validatorSemanticPresets';

import { EMPTY_FORM } from './helpers';
import { buildPatternPayloadDiff, buildValidationPayload } from './controller-diff-utils';

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
  label: overrides.label ?? 'Price from latest product',
  target: overrides.target ?? 'price',
  locale: overrides.locale ?? null,
  regex: overrides.regex ?? '^.*$',
  flags: overrides.flags ?? null,
  message: overrides.message ?? 'Auto-propose price from the latest created product when current price is empty or 0.',
  severity: overrides.severity ?? 'warning',
  enabled: overrides.enabled ?? true,
  replacementEnabled: overrides.replacementEnabled ?? true,
  replacementAutoApply: overrides.replacementAutoApply ?? false,
  skipNoopReplacementProposal: overrides.skipNoopReplacementProposal ?? true,
  replacementValue: overrides.replacementValue ?? 'recipe',
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
  validationDebounceMs: overrides.validationDebounceMs ?? 300,
  sequenceGroupId: overrides.sequenceGroupId ?? null,
  sequenceGroupLabel: overrides.sequenceGroupLabel ?? null,
  sequenceGroupDebounceMs: overrides.sequenceGroupDebounceMs ?? 0,
  sequence: overrides.sequence ?? 10,
  chainMode: overrides.chainMode ?? 'continue',
  maxExecutions: overrides.maxExecutions ?? 1,
  passOutputToNext: overrides.passOutputToNext ?? false,
  launchEnabled: overrides.launchEnabled ?? true,
  launchAppliesToScopes: overrides.launchAppliesToScopes ?? ['product_create'],
  launchScopeBehavior: overrides.launchScopeBehavior ?? 'condition_only',
  launchSourceMode: overrides.launchSourceMode ?? 'current_field',
  launchSourceField: overrides.launchSourceField ?? null,
  launchOperator: overrides.launchOperator ?? 'regex',
  launchValue: overrides.launchValue ?? '^\\s*(?:0+)?\\s*$',
  launchFlags: overrides.launchFlags ?? null,
  appliesToScopes: overrides.appliesToScopes ?? ['draft_template', 'product_create'],
  semanticState: overrides.semanticState ?? buildLatestFieldMirrorSemanticState('price'),
});

describe('controller diff utils', () => {
  it('reconciles semantic state in buildValidationPayload when the edited shape is still compatible', () => {
    const semanticState = buildLatestFieldMirrorSemanticState('price');

    const payload = buildValidationPayload({
      formData: {
        ...EMPTY_FORM,
        label: 'Price from latest product',
        target: 'price',
        regex: '^.*$',
        message:
          'Auto-propose price from the latest created product when current price is empty or 0.',
        replacementEnabled: true,
        replacementFields: ['price'],
        validationDebounceMs: '300',
      },
      sequenceGroups: new Map(),
      editingPattern: null,
      semanticState,
      replacementValue: buildDynamicReplacementRecipe({
        sourceField: 'price',
      }),
      parsedSequence: null,
      parsedMaxExecutions: 1,
      parsedValidationDebounceMs: 300,
    });

    expect(payload.semanticState).toEqual(semanticState);
  });

  it('clears semantic state in buildValidationPayload when the edited shape becomes generic', () => {
    const payload = buildValidationPayload({
      formData: {
        ...EMPTY_FORM,
        label: 'Custom Replace',
        target: 'description',
        locale: 'en',
        regex: 'sale',
        message: 'Replace sale with discounted',
        replacementEnabled: true,
        replacementMode: 'static',
        replacementValue: 'discounted',
        replacementFields: ['description_en'],
        validationDebounceMs: '0',
      },
      sequenceGroups: new Map(),
      editingPattern: null,
      semanticState: buildLatestFieldMirrorSemanticState('price'),
      replacementValue: 'discounted',
      parsedSequence: null,
      parsedMaxExecutions: 1,
      parsedValidationDebounceMs: 0,
    });

    expect(payload.semanticState).toBeNull();
  });

  it('emits semanticState diff updates when semantic metadata changes', () => {
    const existing = buildPattern({});
    const nextPayload = {
      ...existing,
      semanticState: null,
    };

    expect(buildPatternPayloadDiff(existing, nextPayload).semanticState).toBeNull();
  });
});
