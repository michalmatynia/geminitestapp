import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { CategoryMapperSelectCell } from '../CategoryMapperSelectCell';

const OPTIONS = [
  { value: 'cat-1', label: 'Root / Child A' },
  { value: 'cat-2', label: 'Root / Child B' },
];

describe('CategoryMapperSelectCell', () => {
  it('renders selected internal category label', () => {
    const onChange = vi.fn<(value: string | null) => void>();

    render(
      <>
        <CategoryMapperSelectCell
          value='cat-2'
          onChange={onChange}
          options={OPTIONS}
          disabled={false}
          datalistId='internal-categories'
        />
        <datalist id='internal-categories'>
          {OPTIONS.map((option) => (
            <option key={option.value} value={option.label} />
          ))}
        </datalist>
      </>
    );

    expect(screen.getByRole('combobox')).toHaveValue('Root / Child B');
  });

  it('maps typed option label to internal category id', () => {
    const onChange = vi.fn<(value: string | null) => void>();

    render(
      <>
        <CategoryMapperSelectCell
          value={null}
          onChange={onChange}
          options={OPTIONS}
          disabled={false}
          datalistId='internal-categories'
        />
        <datalist id='internal-categories'>
          {OPTIONS.map((option) => (
            <option key={option.value} value={option.label} />
          ))}
        </datalist>
      </>
    );

    const input = screen.getByRole('combobox');
    fireEvent.change(input, { target: { value: 'Root / Child A' } });

    expect(onChange).toHaveBeenCalledWith('cat-1');
  });

  it('clears mapping when input is emptied', () => {
    const onChange = vi.fn<(value: string | null) => void>();

    render(
      <>
        <CategoryMapperSelectCell
          value='cat-1'
          onChange={onChange}
          options={OPTIONS}
          disabled={false}
          datalistId='internal-categories'
        />
        <datalist id='internal-categories'>
          {OPTIONS.map((option) => (
            <option key={option.value} value={option.label} />
          ))}
        </datalist>
      </>
    );

    const input = screen.getByRole('combobox');
    fireEvent.change(input, { target: { value: '' } });

    expect(onChange).toHaveBeenCalledWith(null);
  });
});
