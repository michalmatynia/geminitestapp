import type {
  ProductScanRecord,
} from '@/shared/contracts/product-scans';
import type {
  ProductScan1688ApplyPolicySummaryValue,
} from './ProductScan1688Details.helpers';

export type ProductScan1688ApplyField = 'supplierName' | 'supplierLink' | 'priceComment';

export type ProductScan1688FormBindings = {
  getTextFieldValue: (
    field: ProductScan1688ApplyField
  ) => string | null | undefined;
  applyTextField: (field: ProductScan1688ApplyField, value: string) => void;
  imageLinks?: string[] | null;
  imageBase64s?: string[] | null;
  setImageLinkAt?: (index: number, value: string) => void;
  setImageBase64At?: (index: number, value: string) => void;
};

export type ProductScan1688ApplyScan = Pick<
  ProductScanRecord,
  'url' | 'supplierDetails' | 'supplierEvaluation'
>;

export type ProductScan1688ApplyPanelProps = {
  scan: ProductScan1688ApplyScan;
  formBindings: ProductScan1688FormBindings | null;
};

export type ProductScan1688ApplyActions = {
  canAppendImageUrls: boolean;
  canApplyDetailedPriceComment: boolean;
  canApplyPriceComment: boolean;
  canApplySupplierLink: boolean;
  canApplySupplierName: boolean;
  canApplySupplierProductLink: boolean;
  canApplySupplierStoreLink: boolean;
  canReplaceImageUrls: boolean;
};

export type ProductScan1688ApplyImageState = {
  appendableImageUrlCount: number;
  currentImageBase64Slots: string[];
  currentImageLinkSlots: string[];
  emptyImageSlotCount: number;
  extractedImageUrls: string[];
  imageSlotCount: number;
  nextAppendedImageLinkSlots: string[];
  nextReplacedImageLinkSlots: string[];
};

export type ProductScan1688ApplyModel = {
  actions: ProductScan1688ApplyActions;
  blockActions: boolean;
  currentPriceComment: string | null;
  currentSupplierLink: string | null;
  currentSupplierName: string | null;
  detailedPriceComment: string | null;
  evaluationBanner: ProductScan1688ApplyPolicySummaryValue | null;
  formBindings: ProductScan1688FormBindings;
  imageState: ProductScan1688ApplyImageState;
  pendingActionCount: number;
  priceComment: string | null;
  supplierLink: string | null;
  supplierName: string | null;
  supplierPriceTiers: string[];
  supplierProductLink: string | null;
  supplierStoreLink: string | null;
};
