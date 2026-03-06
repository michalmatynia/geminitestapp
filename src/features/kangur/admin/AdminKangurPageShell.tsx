'use client';

import { KangurFeaturePage } from '@/features/kangur/ui/KangurFeaturePage';

import { KangurAdminMenuToggle } from './KangurAdminMenuToggle';

const KANGUR_ADMIN_BASE_PATH = '/admin/kangur';

export function AdminKangurPageShell({ slug = [] }: { slug?: string[] }): React.JSX.Element {
  return (
    <>
      <KangurAdminMenuToggle />
      <KangurFeaturePage slug={slug} basePath={KANGUR_ADMIN_BASE_PATH} />
    </>
  );
}
