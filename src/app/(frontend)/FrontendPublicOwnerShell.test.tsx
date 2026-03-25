/**
 * @vitest-environment jsdom
 */

import { render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
  usePathnameMock,
  frontendPublicOwnerKangurShellMock,
  kangurFeatureAppPreloadMock,
  kangurGamePreloadMock,
  kangurLessonsPreloadMock,
  prefetchKangurAuthMock,
} = vi.hoisted(() => ({
  usePathnameMock: vi.fn<() => string | null>(),
  frontendPublicOwnerKangurShellMock: vi.fn(),
  kangurFeatureAppPreloadMock: vi.fn(),
  kangurGamePreloadMock: vi.fn(),
  kangurLessonsPreloadMock: vi.fn(),
  prefetchKangurAuthMock: vi.fn(),
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

vi.mock('@/features/kangur/ui/KangurFeatureApp', () => {
  kangurFeatureAppPreloadMock();
  return {
    KangurFeatureApp: () => null,
  };
});

vi.mock('@/features/kangur/ui/pages/Game', () => {
  kangurGamePreloadMock();
  return {
    default: () => null,
  };
});

vi.mock('@/features/kangur/ui/pages/Lessons', () => {
  kangurLessonsPreloadMock();
  return {
    default: () => null,
  };
});

vi.mock('@/features/kangur/services/kangur-auth-prefetch', () => ({
  prefetchKangurAuth: prefetchKangurAuthMock,
}));

import FrontendPublicOwnerShell from './_components/FrontendPublicOwnerShell';

describe('FrontendPublicOwnerShell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState({}, '', '/');
    usePathnameMock.mockReturnValue('/');
  });

  afterEach(() => {
    vi.unstubAllEnvs();
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

  it('falls back to the real browser pathname when the router pathname is transiently unavailable on root-owned routes', async () => {
    window.history.replaceState({}, '', '/en/lessons');
    usePathnameMock.mockReturnValue(null);

    render(
      <FrontendPublicOwnerShell publicOwner='kangur'>
        <div data-testid='frontend-children'>children</div>
      </FrontendPublicOwnerShell>
    );

    expect(await screen.findByTestId('kangur-feature-route-shell')).toBeInTheDocument();
    await waitFor(() => {
      expect(frontendPublicOwnerKangurShellMock).toHaveBeenCalledWith({
        embedded: false,
        initialMode: undefined,
        initialThemeSettings: undefined,
      });
    });
  });

  it('falls back to the real browser pathname when the router pathname is transiently unavailable on localized Kangur alias routes', () => {
    window.history.replaceState({}, '', '/en/kangur/game?quickStart=training');
    usePathnameMock.mockReturnValue(null);

    render(
      <FrontendPublicOwnerShell publicOwner='kangur'>
        <div data-testid='frontend-children'>children</div>
      </FrontendPublicOwnerShell>
    );

    expect(screen.getByTestId('frontend-children')).toBeInTheDocument();
    expect(screen.queryByTestId('kangur-feature-route-shell')).not.toBeInTheDocument();
    expect(frontendPublicOwnerKangurShellMock).not.toHaveBeenCalled();
  });

  it('warms the lessons shell dependencies from the embedded home route', async () => {
    vi.stubEnv('NODE_ENV', 'development');

    render(
      <FrontendPublicOwnerShell publicOwner='kangur'>
        <div data-testid='frontend-children'>children</div>
      </FrontendPublicOwnerShell>
    );

    await waitFor(() => {
      expect(kangurFeatureAppPreloadMock).toHaveBeenCalledTimes(1);
      expect(prefetchKangurAuthMock).toHaveBeenCalledTimes(1);
      expect(kangurGamePreloadMock).toHaveBeenCalledTimes(1);
      expect(kangurLessonsPreloadMock).toHaveBeenCalledTimes(1);
    });
  });

  it('skips the lessons page preload when Kangur is already on a different standalone route', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    usePathnameMock.mockReturnValue('/tests');

    render(
      <FrontendPublicOwnerShell publicOwner='kangur'>
        <div data-testid='frontend-children'>children</div>
      </FrontendPublicOwnerShell>
    );

    await waitFor(() => {
      expect(prefetchKangurAuthMock).toHaveBeenCalledTimes(1);
    });
    expect(kangurLessonsPreloadMock).not.toHaveBeenCalled();
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
