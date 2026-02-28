import { render, screen } from '@testing-library/react';
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
  it('should render nothing when no components are provided', () => {
    const { container } = render(<CmsPageRenderer components={[]} />);
    expect(container.querySelector('.cms-page')).toBeInTheDocument();
    expect(container.querySelectorAll('.cms-page > div')).toHaveLength(0);
  });

  it('should render sections in zone order (header -> template -> footer)', () => {
    const components = [
      {
        type: 'RichText',
        content: { zone: 'template', settings: {}, blocks: [] },
      } as unknown as PageComponent,
      {
        type: 'Hero',
        content: { zone: 'header', settings: {}, blocks: [] },
      } as unknown as PageComponent,
      {
        type: 'Newsletter',
        content: { zone: 'footer', settings: {}, blocks: [] },
      } as unknown as PageComponent,
    ];

    render(<CmsPageRenderer components={components} />);

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
      {
        type: 'Grid',
        content: { settings: {}, blocks: [] },
      } as unknown as PageComponent,
    ];

    render(<CmsPageRenderer components={components} />);
    expect(screen.getByTestId('section-grid')).toBeInTheDocument();
  });

  it('should handle invalid zone by defaulting to \'template\'', () => {
    const components = [
      {
        type: 'Grid',
        content: { zone: 'invalid-zone', settings: {}, blocks: [] },
      } as unknown as PageComponent,
    ];

    render(<CmsPageRenderer components={components} />);
    expect(screen.getByTestId('section-grid')).toBeInTheDocument();
  });

  it('should treat string visibility flags consistently', () => {
    const components = [
      {
        type: 'Hero',
        content: { zone: 'template', settings: { isHidden: 'false' }, blocks: [] },
      } as unknown as PageComponent,
      {
        type: 'RichText',
        content: { zone: 'template', settings: { isHidden: 'true' }, blocks: [] },
      } as unknown as PageComponent,
    ];

    render(<CmsPageRenderer components={components} />);
    expect(screen.getByTestId('section-hero')).toBeInTheDocument();
    expect(screen.queryByTestId('section-rich-text')).not.toBeInTheDocument();
  });

  it('should render multiple sections in the same zone in their original order', () => {
    const components = [
      {
        type: 'Hero',
        content: { zone: 'template', settings: { id: 1 }, blocks: [] },
      } as unknown as PageComponent,
      {
        type: 'RichText',
        content: { zone: 'template', settings: { id: 2 }, blocks: [] },
      } as unknown as PageComponent,
    ];

    render(<CmsPageRenderer components={components} />);
    const sections = screen.getAllByTestId(/^section-/);
    expect(sections[0]).toHaveAttribute('data-testid', 'section-hero');
    expect(sections[1]).toHaveAttribute('data-testid', 'section-rich-text');
  });
});
