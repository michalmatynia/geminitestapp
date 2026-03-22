import { render, screen, waitFor } from '@testing-library/react';
import { vi } from 'vitest';

import { CmsPageRenderer } from '@/features/cms/components/frontend/CmsPageRenderer';
import type { PageComponent } from '@/shared/contracts/cms';

// Mock the section components
vi.mock('@/features/cms/components/frontend/sections/FrontendHeroSection', () => ({
  FrontendHeroSection: () => <div data-testid='section-hero'>Hero</div>,
}));
vi.mock('@/features/cms/components/frontend/sections/FrontendRichTextSection', () => ({
  FrontendRichTextSection: () => <div data-testid='section-rich-text'>RichText</div>,
}));
vi.mock('@/features/cms/components/frontend/sections/FrontendGridSection', () => ({
  FrontendGridSection: () => <div data-testid='section-grid'>Grid</div>,
}));
vi.mock('@/features/cms/components/frontend/sections/FrontendNewsletterSection', () => ({
  FrontendNewsletterSection: () => <div data-testid='section-newsletter'>Newsletter</div>,
}));

// Mock GSAP wrapper to just render children
vi.mock('@/features/cms/components/frontend/GsapAnimationWrapper', () => ({
  GsapAnimationWrapper: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

describe('CmsPageRenderer Component', () => {
  const buildComponent = ({
    type,
    zone = 'template',
    sectionId,
    settings = {},
  }: {
    type: string;
    zone?: unknown;
    sectionId: string;
    settings?: Record<string, unknown>;
  }): PageComponent =>
    ({
      type,
      order: 0,
      content: {
        zone,
        settings,
        blocks: [],
        sectionId,
        parentSectionId: null,
      },
    }) as unknown as PageComponent;

  it('should render nothing when no components are provided', () => {
    const { container } = render(<CmsPageRenderer components={[]} />);
    expect(container.querySelector('.cms-page')).toBeInTheDocument();
    expect(container.querySelectorAll('.cms-page > div')).toHaveLength(0);
  });

  it('should render sections in zone order (header -> template -> footer)', async () => {
    const components = [
      buildComponent({ type: 'RichText', zone: 'template', sectionId: 's-template' }),
      buildComponent({ type: 'Hero', zone: 'header', sectionId: 's-header' }),
      buildComponent({ type: 'Newsletter', zone: 'footer', sectionId: 's-footer' }),
    ];

    render(<CmsPageRenderer components={components} />);

    await waitFor(() => {
      expect(screen.getAllByTestId(/^section-/)).toHaveLength(3);
    });

    const sections = screen.getAllByTestId(/^section-/);
    expect(sections).toHaveLength(3);

    // Header comes first
    expect(sections[0]).toHaveAttribute('data-testid', 'section-hero');
    // Template second
    expect(sections[1]).toHaveAttribute('data-testid', 'section-rich-text');
    // Footer third
    expect(sections[2]).toHaveAttribute('data-testid', 'section-newsletter');
  });

  it('should handle missing zone by defaulting to \'template\'', () => {
    const components = [
      buildComponent({ type: 'Grid', zone: undefined, sectionId: 's-grid-missing-zone' }),
    ];

    render(<CmsPageRenderer components={components} />);
    expect(screen.getByTestId('section-grid')).toBeInTheDocument();
  });

  it('should handle invalid zone by defaulting to \'template\'', () => {
    const components = [
      buildComponent({ type: 'Grid', zone: 'invalid-zone', sectionId: 's-grid-invalid-zone' }),
    ];

    render(<CmsPageRenderer components={components} />);
    expect(screen.getByTestId('section-grid')).toBeInTheDocument();
  });

  it('should hide sections only when isHidden is strict boolean true', () => {
    const components = [
      buildComponent({
        type: 'Hero',
        zone: 'template',
        sectionId: 's-visible-hero',
        settings: { isHidden: false },
      }),
      buildComponent({
        type: 'RichText',
        zone: 'template',
        sectionId: 's-hidden-rich-text',
        settings: { isHidden: true },
      }),
    ];

    render(<CmsPageRenderer components={components} />);
    expect(screen.getByTestId('section-hero')).toBeInTheDocument();
    expect(screen.queryByTestId('section-rich-text')).not.toBeInTheDocument();
  });

  it('should render multiple sections in the same zone in their original order', async () => {
    const components = [
      buildComponent({ type: 'Hero', zone: 'template', sectionId: 's-hero', settings: { id: 1 } }),
      buildComponent({
        type: 'RichText',
        zone: 'template',
        sectionId: 's-rich-text',
        settings: { id: 2 },
      }),
    ];

    render(<CmsPageRenderer components={components} />);
    await waitFor(() => {
      expect(screen.getAllByTestId(/^section-/)).toHaveLength(2);
    });

    const sections = screen.getAllByTestId(/^section-/);
    expect(sections[0]).toHaveAttribute('data-testid', 'section-hero');
    expect(sections[1]).toHaveAttribute('data-testid', 'section-rich-text');
  });
});
