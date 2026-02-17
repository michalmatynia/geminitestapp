import type { ProductImageRecord } from '@/features/products/types';

export type ParsedProductForm = {
  rawData: Record<string, unknown>;
  images: File[];
  imageFileIds: string[];
  catalogIds: string[];
  categoryId: string | null;
  tagIds: string[];
  producerIds: string[];
  noteIds: string[];
  studioProjectId: string | null;
};

const normalizeIdEntries = (entries: FormDataEntryValue[]): string[] =>
  entries
    .map((entry: FormDataEntryValue): string =>
      typeof entry === 'string' ? entry.trim() : '',
    )
    .filter((entry: string): boolean => entry.length > 0);

const normalizeCategoryId = (formData: FormData): string | null => {
  const direct = formData.get('categoryId');
  if (typeof direct === 'string') {
    const trimmed = direct.trim();
    if (trimmed) return trimmed;
  }
  return null;
};

const normalizeStudioProjectId = (formData: FormData): string | null => {
  const raw = formData.get('studioProjectId');
  if (typeof raw !== 'string') return null;
  const normalized = raw.trim();
  return normalized.length > 0 ? normalized : null;
};

export function parseProductForm(formData: FormData): ParsedProductForm {
  const rawData = Object.fromEntries(formData.entries());
  const images = formData
    .getAll('images')
    .filter((x): x is File => x instanceof File && x.size > 0);
  const imageFileIds = formData
    .getAll('imageFileIds')
    .filter((x): x is string => typeof x === 'string');

  return {
    rawData,
    images,
    imageFileIds,
    catalogIds: normalizeIdEntries(formData.getAll('catalogIds')),
    categoryId: normalizeCategoryId(formData),
    tagIds: normalizeIdEntries(formData.getAll('tagIds')),
    producerIds: normalizeIdEntries(formData.getAll('producerIds')),
    noteIds: normalizeIdEntries(formData.getAll('noteIds')),
    studioProjectId: normalizeStudioProjectId(formData),
  };
}

export const getProductImageFilepath = (
  image: ProductImageRecord,
): string | null => {
  const imageFile = image.imageFile as unknown;
  if (!imageFile || typeof imageFile !== 'object' || Array.isArray(imageFile)) {
    return null;
  }
  const filepath = (imageFile as { filepath?: unknown }).filepath;
  if (typeof filepath !== 'string') return null;
  const normalized = filepath.trim();
  return normalized.length > 0 ? normalized : null;
};
