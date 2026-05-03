// @vitest-environment jsdom

import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';

import type { MultiSelectOption } from '@/shared/contracts/ui/controls';
import { MultiSelect } from '@/shared/ui/multi-select';

const OPTIONS: MultiSelectOption[] = [
  { value: 'alpha', label: 'Alpha' },
  { value: 'beta', label: 'Beta' },
  { value: 'gamma', label: 'Gamma' },
];

function ControlledMultiSelect({
  single = false,
  onChangeSpy,
}: {
  single?: boolean;
  onChangeSpy: ReturnType<typeof vi.fn<(values: string[]) => void>>;
}): React.JSX.Element {
  const [selected, setSelected] = React.useState<string[]>([]);

  return (
    <MultiSelect
      options={OPTIONS}
      selected={selected}
      onChange={(values: string[]): void => {
        onChangeSpy(values);
        setSelected(values);
      }}
      ariaLabel='Category picker'
      placeholder='Select categories...'
      single={single}
    />
  );
}

describe('MultiSelect interactions', () => {
  it('keeps the menu open while selecting multiple values', async () => {
    const user = userEvent.setup();
    const onChangeSpy = vi.fn<(values: string[]) => void>();

    render(<ControlledMultiSelect onChangeSpy={onChangeSpy} />);

    await user.click(screen.getByRole('button', { name: 'Category picker' }));
    await user.click(screen.getByRole('menuitemcheckbox', { name: 'Alpha' }));

    expect(onChangeSpy).toHaveBeenLastCalledWith(['alpha']);
    expect(screen.getByRole('menuitemcheckbox', { name: 'Beta' })).toBeInTheDocument();

    await user.click(screen.getByRole('menuitemcheckbox', { name: 'Beta' }));

    expect(onChangeSpy).toHaveBeenLastCalledWith(['alpha', 'beta']);
    expect(screen.getByRole('menuitemcheckbox', { name: 'Gamma' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Category picker', hidden: true })).toHaveTextContent(
      'Alpha, Beta'
    );
  });

  it('closes after selecting a value in single-select mode', async () => {
    const user = userEvent.setup();
    const onChangeSpy = vi.fn<(values: string[]) => void>();

    render(<ControlledMultiSelect single onChangeSpy={onChangeSpy} />);

    await user.click(screen.getByRole('button', { name: 'Category picker' }));
    await user.click(screen.getByRole('menuitemcheckbox', { name: 'Alpha' }));

    expect(onChangeSpy).toHaveBeenLastCalledWith(['alpha']);
    expect(screen.queryByRole('menuitemcheckbox', { name: 'Beta' })).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Category picker' })).toHaveTextContent('Alpha');
  });
});
