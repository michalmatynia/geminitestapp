/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import LessonSlideSection from '@/features/kangur/ui/components/LessonSlideSection';

describe('LessonSlideSection', () => {
  it('renders slide indicators as clickable Kangur micro pills', () => {
    render(
      <LessonSlideSection
        slides={[
          { title: 'Slajd 1', content: <div>Pierwszy</div> },
          { title: 'Slajd 2', content: <div>Drugi</div> },
        ]}
        onBack={vi.fn()}
        dotActiveClass='bg-orange-400'
        dotDoneClass='bg-orange-200'
        gradientClass='from-orange-400 to-yellow-400'
      />
    );

    const firstIndicator = screen.getByTestId('lesson-slide-indicator-0');
    const secondIndicator = screen.getByTestId('lesson-slide-indicator-1');

    expect(firstIndicator).toHaveClass('kangur-cta-pill', 'bg-orange-400');
    expect(firstIndicator).toHaveAttribute('aria-current', 'step');
    expect(secondIndicator).toHaveClass('kangur-cta-pill', 'soft-cta');

    fireEvent.click(secondIndicator);

    expect(firstIndicator).toHaveClass('bg-orange-200');
    expect(firstIndicator).not.toHaveAttribute('aria-current');
    expect(secondIndicator).toHaveClass('bg-orange-400');
    expect(secondIndicator).toHaveAttribute('aria-current', 'step');
    expect(screen.getByText('Drugi')).toBeInTheDocument();
  });
});
