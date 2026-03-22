/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { SelectModal } from '@/shared/ui/templates/modals/SelectModal';

describe('SelectModal', () => {
  it('selects a single option immediately', () => {
    const onClose = vi.fn();
    const onSelect = vi.fn();
    const options = [
      { id: 'alpha', label: 'Alpha' },
      { id: 'beta', label: 'Beta' },
    ];

    render(
      <SelectModal
        open
        onClose={onClose}
        onSelect={onSelect}
        options={options}
        searchable={false}
        title='Pick one'
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Alpha' }));

    expect(onSelect).toHaveBeenCalledWith(options[0]);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('collects multiple selections before confirming', () => {
    const onClose = vi.fn();
    const onSelect = vi.fn();
    const options = [
      { id: 'alpha', label: 'Alpha' },
      { id: 'beta', label: 'Beta' },
      { id: 'gamma', label: 'Gamma' },
    ];

    render(
      <SelectModal
        open
        onClose={onClose}
        onSelect={onSelect}
        options={options}
        searchable={false}
        multiple
        title='Pick many'
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Alpha' }));
    fireEvent.click(screen.getByRole('button', { name: 'Gamma' }));
    fireEvent.click(screen.getByRole('button', { name: 'Select (2)' }));

    expect(onSelect).toHaveBeenCalledWith([options[0], options[2]]);
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
