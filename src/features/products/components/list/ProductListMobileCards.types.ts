import type {
  ProductListRowActionsContextType,
  ProductListRowRuntimeContextType,
  ProductListRowVisualsContextType,
} from '@/features/products/context/ProductListContext';
import type {
  ProductImportSource,
  ProductWithImages,
} from '@/shared/contracts/products/product';

export type ProductListMobileCardModel = {
  nameValue: string;
  displayName: string;
  selectionLabel: string;
  importSource: ProductImportSource | null;
  hasMarketplaceCopy: boolean;
  hasEnglishTitle: boolean;
  hasEnglishDescription: boolean;
  hasPolishTitle: boolean;
  hasPolishDescription: boolean;
  hasStatusIcons: boolean;
  skuLabel: string;
  duplicateSkuCount: number | null;
  duplicateSkuTitle: string | null;
  categoryLabel: string;
  categoryIsUnassigned: boolean;
  autoShippingGroupLabel: string;
  autoShippingRuleLabel: string;
  shippingRuleConflictLabel: string;
  missingManualShippingLabel: string;
  thumbnailUrl: string | null;
  createdAtLabel: string;
  baseCurrencyCode: string;
  hasConvertedPrice: boolean;
  showCurrencyIndicator: boolean;
  currencyCode: string;
  formattedPrice: string;
  basePriceLabel: string;
  sourcePriceLabel: string;
};

export type ProductListMobileCardOwnProps = {
  product: ProductWithImages;
  isSelected: boolean;
  toggleSelection: (productId: string, nextChecked: boolean) => void;
  prefetchListings: (productId: string) => void;
};

export type ProductListMobileCardViewProps = ProductListMobileCardOwnProps & {
  rowActions: ProductListRowActionsContextType;
  rowVisuals: ProductListRowVisualsContextType;
  rowRuntime: ProductListRowRuntimeContextType;
  model: ProductListMobileCardModel;
};
