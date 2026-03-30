/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { localeMock } = vi.hoisted(() => ({
  localeMock: vi.fn(() => 'pl'),
}));

vi.mock('@/features/kangur/ui/hooks/useKangurCoarsePointer', () => ({
  useKangurCoarsePointer: () => true,
}));

vi.mock('next-intl', () => ({
  useLocale: () => localeMock(),
}));

import { KangurPageIntroCard } from '../KangurPageIntroCard';

describe('KangurPageIntroCard', () => {
  beforeEach(() => {
    localeMock.mockReturnValue('pl');
  });

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
    expect(backButton).toHaveClass('min-h-11', 'px-4', 'touch-manipulation');

    fireEvent.click(backButton);

    expect(handleBack).toHaveBeenCalledTimes(1);
  });

  it('omits the back button when disabled', () => {
    const handleBack = vi.fn();
    localeMock.mockClear();

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
    expect(localeMock).not.toHaveBeenCalled();
    expect(handleBack).not.toHaveBeenCalled();
  });

  it('renders custom back-button content in the live back-button slot', () => {
    render(
      <KangurPageIntroCard
        backButtonContent={<div data-testid='intro-card-back-button-skeleton' />}
        onBack={vi.fn()}
        title='Lekcje'
      />
    );

    expect(screen.getByTestId('intro-card-back-button-skeleton')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Wróć do poprzedniej strony' })
    ).toBeNull();
  });

  it('localizes the default back button label on the English route', () => {
    localeMock.mockReturnValue('en');

    render(<KangurPageIntroCard onBack={vi.fn()} title='Lessons' />);

    expect(
      screen.getByRole('button', { name: 'Back to the previous page' })
    ).toBeInTheDocument();
  });
});
