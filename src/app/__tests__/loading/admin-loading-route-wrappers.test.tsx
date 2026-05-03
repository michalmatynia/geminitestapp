/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { adminRouteLoadingMock } = vi.hoisted(() => ({
  adminRouteLoadingMock: vi.fn(() => <div data-testid='admin-route-loading-probe' />),
}));

vi.mock('@/features/admin/public', () => ({
  AdminRouteLoading: adminRouteLoadingMock,
}));

describe('admin loading route wrappers', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it('renders the shared admin loading fallback for both admin loading wrappers', async () => {
    const { default: AdminGroupLoading } = await import('@/app/(admin)/loading');
    const { default: AdminSegmentLoading } = await import('@/app/(admin)/admin/loading');
    const { default: AdminKangurLoading } = await import('@/app/(admin)/admin/kangur/loading');
    const { default: AdminCmsLoading } = await import('@/app/(admin)/admin/cms/loading');
    const { default: AdminSettingsLoading } = await import('@/app/(admin)/admin/settings/loading');

    render(
      <>
        <AdminGroupLoading />
        <AdminSegmentLoading />
        <AdminKangurLoading />
        <AdminCmsLoading />
        <AdminSettingsLoading />
      </>
    );

    expect(screen.getAllByTestId('admin-route-loading-probe')).toHaveLength(5);
    expect(adminRouteLoadingMock).toHaveBeenCalledTimes(5);
  });

  it('renders the shared admin loading fallback for hot nested admin subsections', async () => {
    const { default: AdminKangurSocialLoading } = await import(
      '@/app/(admin)/admin/kangur/social/loading'
    );
    const { default: AdminCmsPagesLoading } = await import(
      '@/app/(admin)/admin/cms/pages/loading'
    );
    const { default: AdminAiPathsQueueLoading } = await import(
      '@/app/(admin)/admin/ai-paths/queue/loading'
    );
    const { default: AdminFilemakerPersonsLoading } = await import(
      '@/app/(admin)/admin/filemaker/persons/loading'
    );
    const { default: AdminProductsImportLoading } = await import(
      '@/app/(admin)/admin/products/import/loading'
    );
    const { default: AdminProductsPreferencesLoading } = await import(
      '@/app/(admin)/admin/products/preferences/loading'
    );

    render(
      <>
        <AdminKangurSocialLoading />
        <AdminCmsPagesLoading />
        <AdminAiPathsQueueLoading />
        <AdminFilemakerPersonsLoading />
        <AdminProductsImportLoading />
        <AdminProductsPreferencesLoading />
      </>
    );

    expect(screen.getAllByTestId('admin-route-loading-probe')).toHaveLength(6);
    expect(adminRouteLoadingMock).toHaveBeenCalledTimes(6);
  });
});
