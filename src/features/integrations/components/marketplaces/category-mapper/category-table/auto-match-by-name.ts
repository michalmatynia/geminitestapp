import type { ExternalCategory } from '@/shared/contracts/integrations';
import type { ProductCategory } from '@/shared/contracts/products';

export type CategoryNameAutoMatch = {
  externalCategoryId: string;
  internalCategoryId: string;
};

export type AutoMatchCategoryMappingsByNameInput = {
  externalCategories: ExternalCategory[];
  internalCategories: ProductCategory[];
  pendingMappings: ReadonlyMap<string, string | null>;
  getCurrentMapping: (externalCategoryId: string) => string | null;
};

export type AutoMatchCategoryMappingsByNameResult = {
  matches: CategoryNameAutoMatch[];
  matchedCount: number;
  alreadyMappedCount: number;
  pendingCount: number;
  ambiguousCount: number;
  unmatchedCount: number;
};

const normalizeCategoryName = (value: string): string =>
  value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLocaleLowerCase()
    .replace(/\s+/g, ' ');

const normalizeCategoryPath = (segments: string[]): string =>
  segments
    .map((segment) => normalizeCategoryName(segment))
    .filter(Boolean)
    .join(' / ');

const splitExternalCategoryPath = (externalCategory: ExternalCategory): string[] => {
  const source = typeof externalCategory.path === 'string' ? externalCategory.path.trim() : '';
  if (!source) {
    return [];
  }

  return source
    .split(/\s*>\s*/)
    .map((segment) => segment.trim())
    .filter(Boolean);
};

const buildInternalCategoryPaths = (
  internalCategories: ProductCategory[]
): Map<string, string[]> => {
  const byId = new Map<string, ProductCategory>(
    internalCategories.map((category) => [category.id, category])
  );
  const cache = new Map<string, string[]>();

  const visit = (category: ProductCategory, trail: Set<string>): string[] => {
    const cached = cache.get(category.id);
    if (cached) return cached;

    const currentName = category.name.trim();
    if (!currentName) {
      cache.set(category.id, []);
      return [];
    }

    const parentId = typeof category.parentId === 'string' ? category.parentId.trim() : '';
    if (!parentId || !byId.has(parentId) || trail.has(parentId)) {
      const path = [currentName];
      cache.set(category.id, path);
      return path;
    }

    const parent = byId.get(parentId)!;
    const path = [...visit(parent, new Set([...trail, parentId])), currentName];
    cache.set(category.id, path);
    return path;
  };

  const paths = new Map<string, string[]>();
  for (const category of internalCategories) {
    const path = visit(category, new Set([category.id]));
    const normalized = normalizeCategoryPath(path);
    if (!normalized) continue;
    const current = paths.get(normalized) ?? [];
    current.push(category.id);
    paths.set(normalized, current);
  }

  return paths;
};

export const autoMatchCategoryMappingsByName = ({
  externalCategories,
  internalCategories,
  pendingMappings,
  getCurrentMapping,
}: AutoMatchCategoryMappingsByNameInput): AutoMatchCategoryMappingsByNameResult => {
  const internalIdsByName = new Map<string, string[]>();
  const internalIdsByPath = buildInternalCategoryPaths(internalCategories);

  for (const category of internalCategories) {
    const normalizedName = normalizeCategoryName(category.name);
    if (!normalizedName) continue;
    const current = internalIdsByName.get(normalizedName) ?? [];
    current.push(category.id);
    internalIdsByName.set(normalizedName, current);
  }

  const unmatchedExternalGroups = new Map<string, ExternalCategory[]>();
  const matches: CategoryNameAutoMatch[] = [];
  let alreadyMappedCount = 0;
  let pendingCount = 0;
  let ambiguousCount = 0;
  let unmatchedCount = 0;

  for (const externalCategory of externalCategories) {
    if (pendingMappings.has(externalCategory.externalId)) {
      pendingCount += 1;
      continue;
    }

    if (getCurrentMapping(externalCategory.externalId) !== null) {
      alreadyMappedCount += 1;
      continue;
    }

    const normalizedPath = normalizeCategoryPath(splitExternalCategoryPath(externalCategory));
    const internalIdsForPath = [...new Set(internalIdsByPath.get(normalizedPath) ?? [])];
    if (normalizedPath && internalIdsForPath.length === 1) {
      matches.push({
        externalCategoryId: externalCategory.externalId,
        internalCategoryId: internalIdsForPath[0]!,
      });
      continue;
    }

    const normalizedName = normalizeCategoryName(externalCategory.name);
    if (!normalizedName) {
      unmatchedCount += 1;
      continue;
    }

    const current = unmatchedExternalGroups.get(normalizedName) ?? [];
    current.push(externalCategory);
    unmatchedExternalGroups.set(normalizedName, current);
  }

  for (const [normalizedName, externalGroup] of unmatchedExternalGroups) {
    const internalIds = [...new Set(internalIdsByName.get(normalizedName) ?? [])];

    if (internalIds.length === 1 && externalGroup.length === 1) {
      matches.push({
        externalCategoryId: externalGroup[0]!.externalId,
        internalCategoryId: internalIds[0]!,
      });
      continue;
    }

    if (internalIds.length === 0) {
      unmatchedCount += externalGroup.length;
      continue;
    }

    ambiguousCount += externalGroup.length;
  }

  return {
    matches,
    matchedCount: matches.length,
    alreadyMappedCount,
    pendingCount,
    ambiguousCount,
    unmatchedCount,
  };
};

export const formatAutoMatchCategoryMappingsByNameMessage = ({
  matchedCount,
  alreadyMappedCount,
  pendingCount,
  ambiguousCount,
  unmatchedCount,
}: AutoMatchCategoryMappingsByNameResult): string => {
  const parts = [`Matched ${matchedCount} categor${matchedCount === 1 ? 'y' : 'ies'}`];

  if (pendingCount > 0) {
    parts.push(`${pendingCount} pending`);
  }
  if (alreadyMappedCount > 0) {
    parts.push(`${alreadyMappedCount} already mapped`);
  }
  if (ambiguousCount > 0) {
    parts.push(`${ambiguousCount} ambiguous`);
  }
  if (unmatchedCount > 0) {
    parts.push(`${unmatchedCount} unmatched`);
  }

  return `${parts.join(', ')}.`;
};
