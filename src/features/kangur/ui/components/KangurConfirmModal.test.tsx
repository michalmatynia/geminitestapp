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
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    try {
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
      expect(onClose).toHaveBeenCalled();

      onClose.mockClear();
      fireEvent.click(screen.getByRole('button', { name: 'Potwierdź' }));

      expect(onConfirm).toHaveBeenCalledTimes(1);

      const loggedOutput = consoleErrorSpy.mock.calls
        .flatMap((call) => call.map((value) => String(value)))
        .join('\n');
      expect(loggedOutput).not.toContain('`DialogContent` requires a `DialogTitle`');
      expect(loggedOutput).not.toContain('Missing `Description`');
    } finally {
      consoleErrorSpy.mockRestore();
    }
  });
});
