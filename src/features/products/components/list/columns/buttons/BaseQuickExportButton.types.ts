import type { ProductListingsRecoveryContext } from '@/shared/contracts/integrations/listings';
import type { ProductWithImages } from '@/shared/contracts/products/product';
import type { TriggerButtonRunFeedbackStatus } from '@/shared/lib/ai-paths/trigger-button-run-feedback';

export type BaseQuickExportButtonProps = {
  product: ProductWithImages;
  status: string;
  prefetchListings: () => void;
  showMarketplaceBadge: boolean;
  onOpenIntegrations?: ((recoveryContext?: ProductListingsRecoveryContext) => void) | undefined;
};

export type QuickExportContext = {
  connectionId: string;
  inventoryId: string;
  templateId: string;
};

export type ExistingSkuDecisionState = QuickExportContext & {
  sku: string;
  existingProductId: string | null;
};

export type PersistedBaseQuickExportFeedback = {
  productId: string;
  runId: string | null;
  status: TriggerButtonRunFeedbackStatus;
  errorMessage?: string | null;
  expiresAt: number;
};
