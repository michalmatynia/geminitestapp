import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/features/kangur/ui/KangurSurfaceClassSync', () => ({
  KangurSurfaceClassSync: ({ children }: { children: ReactNode }) => (
    <div data-testid='kangur-surface-sync'>{children}</div>
  ),
}));

vi.mock('@/features/kangur/ui/KangurFeatureRouteShell', () => ({
  KangurFeatureRouteShell: () => <div data-testid='kangur-route-shell'>Kangur route shell</div>,
}));

import KangurLayout from '@/app/(frontend)/kangur/layout';
import KangurAppLayout from '@/app/(frontend)/kangur/(app)/layout';

describe('kangur route boundary', () => {
  it('renders nested Kangur routes through the shared surface layout', () => {
    render(KangurLayout({ children: <div data-testid='kangur-layout-child'>Child route</div> }));

    expect(screen.getByTestId('kangur-surface-sync')).toBeInTheDocument();
    expect(screen.getByTestId('kangur-layout-child')).toHaveTextContent('Child route');
  });

  it('renders the public Kangur app shell from the dedicated app route-group layout', () => {
    render(KangurAppLayout({ children: null }));

    expect(screen.getByTestId('kangur-route-shell')).toHaveTextContent('Kangur route shell');
  });
});
