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

  it('routes the Tradera category mapping entry to the Tradera-prefilled mapper page', () => {
    const nav = buildAdminNav({
      onOpenChat: () => undefined,
      onCreatePageClick: () => undefined,
    }) as AdminNavNode[];

    const item = findNavItem(
      nav,
      (entry) =>
        entry.id === 'integrations/marketplaces/tradera/category-mapping' &&
        entry.label === 'Category Mapping' &&
        entry.href === '/admin/integrations/marketplaces/category-mapper?marketplace=tradera'
    );

    expect(item).not.toBeNull();
  });

  it('includes the Tradera parameter mapping entry', () => {
    const nav = buildAdminNav({
      onOpenChat: () => undefined,
      onCreatePageClick: () => undefined,
    }) as AdminNavNode[];

    const item = findNavItem(
      nav,
      (entry) =>
        entry.id === 'integrations/marketplaces/tradera/parameter-mapping' &&
        entry.label === 'Parameter Mapping' &&
        entry.href === '/admin/integrations/marketplaces/tradera/parameter-mapping'
    );

    expect(item).not.toBeNull();
  });

  it('includes the Tradera selector registry entry', () => {
    const nav = buildAdminNav({
      onOpenChat: () => undefined,
      onCreatePageClick: () => undefined,
    }) as AdminNavNode[];

    const item = findNavItem(
      nav,
      (entry) =>
        entry.id === 'integrations/marketplaces/tradera/selectors' &&
        entry.label === 'Selector Registry' &&
        entry.href === '/admin/integrations/marketplaces/tradera/selectors'
    );

    expect(item).not.toBeNull();
  });

  it('includes the dedicated product import page and export-focused Base.com entry', () => {
    const nav = buildAdminNav({
      onOpenChat: () => undefined,
      onCreatePageClick: () => undefined,
    }) as AdminNavNode[];

    const productImportItem = findNavItem(
      nav,
      (entry) =>
        entry.id === 'commerce/products/import' &&
        entry.label === 'Import' &&
        entry.href === '/admin/products/import'
    );
    const baseExportItem = findNavItem(
      nav,
      (entry) =>
        entry.id === 'integrations/aggregators/base-com/import-export' &&
        entry.label === 'Export' &&
        entry.href === '/admin/integrations/aggregators/base-com/import-export'
    );

    expect(productImportItem).not.toBeNull();
    expect(baseExportItem).not.toBeNull();
  });
});
