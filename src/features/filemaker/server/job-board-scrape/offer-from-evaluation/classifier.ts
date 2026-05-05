import { classifyFilemakerLexiconLabelWithPatterns } from '../lexicon-validation-patterns';
import { normalizeLexiconLabel } from '../normalizers';

export const lexiconClassifier = {
  classify: classifyFilemakerLexiconLabelWithPatterns,
  normalizeLabel: normalizeLexiconLabel,
};
