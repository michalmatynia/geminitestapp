/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { KangurConfirmModal } from '@/features/kangur/ui/components/KangurConfirmModal';

describe('KangurConfirmModal', () => {
  it('uses touch-friendly confirm and cancel actions', () => {
    const onClose = vi.fn();
    const onConfirm = vi.fn();

    render(
      <KangurConfirmModal
        isOpen
        title='Potwierdź akcję'
        message='Czy na pewno chcesz kontynuować?'
        onClose={onClose}
        onConfirm={onConfirm}
      />
    );

    expect(screen.getByRole('button', { name: 'Anuluj' })).toHaveClass(
      'touch-manipulation',
      'select-none',
      'min-h-11'
    );
    expect(screen.getByRole('button', { name: 'Potwierdź' })).toHaveClass(
      'touch-manipulation',
      'select-none',
      'min-h-11'
    );

    fireEvent.click(screen.getByRole('button', { name: 'Anuluj' }));
    fireEvent.click(screen.getByRole('button', { name: 'Potwierdź' }));

    expect(onClose).toHaveBeenCalledTimes(1);
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });
});
