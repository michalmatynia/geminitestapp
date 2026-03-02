import {
  type ValidatorScope,
  type ValidatorPatternList,
  VALIDATOR_PATTERN_LISTS_KEY,
  VALIDATOR_SCOPE_LABELS,
  VALIDATOR_SCOPE_DESCRIPTIONS,
  buildDefaultValidatorPatternLists as defaultValidatorPatternLists,
  parseValidatorScope,
  normalizeValidatorPatternLists,
  parseValidatorPatternLists,
} from '@/shared/contracts/validator';

export {
  VALIDATOR_PATTERN_LISTS_KEY,
  VALIDATOR_SCOPE_LABELS,
  VALIDATOR_SCOPE_DESCRIPTIONS,
  defaultValidatorPatternLists,
  parseValidatorScope,
  normalizeValidatorPatternLists,
  parseValidatorPatternLists,
};
export type { ValidatorScope, ValidatorPatternList };
