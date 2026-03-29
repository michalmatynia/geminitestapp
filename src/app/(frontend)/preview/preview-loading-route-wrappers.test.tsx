/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { frontendCmsRouteLoadingFallbackMock } = vi.hoisted(() => ({
  frontendCmsRouteLoadingFallbackMock: vi.fn(
    ({ pathname }: { pathname?: string }) => (
      <div data-testid='frontend-cms-route-loading-fallback-probe'>{pathname ?? 'unknown'}</div>
    )
  ),
}));

vi.mock('@/features/kangur/ui/components/FrontendCmsRouteLoadingFallback', () => ({
  FrontendCmsRouteLoadingFallback: frontendCmsRouteLoadingFallbackMock,
}));

describe('preview loading route wrappers', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('renders the dedicated preview page loading fallback for localized and non-localized routes', async () => {
    const { default: PreviewLoading } = await import('@/app/(frontend)/preview/[id]/loading');
    const { default: LocalizedPreviewLoading } = await import(
      '@/app/[locale]/(frontend)/preview/[id]/loading'
    );

    render(
      <>
        <PreviewLoading />
        <LocalizedPreviewLoading />
      </>
    );

    expect(screen.getAllByTestId('frontend-cms-route-loading-fallback-probe')).toHaveLength(2);
    expect(frontendCmsRouteLoadingFallbackMock.mock.calls.map(([props]) => props)).toEqual([
      { pathname: null, variant: 'preview' },
      { pathname: null, variant: 'preview' },
    ]);
  });

  it('renders the dedicated preview runtime loading fallback for localized and non-localized routes', async () => {
    const { default: PreviewRuntimeLoading } = await import(
      '@/app/(frontend)/preview/foldertree-shell-runtime/loading'
    );
    const { default: LocalizedPreviewRuntimeLoading } = await import(
      '@/app/[locale]/(frontend)/preview/foldertree-shell-runtime/loading'
    );

    render(
      <>
        <PreviewRuntimeLoading />
        <LocalizedPreviewRuntimeLoading />
      </>
    );

    expect(screen.getAllByTestId('frontend-cms-route-loading-fallback-probe')).toHaveLength(2);
    expect(frontendCmsRouteLoadingFallbackMock.mock.calls.map(([props]) => props)).toEqual([
      { pathname: null, variant: 'preview-runtime' },
      { pathname: null, variant: 'preview-runtime' },
    ]);
  });
});
