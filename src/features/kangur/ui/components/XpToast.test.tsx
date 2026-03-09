/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  motion: {
    div: ({
      children,
      initial: _initial,
      animate: _animate,
      exit: _exit,
      ...props
    }: React.HTMLAttributes<HTMLDivElement> & {
      children?: React.ReactNode;
      initial?: unknown;
      animate?: unknown;
      exit?: unknown;
    }) => <div {...props}>{children}</div>,
  },
}));

import XpToast from '@/features/kangur/ui/components/XpToast';

describe('XpToast', () => {
  it('uses shared status chips for xp and badge rewards', () => {
    render(<XpToast newBadges={['first_game']} visible xpGained={25} />);

    expect(screen.getByTestId('xp-toast-xp-shell')).toHaveClass(
      'glass-panel',
      'border-indigo-200/70',
      'bg-white/95'
    );
    expect(screen.getByTestId('xp-toast-badge-shell-first_game')).toHaveClass(
      'glass-panel',
      'border-amber-200/80',
      'bg-white/95'
    );
    expect(screen.getByText('+25 XP')).toHaveClass('border-indigo-200', 'bg-indigo-100');
    expect(screen.getByText(/Nowa odznaka/)).toHaveClass('border-amber-200', 'bg-amber-100');
    expect(screen.getByText('Pierwsza gra')).toBeInTheDocument();
    expect(screen.getByTestId('xp-toast-badge-desc-first_game')).toHaveTextContent(
      'Ukoncz pierwsza gre'
    );
  });

  it('renders nothing when the toast is hidden', () => {
    const { container } = render(<XpToast newBadges={['first_game']} visible={false} xpGained={25} />);

    expect(container).toBeEmptyDOMElement();
  });
});
