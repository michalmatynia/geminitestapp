import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import { CategoryMapperSelectCell } from '../CategoryMapperSelectCell';
import type { LabeledOptionDto } from '@/shared/contracts/base';

const OPTIONS = [
  { value: 'cat-1', label: 'Root / Child A' },
  { value: 'cat-2', label: 'Root / Child B' },
] as const satisfies ReadonlyArray<LabeledOptionDto<string>>;

describe('CategoryMapperSelectCell', () => {
  it('renders selected internal category label', () => {
    const onChange = vi.fn<(value: string | null) => void>();

    render(
      <CategoryMapperSelectCell
        value='cat-2'
        onChange={onChange}
        options={OPTIONS}
        disabled={false}
      />
    );

    expect(screen.getByRole('button', { name: 'Root / Child B' })).toBeInTheDocument();
  });

  it('maps selected option label to internal category id', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn<(value: string | null) => void>();

    render(
      <CategoryMapperSelectCell
        value={null}
        onChange={onChange}
        options={OPTIONS}
        disabled={false}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Search internal category...' }));
    await user.click(screen.getByRole('menuitemcheckbox', { name: 'Root / Child A' }));

    expect(onChange).toHaveBeenCalledWith('cat-1');
  });

  it('clears mapping when the selected option is toggled off', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn<(value: string | null) => void>();

    render(
      <CategoryMapperSelectCell
        value='cat-1'
        onChange={onChange}
        options={OPTIONS}
        disabled={false}
      />
    );

    await user.click(screen.getByRole('button', { name: 'Root / Child A' }));
    await user.click(screen.getByRole('menuitemcheckbox', { name: 'Root / Child A' }));

    expect(onChange).toHaveBeenCalledWith(null);
  });
});
