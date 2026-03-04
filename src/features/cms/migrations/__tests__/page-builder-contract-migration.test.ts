import { describe, expect, it } from 'vitest';

import type { PageComponent } from '@/shared/contracts/cms';
import { migrateCmsPageBuilderComponents } from '@/features/cms/migrations/page-builder-contract-migration';

const makeComponent = (overrides: Partial<PageComponent> = {}): PageComponent =>
  ({
    id: 'component-1',
    type: 'Hero',
    order: 0,
    pageId: 'page-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    content: {
      zone: 'template',
      settings: {},
      blocks: [],
      sectionId: 'section-1',
      parentSectionId: null,
    },
    ...overrides,
  }) as PageComponent;

describe('migrateCmsPageBuilderComponents', () => {
  it('backfills missing section id and canonical component order', () => {
    const source = [
      makeComponent({
        id: 'cmp-42',
        order: 9,
        content: {
          zone: 'template',
          settings: {},
          blocks: [],
          parentSectionId: null,
        } as unknown as PageComponent['content'],
      }),
    ];

    const migrated = migrateCmsPageBuilderComponents(source);

    expect(migrated.changed).toBe(true);
    expect(migrated.components[0]?.order).toBe(0);
    expect(migrated.components[0]?.content.sectionId).toBe('cmp-42');
    expect(migrated.stats.missingSectionIds).toBe(1);
    expect(migrated.stats.normalizedOrder).toBe(1);
    expect(migrated.stats.componentsChanged).toBe(1);
  });

  it('normalizes invalid content fields and prunes legacy top-level keys', () => {
    const source = [
      makeComponent({
        content: {
          zone: 'Template',
          sectionId: ' section-root ',
          parentSectionId: ' section-root ',
          settings: 'legacy',
          blocks: { not: 'an-array' },
          legacyFlag: true,
        } as unknown as PageComponent['content'],
      }),
    ];

    const migrated = migrateCmsPageBuilderComponents(source);
    const content = migrated.components[0]?.content;

    expect(migrated.changed).toBe(true);
    expect(content?.zone).toBe('template');
    expect(content?.sectionId).toBe('section-root');
    expect(content?.parentSectionId).toBeNull();
    expect(content?.settings).toEqual({});
    expect(content?.blocks).toEqual([]);
    expect((content as Record<string, unknown>)['legacyFlag']).toBeUndefined();
    expect(migrated.stats.prunedLegacyKeys).toBe(1);
    expect(migrated.stats.normalizedZones).toBe(1);
    expect(migrated.stats.normalizedParents).toBe(1);
    expect(migrated.stats.normalizedSettings).toBe(1);
    expect(migrated.stats.normalizedBlocks).toBe(1);
  });

  it('keeps already canonical components unchanged', () => {
    const source = [makeComponent()];
    const migrated = migrateCmsPageBuilderComponents(source);

    expect(migrated.changed).toBe(false);
    expect(migrated.components[0]).toEqual(source[0]);
    expect(migrated.stats.componentsChanged).toBe(0);
  });
});
