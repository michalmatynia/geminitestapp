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

    fireEvent.click(screen.getByText('[name]'));

    expect(input.value).toBe('[name]');
  });
});
