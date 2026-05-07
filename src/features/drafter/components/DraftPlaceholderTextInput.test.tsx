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

const getProductTitleInput = (): HTMLInputElement => {
  const input = screen.getByRole('textbox', { name: 'Product title' });
  if (!(input instanceof HTMLInputElement)) throw new Error('Expected product title input.');
  return input;
};

describe('DraftPlaceholderTextInput', () => {
  it('opens placeholder choices after typing [ and inserts the selected token', async () => {
    render(<PlaceholderInputHarness />);

    const input = getProductTitleInput();
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

    const input = getProductTitleInput();
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

  it('offers transformed title placeholders', async () => {
    render(<PlaceholderInputHarness />);

    const input = getProductTitleInput();
    fireEvent.change(input, { target: { value: '[name(' } });
    input.setSelectionRange(6, 6);
    fireEvent.keyUp(input, { key: '(' });

    await waitFor(() => {
      expect(screen.getByText('[name(TitleCase)]')).toBeInTheDocument();
    });

    fireEvent.mouseDown(screen.getByRole('option', { name: '[name(TitleCase)]' }));

    expect(input.value).toBe('[name(TitleCase)]');
  });

  it('renders placeholder choices in a top-level overlay above panels', async () => {
    render(<PlaceholderInputHarness />);

    const input = getProductTitleInput();
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
