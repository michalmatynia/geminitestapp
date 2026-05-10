import type { ProductScrapeImageStepControls } from './product-scrape-profile-image-step-controls';
import type {
  ProductScrapeProfileImageImportMode,
  ProductScrapeProfileRuntimeProgressUpdate,
} from '@/shared/contracts/products/scrape-profiles';
import type { CatalogRecord } from '@/shared/contracts/products/catalogs';
import type { PriceGroupForCalculation } from '@/shared/contracts/products/product';
import type { ProductDraft } from '@/shared/contracts/products/drafts';
import type { ProductScrapeProfileConfig } from './product-scrape-profiles.candidates';
import type { ScrapeTemplateLinkedParameterMetadata } from './product-scrape-template-linked-parameters';

export type ProductScrapeDuplicateState = { seenKeys: Set<string> };

export type ProductScrapeProfileProgressReporter = (
  progress: ProductScrapeProfileRuntimeProgressUpdate
) => Promise<void>;

export type ProductScrapeRunContext = {
  profile: ProductScrapeProfileConfig;
  catalog: CatalogRecord;
  dryRun: boolean;
  imageImportMode: ProductScrapeProfileImageImportMode;
  imageStepControls: ProductScrapeImageStepControls;
  skipRecordsWithErrors: boolean;
  productServiceOptions: { userId?: string } | undefined;
  priceGroups: PriceGroupForCalculation[];
  sourcePriceCurrencyCode: string;
  duplicateState?: ProductScrapeDuplicateState;
  draftTemplate?: ProductDraft | null;
  draftTemplateCategoryAliases?: readonly string[];
  draftTemplateLinkedParameterMetadata?: ScrapeTemplateLinkedParameterMetadata | null;
  reportProgress?: ProductScrapeProfileProgressReporter;
  signal?: AbortSignal;
  waitWhilePaused?: () => Promise<void>;
};
