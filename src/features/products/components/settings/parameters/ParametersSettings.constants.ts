import type { LabeledOptionDto } from '@/shared/contracts/base';
import {
  PRODUCT_PARAMETER_LINKABLE_SELECTOR_TYPES,
  type ProductParameterLinkedTitleTermType,
} from '@/shared/contracts/products/parameters';

import type { ParameterSelectorType } from './ParametersSettings.types';

export const SELECTOR_TYPE_OPTIONS: Array<LabeledOptionDto<ParameterSelectorType>> = [
  { value: 'text', label: 'Text Field' },
  { value: 'textarea', label: 'Textarea' },
  { value: 'radio', label: 'Radio Buttons' },
  { value: 'select', label: 'Select List' },
  { value: 'dropdown', label: 'Dropdown' },
  { value: 'checklist', label: 'Checklist' },
  { value: 'checkbox', label: 'Checkbox' },
];

export const SELECTOR_TYPES_REQUIRING_OPTIONS = new Set<ParameterSelectorType>([
  'radio',
  'select',
  'dropdown',
  'checklist',
]);

export const LINKABLE_SELECTOR_TYPES = new Set<ParameterSelectorType>(
  PRODUCT_PARAMETER_LINKABLE_SELECTOR_TYPES
);

export const LINKED_TITLE_TERM_OPTIONS: Array<LabeledOptionDto<string>> = [
  { value: '', label: 'No English Title sync' },
  { value: 'size', label: 'Size term' },
  { value: 'material', label: 'Material term' },
  { value: 'theme', label: 'Theme term' },
];

export const EMPTY_PARAMETER_FORM_DATA = {
  name_en: '',
  name_pl: '',
  name_de: '',
  catalogId: '',
  selectorType: 'text',
  optionLabelsInput: '',
  linkedTitleTermType: null,
} satisfies {
  name_en: string;
  name_pl: string;
  name_de: string;
  catalogId: string;
  selectorType: ParameterSelectorType;
  optionLabelsInput: string;
  linkedTitleTermType: ProductParameterLinkedTitleTermType;
};
