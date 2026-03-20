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
      'kangur-surface-panel-accent-amber',
      'kangur-panel-shell'
    );
    expect(screen.getByTestId('user-not-registered-icon')).toHaveClass(
      'h-16',
      'w-16',
      '[background:color-mix(in_srgb,var(--kangur-soft-card-background)_76%,var(--kangur-accent-amber-start,#fb923c))]',
      '[color:color-mix(in_srgb,var(--kangur-page-text)_72%,var(--kangur-accent-amber-end,#facc15))]'
    );
    expect(screen.getByText('Dostęp ograniczony')).toHaveClass(
      '[border-color:color-mix(in_srgb,var(--kangur-soft-card-border)_52%,var(--kangur-accent-amber-start,#fb923c))]',
      '[background:color-mix(in_srgb,var(--kangur-soft-card-background)_82%,var(--kangur-accent-amber-start,#fb923c))]',
      '[color:color-mix(in_srgb,var(--kangur-page-text)_72%,var(--kangur-accent-amber-end,#facc15))]'
    );
    expect(screen.getByText('To konto nie ma jeszcze dostępu do Kangura')).toBeInTheDocument();
    expect(screen.getByText('Jeśli to pomyłka, sprawdź:').parentElement).toHaveClass(
      'soft-card',
      'kangur-panel-shell',
      '[border-color:var(--kangur-soft-card-border)]',
      '[background:color-mix(in_srgb,var(--kangur-soft-card-background)_68%,var(--kangur-page-background))]'
    );
  });
});
