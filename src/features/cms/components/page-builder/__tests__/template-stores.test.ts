import { describe, expect, it } from 'vitest';

import {
  GRID_TEMPLATE_SETTINGS_KEY,
  normalizeGridTemplates,
} from '@/features/cms/components/page-builder/grid-templates';
import {
  SECTION_TEMPLATE_SETTINGS_KEY,
  normalizeSectionTemplates,
} from '@/features/cms/components/page-builder/section-template-store';

const baseSection = {
  id: 'section-1',
  type: 'Hero',
  zone: 'template' as const,
  parentSectionId: null,
  settings: {},
  blocks: [],
};

describe('page-builder template stores', () => {
  it('uses canonical v2 settings keys', () => {
    expect(SECTION_TEMPLATE_SETTINGS_KEY).toBe('cms_section_templates.v2');
    expect(GRID_TEMPLATE_SETTINGS_KEY).toBe('cms_grid_templates.v2');
  });

  it('keeps only canonical section template records', () => {
    const templates = normalizeSectionTemplates([
      {
        id: ' template-1 ',
        name: ' Hero Template ',
        category: ' Main ',
        sectionType: 'Hero',
        createdAt: '2026-03-04T10:00:00.000Z',
        section: baseSection,
      },
      {
        name: 'legacy-missing-id',
        sectionType: 'Hero',
        createdAt: '2026-03-04T10:00:00.000Z',
        section: baseSection,
      },
    ]);

    expect(templates).toEqual([
      {
        id: 'template-1',
        name: 'Hero Template',
        description: '',
        category: 'Main',
        sectionType: 'Hero',
        createdAt: '2026-03-04T10:00:00.000Z',
        section: baseSection,
      },
    ]);
  });

  it('keeps only canonical grid template records', () => {
    const templates = normalizeGridTemplates([
      {
        id: ' grid-template-1 ',
        name: ' Grid Template ',
        createdAt: '2026-03-04T10:00:00.000Z',
        section: { ...baseSection, type: 'Grid' },
      },
      {
        id: 'legacy-grid',
        name: 'Legacy Grid',
        createdAt: '2026-03-04T10:00:00.000Z',
        section: baseSection,
      },
    ]);

    expect(templates).toEqual([
      {
        id: 'grid-template-1',
        name: 'Grid Template',
        description: '',
        createdAt: '2026-03-04T10:00:00.000Z',
        section: { ...baseSection, type: 'Grid' },
      },
    ]);
  });
});
