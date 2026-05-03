/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { FormProvider, useForm } from 'react-hook-form';
import { describe, expect, it } from 'vitest';

import type { ProductFormData } from '@/shared/contracts/products/drafts';

import ProductFormNotes from './ProductFormNotes';

function renderProductFormNotes(defaultValues: Partial<ProductFormData> = {}): void {
  function Wrapper(): React.JSX.Element {
    const methods = useForm<ProductFormData>({
      defaultValues: {
        ...defaultValues,
      } as ProductFormData,
    });

    return (
      <FormProvider {...methods}>
        <ProductFormNotes />
      </FormProvider>
    );
  }

  render(<Wrapper />);
}

describe('ProductFormNotes', () => {
  it('writes note text and updates the preview', () => {
    renderProductFormNotes();

    const noteInput = screen.getByRole('textbox', { name: 'Product note' });

    fireEvent.change(noteInput, {
      target: { value: 'Keep the original backing card.' },
    });

    expect(noteInput).toHaveValue('Keep the original backing card.');
    expect(screen.getAllByText('Keep the original backing card.')).toHaveLength(2);
  });

  it('updates the paper color from a swatch selection', () => {
    renderProductFormNotes({
      notes: {
        text: 'Existing note',
        color: '#f5e7c3',
      },
    });

    fireEvent.click(screen.getByRole('button', { name: 'Set note color #bfdbfe' }));

    expect(screen.getByText('#bfdbfe')).toBeInTheDocument();
  });
});
