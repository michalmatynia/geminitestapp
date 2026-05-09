import {
  normalizeTimestamp,
  sanitizeOptionalId,
  normalizeHexColor,
  resolveSafeParentId,
} from '@/features/case-resolver/services/taxonomy';
import {
  type CaseResolverCategory,
  type CaseResolverCategoryTreeNode,
  type CaseResolverIdentifier,
  type CaseResolverTag,
} from '@/shared/contracts/case-resolver';
import { parseJsonSetting } from '@/shared/utils/settings-json';

export type { CaseResolverCategoryTreeNode };

function resolveSafeIdentifierParentId(
  identifierId: string,
  parentId: string | null,
  identifierMap: Map<string, CaseResolverIdentifier>
): string | null {
  return resolveSafeParentId(identifierId, parentId, identifierMap);
}

function resolveSafeTagParentId(
  tagId: string,
  parentId: string | null,
  tagMap: Map<string, CaseResolverTag>
): string | null {
  return resolveSafeParentId(tagId, parentId, tagMap);
}

const resolveSafeCategoryParentId = (
  categoryId: string,
  parentId: string | null,
  categoryMap: Map<string, CaseResolverCategory>
): string | null => {
  return resolveSafeParentId(categoryId, parentId, categoryMap);
};

export const normalizeCaseResolverIdentifiers = (input: unknown): CaseResolverIdentifier[] => {
  const now = new Date().toISOString();
  if (!Array.isArray(input)) return [];

  const seen = new Set<string>();
  const raw: CaseResolverIdentifier[] = [];

  input.forEach((entry: unknown, index: number): void => {
    if (!entry || typeof entry !== 'object') return;
    const record = entry as Record<string, unknown>;
    const rawId =
      typeof record['id'] === 'string' && record['id'].trim().length > 0
        ? record['id'].trim()
        : `identifier-${index + 1}`;
    if (seen.has(rawId)) return;
    seen.add(rawId);

    const rawName = typeof record['name'] === 'string' ? record['name'].trim() : '';
    const finalName = rawName || `Case Identifier ${raw.length + 1}`;
    raw.push({
      id: rawId,
      type: typeof record['type'] === 'string' ? record['type'] : 'custom',
      value: typeof record['value'] === 'string' ? record['value'] : finalName,
      name: finalName,
      parentId: sanitizeOptionalId(record['parentId']),
      color: normalizeHexColor(record['color'], '#f59e0b'),
      createdAt: normalizeTimestamp(record['createdAt'], now),
      updatedAt: normalizeTimestamp(record['updatedAt'], now),
    });
  });

  const byId = new Map<string, CaseResolverIdentifier>(
    raw.map((identifier: CaseResolverIdentifier): [string, CaseResolverIdentifier] => [
      identifier.id,
      identifier,
    ])
  );
  const normalizedParents = raw.map(
    (identifier: CaseResolverIdentifier): CaseResolverIdentifier => ({
      ...identifier,
      parentId: resolveSafeIdentifierParentId(identifier.id, identifier.parentId ?? null, byId),
    })
  );

  const grouped = new Map<string, CaseResolverIdentifier[]>();
  const getGroupKey = (parentId: string | null): string => parentId ?? '__root__';
  normalizedParents.forEach((identifier: CaseResolverIdentifier): void => {
    const key = getGroupKey(identifier.parentId ?? null);
    const current = grouped.get(key) ?? [];
    current.push(identifier);
    grouped.set(key, current);
  });

  const output: CaseResolverIdentifier[] = [];
  const visit = (parentId: string | null): void => {
    const group = grouped.get(getGroupKey(parentId)) ?? [];
    group
      .sort((left: CaseResolverIdentifier, right: CaseResolverIdentifier) => {
        const leftName = left.name ?? left.value;
        const rightName = right.name ?? right.value;
        const nameDelta = leftName.localeCompare(rightName);
        if (nameDelta !== 0) return nameDelta;
        return left.id.localeCompare(right.id);
      })
      .forEach((identifier: CaseResolverIdentifier): void => {
        output.push(identifier);
        visit(identifier.id);
      });
  };

  visit(null);
  return output;
};

export const normalizeCaseResolverTags = (input: unknown): CaseResolverTag[] => {
  const now = new Date().toISOString();
  if (!Array.isArray(input)) return [];

  const seen = new Set<string>();
  const raw: CaseResolverTag[] = [];

  input.forEach((entry: unknown, index: number): void => {
    if (!entry || typeof entry !== 'object') return;
    const record = entry as Record<string, unknown>;
    const rawId =
      typeof record['id'] === 'string' && record['id'].trim().length > 0
        ? record['id'].trim()
        : `tag-${index + 1}`;
    if (seen.has(rawId)) return;
    seen.add(rawId);

    const rawName = typeof record['name'] === 'string' ? record['name'].trim() : '';
    const rawLabel = typeof record['label'] === 'string' ? record['label'].trim() : '';
    raw.push({
      id: rawId,
      label: rawLabel || rawName || `Tag ${raw.length + 1}`,
      parentId: sanitizeOptionalId(record['parentId']),
      color: normalizeHexColor(record['color'], '#38bdf8'),
      createdAt: normalizeTimestamp(record['createdAt'], now),
      updatedAt: normalizeTimestamp(record['updatedAt'], now),
    });
  });

  const byId = new Map<string, CaseResolverTag>(
    raw.map((tag: CaseResolverTag): [string, CaseResolverTag] => [tag.id, tag])
  );
  const normalizedParents = raw.map(
    (tag: CaseResolverTag): CaseResolverTag => ({
      ...tag,
      parentId: resolveSafeTagParentId(tag.id, tag.parentId ?? null, byId),
    })
  );

  const grouped = new Map<string, CaseResolverTag[]>();
  const getGroupKey = (parentId: string | null): string => parentId ?? '__root__';
  normalizedParents.forEach((tag: CaseResolverTag): void => {
    const key = getGroupKey(tag.parentId ?? null);
    const current = grouped.get(key) ?? [];
    current.push(tag);
    grouped.set(key, current);
  });

  const output: CaseResolverTag[] = [];
  const visit = (parentId: string | null): void => {
    const group = grouped.get(getGroupKey(parentId)) ?? [];
    group
      .sort((left: CaseResolverTag, right: CaseResolverTag) => {
        const nameDelta = left.label.localeCompare(right.label);
        if (nameDelta !== 0) return nameDelta;
        return left.id.localeCompare(right.id);
      })
      .forEach((tag: CaseResolverTag): void => {
        output.push(tag);
        visit(tag.id);
      });
  };

  visit(null);
  return output;
};

export const normalizeCaseResolverCategories = (input: unknown): CaseResolverCategory[] => {
  const now = new Date().toISOString();
  if (!Array.isArray(input)) return [];

  const seen = new Set<string>();
  const raw: CaseResolverCategory[] = [];
  input.forEach((entry: unknown, index: number): void => {
    if (!entry || typeof entry !== 'object') return;
    const record = entry as Record<string, unknown>;
    const rawId =
      typeof record['id'] === 'string' && record['id'].trim().length > 0
        ? record['id'].trim()
        : `category-${index + 1}`;
    if (seen.has(rawId)) return;
    seen.add(rawId);

    const rawName = typeof record['name'] === 'string' ? record['name'].trim() : '';
    raw.push({
      id: rawId,
      name: rawName || `Category ${raw.length + 1}`,
      parentId: sanitizeOptionalId(record['parentId']),
      sortOrder:
        typeof record['sortOrder'] === 'number' && Number.isFinite(record['sortOrder'])
          ? record['sortOrder']
          : index,
      description: typeof record['description'] === 'string' ? record['description'] : '',
      color: normalizeHexColor(record['color'], '#10b981'),
      createdAt: normalizeTimestamp(record['createdAt'], now),
      updatedAt: normalizeTimestamp(record['updatedAt'], now),
    });
  });

  const byId = new Map<string, CaseResolverCategory>(
    raw.map((category: CaseResolverCategory): [string, CaseResolverCategory] => [
      category.id,
      category,
    ])
  );
  const normalizedParents = raw.map(
    (category: CaseResolverCategory): CaseResolverCategory => ({
      ...category,
      parentId: resolveSafeCategoryParentId(category.id, category.parentId ?? null, byId),
    })
  );

  const grouped = new Map<string, CaseResolverCategory[]>();
  const getGroupKey = (parentId: string | null): string => parentId ?? '__root__';
  normalizedParents.forEach((category: CaseResolverCategory): void => {
    const key = getGroupKey(category.parentId ?? null);
    const current = grouped.get(key) ?? [];
    current.push(category);
    grouped.set(key, current);
  });

  const output: CaseResolverCategory[] = [];
  const visit = (parentId: string | null): void => {
    const key = getGroupKey(parentId);
    const group = grouped.get(key) ?? [];
    group
      .sort((left: CaseResolverCategory, right: CaseResolverCategory) => {
        const sortDelta = left.sortOrder - right.sortOrder;
        if (sortDelta !== 0) return sortDelta;
        const nameDelta = left.name.localeCompare(right.name);
        if (nameDelta !== 0) return nameDelta;
        return left.id.localeCompare(right.id);
      })
      .forEach((category: CaseResolverCategory, index: number): void => {
        output.push({
          ...category,
          sortOrder: index,
        });
        visit(category.id);
      });
  };

  visit(null);
  return output;
};

export const buildCaseResolverCategoryTree = (
  categories: CaseResolverCategory[]
): CaseResolverCategoryTreeNode[] => {
  const byId = new Map<string, CaseResolverCategoryTreeNode>();
  categories.forEach((category: CaseResolverCategory): void => {
    byId.set(category.id, { ...category, children: [] });
  });

  const roots: CaseResolverCategoryTreeNode[] = [];
  categories.forEach((category: CaseResolverCategory): void => {
    const current = byId.get(category.id);
    if (!current) return;
    if (!category.parentId) {
      roots.push(current);
      return;
    }
    const parent = byId.get(category.parentId);
    if (!parent) {
      roots.push(current);
      return;
    }
    parent.children.push(current);
  });

  const sortNodes = (nodes: CaseResolverCategoryTreeNode[]): void => {
    nodes.sort((left: CaseResolverCategoryTreeNode, right: CaseResolverCategoryTreeNode) => {
      const sortDelta = left.sortOrder - right.sortOrder;
      if (sortDelta !== 0) return sortDelta;
      const nameDelta = left.name.localeCompare(right.name);
      if (nameDelta !== 0) return nameDelta;
      return left.id.localeCompare(right.id);
    });
    nodes.forEach((node: CaseResolverCategoryTreeNode): void => {
      if (node.children.length > 0) sortNodes(node.children);
    });
  };
  sortNodes(roots);

  return roots;
};

export const parseCaseResolverTags = (raw: string | null | undefined): CaseResolverTag[] =>
  normalizeCaseResolverTags(parseJsonSetting<unknown>(raw, []));

export const parseCaseResolverIdentifiers = (
  raw: string | null | undefined
): CaseResolverIdentifier[] => normalizeCaseResolverIdentifiers(parseJsonSetting<unknown>(raw, []));

export const parseCaseResolverCategories = (
  raw: string | null | undefined
): CaseResolverCategory[] => normalizeCaseResolverCategories(parseJsonSetting<unknown>(raw, []));
