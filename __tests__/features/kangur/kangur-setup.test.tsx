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

    expect(screen.getByRole('list', { name: 'Wybierz edycje konkursu' })).toBeInTheDocument();
    expect(screen.getByTestId('kangur-setup-editions-shell')).toHaveClass(
      'glass-panel',
      'border-white/88',
      'bg-white/94'
    );
    const editionsHeading = screen.getByTestId('kangur-setup-editions-heading');
    expect(editionsHeading).toHaveClass('flex', 'flex-col', 'items-center', 'text-center');
    expect(within(editionsHeading).getByText('🦘')).toHaveClass(
      'bg-amber-100',
      'text-amber-700'
    );
    expect(screen.getByText('O konkursie Kangur')).toHaveClass('border-amber-200', 'bg-amber-100');

    const editionButton = screen.getByTestId('kangur-setup-edition-2024');
    expect(editionButton).toHaveClass('soft-card', 'border-amber-300');
    expect(editionButton).toHaveAttribute('aria-label', 'Edycja 2024. Dostepna.');
    expect(screen.getByTestId('kangur-setup-edition-icon-2024')).toHaveClass(
      'bg-amber-100',
      'text-amber-700'
    );
    expect(screen.getByText('2024')).toHaveClass('border-amber-200', 'bg-amber-100');

    fireEvent.click(screen.getByText('Edycja 2024'));

    const selectedEditionHeading = screen.getByTestId('kangur-setup-selected-edition-heading');
    expect(screen.getByTestId('kangur-setup-selected-edition-shell')).toHaveClass(
      'glass-panel',
      'border-white/88',
      'bg-white/94'
    );
    expect(selectedEditionHeading).toHaveClass('flex', 'flex-col', 'items-center', 'text-center');
    expect(within(selectedEditionHeading).getByText('🦘')).toHaveClass(
      'bg-amber-100',
      'text-amber-700'
    );
    expect(screen.getByRole('button', { name: /wroc do listy edycji/i })).toHaveClass(
      'kangur-cta-pill',
      'surface-cta'
    );
    expect(screen.getByText('Tryb konkursowy')).toHaveClass('border-indigo-200', 'bg-indigo-100');
    expect(screen.getByRole('list', { name: 'Edycja 2024' })).toBeInTheDocument();
    const setButton = screen.getByTestId('kangur-setup-set-full_test_2024');
    expect(setButton).toHaveClass('soft-card', 'border-amber-300');
    expect(setButton).toHaveAttribute(
      'aria-label',
      '🏆 Pelny test konkursowy. Tryb konkursowy. Dostepny.'
    );

    fireEvent.click(screen.getByText('🏆 Pelny test konkursowy'));

    expect(onStart).toHaveBeenCalledWith('full_test_2024');
  });
});
