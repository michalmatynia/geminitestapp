import type {
  CreateProductValidationPatternInput,
  ProductValidationPatternRepository,
} from '@/shared/contracts/products';

export const VALIDATOR_TEMPLATE_AUDIT_OPTIONS = {
  semanticAuditSource: 'template',
} as const;

type ValidatorTemplatePattern<TPattern, TPayload = CreateProductValidationPatternInput> = {
  buildPayload: () => TPayload;
  matchesExisting: (pattern: TPattern) => boolean;
};

type ValidatorTemplatePersistedPattern = {
  id: string;
  target: string;
  label: string;
};

type ValidatorTemplateRepository<
  TPersistedPattern extends ValidatorTemplatePersistedPattern = ValidatorTemplatePersistedPattern,
  TPayload = CreateProductValidationPatternInput,
> = Pick<ProductValidationPatternRepository, never> & {
  createPattern: (
    payload: TPayload,
    options: typeof VALIDATOR_TEMPLATE_AUDIT_OPTIONS
  ) => Promise<TPersistedPattern>;
  updatePattern: (
    id: string,
    payload: TPayload,
    options: typeof VALIDATOR_TEMPLATE_AUDIT_OPTIONS
  ) => Promise<TPersistedPattern>;
};

export type ValidatorTemplateOutcome = {
  action: 'created' | 'updated';
  target: string;
  patternId: string;
  label: string;
};

export const findMatchingValidatorTemplatePattern = <TPattern, TPayload = CreateProductValidationPatternInput>(
  existingPatterns: TPattern[],
  templatePattern: ValidatorTemplatePattern<TPattern, TPayload>
): TPattern | undefined => existingPatterns.find((pattern) => templatePattern.matchesExisting(pattern));

export const buildValidatorTemplateOutcome = (
  action: 'created' | 'updated',
  persistedPattern: ValidatorTemplatePersistedPattern
): ValidatorTemplateOutcome => ({
  action,
  target: persistedPattern.target,
  patternId: persistedPattern.id,
  label: persistedPattern.label,
});

export const applyValidatorTemplatePatterns = async <
  TPattern extends { id: string },
  TPayload = CreateProductValidationPatternInput,
  TPersistedPattern extends ValidatorTemplatePersistedPattern = ValidatorTemplatePersistedPattern,
>({
  repo,
  existingPatterns,
  templatePatterns,
}: {
  repo: ValidatorTemplateRepository<TPersistedPattern, TPayload>;
  existingPatterns: TPattern[];
  templatePatterns: readonly ValidatorTemplatePattern<TPattern, TPayload>[];
}): Promise<ValidatorTemplateOutcome[]> => {
  const outcomes: ValidatorTemplateOutcome[] = [];

  for (const templatePattern of templatePatterns) {
    const payload = templatePattern.buildPayload();
    const existingPattern = findMatchingValidatorTemplatePattern(existingPatterns, templatePattern);
    const persistedPattern = existingPattern
      ? await repo.updatePattern(existingPattern.id, payload, VALIDATOR_TEMPLATE_AUDIT_OPTIONS)
      : await repo.createPattern(payload, VALIDATOR_TEMPLATE_AUDIT_OPTIONS);

    outcomes.push(
      buildValidatorTemplateOutcome(existingPattern ? 'updated' : 'created', persistedPattern)
    );
  }

  return outcomes;
};
