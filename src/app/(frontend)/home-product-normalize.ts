import type { ProductWithImages } from '@/shared/contracts/products';

type MaybeImages = {
  images?: (ProductWithImages['images'][number] | null)[] | null;
  catalogs?: (ProductWithImages['catalogs'][number] | null)[] | null;
};

const notNull = <T>(value: T | null | undefined): value is T => value != null;

export const normalizeHomeProducts = (
  productsRaw: (ProductWithImages | (ProductWithImages & MaybeImages))[]
): ProductWithImages[] =>
  productsRaw.map((product) => ({
    ...product,
    images: Array.isArray(product.images) ? product.images.filter(notNull) : [],
    catalogs: Array.isArray(product.catalogs) ? product.catalogs.filter(notNull) : [],
  }));
