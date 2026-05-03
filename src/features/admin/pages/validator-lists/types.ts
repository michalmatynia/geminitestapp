import type { LabeledOptionDto } from '@/shared/contracts/base';
import type { ValidatorScope } from '@/shared/contracts/admin';
import { VALIDATOR_SCOPE_LABELS } from '../validator-scope';
import type { SettingsPanelField } from '@/shared/contracts/ui/settings';

export const scopeOptions: Array<LabeledOptionDto<ValidatorScope>> = [
  { value: 'products', label: VALIDATOR_SCOPE_LABELS['products'] },
  { value: 'image-studio', label: VALIDATOR_SCOPE_LABELS['image-studio'] },
  { value: 'prompt-exploder', label: VALIDATOR_SCOPE_LABELS['prompt-exploder'] },
  {
    value: 'case-resolver-prompt-exploder',
    label: VALIDATOR_SCOPE_LABELS['case-resolver-prompt-exploder'],
  },
  {
    value: 'case-resolver-plain-text',
    label: VALIDATOR_SCOPE_LABELS['case-resolver-plain-text'],
  },
  {
    value: 'ai-paths',
    label: VALIDATOR_SCOPE_LABELS['ai-paths'],
  },
  {
    value: 'kangur-ai-tutor-onboarding',
    label: VALIDATOR_SCOPE_LABELS['kangur-ai-tutor-onboarding'],
  },
];

export type ValidatorPatternListEditorState = {
  id: string;
  name: string;
  description: string;
  scope: ValidatorScope;
  deletionLocked: boolean;
};

export const EMPTY_EDITOR_STATE: ValidatorPatternListEditorState = {
  id: '',
  name: '',
  description: '',
  scope: 'products',
  deletionLocked: true,
};

export const EDITOR_FIELDS: SettingsPanelField<ValidatorPatternListEditorState>[] = [
  {
    key: 'name',
    label: 'List Name',
    type: 'text',
    placeholder: 'List name',
    required: true,
  },
  {
    key: 'scope',
    label: 'Scope',
    type: 'select',
    options: scopeOptions.map((option) => ({
      label: option.label,
      value: option.value,
    })),
  },
  {
    key: 'description',
    label: 'Description',
    type: 'textarea',
    placeholder: 'Optional description',
  },
  {
    key: 'deletionLocked',
    label: 'Deletion Locked',
    type: 'switch',
    helperText: 'Keep this on to prevent accidental list removal.',
  },
];

export type ValidatorListsView = 'lists' | 'tooltips';

export const VALIDATOR_LISTS_VIEW_LABELS: Record<ValidatorListsView, string> = {
  lists: 'Lists',
  tooltips: 'Settings',
};

export const VALIDATOR_LISTS_VIEW_TABS_ID_PREFIX = 'validator-lists-view';
