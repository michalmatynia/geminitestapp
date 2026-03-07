/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import UserNotRegisteredError from '@/features/kangur/ui/components/UserNotRegisteredError';

describe('UserNotRegisteredError', () => {
  it('uses shared Kangur status and info surfaces', () => {
    render(<UserNotRegisteredError />);

    expect(screen.getByTestId('user-not-registered-shell')).toHaveClass(
      'glass-panel',
      'border-amber-200/80'
    );
    expect(screen.getByTestId('user-not-registered-icon')).toHaveClass(
      'h-16',
      'w-16',
      'bg-amber-100',
      'text-amber-700'
    );
    expect(screen.getByText('Dostęp ograniczony')).toHaveClass('border-amber-200', 'bg-amber-100');
    expect(screen.getByText('To konto nie ma jeszcze dostępu do Kangura')).toBeInTheDocument();
    expect(screen.getByText('Jeśli to pomyłka, sprawdź:').parentElement).toHaveClass(
      'soft-card',
      'border-slate-200/80'
    );
  });
});
