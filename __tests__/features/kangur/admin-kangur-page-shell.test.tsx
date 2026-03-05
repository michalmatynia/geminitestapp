/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { kangurPageSpy } = vi.hoisted(() => ({
  kangurPageSpy: vi.fn(),
}));

vi.mock('@/features/kangur/admin/KangurAdminMenuToggle', () => ({
  KangurAdminMenuToggle: () => <div data-testid='kangur-admin-menu-toggle' />,
}));

vi.mock('@/features/kangur/ui/KangurFeaturePage', () => ({
  KangurFeaturePage: (props: { slug?: string[]; basePath?: string }) => {
    kangurPageSpy(props);
    return <div data-testid='kangur-feature-page' />;
  },
}));

import { AdminKangurPageShell } from '@/features/kangur/admin/AdminKangurPageShell';

describe('AdminKangurPageShell', () => {
  beforeEach(() => {
    kangurPageSpy.mockReset();
  });

  it('renders menu toggle and configures KangurFeaturePage for admin base path', () => {
    render(<AdminKangurPageShell slug={['parent-dashboard']} />);

    expect(screen.getByTestId('kangur-admin-menu-toggle')).toBeInTheDocument();
    expect(screen.getByTestId('kangur-feature-page')).toBeInTheDocument();
    expect(kangurPageSpy).toHaveBeenCalledWith({
      slug: ['parent-dashboard'],
      basePath: '/admin/kangur',
    });
  });
});
