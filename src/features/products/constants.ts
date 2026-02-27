import { PRODUCT_SIMPLE_PARAMETER_ID_PREFIX } from '@/shared/contracts/products';

export { PRODUCT_SIMPLE_PARAMETER_ID_PREFIX };
export const PRODUCT_DB_PROVIDER_SETTING_KEY = 'product_db_provider';
export const DEFAULT_PRODUCT_IMAGES_EXTERNAL_BASE_URL = 'http://localhost:3000';
export const PRODUCT_VALIDATION_REPLACEMENT_FIELDS = [
  'sku',
  'ean',
  'gtin',
  'asin',
  'price',
  'stock',
  'categoryId',
  'weight',
  'sizeLength',
  'sizeWidth',
  'length',
  'name_en',
  'name_pl',
  'name_de',
  'description_en',
  'description_pl',
  'description_de',
] as const;
