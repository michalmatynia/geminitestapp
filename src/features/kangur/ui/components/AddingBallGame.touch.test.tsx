/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/features/kangur/ui/hooks/useKangurCoarsePointer', () => ({
  useKangurCoarsePointer: () => true,
}));

import AddingBallGame from '@/features/kangur/ui/components/AddingBallGame';

describe('AddingBallGame touch mode', () => {
  it('shows a localized touch hint for the current round mode', () => {
    render(<AddingBallGame onFinish={() => undefined} />);

    expect(screen.getByText('Uzupełnij równanie')).toBeInTheDocument();
    expect(screen.getByTestId('adding-ball-touch-hint')).toHaveTextContent(
      'Dotknij piłkę, a potem dotknij pole, do którego chcesz ją przenieść.'
    );
  });
});
