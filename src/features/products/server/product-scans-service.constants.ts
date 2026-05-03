import 'server-only';

export const PRODUCT_SCAN_TIMEOUT_MS = 180_000;
export const AMAZON_SCAN_TIMEOUT_MS = PRODUCT_SCAN_TIMEOUT_MS;
export const PRODUCT_SCAN_ORPHANED_ACTIVE_MAX_AGE_MS = 60_000;
export const PRODUCT_SCAN_ERROR_MAX_LENGTH = 2_000;
export const PRODUCT_SCAN_BATCH_MESSAGE_MAX_LENGTH = 1_000;
export const PRODUCT_SCAN_TITLE_MAX_LENGTH = 1_000;
export const PRODUCT_SCAN_PRICE_MAX_LENGTH = 200;
export const PRODUCT_SCAN_URL_MAX_LENGTH = 4_000;
export const PRODUCT_SCAN_DESCRIPTION_MAX_LENGTH = 8_000;
export const PRODUCT_SCAN_ASIN_MAX_LENGTH = 40;
export const PRODUCT_SCAN_MATCHED_IMAGE_ID_MAX_LENGTH = 160;
export const PRODUCT_SCAN_SEQUENCE_KEY_MAX_LENGTH = 120;
export const PRODUCT_SCAN_SYNC_PERSIST_ATTEMPTS = 2;
export const PRODUCT_SCAN_MIN_IMAGE_BYTES = 1;
export const PRODUCT_SCAN_MAX_REMOTE_IMAGE_BYTES = 15 * 1024 * 1024;
export const PRODUCT_SCAN_SUPPORTED_LOCAL_IMAGE_EXTENSIONS = new Set([
  '.jpg',
  '.jpeg',
  '.png',
  '.webp',
  '.gif',
  '.bmp',
  '.tif',
  '.tiff',
  '.avif',
  '.heic',
  '.heif',
  '.jfif',
]);
export const PRODUCT_SCAN_MANUAL_VERIFICATION_MESSAGE =
  'Google Lens requested captcha verification. Solve it in the opened browser window and the scan will continue automatically.';
export const PRODUCT_SCAN_URL_PATTERN = /^https?:\/\//i;
export const PRODUCT_SCAN_PUBLIC_UPLOADS_PATH_PATTERN = /^\/uploads\//i;
