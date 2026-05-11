export type ThemeFilterProduct = {
  lore?: string | null;
  name: string;
};

export function getProductThemeName(product: ThemeFilterProduct): string {
  const lore = product.lore?.trim();
  if (lore) return lore;

  const fifthSegment = product.name.split('|')[4]?.trim();
  return fifthSegment ?? '';
}

export function productMatchesThemes(product: ThemeFilterProduct, themes: string[]): boolean {
  if (themes.length === 0) return true;
  const productTheme = getProductThemeName(product).toLowerCase();
  if (!productTheme) return false;

  return themes.some((theme) => {
    const query = theme.trim().toLowerCase();
    return query.length > 0 && productTheme.includes(query);
  });
}
