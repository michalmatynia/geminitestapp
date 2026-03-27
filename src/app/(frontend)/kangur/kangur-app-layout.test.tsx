/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/features/kangur/ui/components/KangurServerShell', () => ({
  KangurServerShell: () => <div data-testid='kangur-server-shell' />,
}));

vi.mock('@/features/kangur/ui/KangurFeatureRouteShellClientBoundary', () => ({
  KangurFeatureRouteShellClientBoundary: () => <div data-testid='kangur-route-shell-boundary' />,
}));

describe('kangur app layout', () => {
  it('renders the shared server shell once and keeps route children lightweight', async () => {
    const { default: KangurAppLayout } = await import('@/app/(frontend)/kangur/(app)/layout');

    render(
      <KangurAppLayout>
        <div data-testid='kangur-route-child' />
      </KangurAppLayout>
    );

    expect(screen.getByTestId('kangur-server-shell')).toBeInTheDocument();
    expect(screen.getByTestId('kangur-route-child')).toBeInTheDocument();
    expect(screen.getByTestId('kangur-route-shell-boundary')).toBeInTheDocument();
  });
});
