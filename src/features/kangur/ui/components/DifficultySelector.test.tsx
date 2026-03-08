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

    expect(screen.getByRole('group', { name: 'Wybierz poziom trudnosci' })).toBeInTheDocument();
    expect(screen.getByTestId('difficulty-selector-heading')).toHaveClass(
      'flex',
      'flex-col',
      'items-center',
      'text-center'
    );
    expect(screen.getByRole('heading', { name: 'Wybierz poziom trudnosci' })).toHaveClass(
      'text-xl',
      'text-slate-800'
    );

    const easyOption = screen.getByTestId('difficulty-option-easy');
    const mediumOption = screen.getByTestId('difficulty-option-medium');

    expect(easyOption).toHaveClass('soft-card');
    expect(mediumOption).toHaveClass('soft-card', 'border-amber-300');
    expect(easyOption).toHaveAttribute('aria-pressed', 'false');
    expect(mediumOption).toHaveAttribute('aria-pressed', 'true');
    expect(within(easyOption).getByTestId('difficulty-icon-easy')).toHaveClass(
      'bg-emerald-100',
      'text-emerald-700'
    );
    expect(within(mediumOption).getByTestId('difficulty-icon-medium')).toHaveClass(
      'bg-amber-100',
      'text-amber-700'
    );
    expect(within(easyOption).getByText(/s$/)).toHaveClass('border-emerald-200', 'bg-emerald-100');
    expect(within(mediumOption).getByText(/s$/)).toHaveClass('border-amber-200', 'bg-amber-100');

    fireEvent.click(screen.getByRole('button', { name: /trudny/i }));

    expect(onSelect).toHaveBeenCalledWith('hard');
  });

  it('can render in compact mode without the stacked heading copy', () => {
    const onSelect = vi.fn();

    render(<DifficultySelector onSelect={onSelect} selected='easy' showHeading={false} />);

    expect(screen.queryByTestId('difficulty-selector-heading')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Wybierz poziom trudnosci' })).not.toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Poziom trudnosci' })).toBeInTheDocument();
  });
});
