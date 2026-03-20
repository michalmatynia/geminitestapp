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

import KangurSetup from '@/features/kangur/ui/components/KangurSetup';

describe('KangurSetup', () => {
  it('uses shared option-card and summary surfaces across the setup flow', () => {
    const onStart = vi.fn();

    render(<KangurSetup onStart={onStart} />);

    expect(screen.getByRole('list', { name: 'Wybierz edycję konkursu' })).toBeInTheDocument();
    expect(screen.getByTestId('kangur-setup-editions-shell')).toHaveClass(
      'glass-panel',
      'kangur-panel-soft',
      'kangur-glass-surface-solid'
    );
    const editionsHeading = screen.getByTestId('kangur-setup-editions-heading');
    expect(editionsHeading).toHaveClass('flex', 'flex-col', 'items-center', 'text-center');
    expect(within(editionsHeading).getByText('🦘')).toHaveClass('rounded-full');
    expect(screen.getByText('O konkursie Kangur')).toHaveClass(
      'inline-flex',
      'rounded-full',
      'border'
    );

    const editionButton = screen.getByTestId('kangur-setup-edition-2024');
    expect(editionButton).toHaveClass('soft-card', 'border', 'rounded-[28px]');
    expect(editionButton).toHaveAttribute('aria-label', 'Edycja 2024. Dostępna.');
    expect(screen.getByTestId('kangur-setup-edition-icon-2024')).toHaveClass(
      'rounded-full',
      'h-16',
      'w-16'
    );
    expect(screen.getByText('2024')).toHaveClass('inline-flex', 'rounded-full', 'border');

    fireEvent.click(screen.getByText('Edycja 2024'));

    const selectedEditionHeading = screen.getByTestId('kangur-setup-selected-edition-heading');
    expect(screen.getByTestId('kangur-setup-selected-edition-shell')).toHaveClass(
      'glass-panel',
      'kangur-panel-soft',
      'kangur-glass-surface-solid'
    );
    expect(selectedEditionHeading).toHaveClass('flex', 'flex-col', 'items-center', 'text-center');
    expect(within(selectedEditionHeading).getByText('🦘')).toHaveClass('rounded-full');
    expect(screen.getByRole('button', { name: /wróć do listy edycji/i })).toHaveClass(
      'kangur-cta-pill',
      'surface-cta'
    );
    expect(screen.getByText('Tryb konkursowy')).toHaveClass(
      'inline-flex',
      'rounded-full',
      'border'
    );
    expect(screen.getByRole('list', { name: 'Edycja 2024' })).toBeInTheDocument();
    const setButton = screen.getByTestId('kangur-setup-set-full_test_2024');
    expect(setButton).toHaveClass('soft-card', 'border', 'rounded-[28px]');
    expect(setButton).toHaveAttribute(
      'aria-label',
      '🏆 Pełny test konkursowy. Tryb konkursowy. Dostępny.'
    );

    fireEvent.click(screen.getByText('🏆 Pełny test konkursowy'));

    expect(onStart).toHaveBeenCalledWith('full_test_2024');
  });
});
