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

vi.mock('@/features/kangur/ui/hooks/useKangurCoarsePointer', () => ({
  useKangurCoarsePointer: () => true,
}));

import DifficultySelector from '@/features/kangur/ui/components/DifficultySelector';

describe('DifficultySelector', () => {
  it('renders shared option cards and accent chips for difficulty choices', () => {
    const onSelect = vi.fn();

    render(<DifficultySelector onSelect={onSelect} selected='medium' />);

    expect(screen.getByRole('group', { name: 'Wybierz poziom trudności' })).toBeInTheDocument();
    expect(screen.getByTestId('difficulty-selector-touch-hint')).toHaveTextContent(
      'Dotknij kartę z poziomem, który chcesz uruchomić.'
    );
    expect(screen.getByTestId('difficulty-selector-heading')).toHaveClass(
      'flex',
      'flex-col',
      'items-center',
      'text-center'
    );
    expect(screen.getByRole('heading', { name: 'Wybierz poziom trudności' })).toHaveClass(
      'text-lg',
      'sm:text-xl',
      '[color:var(--kangur-page-text)]'
    );

    const easyOption = screen.getByTestId('difficulty-option-easy');
    const mediumOption = screen.getByTestId('difficulty-option-medium');

    expect(easyOption).toHaveClass('soft-card', 'border', 'kangur-card-surface', 'kangur-card-padding-lg');
    expect(mediumOption).toHaveClass('soft-card', 'border', 'kangur-card-surface', 'kangur-card-padding-lg');
    expect(easyOption).toHaveClass('touch-manipulation', 'select-none', 'min-h-[10.5rem]');
    expect(easyOption).toHaveAttribute('aria-pressed', 'false');
    expect(mediumOption).toHaveAttribute('aria-pressed', 'true');
    expect(within(easyOption).getByText('Łatwy')).toHaveClass('[color:var(--kangur-page-text)]');
    expect(within(easyOption).getByText('Zakres 1-10')).toHaveClass(
      '[color:var(--kangur-page-muted-text)]'
    );
    expect(within(easyOption).getByTestId('difficulty-icon-easy')).toHaveClass(
      'rounded-full',
      'h-16',
      'w-16'
    );
    expect(within(mediumOption).getByTestId('difficulty-icon-medium')).toHaveClass(
      'rounded-full',
      'h-16',
      'w-16'
    );
    expect(within(easyOption).getByText(/s$/)).toHaveClass('inline-flex', 'rounded-full', 'border');
    expect(within(mediumOption).getByText(/s$/)).toHaveClass(
      'inline-flex',
      'rounded-full',
      'border'
    );

    fireEvent.click(screen.getByRole('button', { name: /trudny/i }));

    expect(onSelect).toHaveBeenCalledWith('hard');
  });

  it('can render in compact mode without the stacked heading copy', () => {
    const onSelect = vi.fn();

    render(<DifficultySelector onSelect={onSelect} selected='easy' showHeading={false} />);

    expect(screen.queryByTestId('difficulty-selector-heading')).not.toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: 'Wybierz poziom trudności' })).not.toBeInTheDocument();
    expect(screen.getByRole('group', { name: 'Poziom trudności' })).toBeInTheDocument();
  });
});
