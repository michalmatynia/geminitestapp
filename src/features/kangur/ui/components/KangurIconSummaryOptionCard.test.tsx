/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { KangurIconSummaryOptionCard } from '@/features/kangur/ui/components/KangurIconSummaryOptionCard';
import { KangurIconSummaryCardContent } from '@/features/kangur/ui/components/KangurIconSummaryCardContent';

describe('KangurIconSummaryOptionCard', () => {
  it('renders the shared icon-summary content inside the shared option-card shell via composition', () => {
    const handleClick = vi.fn();

    render(
      <KangurIconSummaryOptionCard
        accent='indigo'
        buttonClassName='rounded-[28px]'
        data-testid='summary-option-card'
        emphasis='accent'
        onClick={handleClick}
      >
        <KangurIconSummaryCardContent
          aside={<span data-testid='summary-option-aside'>aside</span>}
          description='Opis'
          footer={<span data-testid='summary-option-footer'>footer</span>}
          icon={<span data-testid='summary-option-icon'>icon</span>}
          title='Naglowek'
        />
      </KangurIconSummaryOptionCard>
    );

    const card = screen.getByTestId('summary-option-card');

    expect(card).toHaveClass('soft-card', 'rounded-[28px]');
    expect(screen.getByTestId('summary-option-icon')).toBeInTheDocument();
    expect(screen.getByText('Naglowek')).toBeInTheDocument();
    expect(screen.getByText('Opis')).toBeInTheDocument();
    expect(screen.getByTestId('summary-option-aside')).toBeInTheDocument();
    expect(screen.getByTestId('summary-option-footer')).toBeInTheDocument();

    fireEvent.click(card);

    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});
