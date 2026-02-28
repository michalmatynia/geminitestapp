import {
  DOCUMENTATION_MODULE_IDS,
  type DocumentationEntry,
} from '@/shared/lib/documentation/types';

import {
  VALIDATOR_FUNCTION_DOCS,
  VALIDATOR_UI_DOCS,
  type ValidatorFunctionDoc,
  type ValidatorUiDoc,
} from './validator-docs';

const UI_DOC_PATH = '/docs/validator/tooltips.md';
const FUNCTION_DOC_PATH = '/docs/validator/function-reference.md';

const validatorUiDocumentationEntries: DocumentationEntry[] = VALIDATOR_UI_DOCS.map(
  (entry: ValidatorUiDoc): DocumentationEntry => ({
    id: entry.id,
    moduleId: DOCUMENTATION_MODULE_IDS.validator,
    title: entry.title,
    content: entry.description,
    keywords: [entry.id, entry.title, ...entry.relatedFunctions],
    relatedLinks: [UI_DOC_PATH],
  })
);

const validatorFunctionDocumentationEntries: DocumentationEntry[] = VALIDATOR_FUNCTION_DOCS.map(
  (entry: ValidatorFunctionDoc): DocumentationEntry => ({
    id: entry.id,
    moduleId: DOCUMENTATION_MODULE_IDS.validator,
    title: entry.symbol,
    content: entry.purpose,
    keywords: [entry.id, entry.symbol, ...entry.params],
    relatedLinks: [FUNCTION_DOC_PATH],
  })
);

export const VALIDATOR_DOCUMENTATION_CATALOG: DocumentationEntry[] = [
  ...validatorUiDocumentationEntries,
  ...validatorFunctionDocumentationEntries,
];
