/**
 * @vitest-environment jsdom
 */

import * as DialogPrimitive from '@radix-ui/react-dialog';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { KangurDialogCloseButton } from '@/features/kangur/ui/components/KangurDialogCloseButton';

describe('KangurDialogCloseButton', () => {
  it('uses a larger touch-friendly close target', () => {
    render(
      <DialogPrimitive.Root open>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Content>
            <KangurDialogCloseButton label='Zamknij okno' />
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    );

    expect(screen.getByRole('button', { name: 'Zamknij okno' })).toHaveClass(
      'touch-manipulation',
      'select-none',
      'min-h-11',
      'px-4'
    );
  });
});
