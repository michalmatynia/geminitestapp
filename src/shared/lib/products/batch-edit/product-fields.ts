import type {
  ProductBatchEditField,
  ProductBatchEditLanguage,
} from '@/shared/contracts/products/batch-edit';
import type { ProductWithImages } from '@/shared/contracts/products/product';

const LOCALIZED_FIELDS = {
  name: ['name_en', 'name_pl', 'name_de'],
  description: ['description_en', 'description_pl', 'description_de'],
} as const;

type LocalizedLogicalField = keyof typeof LOCALIZED_FIELDS;

export const isLocalizedLogicalField = (
  field: ProductBatchEditField
): field is LocalizedLogicalField => field === 'name' || field === 'description';

export const resolveLocalizedFieldNames = (
  field: LocalizedLogicalField,
  language: ProductBatchEditLanguage | undefined
): string[] => {
  if (language === undefined || language === 'all') return [...LOCALIZED_FIELDS[field]];
  return [`${field}_${language}`];
};

export const readProductFieldValue = (product: ProductWithImages, field: string): unknown => {
  switch (field) {
    case 'catalogIds':
      return product.catalogs.map((entry) => entry.catalogId);
    case 'tagIds':
      return product.tags.map((entry) => entry.tagId);
    case 'producerIds':
      return product.producers.map((entry) => entry.producerId);
    case 'imageFileIds':
      return product.images.map((entry) => entry.imageFileId);
    default:
      return (product as unknown as Record<string, unknown>)[field];
  }
};
