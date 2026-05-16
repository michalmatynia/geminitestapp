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
        entry.id === 'playwright/programmable/script' &&
        entry.label === 'Script Editor' &&
        entry.href === '/admin/playwright/programmable/script'
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
        entry.href === '/admin/integrations/marketplaces/tradera/category-mapping'
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
    const aggregatorsItem = findNavItem(
      nav,
      (entry) =>
        entry.id === 'integrations/aggregators' &&
        entry.label === 'Aggregators' &&
        entry.href === '/admin/integrations/aggregators/base-com/import-export'
    );
    const baseExportItem = findNavItem(
      nav,
      (entry) =>
        entry.id === 'integrations/aggregators/base-com/import-export' &&
        entry.label === 'Export' &&
        entry.href === '/admin/integrations/aggregators/base-com/import-export'
    );
    const baseCategoryMappingItem = findNavItem(
      nav,
      (entry) =>
        entry.id === 'integrations/aggregators/base-com/category-mapping' &&
        entry.label === 'Category Mapping' &&
        entry.href === '/admin/integrations/aggregators/base-com/category-mapping'
    );

    expect(productImportItem).not.toBeNull();
    expect(aggregatorsItem).not.toBeNull();
    expect(baseExportItem).not.toBeNull();
    expect(baseCategoryMappingItem).not.toBeNull();
  });

  it('includes the Filemaker email client, dashboard, creator, and records entries', () => {
    const nav = buildAdminNav({
      onOpenChat: () => undefined,
      onCreatePageClick: () => undefined,
    }) as AdminNavNode[];

    const emailClientItem = findNavItem(
      nav,
      (entry) =>
        entry.id === 'filemaker/mail-client' &&
        entry.label === 'Email Client' &&
        entry.href === '/admin/filemaker/mail-client'
    );
    const emailDashboardItem = findNavItem(
      nav,
      (entry) =>
        entry.id === 'filemaker/email-dashboard' &&
        entry.label === 'Email Dashboard' &&
        entry.href === '/admin/filemaker/email-dashboard'
    );
    const emailCreatorItem = findNavItem(
      nav,
      (entry) =>
        entry.id === 'filemaker/campaigns/create' &&
        entry.label === 'Email Creator' &&
        entry.href === '/admin/filemaker/campaigns/create'
    );
    const emailCampaignsItem = findNavItem(
      nav,
      (entry) =>
        entry.id === 'filemaker/campaigns' &&
        entry.label === 'Email Campaigns' &&
        entry.href === '/admin/filemaker/campaigns'
    );
    const emailRecordsItem = findNavItem(
      nav,
      (entry) =>
        entry.id === 'filemaker/emails' &&
        entry.label === 'Email Records' &&
        entry.href === '/admin/filemaker/emails'
    );

    expect(emailClientItem).not.toBeNull();
    expect(emailDashboardItem).not.toBeNull();
    expect(emailCreatorItem).not.toBeNull();
    expect(emailCampaignsItem).not.toBeNull();
    expect(emailRecordsItem).not.toBeNull();
  });

  it('includes all restored Filemaker operational entry points', () => {
    const nav = buildAdminNav({
      onOpenChat: () => undefined,
      onCreatePageClick: () => undefined,
    }) as AdminNavNode[];

    const expectedEntries = [
      ['filemaker/job-listings', 'Job Listings', '/admin/filemaker/job-listings'],
      ['filemaker/websites', 'Websites', '/admin/filemaker/websites'],
      ['filemaker/lexicon', 'Lexicon', '/admin/filemaker/lexicon'],
      ['filemaker/goal-automation', 'Goal Automation', '/admin/filemaker/goal-automation'],
    ] as const;

    expectedEntries.forEach(([id, label, href]) => {
      const item = findNavItem(
        nav,
        (entry) => entry.id === id && entry.label === label && entry.href === href
      );

      expect(item).not.toBeNull();
    });
  });

  it('includes restored non-Filemaker operational entry points', () => {
    const nav = buildAdminNav({
      onOpenChat: () => undefined,
      onCreatePageClick: () => undefined,
    }) as AdminNavNode[];

    const expectedEntries = [
      ['workspace/context-registry', 'Context Registry', '/admin/context-registry'],
      ['workspace/ai-insights', 'AI Insights', '/admin/ai-insights'],
      ['ai/case-resolver/cases', 'Cases', '/admin/case-resolver/cases'],
      ['ai/agentcreator/personas', 'Personas', '/admin/agentcreator/personas'],
      ['ai/ai-paths/trigger-buttons', 'Trigger Buttons', '/admin/ai-paths/trigger-buttons'],
      ['content/cms/pages', 'Pages', '/admin/cms/pages'],
      ['content/notes/notebooks', 'Notebooks', '/admin/notes/notebooks'],
      ['page-manager/kangur/lessons-manager', 'Lessons Manager', '/admin/kangur/lessons-manager'],
      ['commerce/products/pages', 'Product Pages', '/admin/products/pages'],
      ['commerce/products/title-terms', 'Title Terms', '/admin/products/title-terms'],
      ['integrations/marketplaces/allegro/messages', 'Messages', '/admin/integrations/marketplaces/allegro/messages'],
      ['integrations/marketplaces/playwright/script', 'Script', '/admin/integrations/marketplaces/playwright/script'],
      ['playwright/step-sequencer', 'Step Sequencer', '/admin/playwright/step-sequencer'],
      ['playwright/action-runs', 'Action Runs', '/admin/playwright/action-runs'],
      ['image-studio/ui-presets', 'UI Presets', '/admin/image-studio/ui-presets'],
      ['system/auth/users', 'Users', '/admin/auth/users'],
      ['system/settings/storage', 'Storage', '/admin/settings/storage'],
      ['system/validator/lists', 'Lists', '/admin/validator/lists'],
    ] as const;

    expectedEntries.forEach(([id, label, href]) => {
      const item = findNavItem(
        nav,
        (entry) => entry.id === id && entry.label === label && entry.href === href
      );

      expect(item).not.toBeNull();
    });
  });
});
