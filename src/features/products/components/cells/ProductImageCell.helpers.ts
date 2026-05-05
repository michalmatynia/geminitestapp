import {
  normalizeProductNotes,
  type ProductNotes,
  type ProductWithImages,
} from '@/shared/contracts/products/product';

export type ProductNoteValue = {
  text?: string | null;
  color?: string | null;
} | null | undefined;

export interface ProductImageCellProps {
  imageUrl: string | null;
  productId: string;
  productName: string;
  note?: ProductNoteValue;
}

export interface ResolvedProductNote {
  text: string;
  color: string;
}

export type ProductListCacheValue =
  | ProductWithImages[]
  | { items: ProductWithImages[] }
  | null
  | undefined;

export interface ProductNoteUpdate {
  hasText: boolean;
  nextNotes: ProductNotes | null;
  payload: Partial<ProductWithImages>;
  toastMessage: string;
}

export const BLUR_PLACEHOLDER =
  'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjQiIGhlaWdodD0iNjQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZyI+PHJlY3Qgd2lkdGg9IjY0IiBoZWlnaHQ9IjY0IiBmaWxsPSIjMjcyNzJhIi8+PC9zdmc+';
export const DEFAULT_NOTE_COLOR = '#f5e7c3';

export const hasImageUrl = (value: string | null): value is string =>
  value !== null && value !== '';

export const shouldSkipOptimization = (url: string): boolean => {
  if (url.startsWith('data:') || url.startsWith('blob:')) return true;
  if (url.startsWith('/')) return false;

  try {
    const { hostname } = new URL(url);
    if (
      hostname === 'ik.imagekit.io' ||
      hostname === 'upload.cdn.baselinker.com' ||
      hostname === 'milkbardesigners.com'
    ) {
      return false;
    }
  } catch {
    return true;
  }

  return true;
};

export const resolveProductNote = (note: ProductNoteValue): ResolvedProductNote | null => {
  if (note === null || note === undefined) return null;

  const text = typeof note.text === 'string' ? note.text.trim() : '';
  if (text.length === 0) return null;

  const rawColor = typeof note.color === 'string' ? note.color.trim() : '';
  return {
    text,
    color: rawColor.length > 0 ? rawColor : DEFAULT_NOTE_COLOR,
  };
};

export const mergeProductIntoListCache = (
  cacheValue: ProductListCacheValue,
  savedProduct: ProductWithImages
): ProductListCacheValue => {
  if (cacheValue === null || cacheValue === undefined) return cacheValue;
  if (Array.isArray(cacheValue)) {
    return cacheValue.map((product: ProductWithImages) =>
      product.id === savedProduct.id ? { ...product, ...savedProduct } : product
    );
  }
  if (Array.isArray(cacheValue.items)) {
    return {
      ...cacheValue,
      items: cacheValue.items.map((product: ProductWithImages) =>
        product.id === savedProduct.id ? { ...product, ...savedProduct } : product
      ),
    };
  }
  return cacheValue;
};

export const applySavedProductNoteOverride = (
  savedProduct: ProductWithImages,
  noteOverride?: ProductNoteValue
): ProductWithImages =>
  noteOverride === undefined
    ? savedProduct
    : {
        ...savedProduct,
        notes: normalizeProductNotes(noteOverride),
      };

export const buildProductNoteUpdate = (
  nextText: string,
  color: string,
  hasExistingNote = true
): ProductNoteUpdate => {
  if (nextText.length === 0) {
    return {
      hasText: false,
      nextNotes: null,
      payload: { notes: { text: null, color: null } },
      toastMessage: 'Product note removed',
    };
  }

  const nextNotes: ProductNotes = { text: nextText, color };
  return {
    hasText: true,
    nextNotes,
    payload: { notes: nextNotes },
    toastMessage: hasExistingNote ? 'Product note updated' : 'Product note created',
  };
};

export const shouldCloseNoteModalAfterSave = (closeAfter: boolean, hasText: boolean): boolean =>
  closeAfter || hasText === false;
