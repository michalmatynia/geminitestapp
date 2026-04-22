import type { ProductValidationPatternRepository } from '@/shared/contracts/products/drafts';
import type { ProductValidationPattern } from '@/shared/contracts/products/validation';
import { getValidatorTemplatePresetByType } from '@/features/products/lib/validatorSemanticPresets';

const DEFAULT_VALIDATOR_TEMPLATE_TYPES = ['producer-stargater'] as const;
const TEMPLATE_AUDIT_OPTIONS = { semanticAuditSource: 'template' } as const;

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

  for (const templateType of DEFAULT_VALIDATOR_TEMPLATE_TYPES) {
    const preset = getValidatorTemplatePresetByType(templateType);
    if (!preset) continue;

    for (const templatePattern of preset.patterns) {
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
  }

  return {
    patterns: [...patterns].sort(comparePatterns),
    createdPatternIds,
  };
};
