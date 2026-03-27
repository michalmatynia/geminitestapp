/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

const { docsEnhancerPropsMock } = vi.hoisted(() => ({
  docsEnhancerPropsMock: vi.fn(),
}));

vi.mock('@/features/kangur/ui/components/LazyKangurDocsTooltipEnhancer', () => ({
  LazyKangurDocsTooltipEnhancer: (props: unknown) => {
    docsEnhancerPropsMock(props);
    return <div data-testid='mock-kangur-docs-tooltip-enhancer' />;
  },
}));

vi.mock('@/features/kangur/ui/design/primitives', () => ({
  KangurPageShell: ({ children }: { children: React.ReactNode }) => (
    <div data-testid='mock-kangur-page-shell'>{children}</div>
  ),
  KangurPageContainer: ({ children }: { children: React.ReactNode }) => (
    <div data-testid='mock-kangur-page-container'>{children}</div>
  ),
}));

import { KangurStandardPageLayout } from '@/features/kangur/ui/components/KangurStandardPageLayout';

describe('KangurStandardPageLayout', () => {
  it('does not mount the docs enhancer when docsRootId is missing', () => {
    docsEnhancerPropsMock.mockClear();

    render(
      <KangurStandardPageLayout>
        <div>Content</div>
      </KangurStandardPageLayout>
    );

    expect(screen.queryByTestId('mock-kangur-docs-tooltip-enhancer')).not.toBeInTheDocument();
    expect(docsEnhancerPropsMock).not.toHaveBeenCalled();
    expect(screen.getByText('Content')).toBeInTheDocument();
  });

  it('mounts the lazy docs enhancer only when docsRootId is provided', () => {
    docsEnhancerPropsMock.mockClear();

    render(
      <KangurStandardPageLayout docsRootId='kangur-lessons-page' docsTooltipsEnabled={false}>
        <div>Content</div>
      </KangurStandardPageLayout>
    );

    expect(screen.getByTestId('mock-kangur-docs-tooltip-enhancer')).toBeInTheDocument();
    expect(docsEnhancerPropsMock).toHaveBeenCalledWith({
      enabled: false,
      rootId: 'kangur-lessons-page',
    });
  });
});
