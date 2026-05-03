import type {
  ContextRegistryResolutionBundle,
  ContextRuntimeDocument,
} from '@/shared/contracts/ai-context-registry';
import type { CatalogRecord } from '@/shared/contracts/products/catalogs';
import type { ProductCategory as ProductCategoryContract } from '@/shared/contracts/products/categories';
import { PAGE_CONTEXT_ENGINE_VERSION } from '@/shared/lib/ai-context-registry/page-context-shared';

import { buildLeafCategoryHierarchyEntries } from '../lib/leafCategoryHierarchy';
import {
  createProductLeafCategoriesWorkspaceRef,
  PRODUCT_EDITOR_LEAF_CATEGORIES_CONTEXT_RUNTIME_ENTITY_TYPE,
} from './workspace.constants';
import type { BuildProductLeafCategoriesContextBundleInput } from './workspace.types';

type ProductLeafCategoryRow = {
  id: string;
  name: string;
  leafName: string;
  terminalLeafLabel: string;
  hierarchyPath: string;
  pathSegments: string[];
  ancestorSegments: string[];
  catalogId: string;
  catalogName: string | null;
};

const hasText = (value: string | null): value is string => value !== null && value.length > 0;

const buildCatalogFilter = (selectedCatalogIds: string[]): Set<string> =>
  new Set(
    selectedCatalogIds.map((catalogId) => catalogId.trim()).filter((catalogId) => catalogId.length > 0)
  );

const buildCatalogNameById = (catalogs: CatalogRecord[]): Map<string, string> =>
  new Map(
    catalogs.map((catalog) => [
      catalog.id,
      typeof catalog.name === 'string' ? catalog.name.trim() : '',
    ])
  );

const buildLeafCategoryRows = (
  categories: ProductCategoryContract[],
  catalogs: CatalogRecord[],
  selectedCatalogIds: string[]
): ProductLeafCategoryRow[] => {
  const catalogFilter = buildCatalogFilter(selectedCatalogIds);
  const catalogNameById = buildCatalogNameById(catalogs);

  return buildLeafCategoryHierarchyEntries(categories)
    .filter((entry) => catalogFilter.size === 0 || catalogFilter.has(entry.catalogId))
    .map((entry) => ({
      id: entry.id,
      name: entry.leafName,
      leafName: entry.leafName,
      terminalLeafLabel: entry.leafName,
      hierarchyPath: entry.hierarchyPath,
      pathSegments: entry.pathSegments,
      ancestorSegments: entry.pathSegments.slice(0, -1),
      catalogId: entry.catalogId,
      catalogName: catalogNameById.get(entry.catalogId) ?? null,
    }));
};

const resolveSelectedCatalogName = (
  catalogId: string,
  catalogs: CatalogRecord[]
): string | null => {
  const catalogName = catalogs.find((catalog) => catalog.id === catalogId)?.name.trim() ?? null;
  return hasText(catalogName) ? catalogName : null;
};

const buildSelectedCatalogNames = (
  selectedCatalogIds: string[],
  catalogs: CatalogRecord[]
): string[] =>
  selectedCatalogIds
    .map((catalogId) => resolveSelectedCatalogName(catalogId, catalogs))
    .filter(hasText);

const buildProductLeafCategoriesRuntimeDocument = (
  input: BuildProductLeafCategoriesContextBundleInput
): ContextRuntimeDocument => {
  const runtimeRef = createProductLeafCategoriesWorkspaceRef(input.selectedCatalogIds);
  const leafCategories = buildLeafCategoryRows(
    input.categories,
    input.catalogs,
    input.selectedCatalogIds
  );
  const selectedCatalogNames = buildSelectedCatalogNames(input.selectedCatalogIds, input.catalogs);

  return {
    id: runtimeRef.id,
    kind: 'runtime_document',
    entityType: PRODUCT_EDITOR_LEAF_CATEGORIES_CONTEXT_RUNTIME_ENTITY_TYPE,
    title: 'Product leaf categories',
    summary:
      'Leaf-only product category vocabulary for the current product editor catalog selection. ' +
      'Use the hierarchy to disambiguate categories, but write only the final leaf label in the normalized title.',
    status: null,
    tags: ['products', 'taxonomy', 'categories', 'leaf-categories', 'editor'],
    relatedNodeIds: [],
    facts: {
      selectedCatalogIds: input.selectedCatalogIds,
      selectedCatalogNames,
      leafCategoryCount: leafCategories.length,
      categorySelectionPolicy: 'leaf_only_exact_name_or_full_hierarchy_match',
      categoryOutputPolicy: 'final_leaf_segment_only',
      categorySpecificityPolicy: 'prefer_most_specific_terminal_leaf',
    },
    sections: [
      {
        kind: 'text',
        title: 'Leaf category options',
        summary:
          'Resolved category vocabulary for AI tasks. Match against the hierarchy when needed, but output only the final terminal leaf label as the category value. If a hierarchy ends with a more specific leaf, never collapse it to an ancestor segment.',
        text: JSON.stringify(
          {
            selectedCatalogIds: input.selectedCatalogIds,
            selectedCatalogNames,
            leafCategories,
          },
          null,
          2
        ),
      },
    ],
    provenance: {
      source: 'products.product-editor.taxonomy.client-state',
      persisted: false,
    },
  };
};

export const buildProductLeafCategoriesContextBundle = (
  input: BuildProductLeafCategoriesContextBundleInput
): ContextRegistryResolutionBundle => ({
  refs: [],
  nodes: [],
  documents: [buildProductLeafCategoriesRuntimeDocument(input)],
  truncated: false,
  engineVersion: PAGE_CONTEXT_ENGINE_VERSION,
});
