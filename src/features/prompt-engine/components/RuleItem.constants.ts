import type { LabeledOptionDto } from '@/shared/contracts/base';
import type {
  PromptExploderCaptureApplyTo,
  PromptExploderCaptureNormalize,
  PromptExploderRuleSegmentType,
  PromptValidationChainMode,
  PromptValidationLaunchScopeBehavior,
  PromptValidationRule,
} from '@/shared/lib/prompt-engine/settings';

import { PROMPT_EXPLODER_SEGMENT_OPTIONS } from './rule-item-utils';

export const RULE_KIND_OPTIONS: Array<LabeledOptionDto<PromptValidationRule['kind']>> = [
  { value: 'regex', label: 'Regex' },
  { value: 'params_object', label: 'Params Object' },
];

export const RULE_SEVERITY_OPTIONS: Array<LabeledOptionDto<PromptValidationRule['severity']>> = [
  { value: 'error', label: 'Error' },
  { value: 'warning', label: 'Warning' },
  { value: 'info', label: 'Info' },
];

export const SEGMENT_TYPE_OVERRIDE_OPTIONS: Array<
  LabeledOptionDto<PromptExploderRuleSegmentType | 'none'>
> = [{ value: 'none', label: 'No type override' }, ...PROMPT_EXPLODER_SEGMENT_OPTIONS];

export const CAPTURE_APPLY_TO_OPTIONS: Array<LabeledOptionDto<PromptExploderCaptureApplyTo>> = [
  { value: 'segment', label: 'Whole segment' },
  { value: 'line', label: 'Each line' },
];

export const CAPTURE_NORMALIZE_OPTIONS: Array<
  LabeledOptionDto<PromptExploderCaptureNormalize>
> = [
  { value: 'trim', label: 'Trim' },
  { value: 'lower', label: 'Lower' },
  { value: 'upper', label: 'Upper' },
  { value: 'country', label: 'Country Name' },
  { value: 'day', label: 'Day' },
  { value: 'month', label: 'Month' },
  { value: 'year', label: 'Year' },
];

export const CHAIN_MODE_OPTIONS: Array<LabeledOptionDto<PromptValidationChainMode>> = [
  { value: 'continue', label: 'Continue' },
  { value: 'stop_on_match', label: 'Stop On Match' },
  { value: 'stop_on_replace', label: 'Stop On Replace' },
];

export const LAUNCH_SCOPE_BEHAVIOR_OPTIONS: Array<
  LabeledOptionDto<PromptValidationLaunchScopeBehavior>
> = [
  { value: 'gate', label: 'Gate outside scope' },
  { value: 'bypass', label: 'Bypass outside scope' },
];
