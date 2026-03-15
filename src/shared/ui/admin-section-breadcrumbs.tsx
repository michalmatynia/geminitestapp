export type AdminBreadcrumbNode = {
  label: string;
  href?: string;
};

export function buildAdminSectionBreadcrumbItems({
  section,
  current,
  parent,
}: AdminSectionBreadcrumbsConfig): AdminBreadcrumbNode[] {
  return [
    { label: 'Admin', href: '/admin' },
    section,
    ...(parent ? [parent] : []),
    { label: current },
  ];
}
export type AdminSectionBreadcrumbsConfig = {
  section: AdminBreadcrumbNode;
  current: string;
  parent?: AdminBreadcrumbNode;
};
