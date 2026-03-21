/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { KangurPageIntroCard } from '@/features/kangur/ui/components/KangurPageIntroCard';

describe('KangurPageIntroCard', () => {
  it('keeps the visual title visible while preserving a hidden text heading fallback', () => {
    const handleBack = vi.fn();

    render(
      <KangurPageIntroCard
        testId='intro-card'
        headingTestId='intro-card-heading'
        onBack={handleBack}
        title='Lekcje'
        visualTitle={<svg aria-hidden='true' data-testid='intro-card-visual-title' />}
      />
    );

    const introCard = screen.getByTestId('intro-card');
    const heading = screen.getByRole('heading', { name: 'Lekcje' });
    const backButton = screen.getByRole('button', { name: 'Wróć do poprzedniej strony' });

    expect(introCard).toHaveClass('text-center');
    expect(screen.getByTestId('intro-card-visual-title')).toBeInTheDocument();
    expect(heading).toHaveClass('flex', 'justify-center');
    expect(screen.getByText('Lekcje', { selector: 'span' })).toHaveClass('sr-only');
    expect(heading.compareDocumentPosition(backButton)).toBe(Node.DOCUMENT_POSITION_FOLLOWING);

    fireEvent.click(backButton);

    expect(handleBack).toHaveBeenCalledTimes(1);
  });

  it('omits the back button when disabled', () => {
    const handleBack = vi.fn();

    render(
      <KangurPageIntroCard
        onBack={handleBack}
        showBackButton={false}
        title='Lekcje'
      />
    );

    expect(
      screen.queryByRole('button', { name: 'Wróć do poprzedniej strony' })
    ).toBeNull();
    expect(handleBack).not.toHaveBeenCalled();
  });
});
