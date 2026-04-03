import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/cache', () => ({
  unstable_cache: (fn: any) => fn,
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

vi.mock('next/headers', () => ({
  headers: vi.fn(async () => new Headers()),
}));

vi.mock('@/features/kangur/server/auth-bootstrap', () => ({
  getKangurAuthBootstrapScript: vi.fn(async () => null),
}));

vi.mock('@/shared/lib/security/safe-html', () => ({
  safeHtml: (value: string) => value,
}));

vi.mock('@/features/kangur/ui/KangurSurfaceClassSync', () => ({
  KangurSurfaceClassSync: ({ children }: { children: ReactNode }) => (
    <div data-testid='kangur-surface-sync'>{children}</div>
  ),
}));

vi.mock('@/features/kangur/ui/components/KangurServerShell', () => ({
  KangurServerShell: () => <div data-testid='kangur-server-shell' />,
}));

vi.mock('@/features/kangur/ui/KangurFeatureRouteShellClientBoundary', () => ({
  KangurFeatureRouteShellClientBoundary: () => (
    <div data-testid='kangur-route-shell'>Kangur route shell</div>
  ),
}));

vi.mock('@/features/kangur/server/storefront-appearance', () => ({
  getKangurStorefrontDefaultMode: async () => 'default',
  getKangurStorefrontInitialState: async () => ({
    initialMode: 'default',
    initialThemeSettings: null,
  }),
}));

import KangurLayout from '@/app/(frontend)/kangur/layout';
import KangurAppLayout from '@/app/(frontend)/kangur/(app)/layout';
import {
  CmsStorefrontAppearanceProvider,
  useOptionalCmsStorefrontAppearance,
} from '@/shared/ui/cms-appearance/CmsStorefrontAppearance';

function AppearanceModeProbe(): React.JSX.Element {
  const appearance = useOptionalCmsStorefrontAppearance();

  return <div data-testid='kangur-appearance-mode-probe'>{appearance?.mode ?? 'missing'}</div>;
}

describe('kangur route boundary', () => {
  it('renders nested Kangur routes through the shared surface layout', async () => {
    const layout = await KangurLayout({
      children: <div data-testid='kangur-layout-child'>Child route</div>,
    });

    render(layout);

    expect(screen.getByTestId('kangur-surface-sync')).toBeInTheDocument();
    expect(screen.getByTestId('kangur-layout-child')).toHaveTextContent('Child route');
  });

  it('defaults the Kangur route subtree to light mode even when the parent storefront is dark', async () => {
    const layout = await KangurLayout({ children: <AppearanceModeProbe /> });

    render(
      <CmsStorefrontAppearanceProvider initialMode='dark'>
        {layout}
      </CmsStorefrontAppearanceProvider>
    );

    expect(screen.getByTestId('kangur-appearance-mode-probe')).toHaveTextContent('default');
  });

  it('renders the public Kangur app shell from the dedicated app route-group layout', async () => {
    render(await KangurAppLayout({ children: null }));

    expect(screen.getByTestId('kangur-route-shell')).toHaveTextContent('Kangur route shell');
  });
});
