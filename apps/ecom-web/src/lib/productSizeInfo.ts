export type SizeInfoFilterProduct = {
  sizeInfo?: string | null;
  name: string;
};

export function getProductSizeInfo(product: SizeInfoFilterProduct): string {
  const sizeInfo = product.sizeInfo?.trim();
  if (sizeInfo !== undefined && sizeInfo !== '') return sizeInfo;
  const segments = product.name.split('|');
  if (segments.length <= 1) return '';
  return segments[1].trim();
}

export function productMatchesSizes(product: SizeInfoFilterProduct, sizes: string[]): boolean {
  if (sizes.length === 0) return true;
  const productSize = getProductSizeInfo(product).toLowerCase();
  if (productSize === '') return false;
  return sizes.some((s) => {
    const query = s.trim().toLowerCase();
    return query.length > 0 && productSize === query;
  });
}
