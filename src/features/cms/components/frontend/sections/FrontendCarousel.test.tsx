/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { FrontendCarousel } from '@/features/cms/components/frontend/sections/FrontendCarousel';
import { SectionBlockProvider } from '@/features/cms/components/frontend/sections/SectionBlockContext';
import type { BlockInstance } from '@/features/cms/types/page-builder';

function renderCarousel(
  settings: Record<string, unknown> = {},
  blocks: BlockInstance[] = []
): void {
  render(
    <SectionBlockProvider
      settings={{
        autoPlay: false,
        showNavigation: true,
        showIndicators: true,
        transitionType: 'fade',
        ...settings,
      }}
      blocks={blocks}
    >
      <FrontendCarousel />
    </SectionBlockProvider>
  );
}

describe('FrontendCarousel accessibility', () => {
  it('announces the carousel and exposes current slide state', () => {
    renderCarousel(
      { carouselAriaLabel: 'Homepage stories' },
      [
        { id: 'slide-1', type: 'CarouselFrame', settings: {}, blocks: [] },
        { id: 'slide-2', type: 'CarouselFrame', settings: {}, blocks: [] },
      ]
    );

    expect(
      screen.getByRole('region', { name: 'Homepage stories' })
    ).toHaveAttribute('aria-roledescription', 'carousel');

    const firstIndicator = screen.getByRole('button', { name: 'Go to slide 1 of 2' });
    const secondIndicator = screen.getByRole('button', { name: 'Go to slide 2 of 2' });
    const firstSlide = document.getElementById(firstIndicator.getAttribute('aria-controls') ?? '');
    const secondSlide = document.getElementById(secondIndicator.getAttribute('aria-controls') ?? '');

    expect(firstSlide).toHaveAttribute('aria-hidden', 'false');
    expect(secondSlide).toHaveAttribute('aria-hidden', 'true');
    expect(firstIndicator).toHaveAttribute(
      'aria-current',
      'step'
    );
  });

  it('updates slide state and indicator state when navigating', () => {
    renderCarousel(
      {},
      [
        { id: 'slide-1', type: 'CarouselFrame', settings: {}, blocks: [] },
        { id: 'slide-2', type: 'CarouselFrame', settings: {}, blocks: [] },
      ]
    );

    const firstIndicator = screen.getByRole('button', { name: 'Go to slide 1 of 2' });
    const secondIndicator = screen.getByRole('button', { name: 'Go to slide 2 of 2' });

    fireEvent.click(secondIndicator);

    const firstSlide = document.getElementById(firstIndicator.getAttribute('aria-controls') ?? '');
    const secondSlide = document.getElementById(secondIndicator.getAttribute('aria-controls') ?? '');

    expect(firstSlide).toHaveAttribute('aria-hidden', 'true');
    expect(secondSlide).toHaveAttribute('aria-hidden', 'false');
    expect(secondIndicator).toHaveAttribute(
      'aria-current',
      'step'
    );
    expect(screen.getByRole('button', { name: 'Next slide' })).toHaveAttribute(
      'aria-controls',
      expect.stringContaining('slide-1')
    );
  });
});
