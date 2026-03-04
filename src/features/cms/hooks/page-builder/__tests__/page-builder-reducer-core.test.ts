import { describe, expect, it } from 'vitest';

import { reducePageBuilderStateCore } from '@/features/cms/hooks/page-builder/page-builder-reducer-core';
import { initialState } from '@/features/cms/hooks/usePageBuilderContext';
import type { Page, PageBuilderState, SectionInstance } from '@/shared/contracts/cms';

const createSection = (overrides: Partial<SectionInstance> = {}): SectionInstance =>
  ({
    id: 'section-default',
    type: 'Hero',
    zone: 'template',
    parentSectionId: null,
    settings: {},
    blocks: [],
    ...overrides,
  }) as SectionInstance;

const createState = (sections: SectionInstance[]): PageBuilderState => ({
  ...initialState,
  sections,
});

const createPage = (components: Page['components'], overrides: Partial<Page> = {}): Page => ({
  id: 'page-1',
  name: 'Test page',
  status: 'draft',
  publishedAt: undefined,
  themeId: null,
  showMenu: false,
  components,
  slugs: [{ id: 'slug-1', slug: 'test-page', pageId: 'page-1', isDefault: true }],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

describe('reducePageBuilderStateCore section hierarchy actions', () => {
  it('removes a section subtree', () => {
    const state = createState([
      createSection({ id: 'root' }),
      createSection({ id: 'child', parentSectionId: 'root' }),
      createSection({ id: 'other', zone: 'footer' }),
    ]);

    const next = reducePageBuilderStateCore(state, {
      type: 'REMOVE_SECTION',
      sectionId: 'root',
    });

    expect(next.sections.map((section) => section.id)).toEqual(['other']);
  });

  it('duplicates a section subtree next to the original sibling slot', () => {
    const state = createState([
      createSection({ id: 'root', settings: { label: 'root' } }),
      createSection({ id: 'child', parentSectionId: 'root', settings: { label: 'child' } }),
      createSection({ id: 'other', settings: { label: 'other' } }),
    ]);

    const next = reducePageBuilderStateCore(state, {
      type: 'DUPLICATE_SECTION',
      sectionId: 'root',
    });

    expect(next.sections).toHaveLength(5);

    const duplicatedRoot = next.sections.find(
      (section) =>
        section.id !== 'root' &&
        section.id !== 'other' &&
        section.parentSectionId === null &&
        section.settings['label'] === 'root'
    );
    expect(duplicatedRoot).toBeDefined();

    const duplicatedChild = next.sections.find(
      (section) =>
        section.id !== 'child' &&
        section.parentSectionId === duplicatedRoot?.id &&
        section.settings['label'] === 'child'
    );
    expect(duplicatedChild).toBeDefined();
  });

  it('copies and pastes a section subtree with inherited target zone', () => {
    const root = createSection({ id: 'root', settings: { label: 'root' } });
    const child = createSection({
      id: 'child',
      parentSectionId: 'root',
      settings: { label: 'child' },
    });
    const state = createState([root, child]);

    const copied = reducePageBuilderStateCore(state, {
      type: 'COPY_SECTION',
      sectionId: 'root',
    });
    const pasted = reducePageBuilderStateCore(copied, {
      type: 'PASTE_SECTION',
      zone: 'footer',
    });

    expect(pasted.clipboard?.type).toBe('section_hierarchy');
    expect(pasted.sections).toHaveLength(4);

    const pastedRoot = pasted.sections.find(
      (section) =>
        section.id !== 'root' &&
        section.parentSectionId === null &&
        section.zone === 'footer' &&
        section.settings['label'] === 'root'
    );
    expect(pastedRoot).toBeDefined();

    const pastedChild = pasted.sections.find(
      (section) =>
        section.id !== 'child' &&
        section.parentSectionId === pastedRoot?.id &&
        section.zone === 'footer' &&
        section.settings['label'] === 'child'
    );
    expect(pastedChild).toBeDefined();
  });

  it('rejects section-to-block conversion when the source section has child sections', () => {
    const state = createState([
      createSection({ id: 'root', type: 'TextElement' }),
      createSection({ id: 'child', parentSectionId: 'root' }),
      createSection({ id: 'target', type: 'Hero' }),
    ]);

    const next = reducePageBuilderStateCore(state, {
      type: 'CONVERT_SECTION_TO_BLOCK',
      sectionId: 'root',
      toSectionId: 'target',
      toIndex: 0,
    });

    expect(next).toBe(state);
  });

  it('hydrates sections from canonical page components without legacy parent normalization', () => {
    const page = createPage([
      {
        type: 'Hero',
        order: 0,
        content: {
          sectionId: 'section-root',
          zone: 'template',
          parentSectionId: null,
          settings: { title: 'Root' },
          blocks: [],
        },
      },
      {
        type: 'TextElement',
        order: 1,
        content: {
          sectionId: 'section-child',
          zone: 'template',
          parentSectionId: 'missing-parent',
          settings: { text: 'Child' },
          blocks: [],
        },
      },
    ]);

    const next = reducePageBuilderStateCore(createState([]), {
      type: 'SET_CURRENT_PAGE',
      page,
    });

    expect(next.currentPage).toBe(page);
    expect(next.sections).toEqual([
      {
        id: 'section-root',
        type: 'Hero',
        zone: 'template',
        parentSectionId: null,
        settings: { title: 'Root' },
        blocks: [],
      },
      {
        id: 'section-child',
        type: 'TextElement',
        zone: 'template',
        parentSectionId: 'missing-parent',
        settings: { text: 'Child' },
        blocks: [],
      },
    ]);
  });
});
