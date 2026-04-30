import React, { useState } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { DraftPlaceholderTextInput } from './DraftPlaceholderTextInput';

function PlaceholderInputHarness(): React.JSX.Element {
  const [value, setValue] = useState('');
  return (
    <DraftPlaceholderTextInput
      value={value}
      onValueChange={setValue}
      placeholder='Product title'
      ariaLabel='Product title'
      title='Product title'
      placeholderDropdownEnabled
    />
  );
}

describe('DraftPlaceholderTextInput', () => {
  it('opens placeholder choices after typing [ and inserts the selected token', async () => {
    render(<PlaceholderInputHarness />);

    const input = screen.getByRole('textbox', { name: 'Product title' }) as HTMLInputElement;
    fireEvent.change(input, { target: { value: '[' } });
    input.setSelectionRange(1, 1);
    fireEvent.keyDown(input, { key: '[' });

    await waitFor(() => {
      expect(screen.getByText('[name]')).toBeInTheDocument();
    });

    fireEvent.mouseDown(screen.getByRole('option', { name: '[name]' }));

    expect(input.value).toBe('[name]');
  });

  it('filters placeholder choices while typing the token name', async () => {
    render(<PlaceholderInputHarness />);

    const input = screen.getByRole('textbox', { name: 'Product title' }) as HTMLInputElement;
    fireEvent.change(input, { target: { value: '[sou' } });
    input.setSelectionRange(4, 4);
    fireEvent.keyUp(input, { key: 'u' });

    await waitFor(() => {
      expect(screen.getByText('[sourceUrl]')).toBeInTheDocument();
    });

    expect(screen.queryByText('[name]')).not.toBeInTheDocument();

    fireEvent.mouseDown(screen.getByRole('option', { name: '[sourceUrl]' }));

    expect(input.value).toBe('[sourceUrl]');
  });

  it('renders placeholder choices in a top-level overlay above panels', async () => {
    render(<PlaceholderInputHarness />);

    const input = screen.getByRole('textbox', { name: 'Product title' }) as HTMLInputElement;
    fireEvent.change(input, { target: { value: '[' } });
    input.setSelectionRange(1, 1);
    fireEvent.keyDown(input, { key: '[' });

    const listbox = await screen.findByRole('listbox', { name: 'Scrape placeholders' });

    expect(listbox.parentElement).toBe(document.body);
    expect(listbox).toHaveClass('fixed');
    expect(listbox).toHaveClass('z-[80]');
    expect(listbox).toHaveClass('pointer-events-auto');
  });
});
