/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
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

    render(<KangurSetup onBack={vi.fn()} onStart={onStart} />);

    expect(screen.getByText('O konkursie Kangur')).toHaveClass('border-amber-200', 'bg-amber-100');

    const editionButton = screen.getByTestId('kangur-setup-edition-2024');
    expect(editionButton).toHaveClass('soft-card', 'border-amber-300');
    expect(screen.getByText('2024')).toHaveClass('border-amber-200', 'bg-amber-100');

    fireEvent.click(screen.getByText('Edycja 2024'));

    expect(screen.getByText('Tryb konkursowy')).toHaveClass('border-indigo-200', 'bg-indigo-100');
    const setButton = screen.getByTestId('kangur-setup-set-full_test_2024');
    expect(setButton).toHaveClass('soft-card', 'border-amber-300');

    fireEvent.click(screen.getByText('🏆 Pelny test konkursowy'));

    expect(onStart).toHaveBeenCalledWith('full_test_2024');
  });
});
