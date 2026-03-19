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
      'border-amber-200/80'
    );
    expect(screen.getByText('restricted')).toHaveClass(
      'text-[11px]',
      'uppercase',
      'tracking-[0.18em]'
    );
    expect(screen.getByRole('heading', { name: 'title' })).toHaveClass(
      'text-3xl',
      'font-extrabold'
    );
    expect(screen.getByText('description')).toBeInTheDocument();
    expect(screen.getByText('checkLabel')).toBeInTheDocument();
  });
});
