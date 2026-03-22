/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const useKangurOperationSelectorStateMock = vi.hoisted(() => vi.fn());

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
    }) => (
      <div {...props}>{children}</div>
    ),
  },
}));

vi.mock('@/features/kangur/ui/hooks/useKangurOperationSelectorState', () => ({
  useKangurOperationSelectorState: useKangurOperationSelectorStateMock,
}));

vi.mock('@/features/kangur/ui/hooks/useKangurCoarsePointer', () => ({
  useKangurCoarsePointer: () => true,
}));

vi.mock('@/features/kangur/ui/components/DifficultySelector', () => ({
  default: () => <div data-testid='difficulty-selector'>difficulty-selector</div>,
}));

import OperationSelector from '@/features/kangur/ui/components/OperationSelector';

describe('OperationSelector', () => {
  it('renders a recommendation chip on the recommended operation card', () => {
    useKangurOperationSelectorStateMock.mockReturnValue({
      difficulty: 'medium',
      operations: [
        {
          accent: 'amber',
          actionLabel: 'Zacznij lekcję',
          description: 'Wejdź do serii pytań i ćwicz we własnym tempie.',
          displayLabel: '➗ Dzielenie',
          emoji: '➗',
          hasPriorityAssignment: false,
          id: 'division',
          isRecommended: true,
          label: 'Dzielenie',
          priority: null,
          recommendedLabel: 'Misja dnia',
          select: vi.fn(),
          statusLabel: 'Trening swobodny',
          subject: 'maths',
        },
      ],
      setDifficulty: vi.fn(),
    });

    render(<OperationSelector onSelect={vi.fn()} recommendedLabel='Misja dnia' recommendedOperation='division' />);

    expect(
      screen.getByTestId('operation-card-division').getAttribute('aria-describedby')
    ).toContain('operation-card-recommendation-division');
    expect(screen.getByText('Dzielenie')).toHaveClass('[color:var(--kangur-page-text)]');
    expect(
      screen.getByText('Wejdź do serii pytań i ćwicz we własnym tempie.')
    ).toHaveClass('[color:var(--kangur-page-muted-text)]');
    expect(screen.getByTestId('operation-card-recommendation-division')).toHaveTextContent(
      'Misja dnia'
    );
    expect(screen.getByTestId('operation-card-division')).toHaveClass(
      'min-h-[176px]',
      'px-5',
      'py-5'
    );
  });
});
