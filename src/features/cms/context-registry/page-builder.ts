import type {
  ContextRegistryRef,
  ContextRegistryResolutionBundle,
  ContextRuntimeDocument,
  ContextRuntimeDocumentSection,
} from '@/shared/contracts/ai-context-registry';
import type { BlockInstance, PageBuilderState, SectionInstance } from '@/shared/contracts/cms';
import { PAGE_CONTEXT_ENGINE_VERSION } from '@/shared/lib/ai-context-registry/page-context-shared';

export const CMS_PAGE_BUILDER_RUNTIME_PROVIDER_ID = 'cms-page-builder-local';
export const CMS_PAGE_BUILDER_RUNTIME_ENTITY_TYPE = 'cms_page_builder_state';
export const CMS_PAGE_BUILDER_RUNTIME_REF_PREFIX = 'runtime:cms-page-builder:';
export const CMS_PAGE_BUILDER_CONTEXT_ROOT_IDS = [
  'page:cms-page-builder',
  'component:cms-page-builder-preview',
  'component:cms-page-builder-inspector',
  'component:cms-theme-settings-panel',
  'action:cms-css-ai-stream',
  'collection:cms-pages',
  'collection:cms-themes',
] as const;

type BuilderSelectionSnapshot = Pick<PageBuilderState, 'selectedNodeId'> & {
  selectedSection?: SectionInstance | null;
  selectedBlock?: BlockInstance | null;
  selectedColumn?: BlockInstance | null;
  selectedParentSection?: SectionInstance | null;
  selectedParentColumn?: BlockInstance | null;
  selectedParentBlock?: BlockInstance | null;
};

export type BuildCmsPageBuilderContextBundleInput = {
  state: Pick<PageBuilderState, 'currentPage' | 'sections' | 'selectedNodeId' | 'previewMode'>;
} & BuilderSelectionSnapshot;

const encodeSegment = (value: string): string => encodeURIComponent(value.trim());

const normalizeSlugValue = (slug: string | { slug?: string | null }): string =>
  typeof slug === 'string' ? slug.trim() : slug.slug?.trim() ?? '';

const countNestedBlocks = (blocks: readonly BlockInstance[] | undefined): number =>
  (blocks ?? []).reduce<number>(
    (total, block) => total + 1 + countNestedBlocks(block.blocks),
    0
  );

const summarizeBlock = (block: BlockInstance): Record<string, unknown> => ({
  id: block.id,
  type: block.type,
  settingKeys: Object.keys(block.settings ?? {}).sort(),
  childBlockCount: countNestedBlocks(block.blocks),
});

const summarizeSection = (section: SectionInstance): Record<string, unknown> => ({
  id: section.id,
  type: section.type,
  zone: section.zone,
  parentSectionId: section.parentSectionId ?? null,
  blockCount: countNestedBlocks(section.blocks),
  settingKeys: Object.keys(section.settings ?? {}).sort(),
});

const buildSelectionSnapshot = (
  input: BuilderSelectionSnapshot
): Record<string, unknown> | null => {
  if (input.selectedSection && !input.selectedBlock && !input.selectedColumn) {
    return {
      kind: 'section',
      id: input.selectedSection.id,
      type: input.selectedSection.type,
      zone: input.selectedSection.zone,
      settingKeys: Object.keys(input.selectedSection.settings ?? {}).sort(),
      blockCount: countNestedBlocks(input.selectedSection.blocks),
    };
  }

  if (input.selectedColumn) {
    return {
      kind: 'column',
      id: input.selectedColumn.id,
      sectionId: input.selectedParentSection?.id ?? null,
      settingKeys: Object.keys(input.selectedColumn.settings ?? {}).sort(),
      childBlockCount: countNestedBlocks(input.selectedColumn.blocks),
    };
  }

  if (input.selectedBlock) {
    return {
      kind: input.selectedBlock.type === 'Row' ? 'row' : 'block',
      id: input.selectedBlock.id,
      type: input.selectedBlock.type,
      sectionId: input.selectedParentSection?.id ?? null,
      columnId: input.selectedParentColumn?.id ?? null,
      parentBlockId: input.selectedParentBlock?.id ?? null,
      settingKeys: Object.keys(input.selectedBlock.settings ?? {}).sort(),
      childBlockCount: countNestedBlocks(input.selectedBlock.blocks),
    };
  }

  if (!input.selectedNodeId) {
    return null;
  }

  return {
    kind: 'node',
    id: input.selectedNodeId,
  };
};

export const createCmsPageBuilderStateRef = (pageId: string): ContextRegistryRef => ({
  id: `${CMS_PAGE_BUILDER_RUNTIME_REF_PREFIX}${encodeSegment(pageId)}`,
  kind: 'runtime_document',
  providerId: CMS_PAGE_BUILDER_RUNTIME_PROVIDER_ID,
  entityType: CMS_PAGE_BUILDER_RUNTIME_ENTITY_TYPE,
});

export const buildCmsPageBuilderRuntimeDocument = (
  input: BuildCmsPageBuilderContextBundleInput
): ContextRuntimeDocument | null => {
  const page = input.state.currentPage;
  if (!page?.id) {
    return null;
  }

  const runtimeRef = createCmsPageBuilderStateRef(page.id);
  const slugs = (page.slugs ?? [])
    .map(normalizeSlugValue)
    .filter((slug): slug is string => slug.length > 0);
  const zoneSummary = input.state.sections.reduce<Record<string, number>>((summary, section) => {
    summary[section.zone] = (summary[section.zone] ?? 0) + 1;
    return summary;
  }, {});
  const typeSummary = input.state.sections.reduce<Record<string, number>>((summary, section) => {
    summary[section.type] = (summary[section.type] ?? 0) + 1;
    return summary;
  }, {});
  const selection = buildSelectionSnapshot(input);

  const sections: ContextRuntimeDocumentSection[] = [
    {
      kind: 'facts',
      title: 'Page snapshot',
      items: [
        {
          id: page.id,
          name: page.name,
          status: page.status ?? null,
          themeId: page.themeId ?? null,
          previewMode: input.state.previewMode,
          showMenu: page.showMenu ?? true,
          slugCount: slugs.length,
          sectionCount: input.state.sections.length,
          selectedNodeId: input.state.selectedNodeId ?? null,
        },
      ],
    },
    {
      kind: 'items',
      title: 'Sections',
      summary: 'Current builder sections grouped by zone and type.',
      items: input.state.sections.slice(0, 24).map(summarizeSection),
    },
  ];

  if (selection) {
    sections.push({
      kind: 'facts',
      title: 'Active selection',
      items: [selection],
    });
  }

  const firstBlocks = input.state.sections
    .slice(0, 8)
    .flatMap((section) =>
      (section.blocks ?? []).slice(0, 6).map((block) => ({
        sectionId: section.id,
        zone: section.zone,
        ...summarizeBlock(block),
      }))
    );

  if (firstBlocks.length > 0) {
    sections.push({
      kind: 'items',
      title: 'Top-level blocks',
      summary: 'Representative top-level blocks from the current editor state.',
      items: firstBlocks,
    });
  }

  return {
    id: runtimeRef.id,
    kind: 'runtime_document',
    entityType: CMS_PAGE_BUILDER_RUNTIME_ENTITY_TYPE,
    title: `CMS builder state for ${page.name}`,
    summary:
      `Live in-memory builder state for page "${page.name}" with ${input.state.sections.length} ` +
      `sections in ${input.state.previewMode} preview mode.`,
    status: page.status ?? null,
    tags: ['cms', 'page-builder', 'editor', 'live-state'],
    relatedNodeIds: [...CMS_PAGE_BUILDER_CONTEXT_ROOT_IDS],
    facts: {
      pageId: page.id,
      pageName: page.name,
      slugs,
      previewMode: input.state.previewMode,
      themeId: page.themeId ?? null,
      sectionCount: input.state.sections.length,
      zoneSummary,
      typeSummary,
      selectedNodeId: input.state.selectedNodeId ?? null,
    },
    sections,
    provenance: {
      source: 'cms.page-builder.client-state',
      persisted: false,
    },
  };
};

export const buildCmsPageBuilderContextBundle = (
  input: BuildCmsPageBuilderContextBundleInput
): ContextRegistryResolutionBundle | null => {
  const pageId = input.state.currentPage?.id;
  const document = buildCmsPageBuilderRuntimeDocument(input);
  if (!document || !pageId) {
    return null;
  }

  return {
    refs: [createCmsPageBuilderStateRef(pageId)],
    nodes: [],
    documents: [document],
    truncated: false,
    engineVersion: PAGE_CONTEXT_ENGINE_VERSION,
  };
};
