import type { ProductValidationPatternRepository } from '@/shared/contracts/products/drafts';
import type {
  CreateProductValidationPatternInput,
  ProductValidationPattern,
} from '@/shared/contracts/products/validation';
import { getValidatorTemplatePresetByType } from '@/features/products/lib/validatorSemanticPresets';
import {
  buildTraderaParseActionValidationPatternPayload,
  isTraderaParseActionValidationPatternRole,
  PRODUCT_PARSE_ACTIONS_TRADERA_PATTERN_DEFINITIONS,
} from '@/features/products/lib/parseActionsValidationPatterns';

const DEFAULT_VALIDATOR_TEMPLATE_TYPES = ['producer-stargater'] as const;
const TEMPLATE_AUDIT_OPTIONS = { semanticAuditSource: 'template' } as const;

type DefaultValidatorTemplatePattern = {
  buildPayload: () => CreateProductValidationPatternInput;
  matchesExisting: (pattern: ProductValidationPattern) => boolean;
};

const normalizeSequence = (pattern: ProductValidationPattern): number =>
  typeof pattern.sequence === 'number' && Number.isFinite(pattern.sequence)
    ? Math.floor(pattern.sequence)
    : Number.MAX_SAFE_INTEGER;

const comparePatterns = (
  left: ProductValidationPattern,
  right: ProductValidationPattern
): number => {
  const sequenceDelta = normalizeSequence(left) - normalizeSequence(right);
  if (sequenceDelta !== 0) return sequenceDelta;

  const targetDelta = left.target.localeCompare(right.target);
  if (targetDelta !== 0) return targetDelta;

  return left.label.localeCompare(right.label);
};

const getDefaultValidatorTemplatePatterns = (): DefaultValidatorTemplatePattern[] => {
  const templatePatterns: DefaultValidatorTemplatePattern[] = [];

  for (const templateType of DEFAULT_VALIDATOR_TEMPLATE_TYPES) {
    const preset = getValidatorTemplatePresetByType(templateType);
    if (!preset) continue;
    templatePatterns.push(...preset.patterns);
  }

  templatePatterns.push(
    ...PRODUCT_PARSE_ACTIONS_TRADERA_PATTERN_DEFINITIONS.map((definition) => ({
      buildPayload: () => buildTraderaParseActionValidationPatternPayload(definition),
      matchesExisting: (pattern: ProductValidationPattern): boolean =>
        isTraderaParseActionValidationPatternRole(pattern, definition.role),
    }))
  );

  return templatePatterns;
};

export const ensureDefaultProductValidationPatterns = async ({
  repository,
}: {
  repository: ProductValidationPatternRepository;
}): Promise<{
  patterns: ProductValidationPattern[];
  createdPatternIds: string[];
}> => {
  let patterns = await repository.listPatterns();
  const createdPatternIds: string[] = [];

  for (const templatePattern of getDefaultValidatorTemplatePatterns()) {
    if (patterns.some((pattern) => templatePattern.matchesExisting(pattern))) continue;

    // Sequential creation preserves stable sequence assignment when multiple defaults are missing.
    // eslint-disable-next-line no-await-in-loop
    const createdPattern = await repository.createPattern(
      templatePattern.buildPayload(),
      TEMPLATE_AUDIT_OPTIONS
    );
    patterns = [...patterns, createdPattern];
    createdPatternIds.push(createdPattern.id);
  }

  return {
    patterns: [...patterns].sort(comparePatterns),
    createdPatternIds,
  };
};
