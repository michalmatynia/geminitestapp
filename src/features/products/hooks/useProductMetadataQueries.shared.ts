import type {
  ProductCategory,
  ProductCategoryWithChildren,
} from '@/shared/contracts/products/categories';
import { productMetadataKeys } from '@/shared/lib/query-key-exports';

export { productMetadataKeys };

export type ProductMetadataQueryOptions = {
  enabled?: boolean;
  allowWithoutCatalog?: boolean;
};

const STABLE_METADATA_STALE_MS = 10 * 60 * 1_000;

export const STABLE_METADATA_QUERY_OPTIONS = {
  staleTime: STABLE_METADATA_STALE_MS,
  refetchOnMount: false as const,
  refetchOnWindowFocus: false as const,
  refetchOnReconnect: false as const,
};

export const resolveMetadataQueryEnabled = (
  options?: ProductMetadataQueryOptions
): boolean => options?.enabled ?? true;

export const normalizeOptionalIdentifier = (
  value: string | null | undefined
): string | null => {
  if (value === null || value === undefined || value === '') return null;
  return value;
};

export const hasMutationId = (id: string | undefined): id is string =>
  id !== undefined && id !== '';

export const flattenCategoryTree = (
  nodes: ProductCategoryWithChildren[],
  parentId: string | null = null
): ProductCategory[] => {
  const flattened: ProductCategory[] = [];
  for (const node of nodes) {
    const { children, ...nodeWithoutChildren } = node;
    const normalizedNode: ProductCategory = {
      ...nodeWithoutChildren,
      parentId: node.parentId ?? parentId ?? null,
    };
    flattened.push(normalizedNode);
    if (Array.isArray(children) && children.length > 0) {
      flattened.push(...flattenCategoryTree(children, node.id));
    }
  }
  return flattened;
};
