import { render, screen } from '@testing-library/react';

import { KangurButton } from '@/features/kangur/ui/design/primitives/KangurButton';

import { getKangurCheckButtonClassName } from './KangurCheckButton';

describe('KangurCheckButton', () => {
  it('keeps the success state fully visible while disabled', () => {
    render(
      <KangurButton disabled className={getKangurCheckButtonClassName(undefined, 'success')}>
        Sprawdź
      </KangurButton>
    );

    expect(screen.getByRole('button', { name: 'Sprawdź' })).toHaveClass(
      'bg-emerald-500',
      'border-emerald-500',
      'disabled:opacity-100'
    );
  });

  it('applies the error styling without changing the label', () => {
    render(
      <KangurButton className={getKangurCheckButtonClassName(undefined, 'error')}>
        Sprawdź
      </KangurButton>
    );

    expect(screen.getByRole('button', { name: 'Sprawdź' })).toHaveClass(
      'bg-rose-500',
      'border-rose-500'
    );
  });
});
