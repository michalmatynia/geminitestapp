import { describe, expect, it } from 'vitest';

import { buildAdminNav } from '@/features/admin/components/admin-menu-nav';

type AdminNavNode = {
  id: string;
  label: string;
  href?: string;
  children?: AdminNavNode[];
};

const findNavItem = (
  items: AdminNavNode[],
  predicate: (item: AdminNavNode) => boolean
): AdminNavNode | null => {
  for (const item of items) {
    if (predicate(item)) return item;
    if (item.children) {
      const nested = findNavItem(item.children, predicate);
      if (nested) return nested;
    }
  }
  return null;
};

describe('buildAdminNav', () => {
  it('includes the text editors settings entry in the system settings tree', () => {
    const nav = buildAdminNav({
      onOpenChat: () => undefined,
      onCreatePageClick: () => undefined,
    }) as AdminNavNode[];

    const item = findNavItem(
      nav,
      (entry) =>
        entry.id === 'system/settings/text-editors' &&
        entry.label === 'Text Editors' &&
        entry.href === '/admin/settings/text-editors'
    );

    expect(item).not.toBeNull();
  });

  it('includes the programmable playwright marketplace entry', () => {
    const nav = buildAdminNav({
      onOpenChat: () => undefined,
      onCreatePageClick: () => undefined,
    }) as AdminNavNode[];

    const item = findNavItem(
      nav,
      (entry) =>
        entry.id === 'integrations/marketplaces/playwright/script' &&
        entry.label === 'Script Editor' &&
        entry.href === '/admin/integrations/marketplaces/playwright/script'
    );

    expect(item).not.toBeNull();
  });
});
