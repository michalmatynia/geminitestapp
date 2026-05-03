'use client';

import { useFormContext, type UseFormReturn } from 'react-hook-form';

import { useProductFormCore } from '@/features/products/context/ProductFormCoreContext';
import {
  useProductFormMetadata,
  type ProductFormMetadataContextType,
} from '@/features/products/context/ProductFormMetadataContext';
import type { ProductFormData } from '@/shared/contracts/products/drafts';
import type { ProductValidationPattern } from '@/shared/contracts/products/validation';

import {
  useProductFormValidatorSettings,
  type ProductFormValidatorSettingsResult,
} from './validator/useProductFormValidatorSettings';

export type ProductFormValidatorContextState = {
  draftId: string | null;
  form: UseFormReturn<ProductFormData>;
  instanceDenyBehavior: unknown;
  metadata: ProductFormMetadataContextType;
  productCatalogId: string;
  productId: string | null;
  settings: ProductFormValidatorSettingsResult;
  validatorPatterns: ProductValidationPattern[];
};

type ProductFormCoreState = ReturnType<typeof useProductFormCore>;
type ProductValidatorConfigData =
  ProductFormValidatorSettingsResult['validatorConfigQuery']['data'];

const resolveDraftId = (draft: ProductFormCoreState['draft']): string | null =>
  draft?.id ?? null;

const resolveProductCatalogId = (product: ProductFormCoreState['product']): string =>
  product?.catalogId ?? '';

const resolveProductId = (product: ProductFormCoreState['product']): string | null =>
  product?.id ?? null;

const resolveInstanceDenyBehavior = (config: ProductValidatorConfigData): unknown =>
  config?.instanceDenyBehavior ?? null;

const resolveValidatorPatterns = (
  config: ProductValidatorConfigData
): ProductValidationPattern[] => config?.patterns ?? [];

export const useProductFormValidatorContextState = (): ProductFormValidatorContextState => {
  const { product, draft } = useProductFormCore();
  const metadata = useProductFormMetadata();
  const form = useFormContext<ProductFormData>();
  const settings = useProductFormValidatorSettings();
  const config = settings.validatorConfigQuery.data;

  return {
    draftId: resolveDraftId(draft),
    form,
    instanceDenyBehavior: resolveInstanceDenyBehavior(config),
    metadata,
    productCatalogId: resolveProductCatalogId(product),
    productId: resolveProductId(product),
    settings,
    validatorPatterns: resolveValidatorPatterns(config),
  };
};
