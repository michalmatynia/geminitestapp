import { type PromptValidationRule } from '@/shared/contracts/prompt-engine';

import { PROMPT_EXPLODER_PATTERN_PACK_EXTRA } from './pattern-pack-rules-extra';
import { CASE_RESOLVER_RULES } from './rules/case-resolver-rules';
import { EXPLODER_RULES } from './rules/exploder-rules';
import { OTHER_RULES } from './rules/other-rules';

export {
  PROMPT_EXPLODER_SCOPE,
  CASE_RESOLVER_PROMPT_EXPLODER_SCOPE,
  isCaseResolverExploderScope,
  normalizeRuleScopes,
  includesScope,
  remapExploderScopesForTarget,
} from './rules/base';

export const PROMPT_EXPLODER_PATTERN_PACK: PromptValidationRule[] = [
  ...EXPLODER_RULES,
  ...CASE_RESOLVER_RULES,
  ...OTHER_RULES,
  ...PROMPT_EXPLODER_PATTERN_PACK_EXTRA,
];
