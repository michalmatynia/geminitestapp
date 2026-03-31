/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { shellPropsSpy } = vi.hoisted(() => ({
  shellPropsSpy: vi.fn(),
}));

const { requireAccessibleKangurSlugRouteMock } = vi.hoisted(() => ({
  requireAccessibleKangurSlugRouteMock: vi.fn(async () => undefined),
}));

vi.mock('@/features/kangur/public', () => ({
  AdminKangurPageShell: (props: { slug?: string[] }) => {
    shellPropsSpy(props);
    return <div data-testid='admin-kangur-shell' />;
  },
}));

vi.mock('@/features/kangur/server', () => ({
  requireAccessibleKangurSlugRoute: requireAccessibleKangurSlugRouteMock,
}));

import AdminKangurPage from '@/app/(admin)/admin/kangur/page';
import AdminKangurSlugPage from '@/app/(admin)/admin/kangur/[...slug]/page';

describe('admin kangur routes', () => {
  beforeEach(() => {
    shellPropsSpy.mockReset();
    requireAccessibleKangurSlugRouteMock.mockReset();
  });

  it('renders /admin/kangur with an empty slug', () => {
    render(AdminKangurPage());

    expect(screen.getByTestId('admin-kangur-shell')).toBeInTheDocument();
    expect(shellPropsSpy).toHaveBeenCalledWith({ slug: [] });
  });

  it('renders /admin/kangur/* with provided slug segments', async () => {
    const element = await AdminKangurSlugPage({
      params: Promise.resolve({ slug: ['lessons'] }),
    });

    render(element);

    expect(screen.getByTestId('admin-kangur-shell')).toBeInTheDocument();
    expect(requireAccessibleKangurSlugRouteMock).toHaveBeenCalledWith(['lessons']);
    expect(shellPropsSpy).toHaveBeenCalledWith({ slug: ['lessons'] });
  });
});
