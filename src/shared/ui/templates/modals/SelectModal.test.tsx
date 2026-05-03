// @vitest-environment jsdom

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { SelectModal } from './SelectModal';

describe('SelectModal accessibility contract', () => {
  it('renders listbox/option semantics in multi-select mode', () => {
    render(
      <SelectModal
        open
        onClose={vi.fn()}
        title='Choose tags'
        multiple
        options={[
          { id: 'tag-a', label: 'Tag A', value: 'tag-a' },
          { id: 'tag-b', label: 'Tag B', value: 'tag-b' },
        ]}
        onSelect={vi.fn()}
      />
    );

    const listbox = screen.getByRole('listbox', { name: 'Choose tags' });
    expect(listbox).toHaveAttribute('aria-multiselectable', 'true');

    const tagA = screen.getByRole('option', { name: 'Tag A' });
    expect(tagA).toHaveAttribute('aria-selected', 'false');

    fireEvent.click(tagA);
    expect(tagA).toHaveAttribute('aria-selected', 'true');
  });
});
