/**
 * @vitest-environment jsdom
 */

import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { usePathnameMock, frontendPublicOwnerKangurShellMock } = vi.hoisted(() => ({
  usePathnameMock: vi.fn<() => string | null>(),
  frontendPublicOwnerKangurShellMock: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  usePathname: usePathnameMock,
  redirect: vi.fn(),
  permanentRedirect: vi.fn(),
  notFound: vi.fn(),
}));

vi.mock('@/features/kangur/ui/FrontendPublicOwnerKangurShell', () => ({
  FrontendPublicOwnerKangurShell: ({
    embedded,
    initialMode,
    initialThemeSettings,
  }: {
    embedded?: boolean;
    initialMode?: string;
    initialThemeSettings?: Record<string, unknown>;
  }) => {
    frontendPublicOwnerKangurShellMock({ embedded, initialMode, initialThemeSettings });
    return <div data-testid='kangur-feature-route-shell'>Kangur route shell</div>;
  },
}));

import FrontendPublicOwnerShell from './_components/FrontendPublicOwnerShell';

describe('FrontendPublicOwnerShell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    usePathnameMock.mockReturnValue('/');
  });

  it('renders the persistent Kangur route shell for root-owned public routes', async () => {
    usePathnameMock.mockReturnValue('/lessons');

    render(
      <FrontendPublicOwnerShell publicOwner='kangur'>
        <div data-testid='frontend-children'>children</div>
      </FrontendPublicOwnerShell>
    );

    expect(await screen.findByTestId('kangur-feature-route-shell')).toBeInTheDocument();
    expect(screen.queryByTestId('frontend-children')).not.toBeInTheDocument();
    await waitFor(() => {
      expect(frontendPublicOwnerKangurShellMock).toHaveBeenCalledWith({
        embedded: false,
        initialMode: undefined,
        initialThemeSettings: undefined,
      });
    });
  });

  it('keeps the home route embedded without forcing body scroll lock when Kangur owns the root', async () => {
    render(
      <FrontendPublicOwnerShell publicOwner='kangur'>
        <div data-testid='frontend-children'>children</div>
      </FrontendPublicOwnerShell>
    );

    expect(await screen.findByTestId('kangur-feature-route-shell')).toBeInTheDocument();
    await waitFor(() => {
      expect(frontendPublicOwnerKangurShellMock).toHaveBeenCalledWith({
        embedded: true,
        initialMode: undefined,
        initialThemeSettings: undefined,
      });
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
    expect(frontendPublicOwnerKangurShellMock).not.toHaveBeenCalled();
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
    expect(frontendPublicOwnerKangurShellMock).not.toHaveBeenCalled();
  });
});
