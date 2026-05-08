import 'server-only';

export type ProductScrapeImageStepControls = {
  applyImagePayload: boolean;
  collectProductGalleryImages: boolean;
  collectScrapedImageLinks: boolean;
  downloadProductGalleryImages: boolean;
  downloadScrapedImages: boolean;
  uploadProductImages: boolean;
};

export const DEFAULT_PRODUCT_SCRAPE_IMAGE_STEP_CONTROLS: ProductScrapeImageStepControls = {
  applyImagePayload: true,
  collectProductGalleryImages: true,
  collectScrapedImageLinks: true,
  downloadProductGalleryImages: true,
  downloadScrapedImages: true,
  uploadProductImages: true,
};

export const normalizeProductScrapeImageStepControls = (
  controls: Partial<ProductScrapeImageStepControls> | undefined
): ProductScrapeImageStepControls => ({
  ...DEFAULT_PRODUCT_SCRAPE_IMAGE_STEP_CONTROLS,
  ...(controls ?? {}),
});
