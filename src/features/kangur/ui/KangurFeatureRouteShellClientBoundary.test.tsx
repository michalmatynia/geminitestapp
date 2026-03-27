import { render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/features/kangur/ui/KangurFeatureRouteShell', () => ({
  KangurFeatureRouteShell: () => (
    <div data-testid='kangur-feature-route-shell'>Kangur route shell</div>
  ),
}));

import { KangurFeatureRouteShellClientBoundary } from './KangurFeatureRouteShellClientBoundary';

describe('KangurFeatureRouteShellClientBoundary', () => {
  it('renders nothing until the route shell module resolves', async () => {
    render(<KangurFeatureRouteShellClientBoundary />);

    expect(screen.queryByTestId('kangur-feature-route-shell')).not.toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByTestId('kangur-feature-route-shell')).toBeInTheDocument();
    });
  });
});
