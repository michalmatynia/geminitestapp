/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { frontendRouteLoadingFallbackMock } = vi.hoisted(() => ({
  frontendRouteLoadingFallbackMock: vi.fn(() => (
    <div data-testid='frontend-route-loading-fallback-probe' />
  )),
}));

vi.mock('@/features/kangur/public', () => ({
  FrontendRouteLoadingFallback: frontendRouteLoadingFallbackMock,
}));

describe('frontend loading route wrappers', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('renders the shared loading fallback for the root frontend wrappers', async () => {
    const { default: FrontendLoading } = await import('@/app/(frontend)/loading');
    const { default: KangurLoading } = await import('@/app/(frontend)/kangur/loading');

    render(
      <>
        <FrontendLoading />
        <KangurLoading />
      </>
    );

    expect(screen.getAllByTestId('frontend-route-loading-fallback-probe')).toHaveLength(2);
    expect(frontendRouteLoadingFallbackMock).toHaveBeenCalledTimes(2);
  });

  it('renders the shared loading fallback for the localized frontend wrappers', async () => {
    const { default: LocalizedFrontendLoading } = await import('@/app/[locale]/(frontend)/loading');
    const { default: LocalizedKangurLoading } = await import(
      '@/app/[locale]/(frontend)/kangur/loading'
    );

    render(
      <>
        <LocalizedFrontendLoading />
        <LocalizedKangurLoading />
      </>
    );

    expect(screen.getAllByTestId('frontend-route-loading-fallback-probe')).toHaveLength(2);
    expect(frontendRouteLoadingFallbackMock).toHaveBeenCalledTimes(2);
  });
});
