import { describe, expect, it } from 'vitest';

import type { PageBuilderState } from '@/shared/contracts/cms';

import {
  buildCmsPageBuilderContextBundle,
  CMS_PAGE_BUILDER_CONTEXT_ROOT_IDS,
  CMS_PAGE_BUILDER_RUNTIME_ENTITY_TYPE,
} from '../page-builder';

const createPageBuilderState = (): Pick<
  PageBuilderState,
  'currentPage' | 'sections' | 'selectedNodeId' | 'previewMode'
> => ({
  currentPage: {
    id: 'page-1',
    name: 'Landing',
    status: 'draft',
    publishedAt: null,
    seoTitle: '',
    seoDescription: '',
    seoOgImage: '',
    seoCanonical: '',
    robotsMeta: '',
    themeId: 'theme-1',
    showMenu: true,
    components: [],
    slugs: [
      {
        id: 'slug-1',
        slug: 'landing',
        isDefault: true,
        createdAt: '2026-03-09T00:00:00.000Z',
        updatedAt: '2026-03-09T00:00:00.000Z',
        pageId: 'page-1',
      },
    ],
    createdAt: '2026-03-09T00:00:00.000Z',
    updatedAt: '2026-03-09T00:00:00.000Z',
  },
  sections: [
    {
      id: 'section-hero',
      type: 'Hero',
      zone: 'template',
      settings: { align: 'center' },
      blocks: [
        {
          id: 'block-title',
          type: 'Text',
          settings: { value: 'Hello' },
        },
      ],
    },
  ],
  selectedNodeId: 'section-hero',
  previewMode: 'desktop',
});

describe('buildCmsPageBuilderContextBundle', () => {
  it('builds a live runtime document for the current builder state', () => {
    const state = createPageBuilderState();

    const bundle = buildCmsPageBuilderContextBundle({
      state,
      selectedNodeId: state.selectedNodeId,
      selectedSection: state.sections[0],
      selectedBlock: null,
      selectedColumn: null,
      selectedParentSection: null,
      selectedParentColumn: null,
      selectedParentBlock: null,
    });

    expect(bundle).not.toBeNull();
    expect(bundle?.refs).toHaveLength(1);
    expect(bundle?.documents).toHaveLength(1);
    expect(bundle?.documents[0]?.entityType).toBe(CMS_PAGE_BUILDER_RUNTIME_ENTITY_TYPE);
    expect(bundle?.documents[0]?.facts).toMatchObject({
      pageId: 'page-1',
      pageName: 'Landing',
      selectedNodeId: 'section-hero',
      sectionCount: 1,
      previewMode: 'desktop',
    });
    expect(bundle?.documents[0]?.relatedNodeIds).toEqual([...CMS_PAGE_BUILDER_CONTEXT_ROOT_IDS]);
    expect(bundle?.documents[0]?.sections[0]?.title).toBe('Page snapshot');
    expect(bundle?.documents[0]?.sections[1]?.items?.[0]).toMatchObject({
      id: 'section-hero',
      type: 'Hero',
      zone: 'template',
    });
  });

  it('returns null when no page is loaded', () => {
    const state = createPageBuilderState();

    expect(
      buildCmsPageBuilderContextBundle({
        state: {
          ...state,
          currentPage: null,
        },
        selectedNodeId: null,
        selectedSection: null,
        selectedBlock: null,
        selectedColumn: null,
        selectedParentSection: null,
        selectedParentColumn: null,
        selectedParentBlock: null,
      })
    ).toBeNull();
  });
});
