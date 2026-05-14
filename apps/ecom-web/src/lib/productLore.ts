export type LoreFilterProduct = { lore?: string | null; name: string };

export function getProductLore(product: LoreFilterProduct): string {
  const lore = product.lore?.trim();
  if (lore !== undefined && lore !== '') return lore;
  const segments = product.name.split('|');
  if (segments.length <= 4) return '';
  return segments[4].trim();
}

export function productMatchesLores(product: LoreFilterProduct, lores: string[]): boolean {
  if (lores.length === 0) return true;
  const productLore = getProductLore(product).toLowerCase();
  if (productLore === '') return false;
  return lores.some((l) => {
    const query = l.trim().toLowerCase();
    return query.length > 0 && productLore === query;
  });
}
