/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const { localeMock } = vi.hoisted(() => ({
  localeMock: vi.fn(() => 'pl'),
}));

vi.mock('next-intl', () => ({
  useLocale: () => localeMock(),
}));

vi.mock('framer-motion', () => ({
  motion: {
    div: ({
      children,
      animate: _animate,
      initial: _initial,
      transition: _transition,
      whileHover: _whileHover,
      whileTap: _whileTap,
      ...props
    }: React.HTMLAttributes<HTMLDivElement> & {
      animate?: unknown;
      children?: React.ReactNode;
      initial?: unknown;
      transition?: unknown;
      whileHover?: unknown;
      whileTap?: unknown;
    }) => <div {...props}>{children}</div>,
  },
}));

vi.mock('@/features/kangur/ui/hooks/useKangurCoarsePointer', () => ({
  useKangurCoarsePointer: () => true,
}));

import KangurSetup from '@/features/kangur/ui/components/KangurSetup';

describe('KangurSetup', () => {
  it('shows the recommended set and marks the matching card after choosing an edition', () => {
    localeMock.mockReturnValue('pl');
    render(
      <KangurSetup
        onStart={vi.fn()}
        recommendedDescription='Ten zestaw najlepiej pasuje do aktualnego tempa.'
        recommendedLabel='Mocny krok'
        recommendedMode='original_4pt_2024'
        recommendedTitle='Polecamy zestaw 4-punktowy'
      />
    );

    fireEvent.click(screen.getByTestId('kangur-setup-edition-2024'));

    const backToEditionsButton = screen.getByRole('button', { name: 'Wróć do listy edycji' });

    expect(backToEditionsButton).toHaveClass(
      'min-h-11',
      'px-5',
      'touch-manipulation'
    );
    expect(backToEditionsButton).not.toHaveTextContent('Edycje');

    expect(screen.getByTestId('kangur-setup-recommendation-card')).toBeInTheDocument();
    expect(screen.getByTestId('kangur-setup-recommendation-label')).toHaveTextContent('Mocny krok');
    expect(screen.getByTestId('kangur-setup-recommendation-title')).toHaveTextContent(
      'Polecamy zestaw 4-punktowy'
    );
    expect(screen.getByTestId('kangur-setup-recommendation-description')).toHaveTextContent(
      'Ten zestaw najlepiej pasuje do aktualnego tempa.'
    );
    expect(
      screen.getByTestId('kangur-setup-recommendation-chip-original_4pt_2024')
    ).toHaveTextContent('Mocny krok');
  });

  it('renders the setup chrome and set labels in English on the English route', () => {
    localeMock.mockReturnValue('en');

    render(<KangurSetup onStart={vi.fn()} />);

    expect(
      screen.getByRole('heading', { name: 'Choose the competition edition' })
    ).toBeInTheDocument();
    expect(
      screen.getByText('Decide which edition you want to solve tasks from.')
    ).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('kangur-setup-edition-2024'));

    expect(screen.getByRole('button', { name: 'Back to the editions list' })).toBeInTheDocument();
    expect(screen.getByText('Choose a question set:')).toBeInTheDocument();
    expect(screen.getByText('📋 Original - 4 pts')).toBeInTheDocument();
    expect(
      screen.getByText(
        '8 authentic Mathematical Kangaroo 2024 questions worth 4 points (medium)'
      )
    ).toBeInTheDocument();
    expect(screen.getByText('Competition mode')).toBeInTheDocument();
  });
});
