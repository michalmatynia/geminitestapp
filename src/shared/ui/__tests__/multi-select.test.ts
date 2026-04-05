import { describe, expect, it } from 'vitest';

import type { MultiSelectOption } from '@/shared/contracts/ui/ui/controls';
import {
  filterMultiSelectOptions,
  formatMultiSelectDisplayValue,
  toggleMultiSelectValue,
} from '@/shared/ui/multi-select';

const OPTIONS: MultiSelectOption[] = [
  { value: 'alpha', label: 'Alpha' },
  { value: 'beta', label: 'Beta' },
  { value: 'gamma', label: 'Gamma' },
];

describe('multi-select helpers', () => {
  it('filters options by a case-insensitive trimmed query', () => {
    expect(filterMultiSelectOptions(OPTIONS, '  be  ')).toEqual([OPTIONS[1]]);
    expect(filterMultiSelectOptions(OPTIONS, '')).toEqual(OPTIONS);
  });

  it('toggles values in multi-select and single-select modes', () => {
    expect(
      toggleMultiSelectValue({
        selected: ['alpha'],
        value: 'beta',
        single: false,
      })
    ).toEqual(['alpha', 'beta']);

    expect(
      toggleMultiSelectValue({
        selected: ['alpha'],
        value: 'alpha',
        single: false,
      })
    ).toEqual([]);

    expect(
      toggleMultiSelectValue({
        selected: ['alpha'],
        value: 'beta',
        single: true,
      })
    ).toEqual(['beta']);
  });

  it('formats placeholder, compact labels, and overflow labels', () => {
    expect(
      formatMultiSelectDisplayValue({
        placeholder: 'Select options...',
        selected: [],
        selectedLabels: [],
        single: false,
      })
    ).toBe('Select options...');

    expect(
      formatMultiSelectDisplayValue({
        placeholder: 'Select options...',
        selected: ['alpha'],
        selectedLabels: ['Alpha'],
        single: true,
      })
    ).toBe('Alpha');

    expect(
      formatMultiSelectDisplayValue({
        placeholder: 'Select options...',
        selected: ['alpha', 'beta', 'gamma'],
        selectedLabels: ['Alpha', 'Beta', 'Gamma'],
        single: false,
      })
    ).toBe('Alpha, Beta +1');
  });
});
