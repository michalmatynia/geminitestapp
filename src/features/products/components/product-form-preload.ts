import type * as ProductFormModule from './ProductForm';

const productFormImport = (): Promise<typeof ProductFormModule> => import('./ProductForm');

let productFormPreloaded = false;

export const loadProductForm = productFormImport;

export function preloadProductFormChunk(): void {
  if (productFormPreloaded) return;
  productFormPreloaded = true;
  void productFormImport();
}
