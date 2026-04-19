/**
 * @vitest-environment jsdom
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/features/kangur/ui/useKangurStorefrontAppearance', () => ({
  useKangurStorefrontAppearance: vi.fn(() => ({
    theme: { backgroundColor: '#f1ecf4' },
  })),
}));

vi.mock('next/dynamic', async () => {
  const appearanceModule = await import(
    '@/features/kangur/ui/useKangurStorefrontAppearance'
  );

  return {
    default: () => function MockKangurFeatureRouteShell() {
      const appearance = appearanceModule.useKangurStorefrontAppearance();

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
import { KangurFeatureRouteShellClientBoundary } from './KangurFeatureRouteShellClientBoundary';

describe('KangurFeatureRouteShellClientBoundary', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the route shell immediately', () => {
    render(<KangurFeatureRouteShellClientBoundary />);

    expect(screen.getByTestId('kangur-feature-route-shell')).toBeInTheDocument();
  });

  it('inherits the parent storefront appearance snapshot instead of resetting it', () => {
    (useKangurStorefrontAppearance as any).mockReturnValue({
      theme: { backgroundColor: '#123456' },
    });

    render(<KangurFeatureRouteShellClientBoundary />);

    const element = screen.getByTestId('kangur-feature-route-shell');
    expect(element).toHaveAttribute('data-background', '#123456');
  });
});
