export const AI_PATHS_MODEL_NOT_CONFIGURED_CODE = 'AI_PATHS_MODEL_NOT_CONFIGURED';

export const AI_PATHS_MODEL_NOT_CONFIGURED_USER_MESSAGE =
  'No AI model is configured for this AI Path run. Select a model on the Model node, or set AI Brain > Routing > AI Paths Model.';

export const AI_PATHS_MODEL_NOT_CONFIGURED_HINTS = [
  'Open the failing AI Path and select a model on the Model node.',
  'Alternatively set AI Brain > Routing > AI Paths Model to an installed model.',
];

const normalizeMessage = (value: unknown): string =>
  typeof value === 'string' ? value.trim().toLowerCase() : '';

const MODEL_NOT_CONFIGURED_PHRASES = [
  'no model assigned',
  'no enabled ai model assigned',
  'no model configured',
  'no ai model configured',
];

const MODEL_NOT_CONFIGURED_TERM_SETS = [
  ['model', 'not added'],
  ['model', 'did not select'],
  ['ai paths model', 'no model'],
];

const includesEveryTerm = (message: string, terms: string[]): boolean =>
  terms.every((term) => message.includes(term));

export const isAiPathsModelNotConfiguredMessage = (value: unknown): boolean => {
  const message = normalizeMessage(value);
  if (message.length === 0) return false;
  return (
    MODEL_NOT_CONFIGURED_PHRASES.some((phrase) => message.includes(phrase)) ||
    MODEL_NOT_CONFIGURED_TERM_SETS.some((terms) => includesEveryTerm(message, terms))
  );
};

export const resolveAiPathsRunFailureUserMessage = (
  message: string | null | undefined
): string | null => {
  const normalized = typeof message === 'string' ? message.trim() : '';
  if (normalized.length === 0) return null;
  return isAiPathsModelNotConfiguredMessage(normalized)
    ? AI_PATHS_MODEL_NOT_CONFIGURED_USER_MESSAGE
    : normalized;
};

export const resolveAiPathsRunFailureToastMessage = (
  message: string | null | undefined
): string => {
  return (
    resolveAiPathsRunFailureUserMessage(message) ??
    'AI Path run failed. Open Job Queue for run details.'
  );
};
