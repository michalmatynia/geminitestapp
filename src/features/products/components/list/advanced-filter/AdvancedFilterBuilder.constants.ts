import type { SelectSimpleOption } from '@/shared/contracts/ui/controls';

import { ADVANCED_FILTER_FIELD_CONFIGS } from './advanced-filter-utils';

export const COMBINATOR_OPTIONS: SelectSimpleOption[] = [
  { value: 'and', label: 'AND' },
  { value: 'or', label: 'OR' },
];

export const FIELD_OPTIONS: SelectSimpleOption[] = ADVANCED_FILTER_FIELD_CONFIGS.map((config) => ({
  value: config.field,
  label: config.label,
}));
