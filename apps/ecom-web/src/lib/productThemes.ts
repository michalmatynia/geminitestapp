export type ThemeFilterProduct = {
  lore?: string | null;
  name: string;
};

export function getProductThemeName(product: ThemeFilterProduct): string {
  const lore = product.lore?.trim();
  if (lore !== undefined && lore !== '') return lore;

  const nameSegments = product.name.split('|');
  if (nameSegments.length <= 4) return '';

  return nameSegments[4].trim();
}

export function productMatchesThemes(product: ThemeFilterProduct, themes: string[]): boolean {
  if (themes.length === 0) return true;
  const productTheme = getProductThemeName(product).toLowerCase();
  if (productTheme === '') return false;

  return themes.some((theme) => {
    const query = theme.trim().toLowerCase();
    return query.length > 0 && productTheme.includes(query);
  });
}
