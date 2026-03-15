import type {
  CaseResolverFile,
  CaseSearchScope,
  CaseViewMode,
  CaseFileTypeFilter,
  CaseSortKey as SharedCaseSortKey,
  CaseSortOrder as SharedCaseSortOrder,
} from '@/shared/contracts/case-resolver';
export type { CaseSearchScope };

export type CaseTreeNode = {
  file: CaseResolverFile;
  children: CaseTreeNode[];
};

type CaseSortKey = SharedCaseSortKey;
type CaseSortOrder = SharedCaseSortOrder;

export type { CaseSortKey, CaseSortOrder };
export type { CaseViewMode, CaseFileTypeFilter };
export type IndexedCaseRow = {
  file: CaseResolverFile;
  normalizedName: string;
  normalizedFolder: string;
  normalizedContent: string;
  normalizedTag: string;
  normalizedCaseIdentifier: string;
  normalizedCategory: string;
};

export type CaseFileComparator = (left: CaseResolverFile, right: CaseResolverFile) => number;

export const buildPathLabelMap = <T extends { id: string; name: string; parentId: string | null }>(
  items: T[]
): Map<string, string> => {
  const byId = new Map<string, T>(items.map((item) => [item.id, item]));
  const labels = new Map<string, string>();

  const resolve = (id: string): string => {
    if (labels.has(id)) return labels.get(id)!;
    const item = byId.get(id);
    if (!item) return '';
    const parentLabel = item.parentId ? resolve(item.parentId) : '';
    const label = parentLabel ? `${parentLabel} / ${item.name}` : item.name;
    labels.set(id, label);
    return label;
  };

  items.forEach((item) => resolve(item.id));
  return labels;
};

export const buildCaseTree = (
  files: CaseResolverFile[],
  sortComparator?: CaseFileComparator
): CaseTreeNode[] => {
  const nodesById = new Map<string, CaseTreeNode>(
    files.map((file) => [file.id, { file, children: [] }])
  );
  const roots: CaseTreeNode[] = [];

  files.forEach((file) => {
    const node = nodesById.get(file.id)!;
    if (file.parentCaseId && nodesById.has(file.parentCaseId)) {
      nodesById.get(file.parentCaseId)!.children.push(node);
    } else {
      roots.push(node);
    }
  });

  const sort = (nodes: CaseTreeNode[]): void => {
    if (sortComparator) {
      nodes.sort((left, right) => sortComparator(left.file, right.file));
    }
    nodes.forEach((node) => sort(node.children));
  };

  sort(roots);
  return roots;
};

export const flattenCaseTreeOptions = (
  nodes: CaseTreeNode[],
  depth: number = 0
): Array<{ value: string; label: string }> => {
  const options: Array<{ value: string; label: string }> = [];
  nodes.forEach((node) => {
    options.push({
      value: node.file.id,
      label: `${' '.repeat(depth * 2)}${node.file.name}`,
    });
    options.push(...flattenCaseTreeOptions(node.children, depth + 1));
  });
  return options;
};

export const stripHtml = (value: string): string =>
  value
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+/g, ' ')
    .trim();
