import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { CmsPageRenderer } from '@/features/cms/components/frontend/CmsPageRenderer';
import type { PageComponentInput } from '@/shared/contracts/cms';

vi.mock('@/features/cms/components/shared/EventEffectsWrapper', () => ({
  EventEffectsWrapper: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/features/cms/components/frontend/CssAnimationWrapper', () => ({
  CssAnimationWrapper: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/features/cms/components/frontend/GsapAnimationWrapper', () => ({
  GsapAnimationWrapper: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

vi.mock('@/features/cms/components/frontend/sections/FrontendHeroSection', () => ({
  FrontendHeroSection: () => <div data-testid='section-hero'>Hero</div>,
}));

vi.mock('@/features/cms/components/frontend/sections/FrontendTextElementSection', () => ({
  FrontendTextElementSection: () => <div data-testid='section-text'>Text</div>,
}));

const createComponent = (overrides: Partial<PageComponentInput>): PageComponentInput =>
  ({
    type: 'Hero',
    order: 0,
    content: {
      zone: 'template',
      settings: {},
      blocks: [],
      sectionId: `section-${overrides.order ?? 0}`,
      parentSectionId: null,
    },
    ...overrides,
  }) as PageComponentInput;

describe('CmsPageRenderer nested sections', () => {
  it('renders nested child sections inside a subtle wrapper', () => {
    const components: PageComponentInput[] = [
      createComponent({
        type: 'Hero',
        order: 0,
        content: {
          zone: 'template',
          settings: {},
          blocks: [],
          sectionId: 'root',
          parentSectionId: null,
        },
      }),
      createComponent({
        type: 'TextElement',
        order: 1,
        content: {
          zone: 'template',
          settings: {},
          blocks: [],
          sectionId: 'child',
          parentSectionId: 'root',
        },
      }),
    ];

    render(<CmsPageRenderer components={components} />);

    expect(screen.getByTestId('section-hero')).toBeInTheDocument();
    const child = screen.getByTestId('section-text');
    expect(child).toBeInTheDocument();
    const nestedWrapper = child.closest('.ml-4');
    expect(nestedWrapper).not.toBeNull();
    expect(nestedWrapper).toHaveClass('ml-4', 'border-l', 'pl-3');
  });

  it('suppresses an entire subtree when the parent section is hidden', () => {
    const components: PageComponentInput[] = [
      createComponent({
        type: 'Hero',
        order: 0,
        content: {
          zone: 'template',
          settings: { isHidden: true },
          blocks: [],
          sectionId: 'root',
          parentSectionId: null,
        },
      }),
      createComponent({
        type: 'TextElement',
        order: 1,
        content: {
          zone: 'template',
          settings: {},
          blocks: [],
          sectionId: 'child',
          parentSectionId: 'root',
        },
      }),
    ];

    render(<CmsPageRenderer components={components} />);

    expect(screen.queryByTestId('section-hero')).not.toBeInTheDocument();
    expect(screen.queryByTestId('section-text')).not.toBeInTheDocument();
  });

  it('does not synthesize legacy section ids when sectionId is missing', () => {
    const components = [
      {
        type: 'Hero',
        order: 0,
        content: {
          zone: 'template',
          settings: {},
          blocks: [],
          sectionId: ' ',
          parentSectionId: null,
        },
      } as unknown as PageComponentInput,
    ];

    const { container } = render(<CmsPageRenderer components={components} />);

    expect(screen.queryByTestId('section-hero')).not.toBeInTheDocument();
    expect(container.querySelector('.cms-page')?.children.length).toBe(0);
  });
});
