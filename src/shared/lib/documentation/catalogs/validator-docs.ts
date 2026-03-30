import { VALIDATOR_FUNCTION_DOCS } from './validator-docs/validator-docs.functions';
import { VALIDATOR_UI_DOCS } from './validator-docs/validator-docs.ui';

export * from './validator-docs/validator-docs.functions';
export * from './validator-docs/validator-docs.ui';

export const VALIDATOR_FUNCTION_DOC_IDS = new Set(VALIDATOR_FUNCTION_DOCS.map((entry) => entry.id));

export const VALIDATOR_UI_DOC_IDS = new Set(VALIDATOR_UI_DOCS.map((entry) => entry.id));

export const VALIDATOR_UI_DOC_BY_ID = new Map(
  VALIDATOR_UI_DOCS.map((entry) => [entry.id, entry] as const)
);

export const VALIDATOR_FUNCTION_DOC_BY_ID = new Map(
  VALIDATOR_FUNCTION_DOCS.map((entry) => [entry.id, entry] as const)
);

export const VALIDATOR_CATALOG = {
  functions: VALIDATOR_FUNCTION_DOCS,
  ui: VALIDATOR_UI_DOCS,
};
