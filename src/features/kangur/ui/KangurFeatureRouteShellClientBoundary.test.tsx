/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/features/kangur/ui/useKangurStorefrontAppearance', () => ({
  useKangurStorefrontAppearance: vi.fn(() => ({
    theme: { backgroundColor: '#f1ecf4' },
  })),
}));

vi.mock('@/features/kangur/ui/KangurFeatureRouteShell', async () => {
  const { useKangurStorefrontAppearance } = await import(
    '@/features/kangur/ui/useKangurStorefrontAppearance'
  );

  return {
    KangurFeatureRouteShell: () => {
      const appearance = useKangurStorefrontAppearance();

      return (
        <div
          data-testid='kangur-feature-route-shell'
          data-background={appearance.theme.backgroundColor}
        >
          Kangur route shell
        </div>
      );
    },
  };
});

import { useKangurStorefrontAppearance } from '@/features/kangur/ui/useKangurStorefrontAppearance';

describe('KangurFeatureRouteShellClientBoundary', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('renders nothing until the route shell module resolves', async () => {
    const { KangurFeatureRouteShellClientBoundary } = await import(
      './KangurFeatureRouteShellClientBoundary'
    );

    render(<KangurFeatureRouteShellClientBoundary />);

    expect(screen.queryByTestId('kangur-feature-route-shell')).not.toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId('kangur-feature-route-shell')).toBeInTheDocument();
    });
  });

  it('inherits the parent storefront appearance snapshot instead of resetting it', async () => {
    const { KangurFeatureRouteShellClientBoundary } = await import(
      './KangurFeatureRouteShellClientBoundary'
    );
    
    (useKangurStorefrontAppearance as any).mockReturnValue({
      theme: { backgroundColor: '#123456' },
    });

    render(<KangurFeatureRouteShellClientBoundary />);

    await waitFor(() => {
      const element = screen.getByTestId('kangur-feature-route-shell');
      expect(element).toHaveAttribute('data-background', '#123456');
    });
  });
});
