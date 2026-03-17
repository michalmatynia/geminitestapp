import type { LabeledOptionDto } from '@/shared/contracts/base';
import type { PromptExploderRuleSegmentType } from '@/shared/contracts/prompt-engine';
import type {
  PromptExploderBindingType,
  PromptExploderLearnedTemplate,
} from '../../types';

export const PROMPT_EXPLODER_ACTIVE_TAB_KEY = 'prompt_exploder:active_tab';

export const BINDING_TYPE_OPTIONS = [
  { value: 'depends_on', label: 'Depends On' },
  { value: 'references', label: 'References' },
  { value: 'uses_param', label: 'Uses Param' },
] as const satisfies ReadonlyArray<LabeledOptionDto<PromptExploderBindingType>>;

export const RUNTIME_RULE_PROFILE_OPTIONS = [
  { value: 'all', label: 'All Rules' },
  { value: 'pattern_pack', label: 'Pattern Pack Only' },
  { value: 'learned_only', label: 'Learned Rules Only' },
] as const satisfies ReadonlyArray<
  LabeledOptionDto<'all' | 'pattern_pack' | 'learned_only'>
>;

export const TEMPLATE_STATE_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'candidate', label: 'Candidate' },
  { value: 'active', label: 'Active' },
  { value: 'disabled', label: 'Disabled' },
] as const satisfies ReadonlyArray<LabeledOptionDto<PromptExploderLearnedTemplate['state']>>;

export const PARSER_TUNING_SEGMENT_TYPE_OPTIONS: Array<
  LabeledOptionDto<PromptExploderRuleSegmentType | 'none'>
> = [
  { value: 'none', label: 'No type hint' },
  { value: 'metadata', label: 'Metadata' },
  { value: 'assigned_text', label: 'Assigned Text' },
  { value: 'list', label: 'List' },
  { value: 'parameter_block', label: 'Parameter Block' },
  { value: 'referential_list', label: 'Referential List' },
  { value: 'sequence', label: 'Sequence' },
  { value: 'hierarchical_list', label: 'Hierarchical List' },
  { value: 'conditional_list', label: 'Conditional List' },
  { value: 'qa_matrix', label: 'QA Matrix' },
];

export type BenchmarkSuiteOption = 'default' | 'extended' | 'custom';

export const BENCHMARK_SUITE_OPTIONS = [
  {
    value: 'default',
    label: 'Default',
  },
  {
    value: 'extended',
    label: 'Extended',
  },
  {
    value: 'custom',
    label: 'Custom (JSON)',
  },
] as const satisfies ReadonlyArray<LabeledOptionDto<BenchmarkSuiteOption>>;
