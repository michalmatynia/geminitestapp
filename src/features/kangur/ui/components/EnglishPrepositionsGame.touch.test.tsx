/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/features/kangur/ui/hooks/useKangurCoarsePointer', () => ({
  useKangurCoarsePointer: () => true,
}));

import EnglishPrepositionsGame from '@/features/kangur/ui/components/EnglishPrepositionsGame';
import { KANGUR_ACCENT_STYLES } from '@/features/kangur/ui/design/tokens';

describe('EnglishPrepositionsGame touch mode', () => {
  it('shows a touch mode label, larger answer buttons, and a visible selected state', () => {
    render(<EnglishPrepositionsGame onFinish={vi.fn()} />);

    expect(screen.getByText('Dotknij')).toBeInTheDocument();
    expect(
      screen.queryByText('Dotknij przyimek, a potem dotknij Sprawdź.')
    ).not.toBeInTheDocument();

    const option = screen.getByRole('button', { name: 'at' });
    expect(option).toHaveClass('touch-manipulation', 'select-none', 'min-h-[4.25rem]');

    fireEvent.click(option);

    expect(option).toHaveAttribute('aria-pressed', 'true');
    expect(option).toHaveClass(
      ...KANGUR_ACCENT_STYLES.rose.activeCard.split(' '),
      ...KANGUR_ACCENT_STYLES.rose.activeText.split(' '),
      'ring-2',
      'ring-emerald-400/70'
    );
  });
});
