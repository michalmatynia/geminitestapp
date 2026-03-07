/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('framer-motion', () => ({
  motion: {
    div: ({
      children,
      initial: _initial,
      animate: _animate,
      transition: _transition,
      whileHover: _whileHover,
      whileTap: _whileTap,
      ...props
    }: React.HTMLAttributes<HTMLDivElement> & {
      children?: React.ReactNode;
      initial?: unknown;
      animate?: unknown;
      transition?: unknown;
      whileHover?: unknown;
      whileTap?: unknown;
    }) => <div {...props}>{children}</div>,
  },
}));

import DifficultySelector from '@/features/kangur/ui/components/DifficultySelector';

describe('DifficultySelector', () => {
  it('renders shared option cards and accent chips for difficulty choices', () => {
    const onSelect = vi.fn();

    render(<DifficultySelector onSelect={onSelect} selected='medium' />);

    const easyOption = screen.getByTestId('difficulty-option-easy');
    const mediumOption = screen.getByTestId('difficulty-option-medium');

    expect(easyOption).toHaveClass('soft-card');
    expect(mediumOption).toHaveClass('soft-card', 'border-amber-300');
    expect(within(easyOption).getByText(/s$/)).toHaveClass('border-emerald-200', 'bg-emerald-100');
    expect(within(mediumOption).getByText(/s$/)).toHaveClass('border-amber-200', 'bg-amber-100');

    fireEvent.click(screen.getByRole('button', { name: /trudny/i }));

    expect(onSelect).toHaveBeenCalledWith('hard');
  });
});
