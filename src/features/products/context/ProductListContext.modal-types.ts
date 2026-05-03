import type { ProductListingsRecoveryContext } from '@/shared/contracts/integrations/listings';
import type { ProductDraft } from '@/shared/contracts/products/drafts';
import type { ProductWithImages } from '@/shared/contracts/products/product';
import type { ProductAiRunFeedback } from '@/features/products/lib/product-ai-run-feedback';
import type { ProductScanRunFeedback } from '@/features/products/lib/product-scan-run-feedback';

export interface ProductListRowRuntimeContextType {
  showMarketplaceBadge: boolean;
  integrationStatus: string;
  showTraderaBadge: boolean;
  traderaStatus: string;
  showVintedBadge: boolean;
  vintedStatus: string;
  showScrapedSourceBadge: boolean;
  scrapedSourceStatus: string;
  showPlaywrightProgrammableBadge: boolean;
  playwrightProgrammableStatus: string;
  productAiRunFeedback: ProductAiRunFeedback | null;
  productScanRunFeedback: ProductScanRunFeedback | null;
}

export interface ProductListModalsContextType {
  isCreateOpen: boolean;
  isPromptOpen: boolean;
  setIsPromptOpen: (open: boolean) => void;
  handleConfirmSku: (sku: string) => Promise<void>;
  initialSku: string;
  createDraft: ProductDraft | null;
  initialCatalogId: string | null;
  onCloseCreate: () => void;
  onCreateSuccess: (info?: { queued?: boolean }) => void;
  editingProduct: ProductWithImages | null;
  isEditHydrating: boolean;
  onCloseEdit: () => void;
  onEditSuccess: (info?: { queued?: boolean }) => void;
  onEditSave: (saved: ProductWithImages) => void;
  integrationsProduct: ProductWithImages | null;
  integrationsRecoveryContext: ProductListingsRecoveryContext | null;
  integrationsFilterIntegrationSlug: string | null;
  onCloseIntegrations: () => void;
  onStartListing: (
    integrationId: string,
    connectionId: string,
    options?: { autoSubmit?: boolean }
  ) => void;
  showListProductModal: boolean;
  onCloseListProduct: () => void;
  onListProductSuccess: () => void;
  listProductPreset:
    | { integrationId: string; connectionId: string; autoSubmit?: boolean }
    | null;
  exportSettingsProduct: ProductWithImages | null;
  onCloseExportSettings: () => void;
  onListingsUpdated: () => void;
  massListIntegration: { integrationId: string; connectionId: string } | null;
  massListProductIds: string[];
  onCloseMassList: () => void;
  onMassListSuccess: () => void;
  showIntegrationModal: boolean;
  onCloseIntegrationModal: () => void;
  onSelectIntegrationFromModal: (integrationId: string, connectionId: string) => void;
}
