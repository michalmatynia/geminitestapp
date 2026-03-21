/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { usePathnameMock, kangurFeatureRouteShellMock } = vi.hoisted(() => ({
  usePathnameMock: vi.fn<() => string | null>(),
  kangurFeatureRouteShellMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  usePathname: usePathnameMock,
  redirect: vi.fn(),
  permanentRedirect: vi.fn(),
  notFound: vi.fn(),
}));

vi.mock('@/features/kangur/ui/KangurFeatureRouteShell', () => ({
  KangurFeatureRouteShell: ({
    basePath,
    embedded,
    forceBodyScrollLock,
  }: {
    basePath?: string;
    embedded?: boolean;
    forceBodyScrollLock?: boolean;
  }) => {
    kangurFeatureRouteShellMock({ basePath, embedded, forceBodyScrollLock });
    return <div data-testid='kangur-feature-route-shell'>Kangur route shell</div>;
  },
}));

import FrontendPublicOwnerShell from './_components/FrontendPublicOwnerShell';

describe('FrontendPublicOwnerShell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usePathnameMock.mockReturnValue('/');
  });

  it('renders the persistent Kangur route shell for root-owned public routes', () => {
    usePathnameMock.mockReturnValue('/lessons');

    render(
      <FrontendPublicOwnerShell publicOwner='kangur'>
        <div data-testid='frontend-children'>children</div>
      </FrontendPublicOwnerShell>
    );

    expect(screen.getByTestId('kangur-feature-route-shell')).toBeInTheDocument();
    expect(screen.queryByTestId('frontend-children')).not.toBeInTheDocument();
    expect(kangurFeatureRouteShellMock).toHaveBeenCalledWith({
      basePath: '/',
      embedded: false,
      forceBodyScrollLock: false,
    });
  });

  it('keeps the home route embedded without forcing body scroll lock when Kangur owns the root', () => {
    render(
      <FrontendPublicOwnerShell publicOwner='kangur'>
        <div data-testid='frontend-children'>children</div>
      </FrontendPublicOwnerShell>
    );

    expect(screen.getByTestId('kangur-feature-route-shell')).toBeInTheDocument();
    expect(kangurFeatureRouteShellMock).toHaveBeenCalledWith({
      basePath: '/',
      embedded: true,
      forceBodyScrollLock: false,
    });
  });

  it('lets the explicit /kangur alias route render its children', () => {
    usePathnameMock.mockReturnValue('/kangur/lessons');

    render(
      <FrontendPublicOwnerShell publicOwner='kangur'>
        <div data-testid='frontend-children'>children</div>
      </FrontendPublicOwnerShell>
    );

    expect(screen.getByTestId('frontend-children')).toBeInTheDocument();
    expect(screen.queryByTestId('kangur-feature-route-shell')).not.toBeInTheDocument();
    expect(kangurFeatureRouteShellMock).not.toHaveBeenCalled();
  });

  it('passes through the regular frontend children when CMS owns the public frontend', () => {
    usePathnameMock.mockReturnValue('/lessons');

    render(
      <FrontendPublicOwnerShell publicOwner='cms'>
        <div data-testid='frontend-children'>children</div>
      </FrontendPublicOwnerShell>
    );

    expect(screen.getByTestId('frontend-children')).toBeInTheDocument();
    expect(screen.queryByTestId('kangur-feature-route-shell')).not.toBeInTheDocument();
    expect(kangurFeatureRouteShellMock).not.toHaveBeenCalled();
  });
});
