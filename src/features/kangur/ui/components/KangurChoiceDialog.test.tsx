/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { renderKangurChoiceDialog } from '@/features/kangur/ui/components/KangurChoiceDialog';

describe('KangurChoiceDialog', () => {
  it('uses touch-friendly option, close, and done controls', () => {
    const onOpenChange = vi.fn();
    const onSelectDefault = vi.fn();
    const onSelectAlt = vi.fn();
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    try {
      render(
        renderKangurChoiceDialog({
          open: true,
          onOpenChange,
          header: <div>Header</div>,
          title: 'Wybierz tryb',
          defaultChoiceLabel: 'Domyślny',
          currentChoiceLabel: 'Domyślny',
          closeAriaLabel: 'Zamknij dialog',
          groupAriaLabel: 'Tryb',
          options: [
            { id: 'default', label: 'Domyślny', isActive: true, onSelect: onSelectDefault },
            { id: 'alt', label: 'Alternatywny', isActive: false, onSelect: onSelectAlt },
          ],
          doneLabel: 'Gotowe',
        })
      );

      expect(screen.getByRole('button', { name: 'Domyślny' })).toHaveClass(
        'touch-manipulation',
        'select-none',
        'min-h-12'
      );
      expect(screen.getByRole('button', { name: 'Alternatywny' })).toHaveClass(
        'touch-manipulation',
        'select-none',
        'min-h-12'
      );
      expect(screen.getByRole('button', { name: 'Gotowe' })).toHaveClass(
        'touch-manipulation',
        'select-none',
        'min-h-12'
      );
      expect(screen.getByRole('button', { name: 'Zamknij dialog' })).toHaveClass(
        'touch-manipulation',
        'select-none',
        'min-h-11',
        'min-w-11'
      );

      fireEvent.click(screen.getByRole('button', { name: 'Alternatywny' }));
      fireEvent.click(screen.getByRole('button', { name: 'Gotowe' }));

      expect(onSelectAlt).toHaveBeenCalledTimes(1);
      expect(onOpenChange).toHaveBeenCalledWith(false);

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
