export const PRODUCT_DB_PROVIDER_SETTING_KEY = 'product_db_provider';
export const PRODUCT_VALIDATOR_ENABLED_BY_DEFAULT_SETTING_KEY = 'product_validator_enabled_by_default';
export const PRODUCT_IMAGES_EXTERNAL_BASE_URL_SETTING_KEY = 'product_images_external_base_url';
export const PRODUCT_IMAGES_EXTERNAL_ROUTES_SETTING_KEY = 'product_images_external_routes';
export const DEFAULT_PRODUCT_IMAGES_EXTERNAL_BASE_URL = 'http://localhost:3000';
export const PRODUCT_VALIDATION_REPLACEMENT_FIELDS = [
  'sku',
  'ean',
  'gtin',
  'asin',
  'price',
  'stock',
  'name_en',
  'name_pl',
  'name_de',
  'description_en',
  'description_pl',
  'description_de',
] as const;
