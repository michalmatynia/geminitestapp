import type { LabeledOptionDto } from '@/shared/contracts/base';

export const TARGET_OPTIONS = [
  { value: 'name', label: 'Name' },
  { value: 'description', label: 'Description' },
  { value: 'sku', label: 'SKU' },
  { value: 'price', label: 'Price' },
  { value: 'stock', label: 'Stock' },
  { value: 'category', label: 'Category' },
  { value: 'producer', label: 'Producers' },
  { value: 'weight', label: 'Weight' },
  { value: 'size_length', label: 'Length (sizeLength)' },
  { value: 'size_width', label: 'Width (sizeWidth)' },
  { value: 'length', label: 'Height (length)' },
] as const satisfies ReadonlyArray<LabeledOptionDto<string>>;

export const LOCALE_OPTIONS = [
  { value: 'any', label: 'Any locale' },
  { value: 'en', label: 'English (en)' },
  { value: 'pl', label: 'Polish (pl)' },
  { value: 'de', label: 'German (de)' },
] as const satisfies ReadonlyArray<LabeledOptionDto<string>>;

export const SEVERITY_OPTIONS = [
  { value: 'error', label: 'Error' },
  { value: 'warning', label: 'Warning' },
] as const satisfies ReadonlyArray<LabeledOptionDto<string>>;

export const REPLACEMENT_MODE_OPTIONS = [
  { value: 'static', label: 'Static replacer' },
  { value: 'dynamic', label: 'Dynamic replacer' },
] as const satisfies ReadonlyArray<LabeledOptionDto<string>>;

export const SOURCE_MODE_OPTIONS = [
  { value: 'current_field', label: 'Current field' },
  { value: 'form_field', label: 'Other form field' },
  { value: 'latest_product_field', label: 'Latest product field' },
] as const satisfies ReadonlyArray<LabeledOptionDto<string>>;

export const CHAIN_MODE_OPTIONS = [
  { value: 'continue', label: 'Continue' },
  { value: 'stop_on_match', label: 'Stop on match' },
  { value: 'stop_on_replace', label: 'Stop on replace' },
] as const satisfies ReadonlyArray<LabeledOptionDto<string>>;

export const LAUNCH_SCOPE_BEHAVIOR_OPTIONS = [
  { value: 'gate', label: 'Gate Pattern By Scope' },
  { value: 'condition_only', label: 'Condition Only In Scope' },
] as const satisfies ReadonlyArray<LabeledOptionDto<string>>;

export const LAUNCH_OPERATOR_OPTIONS = [
  { value: 'equals', label: 'Equals' },
  { value: 'not_equals', label: 'Not equals' },
  { value: 'contains', label: 'Contains' },
  { value: 'starts_with', label: 'Starts with' },
  { value: 'ends_with', label: 'Ends with' },
  { value: 'regex', label: 'Regex test' },
  { value: 'gt', label: 'Greater than' },
  { value: 'gte', label: 'Greater than or equal' },
  { value: 'lt', label: 'Less than' },
  { value: 'lte', label: 'Less than or equal' },
  { value: 'is_empty', label: 'Is empty' },
  { value: 'is_not_empty', label: 'Is not empty' },
] as const satisfies ReadonlyArray<LabeledOptionDto<string>>;

export const SOURCE_FIELD_PLACEHOLDER_OPTION: LabeledOptionDto<string> = {
  value: '__none__',
  label: 'Select source field',
};

export const RUNTIME_TYPE_OPTIONS = [
  { value: 'database_query', label: 'Database Query / Action' },
  { value: 'ai_prompt', label: 'AI Prompt Segment' },
] as const satisfies ReadonlyArray<LabeledOptionDto<string>>;

export const MATH_OPERATION_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'add', label: 'Add' },
  { value: 'subtract', label: 'Subtract' },
  { value: 'multiply', label: 'Multiply' },
  { value: 'divide', label: 'Divide' },
] as const satisfies ReadonlyArray<LabeledOptionDto<string>>;

export const ROUND_MODE_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'round', label: 'Round' },
  { value: 'floor', label: 'Floor' },
  { value: 'ceil', label: 'Ceil' },
] as const satisfies ReadonlyArray<LabeledOptionDto<string>>;

export const LOGIC_OPERATOR_OPTIONS = [
  { value: 'none', label: 'None' },
  { value: 'equals', label: 'Equals' },
  { value: 'not_equals', label: 'Not equals' },
  { value: 'contains', label: 'Contains' },
  { value: 'starts_with', label: 'Starts with' },
  { value: 'ends_with', label: 'Ends with' },
  { value: 'regex', label: 'Regex test' },
  { value: 'gt', label: 'Greater than' },
  { value: 'gte', label: 'Greater than or equal' },
  { value: 'lt', label: 'Less than' },
  { value: 'lte', label: 'Less than or equal' },
  { value: 'is_empty', label: 'Is empty' },
  { value: 'is_not_empty', label: 'Is not empty' },
] as const satisfies ReadonlyArray<LabeledOptionDto<string>>;

export const LOGIC_ACTION_OPTIONS = [
  { value: 'keep', label: 'Keep current value' },
  { value: 'set_value', label: 'Set custom value' },
  { value: 'clear', label: 'Clear value' },
  { value: 'abort', label: 'Abort replacement' },
] as const satisfies ReadonlyArray<LabeledOptionDto<string>>;

export const RESULT_ASSEMBLY_OPTIONS = [
  { value: 'segment_only', label: 'Use transformed segment' },
  { value: 'source_replace_match', label: 'Inject into source value' },
] as const satisfies ReadonlyArray<LabeledOptionDto<string>>;

export const TARGET_APPLY_OPTIONS = [
  { value: 'replace_matched_segment', label: 'Replace matched segment' },
  { value: 'replace_whole_field', label: 'Replace whole field' },
] as const satisfies ReadonlyArray<LabeledOptionDto<string>>;

export const POST_ACCEPT_BEHAVIOR_OPTIONS = [
  { value: 'revalidate', label: 'Revalidate Continuously' },
  { value: 'stop_after_accept', label: 'Stop After First Accept' },
] as const satisfies ReadonlyArray<LabeledOptionDto<string>>;

export const DENY_BEHAVIOR_OVERRIDE_OPTIONS = [
  { value: 'inherit', label: 'Inherit Form Policy' },
  { value: 'mute_session', label: 'Stop For This Session' },
  { value: 'ask_again', label: 'Ask Again Next Validation' },
] as const satisfies ReadonlyArray<LabeledOptionDto<string>>;
