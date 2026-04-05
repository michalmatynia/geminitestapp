/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { KangurPanelCloseButton } from '@/features/kangur/ui/components/KangurPanelCloseButton';

describe('KangurPanelCloseButton', () => {
  it('uses a touch-friendly icon close target', () => {
    render(<KangurPanelCloseButton aria-label='Zamknij panel' />);

    const closeButton = screen.getByRole('button', { name: 'Zamknij panel' });

    expect(closeButton).toHaveClass(
      'inline-flex',
      'items-center',
      'justify-center',
      'leading-none',
      'touch-manipulation',
      'select-none',
      'min-h-11',
      'min-w-11'
    );
    expect(closeButton.firstElementChild).toHaveClass('block');
  });

  it('supports a neutral panel variant for regular app modals', () => {
    render(<KangurPanelCloseButton aria-label='Zamknij modal' variant='panel' />);

    const closeButton = screen.getByRole('button', { name: 'Zamknij modal' });

    expect(closeButton).toHaveClass(
      'border-[color:var(--kangur-page-border)]',
      'bg-[var(--kangur-soft-card-background,#ffffff)]',
      'text-[color:var(--kangur-page-text)]'
    );
  });
});
