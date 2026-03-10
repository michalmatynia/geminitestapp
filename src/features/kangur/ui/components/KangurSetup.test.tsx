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
      animate,
      initial,
      transition,
      whileHover,
      whileTap,
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

import KangurSetup from '@/features/kangur/ui/components/KangurSetup';

describe('KangurSetup', () => {
  it('shows the recommended set and marks the matching card after choosing an edition', () => {
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
});
