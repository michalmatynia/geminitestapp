import type { ExternalCategory } from '@/shared/contracts/integrations/listings';
import type { InternalCategoryOption } from '@/shared/contracts/integrations/context';
import type { ProductCategory } from '@/shared/contracts/products/categories';

export const normalizeParentExternalId = (value: string | null | undefined): string | null => {
  const candidate = typeof value === 'string' ? value.trim() : '';
  if (!candidate || candidate === '0' || candidate.toLowerCase() === 'null') {
    return null;
  }
  return candidate;
};

export const isMissingExternalCategoryName = (value: string | null | undefined): boolean => {
  const candidate = typeof value === 'string' ? value.trim() : '';
  return candidate.startsWith('[Missing external category:');
};

export const buildInternalCategoryOptions = (categories: ProductCategory[]): InternalCategoryOption[] => {
  if (categories.length === 0) return [];

  const byId = new Map<string, ProductCategory>(
    categories.map((category: ProductCategory): [string, ProductCategory] => [
      category.id,
      category,
    ])
  );
  const childrenByParentId = new Map<string | null, ProductCategory[]>();

  const pushChild = (parentId: string | null, category: ProductCategory): void => {
    const current = childrenByParentId.get(parentId) ?? [];
    current.push(category);
    childrenByParentId.set(parentId, current);
  };

  for (const category of categories) {
    const rawParentId = typeof category.parentId === 'string' ? category.parentId.trim() : '';
    const normalizedParentId =
      rawParentId.length > 0 && rawParentId !== category.id && byId.has(rawParentId)
        ? rawParentId
        : null;
    pushChild(normalizedParentId, category);
  }

  for (const [, children] of childrenByParentId) {
    children.sort((a: ProductCategory, b: ProductCategory): number => a.name.localeCompare(b.name));
  }

  const visited = new Set<string>();
  const options: InternalCategoryOption[] = [];

  const visit = (parentId: string | null, depth: number, ancestry: string[]): void => {
    const children = childrenByParentId.get(parentId) ?? [];
    for (const child of children) {
      if (visited.has(child.id)) continue;
      visited.add(child.id);
      const path = [...ancestry, child.name];
      const indent = depth > 0 ? `${'\u00A0\u00A0'.repeat(depth)}↳ ` : '';
      options.push({
        value: child.id,
        label: `${indent}${path.join(' / ')}`,
      });
      visit(child.id, depth + 1, path);
    }
  };

  visit(null, 0, []);

  const unvisited = categories
    .filter((category: ProductCategory): boolean => !visited.has(category.id))
    .sort((a: ProductCategory, b: ProductCategory): number => a.name.localeCompare(b.name));

  for (const category of unvisited) {
    if (visited.has(category.id)) continue;
    visited.add(category.id);
    options.push({ value: category.id, label: category.name });
    visit(category.id, 1, [category.name]);
  }

  return options;
};

export const isRootExternalCategory = (
  category: ExternalCategory,
  externalIds: Set<string>
): boolean => {
  const parentExternalId = normalizeParentExternalId(category.parentExternalId);
  if (!parentExternalId) return true;
  if (parentExternalId === category.externalId) return true;
  return !externalIds.has(parentExternalId);
};
