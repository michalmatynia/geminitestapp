/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/features/kangur/ui/hooks/useKangurCoarsePointer', () => ({
  useKangurCoarsePointer: () => true,
}));

import EnglishSubjectVerbAgreementGame from '@/features/kangur/ui/components/EnglishSubjectVerbAgreementGame';

describe('EnglishSubjectVerbAgreementGame touch mode', () => {
  it('shows a touch mode label, hint, and larger answer buttons', () => {
    render(<EnglishSubjectVerbAgreementGame onFinish={() => undefined} />);

    expect(screen.getByText('Dotknij')).toBeInTheDocument();
    expect(screen.getByTestId('english-agreement-touch-hint')).toHaveTextContent(
      'Dotknij czasownik, a potem dotknij Sprawdź.'
    );

    const option = screen.getByRole('button', { name: 'goes' });
    expect(option).toHaveClass('touch-manipulation', 'select-none', 'min-h-[4.25rem]');
  });
});
