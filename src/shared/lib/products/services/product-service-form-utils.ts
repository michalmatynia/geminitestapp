import type { ProductImageRecord } from '@/shared/contracts/products/product';

export type ParsedProductImageSequenceEntry =
  | { kind: 'existing'; imageFileId: string }
  | { kind: 'upload'; file: File };

export type ParsedProductForm = {
  rawData: Record<string, unknown>;
  images: File[];
  imageFileIds: string[];
  imageSequence: ParsedProductImageSequenceEntry[];
  catalogIds: string[];
  categoryId: string | null;
  tagIds: string[];
  producerIds: string[];
  noteIds: string[];
  studioProjectId: string | null;
};

type BlobWithOptionalName = Blob & {
  name?: string;
};

export function formDataToObject(formData: FormData): Record<string, unknown> {
  const output: Record<string, unknown> = {};

  for (const [rawKey, value] of formData.entries()) {
    const isArrayKey = rawKey.endsWith('[]');
    const key = isArrayKey ? rawKey.slice(0, -2) : rawKey;
    const existing = output[key];

    if (existing === undefined) {
      output[key] = isArrayKey ? [value] : value;
      continue;
    }

    if (Array.isArray(existing)) {
      existing.push(value);
      continue;
    }

    output[key] = [existing, value];
  }

  return output;
}

const toUploadFile = (entry: FormDataEntryValue, uploadIndex: number): File | null => {
  if (typeof entry === 'string') return null;
  const candidate = entry as BlobWithOptionalName;
  if (typeof candidate.size !== 'number' || candidate.size <= 0) return null;

  if (typeof File !== 'undefined' && entry instanceof File) {
    return entry;
  }

  if (typeof Blob === 'undefined' || !(entry instanceof Blob) || typeof File === 'undefined') {
    return null;
  }

  const normalizedName =
    typeof candidate.name === 'string' && candidate.name.trim().length > 0
      ? candidate.name.trim()
      : `upload-${uploadIndex + 1}`;
  const normalizedType =
    typeof candidate.type === 'string' && candidate.type.trim().length > 0
      ? candidate.type
      : 'application/octet-stream';

  return new File([entry], normalizedName, { type: normalizedType });
};

const normalizeIdEntries = (entries: FormDataEntryValue[]): string[] =>
  entries
    .map((entry: FormDataEntryValue): string => (typeof entry === 'string' ? entry.trim() : ''))
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
  const rawData = formDataToObject(formData);
  const images: File[] = [];
  const imageFileIds: string[] = [];
  const imageSequence: ParsedProductImageSequenceEntry[] = [];

  for (const [key, entry] of formData.entries()) {
    if (key === 'images') {
      const uploadFile = toUploadFile(entry, images.length);
      if (!uploadFile) continue;
      images.push(uploadFile);
      imageSequence.push({ kind: 'upload', file: uploadFile });
      continue;
    }

    if (key === 'imageFileIds' && typeof entry === 'string') {
      const normalized = entry.trim();
      if (!normalized) continue;
      imageFileIds.push(normalized);
      imageSequence.push({ kind: 'existing', imageFileId: normalized });
    }
  }

  return {
    rawData,
    images,
    imageFileIds,
    imageSequence,
    catalogIds: normalizeIdEntries(formData.getAll('catalogIds')),
    categoryId: normalizeCategoryId(formData),
    tagIds: normalizeIdEntries(formData.getAll('tagIds')),
    producerIds: normalizeIdEntries(formData.getAll('producerIds')),
    noteIds: normalizeIdEntries(formData.getAll('noteIds')),
    studioProjectId: normalizeStudioProjectId(formData),
  };
}

export const getProductImageFilepath = (image: ProductImageRecord): string | null => {
  const imageFile = image.imageFile as unknown;
  if (!imageFile || typeof imageFile !== 'object' || Array.isArray(imageFile)) {
    return null;
  }
  const filepath = (imageFile as { filepath?: unknown }).filepath;
  if (typeof filepath !== 'string') return null;
  const normalized = filepath.trim();
  return normalized.length > 0 ? normalized : null;
};
