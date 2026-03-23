import { render, screen } from '@testing-library/react';

import { KangurCheckButton } from './KangurCheckButton';

describe('KangurCheckButton', () => {
  it('keeps the success state fully visible while disabled', () => {
    render(
      <KangurCheckButton disabled feedbackTone='success'>
        Sprawdź
      </KangurCheckButton>
    );

    expect(screen.getByRole('button', { name: 'Sprawdź' })).toHaveClass(
      'bg-emerald-500',
      'border-emerald-500',
      'disabled:opacity-100'
    );
  });

  it('applies the error styling without changing the label', () => {
    render(<KangurCheckButton feedbackTone='error'>Sprawdź</KangurCheckButton>);

    expect(screen.getByRole('button', { name: 'Sprawdź' })).toHaveClass(
      'bg-rose-500',
      'border-rose-500'
    );
  });
});
