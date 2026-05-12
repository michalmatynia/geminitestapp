export type ProductCategoryDisplayOption = {
  name: string;
  parentName?: string | null;
};

const UNIVERSE_CATEGORY_PREFIXES = new Set(['Anime', 'Gaming', 'Movie']);

function uniqueTrimmed(values: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const normalized = value.trim();
    if (normalized === '' || seen.has(normalized)) continue;
    seen.add(normalized);
    result.push(normalized);
  }

  return result;
}

function firstWord(value: string): string {
  return value.trim().split(/\s+/)[0] ?? '';
}

function shouldUsePrefixAsParent(prefix: string, count: number): boolean {
  return UNIVERSE_CATEGORY_PREFIXES.has(prefix) || count > 1;
}

export function getCategoryDisplayNames(
  selectedCategories: string[],
  catalogCategories: ProductCategoryDisplayOption[] = [],
): string[] {
  const selected = uniqueTrimmed(selectedCategories);
  const categoryByName = new Map(
    catalogCategories.map((category) => [category.name.trim(), category]),
  );
  const fallbackPrefixCounts = new Map<string, number>();

  for (const category of selected) {
    const prefix = firstWord(category);
    if (prefix === '') continue;
    fallbackPrefixCounts.set(prefix, (fallbackPrefixCounts.get(prefix) ?? 0) + 1);
  }

  return uniqueTrimmed(
    selected.map((category) => {
      const prefix = firstWord(category);
      if (
        prefix !== '' &&
        shouldUsePrefixAsParent(prefix, fallbackPrefixCounts.get(prefix) ?? 0)
      ) {
        return prefix;
      }

      const parentName = categoryByName.get(category)?.parentName?.trim();
      return parentName === undefined || parentName === '' ? category : parentName;
    }),
  );
}

export function getCategorySelectorTitle(
  selectedCategories: string[],
  catalogCategories: ProductCategoryDisplayOption[] = [],
): string {
  return getCategoryDisplayNames(selectedCategories, catalogCategories).join(', ');
}
