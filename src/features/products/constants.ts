import {
  PRODUCT_SIMPLE_PARAMETER_ID_PREFIX,
  PRODUCT_STUDIO_DEFAULT_PROJECT_SETTING_KEY,
} from '@/shared/contracts/products';

export { PRODUCT_SIMPLE_PARAMETER_ID_PREFIX, PRODUCT_STUDIO_DEFAULT_PROJECT_SETTING_KEY };
export const PRODUCT_DB_PROVIDER_SETTING_KEY = 'product_db_provider';
export const PRODUCT_VALIDATOR_ENABLED_BY_DEFAULT_SETTING_KEY =
  'product_validator_enabled_by_default';
export const PRODUCT_FORMATTER_ENABLED_BY_DEFAULT_SETTING_KEY =
  'product_formatter_enabled_by_default';
export const PRODUCT_VALIDATOR_INSTANCE_DENY_BEHAVIOR_SETTING_KEY =
  'product_validator_instance_deny_behavior';
export const PRODUCT_VALIDATOR_DECISION_LOG_SETTING_KEY =
  'product_validator_decision_log';
export const PRODUCT_SIMPLE_PARAMETERS_SETTING_KEY = 'product_simple_parameters';
export const PRODUCT_IMAGES_EXTERNAL_BASE_URL_SETTING_KEY =
  'product_images_external_base_url';
export const PRODUCT_IMAGES_EXTERNAL_ROUTES_SETTING_KEY =
  'product_images_external_routes';
export const PRODUCT_STUDIO_SEQUENCE_GENERATION_MODE_SETTING_KEY =
  'product_studio_sequence_generation_mode';
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
