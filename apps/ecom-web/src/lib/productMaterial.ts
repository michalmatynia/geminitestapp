export type MaterialFilterProduct = {
  material?: string | null;
  name: string;
};

export function getProductMaterial(product: MaterialFilterProduct): string {
  const material = product.material?.trim();
  if (material !== undefined && material !== '') return material;
  const segments = product.name.split('|');
  if (segments.length <= 2) return '';
  return segments[2].trim();
}

export function productMatchesMaterials(product: MaterialFilterProduct, materials: string[]): boolean {
  if (materials.length === 0) return true;
  const productMaterial = getProductMaterial(product).toLowerCase();
  if (productMaterial === '') return false;
  return materials.some((m) => {
    const query = m.trim().toLowerCase();
    return query.length > 0 && productMaterial === query;
  });
}
