import type {
  ProductScanProvider,
  ProductScanRecord,
  ProductScanStatus,
} from '@/shared/contracts/product-scans';
import type { ProductWithImages } from '@/shared/contracts/products/product';

export type ProductScanModalProps = {
  isOpen: boolean;
  onClose: () => void;
  productIds: string[];
  products: ProductWithImages[];
  provider?: ProductScanModalProvider;
};

export type ScanModalRow = {
  productId: string;
  productName: string;
  requestedAt: string;
  scanId: string | null;
  runId: string | null;
  status: ProductScanStatus | 'enqueuing';
  message: string | null;
  scan: ProductScanRecord | null;
};

export type ProductScanModalSelectedProduct = {
  productId: string;
  productName: string;
};

export type ProductScanModal1688Connection = {
  id?: string;
  name?: string;
  integrationId?: string;
  hasPlaywrightStorageState?: boolean;
  playwrightBrowser?: 'auto' | 'brave' | 'chrome' | 'chromium' | null;
  playwrightIdentityProfile?: 'default' | 'search' | 'marketplace' | null;
  playwrightPersonaId?: string;
  playwrightStorageStateUpdatedAt?: string;
  playwrightHumanizeMouse?: boolean;
};

export type ProductScanModalProvider = Extract<ProductScanProvider, 'amazon' | '1688'>;

export type ProductScanModalConfig = {
  batchEndpoint: string;
  batchFailureMessage: string;
  batchLabel: string;
  modalTitle: string;
  noQueuedMessage: string;
  openResultLabel: string;
  preparingLabel: string;
  refreshFailureMessage: string;
  resultStatusLabel: string;
  resultTypeLabel: string;
};
