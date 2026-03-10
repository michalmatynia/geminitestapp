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
    }) => (
      <div {...props}>{children}</div>
    ),
  },
}));

vi.mock('@/features/kangur/ui/hooks/useKangurOperationSelectorState', () => ({
  useKangurOperationSelectorState: useKangurOperationSelectorStateMock,
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
          actionLabel: 'Zacznij lekcje',
          description: 'Wejdz do serii pytan i cwicz we wlasnym tempie.',
          displayLabel: '➗ Dzielenie',
          emoji: '➗',
          hasPriorityAssignment: false,
          id: 'division',
          isRecommended: true,
          label: 'Dzielenie',
          priorityLabel: '',
          recommendedLabel: 'Misja dnia',
          select: vi.fn(),
          statusLabel: 'Trening swobodny',
        },
      ],
      setDifficulty: vi.fn(),
    });

    render(<OperationSelector onSelect={vi.fn()} recommendedLabel='Misja dnia' recommendedOperation='division' />);

    expect(
      screen.getByTestId('operation-card-division').getAttribute('aria-describedby')
    ).toContain('operation-card-recommendation-division');
    expect(screen.getByTestId('operation-card-recommendation-division')).toHaveTextContent(
      'Misja dnia'
    );
  });
});
