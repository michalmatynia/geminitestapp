import { describe, expect, it } from 'vitest';

import { buildAdminSectionBreadcrumbItems } from '@/shared/ui/admin-section-breadcrumbs';

describe('buildAdminSectionBreadcrumbItems', () => {
  it('builds the shared Admin -> section -> parent -> current breadcrumb trail', () => {
    expect(
      buildAdminSectionBreadcrumbItems({
        section: { label: 'CMS', href: '/admin/cms' },
        parent: { label: 'Pages', href: '/admin/cms/pages' },
        current: 'Edit',
      })
    ).toEqual([
      { label: 'Admin', href: '/admin' },
      { label: 'CMS', href: '/admin/cms' },
      { label: 'Pages', href: '/admin/cms/pages' },
      { label: 'Edit' },
    ]);
  });
});
