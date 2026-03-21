/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@/__tests__/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { kangurPageSpy } = vi.hoisted(() => ({
  kangurPageSpy: vi.fn(),
}));

const {
  kangurFeaturePageProps,
  KangurFeaturePageMock,
  resolveKangurFeaturePageRouteMock,
} = vi.hoisted(() => {
  const featurePageState = {
    slug: [] as string[],
    basePath: '/admin/kangur',
    embedded: false,
  };

  const resolveKangurFeaturePageRouteMock = (
    slug: string[] = [],
    basePath = '/admin/kangur'
  ): {
    normalizedBasePath: string;
    pageKey: string | null;
    requestedPath: string;
  } => {
    const activeSlug = slug[0] ?? null;
    featurePageState.slug = slug;
    featurePageState.basePath = basePath;
    featurePageState.embedded = true;

    const requestedPath = [basePath, ...(activeSlug ? [activeSlug] : [])].join('/');
    return {
      normalizedBasePath: basePath,
      pageKey: activeSlug ? activeSlug[0]?.toUpperCase() + activeSlug.slice(1) : null,
      requestedPath: requestedPath || basePath,
    };
  };

  const KangurFeaturePageMock = (props: {
    slug?: string[];
    basePath?: string;
    embedded?: boolean;
  }) => {
    featurePageState.slug = props.slug ?? [];
    featurePageState.basePath = props.basePath ?? '/admin/kangur';
    featurePageState.embedded = props.embedded ?? false;
    kangurPageSpy(props);
    return <div data-testid='kangur-feature-page' />;
  };

  return {
    kangurFeaturePageProps: featurePageState,
    KangurFeaturePageMock,
    resolveKangurFeaturePageRouteMock,
  };
});

vi.mock('@/features/kangur/admin/KangurAdminMenuToggle', () => ({
  KangurAdminMenuToggle: () => <div data-testid='kangur-admin-menu-toggle' />,
}));

vi.mock('@/features/kangur/config/routing', async () => {
  const actual = await vi.importActual<typeof import('@/features/kangur/config/routing')>(
    '@/features/kangur/config/routing'
  );

  return {
    ...actual,
    resolveKangurFeaturePageRoute: resolveKangurFeaturePageRouteMock,
  };
});

vi.mock('@/features/kangur/ui/KangurFeaturePage', () => ({
  KangurFeaturePageShell: () => <KangurFeaturePageMock {...kangurFeaturePageProps} />,
  KangurFeaturePage: KangurFeaturePageMock,
}));

import { AdminKangurPageShell } from '@/features/kangur/admin/AdminKangurPageShell';

describe('AdminKangurPageShell', () => {
  beforeEach(() => {
    kangurPageSpy.mockReset();
    kangurFeaturePageProps.slug = [];
    kangurFeaturePageProps.basePath = '/admin/kangur';
    kangurFeaturePageProps.embedded = false;
  });

  it('renders menu toggle and configures KangurFeaturePage for admin base path', async () => {
    render(<AdminKangurPageShell slug={['parent-dashboard']} />);

    expect(screen.getByTestId('kangur-admin-menu-toggle')).toBeInTheDocument();
    expect(await screen.findByTestId('kangur-feature-page')).toBeInTheDocument();
    expect(kangurPageSpy).toHaveBeenCalledWith({
      slug: ['parent-dashboard'],
      basePath: '/admin/kangur',
      embedded: true,
    });
  });
});
