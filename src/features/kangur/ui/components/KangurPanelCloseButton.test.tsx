/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { KangurPanelCloseButton } from '@/features/kangur/ui/components/KangurPanelCloseButton';

describe('KangurPanelCloseButton', () => {
  it('uses a touch-friendly icon close target', () => {
    render(<KangurPanelCloseButton aria-label='Zamknij panel' />);

    expect(screen.getByRole('button', { name: 'Zamknij panel' })).toHaveClass(
      'touch-manipulation',
      'select-none',
      'min-h-11',
      'min-w-11'
    );
  });
});
