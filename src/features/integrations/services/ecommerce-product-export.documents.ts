import type {
  EcommerceCategoryDocument,
  EcommerceProductDocument,
} from './ecommerce-product-export.mapper';
import { toValidDate } from './ecommerce-product-export.timestamps';

export const ECOMMERCE_PRODUCT_DEPRECATED_PRICING_UNSET = {
  priceAddToPrice: '',
  priceBaseCurrencyCode: '',
  priceGroupBasePriceField: '',
  priceGroupType: '',
  priceMultiplier: '',
} as const;

export const toEcommerceCategoryDocumentUpdate = (
  document: EcommerceCategoryDocument
): EcommerceCategoryDocument => {
  const exportedAt = toValidDate(document.exportedAt, new Date());
  return {
    ...document,
    exportedAt,
    updatedAt: toValidDate(document.updatedAt, exportedAt),
  };
};

export const toEcommerceProductDocumentUpdate = (
  document: EcommerceProductDocument
): Partial<EcommerceProductDocument> => {
  const exportedAt = toValidDate(document.exportedAt, new Date());
  const documentForSet: Partial<EcommerceProductDocument> = {
    ...document,
    createdAt: toValidDate(document.createdAt, exportedAt),
    exportedAt,
    updatedAt: toValidDate(document.updatedAt, exportedAt),
  };
  delete documentForSet._id;
  return documentForSet;
};
