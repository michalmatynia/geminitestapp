import type { ExternalCategory } from '@/shared/contracts/integrations';

export type CategoryRow = ExternalCategory & {
  subRows?: CategoryRow[] | undefined;
};

const normalizeParentExternalId = (value: string | null | undefined): string | null => {
  const candidate = typeof value === 'string' ? value.trim() : '';
  if (!candidate || candidate === '0' || candidate.toLowerCase() === 'null') {
    return null;
  }
  return candidate;
};

export const buildCategoryTree = (categories: ExternalCategory[]): CategoryRow[] => {
  const byId = new Map<string, CategoryRow>();
  const roots: CategoryRow[] = [];

  // First pass: create all nodes
  categories.forEach((cat) => {
    byId.set(cat.externalId, { ...cat, subRows: [] });
  });

  // Second pass: link children
  categories.forEach((cat) => {
    const node = byId.get(cat.externalId)!;
    const parentId = normalizeParentExternalId(cat.parentExternalId);

    if (parentId && byId.has(parentId)) {
      byId.get(parentId)!.subRows!.push(node);
    } else {
      roots.push(node);
    }
  });

  // Sort function
  const sortNodes = (nodes: CategoryRow[]) => {
    nodes.sort((a, b) => a.name.localeCompare(b.name));
    nodes.forEach((node) => {
      if (node.subRows?.length) {
        sortNodes(node.subRows);
      } else {
        node.subRows = undefined; // Remove empty arrays for leaf nodes
      }
    });
  };

  sortNodes(roots);
  return roots;
};
