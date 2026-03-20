/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import UserNotRegisteredError from '@/features/kangur/ui/components/UserNotRegisteredError';

describe('UserNotRegisteredError', () => {
  it('renders the shared restricted-access surface and eyebrow chip styling', () => {
    render(<UserNotRegisteredError />);

    expect(screen.getByTestId('user-not-registered-shell')).toHaveClass(
      'glass-panel',
      'kangur-panel-soft',
      'rounded-[34px]',
      'kangur-surface-panel-accent-amber',
      'kangur-panel-padding-xl',
      'kangur-panel-shell'
    );
    expect(screen.getByText('Dostep ograniczony')).toHaveClass(
      'text-[11px]',
      'uppercase',
      'tracking-[0.18em]'
    );
    expect(screen.getByRole('heading', { name: 'To konto nie ma jeszcze dostepu do Kangura' })).toHaveClass(
      'text-3xl',
      'font-extrabold'
    );
    expect(screen.getByText(/Wyglada na to, ze Twoje konto/)).toBeInTheDocument();
    expect(screen.getByText('Jesli to pomylka, sprawdz:')).toBeInTheDocument();
  });
});
