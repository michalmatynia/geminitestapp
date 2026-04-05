const productFormImport = (): Promise<typeof import('./ProductForm')> => import('./ProductForm');

let productFormPreloaded = false;

export const loadProductForm = productFormImport;

export function preloadProductFormChunk(): void {
  if (productFormPreloaded) return;
  productFormPreloaded = true;
  void productFormImport();
}
