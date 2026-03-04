import { describe, expect, it } from 'vitest';

import { GRID_TEMPLATE_SETTINGS_KEY } from '@/features/cms/components/page-builder/grid-templates';
import { SECTION_TEMPLATE_SETTINGS_KEY } from '@/features/cms/components/page-builder/section-template-store';
import { migrateCmsPageBuilderTemplateSettingValue } from '@/features/cms/migrations/page-builder-template-contract-migration';

const fallbackTimestamp = '2026-03-04T12:00:00.000Z';

const baseSection = {
  id: 'section-1',
  type: 'Hero',
  zone: 'template',
  parentSectionId: null,
  settings: {},
  blocks: [],
};

describe('migrateCmsPageBuilderTemplateSettingValue', () => {
  it('backfills legacy section template defaults in migration mode', () => {
    const result = migrateCmsPageBuilderTemplateSettingValue({
      key: SECTION_TEMPLATE_SETTINGS_KEY,
      value: JSON.stringify([{ section: baseSection }]),
      fallbackTimestamp,
    });

    expect(result.status).toBe('changed');
    expect(result.stats.entriesScanned).toBe(1);
    expect(result.stats.idsBackfilled).toBe(1);
    expect(result.stats.namesBackfilled).toBe(1);
    expect(result.stats.categoriesBackfilled).toBe(1);
    expect(result.stats.sectionTypesBackfilled).toBe(1);
    expect(result.stats.createdAtBackfilled).toBe(1);

    const parsed = JSON.parse(result.value) as Array<Record<string, unknown>>;
    expect(parsed).toHaveLength(1);
    expect(parsed[0]).toMatchObject({
      id: 'section-template-1',
      name: 'Section template 1',
      category: 'Saved sections',
      sectionType: 'Hero',
      createdAt: fallbackTimestamp,
    });
  });

  it('drops non-grid template sections and canonicalizes valid grid entries', () => {
    const result = migrateCmsPageBuilderTemplateSettingValue({
      key: GRID_TEMPLATE_SETTINGS_KEY,
      value: JSON.stringify([
        { id: 'legacy-grid', section: baseSection },
        {
          id: ' grid-template-1 ',
          name: ' Grid ',
          createdAt: '2026-03-04T10:00:00.000Z',
          section: { ...baseSection, type: 'Grid' },
        },
      ]),
      fallbackTimestamp,
    });

    expect(result.status).toBe('changed');
    expect(result.stats.entriesScanned).toBe(2);
    expect(result.stats.entriesDropped).toBe(1);
    expect(result.stats.entriesKept).toBe(1);

    const parsed = JSON.parse(result.value) as Array<Record<string, unknown>>;
    expect(parsed).toEqual([
      {
        id: 'grid-template-1',
        name: 'Grid',
        description: '',
        createdAt: '2026-03-04T10:00:00.000Z',
        section: { ...baseSection, type: 'Grid' },
      },
    ]);
  });

  it('returns invalid status for malformed JSON payloads', () => {
    const result = migrateCmsPageBuilderTemplateSettingValue({
      key: SECTION_TEMPLATE_SETTINGS_KEY,
      value: '{"broken-json"',
      fallbackTimestamp,
    });

    expect(result.status).toBe('invalid');
    expect(result.value).toBe('[]');
    expect(result.warnings[0]).toMatch(/not valid JSON/i);
  });
});
