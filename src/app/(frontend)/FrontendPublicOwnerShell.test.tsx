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
}));

vi.mock('@/features/kangur/ui/KangurFeatureRouteShell', () => ({
  KangurFeatureRouteShell: ({
    basePath,
    embedded,
  }: {
    basePath?: string;
    embedded?: boolean;
  }) => {
    kangurFeatureRouteShellMock({ basePath, embedded });
    return <div data-testid='kangur-feature-route-shell'>Kangur route shell</div>;
  },
}));

import FrontendPublicOwnerShell from '@/shared/components/FrontendPublicOwnerShell';

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
    });
  });

  it('keeps the home route embedded when Kangur owns the root', () => {
    render(
      <FrontendPublicOwnerShell publicOwner='kangur'>
        <div data-testid='frontend-children'>children</div>
      </FrontendPublicOwnerShell>
    );

    expect(screen.getByTestId('kangur-feature-route-shell')).toBeInTheDocument();
    expect(kangurFeatureRouteShellMock).toHaveBeenCalledWith({
      basePath: '/',
      embedded: true,
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
