import {
  type ValidatorScope,
  type ValidatorPatternList,
  VALIDATOR_PATTERN_LISTS_KEY,
  VALIDATOR_PATTERN_LISTS_VERSION,
  VALIDATOR_SCOPE_LABELS,
  VALIDATOR_SCOPE_DESCRIPTIONS,
  buildDefaultValidatorPatternLists as defaultValidatorPatternLists,
  buildValidatorPatternListsPayload,
  parseValidatorScope,
  normalizeValidatorPatternLists,
  parseValidatorPatternLists,
} from '@/shared/contracts/validator';

export {
  VALIDATOR_PATTERN_LISTS_KEY,
  VALIDATOR_PATTERN_LISTS_VERSION,
  VALIDATOR_SCOPE_LABELS,
  VALIDATOR_SCOPE_DESCRIPTIONS,
  defaultValidatorPatternLists,
  buildValidatorPatternListsPayload,
  parseValidatorScope,
  normalizeValidatorPatternLists,
  parseValidatorPatternLists,
};
export type { ValidatorScope, ValidatorPatternList };
