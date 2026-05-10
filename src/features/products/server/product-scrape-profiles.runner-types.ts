import type {
  ProductScrapeProfileImageImportMode,
  ProductScrapeProfileRuntimeProgressUpdate,
} from '@/shared/contracts/products/scrape-profiles';
import type { CatalogRecord } from '@/shared/contracts/products/catalogs';
import type { ProductDraft } from '@/shared/contracts/products/drafts';
import type { resolveRuntimeActionDefinition } from '@/shared/lib/browser-execution/runtime-action-resolver.server';
import type { listScrapePriceGroupsForCalculation } from './product-scrape-pricing';
import type { loadScrapeTemplateLinkedParameterMetadata } from './product-scrape-template-linked-parameters';
import type { ProductScrapeImageStepControls } from './product-scrape-profile-image-step-controls';
import type { ProductScrapeProfileConfig } from './product-scrape-profiles.candidates';

export type ProductScrapeProfileProgressReporter = (
  progress: ProductScrapeProfileRuntimeProgressUpdate
) => Promise<void>;

export type ProductScrapeProfileRunOptions = {
  reportProgress?: ProductScrapeProfileProgressReporter;
  signal?: AbortSignal;
  userId?: string | null;
  runtimeQueueName?: string | null;
  waitWhilePaused?: () => Promise<void>;
};

export type RuntimeActionDefinition = Awaited<ReturnType<typeof resolveRuntimeActionDefinition>>;

export type PreparedProductScrapeRun = {
  catalog: CatalogRecord;
  draftTemplate: ProductDraft | null;
  draftTemplateCategoryAliases: string[];
  draftTemplateLinkedParameterMetadata: Awaited<ReturnType<typeof loadScrapeTemplateLinkedParameterMetadata>> | null;
  dryRun: boolean;
  imageImportMode: ProductScrapeProfileImageImportMode;
  imageStepControls: ProductScrapeImageStepControls;
  priceGroups: Awaited<ReturnType<typeof listScrapePriceGroupsForCalculation>>;
  profile: ProductScrapeProfileConfig;
  runtimeAction: RuntimeActionDefinition;
  sourcePriceCurrencyCode: string;
};
