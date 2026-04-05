/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { MultiSelectOption } from '@/shared/contracts/ui/ui/controls';
import { SearchableSelect } from '@/shared/ui/searchable-select';

type MockMultiSelectProps = {
  options: ReadonlyArray<MultiSelectOption>;
  selected: string[];
  onChange: (values: string[]) => void;
  single?: boolean;
};

let latestMultiSelectProps: MockMultiSelectProps | null = null;

vi.mock('@/shared/ui/multi-select', () => ({
  MultiSelect: (props: MockMultiSelectProps) => {
    latestMultiSelectProps = props;

    return (
      <div data-testid='mock-multi-select'>
        <div data-testid='selected-values'>{props.selected.join(',')}</div>
        <button type='button' onClick={() => props.onChange(['beta'])}>
          choose-beta
        </button>
        <button type='button' onClick={() => props.onChange([])}>
          clear-selection
        </button>
      </div>
    );
  },
}));

describe('SearchableSelect', () => {
  it('maps a single value into MultiSelect selected state', () => {
    const onChange = vi.fn();
    const options: MultiSelectOption[] = [
      { value: 'alpha', label: 'Alpha' },
      { value: 'beta', label: 'Beta' },
    ];

    render(
      <SearchableSelect
        options={options}
        value='alpha'
        onChange={onChange}
        placeholder='Select one'
      />
    );

    expect(screen.getByTestId('selected-values')).toHaveTextContent('alpha');
    expect(latestMultiSelectProps?.single).toBe(true);
  });

  it('maps MultiSelect changes back to a nullable single value', () => {
    const onChange = vi.fn();
    const options: MultiSelectOption[] = [
      { value: 'alpha', label: 'Alpha' },
      { value: 'beta', label: 'Beta' },
    ];

    render(<SearchableSelect options={options} value={null} onChange={onChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'choose-beta' }));
    fireEvent.click(screen.getByRole('button', { name: 'clear-selection' }));

    expect(onChange).toHaveBeenNthCalledWith(1, 'beta');
    expect(onChange).toHaveBeenNthCalledWith(2, null);
  });
});
