import type {
  ProductImageSlotPreview,
  ProductStudioAuditEntry,
  ProductStudioRunStatus,
  ProductStudioVariantsResponse,
} from '@/features/products/context/ProductStudioContext.types';
import type { CatalogRecord } from '@/shared/contracts/products/catalogs';
import type { ProductCategory as ProductCategoryContract } from '@/shared/contracts/products/categories';
import type { ProductWithImages } from '@/shared/contracts/products/product';
import type {
  ProductValidationDenyBehavior,
  ProductValidationInstanceScope,
} from '@/shared/contracts/products/validation';

export interface BuildProductEditorWorkspaceContextBundleInput {
  productId: string | null;
  draftId: string | null;
  productTitle: string | null;
  activeTab: string;
  mountedTabs: string[];
  validationInstanceScope: ProductValidationInstanceScope;
  validatorEnabled: boolean;
  formatterEnabled: boolean;
  validationDenyBehavior: ProductValidationDenyBehavior;
  visibleIssueCount: number;
  visibleIssueFieldCount: number;
  validatorPatternCount: number;
  selectedCategoryId: string | null;
  selectedCatalogIds: string[];
  selectedTagIds: string[];
  selectedProducerIds: string[];
  hasUnsavedChanges: boolean;
  uploading: boolean;
  uploadError: string | null;
  uploadSuccess: boolean;
}

export interface BuildProductStudioWorkspaceContextBundleInput {
  product: ProductWithImages;
  studioProjectId: string | null;
  selectedImageIndex: number | null;
  imageSlotPreviews: ProductImageSlotPreview[];
  selectedVariantSlotId: string | null;
  variantsData: ProductStudioVariantsResponse | null;
  activeRunId: string | null;
  runStatus: ProductStudioRunStatus | null;
  pendingVariantPlaceholderCount: number;
  sequenceReadinessMessage: string | null;
  auditEntries: ProductStudioAuditEntry[];
}

export interface BuildProductLeafCategoriesContextBundleInput {
  categories: ProductCategoryContract[];
  catalogs: CatalogRecord[];
  selectedCatalogIds: string[];
}
