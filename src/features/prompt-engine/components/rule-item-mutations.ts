import type {
  PromptAutofixOperation,
  PromptValidationRule,
  PromptValidationSimilarPattern,
} from '../settings';

type PatchRule = (patch: Partial<PromptValidationRule>) => void;

export const updateSimilarInRule = (
  rule: PromptValidationRule | null,
  patchRule: PatchRule,
  index: number,
  patch: Partial<PromptValidationSimilarPattern>,
): void => {
  if (!rule) return;
  const next = [...(rule.similar ?? [])];
  const current = next[index];
  if (!current) return;
  next[index] = { ...current, ...patch };
  patchRule({ similar: next });
};

export const removeSimilarFromRule = (
  rule: PromptValidationRule | null,
  patchRule: PatchRule,
  index: number,
): void => {
  if (!rule) return;
  patchRule({
    similar: (rule.similar ?? []).filter((_item, idx) => idx !== index),
  });
};

export const addSimilarToRule = (
  rule: PromptValidationRule | null,
  patchRule: PatchRule,
): void => {
  if (!rule) return;
  patchRule({
    similar: [
      ...(rule.similar ?? []),
      {
        pattern: '',
        flags: '',
        suggestion: '',
        comment: null,
      },
    ],
  });
};

export const updateAutofixOperationInRule = (
  rule: PromptValidationRule | null,
  patchRule: PatchRule,
  index: number,
  operation: PromptAutofixOperation,
): void => {
  if (!rule) return;
  const currentOps = rule.autofix?.operations ?? [];
  const next = [...currentOps];
  if (!next[index]) return;
  next[index] = operation;
  patchRule({
    autofix: {
      enabled: rule.autofix?.enabled ?? true,
      operations: next,
    },
  });
};

export const removeAutofixOperationFromRule = (
  rule: PromptValidationRule | null,
  patchRule: PatchRule,
  index: number,
): void => {
  if (!rule) return;
  const currentOps = rule.autofix?.operations ?? [];
  patchRule({
    autofix: {
      enabled: rule.autofix?.enabled ?? true,
      operations: currentOps.filter((_item, idx) => idx !== index),
    },
  });
};

export const addAutofixOperationToRule = (
  rule: PromptValidationRule | null,
  patchRule: PatchRule,
  kind: PromptAutofixOperation['kind'],
): void => {
  if (!rule) return;
  const currentOps = rule.autofix?.operations ?? [];
  const nextOperation: PromptAutofixOperation =
    kind === 'params_json'
      ? { kind: 'params_json', comment: null }
      : {
        kind: 'replace',
        pattern: '',
        flags: '',
        replacement: '',
        comment: null,
      };

  patchRule({
    autofix: {
      enabled: rule.autofix?.enabled ?? true,
      operations: [...currentOps, nextOperation],
    },
  });
};
