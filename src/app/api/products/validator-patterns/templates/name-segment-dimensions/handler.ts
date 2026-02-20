import { NextRequest, NextResponse } from 'next/server';

import { getValidationPatternRepository } from '@/features/products/server';
import { invalidateValidationPatternRuntimeCache } from '@/features/products/services/validation-pattern-runtime-cache';
import {
  encodeDynamicReplacementRecipe,
  parseDynamicReplacementRecipe,
} from '@/features/products/utils/validator-replacement-recipe';
import type {
  ProductValidationInstanceScopeDto as ProductValidationInstanceScope,
  ProductValidationPatternDto as ProductValidationPattern,
  ProductValidationTargetDto as ProductValidationTarget,
} from '@/shared/contracts/products';
import type { ApiHandlerContext } from '@/shared/contracts/ui';

type TemplateTarget = Extract<ProductValidationTarget, 'size_length' | 'length'>;

type NameSegmentTemplateConfig = {
  target: TemplateTarget;
  label: string;
  message: string;
  replacementField: 'sizeLength' | 'length';
};

const NAME_SEGMENT_DIMENSION_TEMPLATES: NameSegmentTemplateConfig[] = [
  {
    target: 'size_length',
    label: 'Name Segment #2 -> Length',
    message:
      'Propose Length (sizeLength) from Name segment #2 (between first and second "|").',
    replacementField: 'sizeLength',
  },
  {
    target: 'length',
    label: 'Name Segment #2 -> Height',
    message:
      'Propose Height (length) from Name segment #2 (between first and second "|").',
    replacementField: 'length',
  },
];

const TEMPLATE_SCOPES: ProductValidationInstanceScope[] = [
  'draft_template',
  'product_create',
  'product_edit',
];

const isNameSegmentDimensionPattern = (
  pattern: ProductValidationPattern,
  template: NameSegmentTemplateConfig,
): boolean => {
  if (pattern.target !== template.target) return false;
  if (pattern.label.trim().toLowerCase() === template.label.trim().toLowerCase()) {
    return true;
  }
  if (!pattern.replacementEnabled || !pattern.replacementValue) return false;
  const recipe = parseDynamicReplacementRecipe(pattern.replacementValue);
  if (!recipe) return false;
  return (
    recipe.sourceMode === 'form_field' &&
    recipe.sourceField === 'name_en' &&
    recipe.targetApply === 'replace_whole_field'
  );
};

const getPatternSequence = (
  pattern: ProductValidationPattern,
  fallbackIndex: number,
): number => {
  if (typeof pattern.sequence === 'number' && Number.isFinite(pattern.sequence)) {
    return Math.max(0, Math.floor(pattern.sequence));
  }
  return (fallbackIndex + 1) * 10;
};

export async function POST_handler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const repository = await getValidationPatternRepository();
  const patterns = await repository.listPatterns();
  const maxSequence = patterns.reduce(
    (max: number, pattern: ProductValidationPattern, index: number) =>
      Math.max(max, getPatternSequence(pattern, index)),
    0,
  );

  const replacementRecipe = encodeDynamicReplacementRecipe({
    version: 1,
    sourceMode: 'form_field',
    sourceField: 'name_en',
    sourceRegex: '^\\s*[^|]+\\|\\s*([0-9]+(?:[.,][0-9]+)?)',
    sourceFlags: 'i',
    sourceMatchGroup: 1,
    mathOperation: 'none',
    mathOperand: null,
    roundMode: 'none',
    padLength: null,
    padChar: null,
    logicOperator: 'regex',
    logicOperand: '^[0-9]+(?:[.,][0-9]+)?$',
    logicFlags: null,
    logicWhenTrueAction: 'keep',
    logicWhenTrueValue: null,
    logicWhenFalseAction: 'abort',
    logicWhenFalseValue: null,
    resultAssembly: 'segment_only',
    targetApply: 'replace_whole_field',
  });

  const outcomes: Array<{
    id: string;
    target: TemplateTarget;
    label: string;
    action: 'created' | 'updated';
  }> = [];

  let sequence = maxSequence + 10;
  for (const template of NAME_SEGMENT_DIMENSION_TEMPLATES) {
    const existing = patterns.find((pattern: ProductValidationPattern) =>
      isNameSegmentDimensionPattern(pattern, template),
    );
    const payload = {
      label: template.label,
      target: template.target,
      locale: null,
      regex: '^.*$',
      flags: null,
      message: template.message,
      severity: 'warning' as const,
      enabled: true,
      replacementEnabled: true,
      replacementAutoApply: false,
      skipNoopReplacementProposal: true,
      replacementValue: replacementRecipe,
      replacementFields: [template.replacementField],
      replacementAppliesToScopes: [...TEMPLATE_SCOPES],
      postAcceptBehavior: 'revalidate' as const,
      validationDebounceMs: 250,
      sequenceGroupId: null,
      sequenceGroupLabel: null,
      sequenceGroupDebounceMs: 0,
      sequence,
      chainMode: 'continue' as const,
      maxExecutions: 1,
      passOutputToNext: false,
      launchEnabled: true,
      launchAppliesToScopes: [...TEMPLATE_SCOPES],
      launchScopeBehavior: 'gate' as const,
      launchSourceMode: 'form_field' as const,
      launchSourceField: 'name_en',
      launchOperator: 'regex' as const,
      launchValue:
        '^\\s*[^|]+\\s*\\|\\s*[^|]+\\s*\\|\\s*[^|]+\\s*\\|\\s*[^|]+\\s*\\|\\s*[^|]+\\s*$',
      launchFlags: null,
      appliesToScopes: [...TEMPLATE_SCOPES],
    };

    if (existing) {
      const updated = await repository.updatePattern(existing.id, {
        ...payload,
        label: existing.label,
      });
      outcomes.push({
        id: updated.id,
        target: template.target,
        label: updated.label,
        action: 'updated',
      });
    } else {
      const created = await repository.createPattern(payload);
      outcomes.push({
        id: created.id,
        target: template.target,
        label: created.label,
        action: 'created',
      });
    }

    sequence += 10;
  }

  const refreshedPatterns = await repository.listPatterns();
  const ensuredPatterns = refreshedPatterns.filter((pattern: ProductValidationPattern) =>
    NAME_SEGMENT_DIMENSION_TEMPLATES.some((template) =>
      isNameSegmentDimensionPattern(pattern, template),
    ),
  );

  invalidateValidationPatternRuntimeCache();

  return NextResponse.json({
    outcomes,
    ensuredPatterns,
  });
}

