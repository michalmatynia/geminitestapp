'use client';

import { useQuery } from '@tanstack/react-query';
import { useContext, useEffect, useMemo, useState } from 'react';

import {
  resolveAmazonScanRecommendationReason,
  resolvePreferredAmazonExtractedScans,
} from '@/features/products/components/scans/ProductScanAmazonDetails';
import type { ProductScanAmazonFormBindings } from '@/features/products/components/scans/ProductScanAmazonExtractedFieldsPanel';
import { ProductFormCustomFieldContext } from '@/features/products/context/ProductFormCustomFieldContext';
import {
  ProductFormCoreActionsContext,
  ProductFormCoreStateContext,
} from '@/features/products/context/ProductFormCoreContext';
import { ProductFormParameterContext } from '@/features/products/context/ProductFormParameterContext';
import type { ProductWithImages } from '@/shared/contracts/products/product';
import type { ProductScanListResponse, ProductScanRecord } from '@/shared/contracts/product-scans';
import { api } from '@/shared/lib/api-client';
import { QUERY_KEYS } from '@/shared/lib/query-keys';

import { resolveScanQualityHintLabels } from './ProductFormLatestAmazonExtraction.helpers';
import {
  LatestAmazonExtractionView,
  type LatestAmazonExtractionViewModel,
} from './ProductFormLatestAmazonExtraction.parts';

const resolveProductId = (product: ProductWithImages | null | undefined): string =>
  product?.id.trim() ?? '';

const useAmazonProductScans = (productId: string): ProductScanRecord[] => {
  const latestAmazonScanQuery = useQuery<ProductScanListResponse, Error>({
    queryKey: QUERY_KEYS.products.scans(productId),
    enabled: productId.length > 0,
    queryFn: async () =>
      await api.get<ProductScanListResponse>(`/api/v2/products/${productId}/scans`, {
        cache: 'no-store',
        params: { limit: 10 },
      }),
  });

  return useMemo(
    () => resolvePreferredAmazonExtractedScans(latestAmazonScanQuery.data?.scans ?? []),
    [latestAmazonScanQuery.data?.scans]
  );
};

const useSelectedAmazonScan = (
  extractedAmazonScans: ProductScanRecord[]
): {
  selectedAmazonScan: ProductScanRecord | null;
  setSelectedScanId: React.Dispatch<React.SetStateAction<string | null>>;
} => {
  const [selectedScanId, setSelectedScanId] = useState<string | null>(null);

  useEffect(() => {
    if (extractedAmazonScans.length === 0) {
      setSelectedScanId(null);
      return;
    }

    setSelectedScanId((current) => {
      if (current !== null && extractedAmazonScans.some((scan) => scan.id === current)) {
        return current;
      }
      return extractedAmazonScans[0]?.id ?? null;
    });
  }, [extractedAmazonScans]);

  const selectedAmazonScan = useMemo(
    () =>
      extractedAmazonScans.find((scan) => scan.id === selectedScanId) ??
      extractedAmazonScans[0] ??
      null,
    [extractedAmazonScans, selectedScanId]
  );

  return { selectedAmazonScan, setSelectedScanId };
};

const useAmazonFormBindings = (): ProductScanAmazonFormBindings | null => {
  const productFormCoreState = useContext(ProductFormCoreStateContext);
  const productFormCoreActions = useContext(ProductFormCoreActionsContext);
  const productFormParameters = useContext(ProductFormParameterContext);
  const productFormCustomFields = useContext(ProductFormCustomFieldContext);

  return useMemo(() => {
    if (
      productFormCoreState === null ||
      productFormCoreActions === null ||
      productFormParameters === null ||
      productFormCustomFields === null
    ) {
      return null;
    }

    return {
      getTextFieldValue: (field: 'asin' | 'ean' | 'gtin') => {
        const value = productFormCoreState.getValues(field);
        return typeof value === 'string' ? value : null;
      },
      getNumberFieldValue: (field: 'weight' | 'sizeLength' | 'sizeWidth' | 'length') => {
        const value = productFormCoreState.getValues(field);
        return typeof value === 'number' ? value : null;
      },
      applyTextField: (field: 'asin' | 'ean' | 'gtin', value: string) => {
        productFormCoreActions.setValue(field, value, {
          shouldDirty: true,
          shouldTouch: true,
          shouldValidate: true,
        });
      },
      applyNumberField: (
        field: 'weight' | 'sizeLength' | 'sizeWidth' | 'length',
        value: number
      ) => {
        productFormCoreActions.setValue(field, value, {
          shouldDirty: true,
          shouldTouch: true,
          shouldValidate: true,
        });
      },
      parameters: productFormParameters.parameters,
      parameterValues: productFormParameters.parameterValues,
      addParameterValue: productFormParameters.addParameterValue,
      updateParameterId: productFormParameters.updateParameterId,
      updateParameterValue: productFormParameters.updateParameterValue,
      customFields: productFormCustomFields.customFields,
      customFieldValues: productFormCustomFields.customFieldValues,
      setTextValue: productFormCustomFields.setTextValue,
      toggleSelectedOption: productFormCustomFields.toggleSelectedOption,
    };
  }, [
    productFormCoreActions,
    productFormCoreState,
    productFormCustomFields,
    productFormParameters,
  ]);
};

const useLatestAmazonExtractionModel = (): LatestAmazonExtractionViewModel | null => {
  const productFormCoreState = useContext(ProductFormCoreStateContext);
  const productId = resolveProductId(productFormCoreState?.product ?? null);
  const extractedAmazonScans = useAmazonProductScans(productId);
  const { selectedAmazonScan, setSelectedScanId } = useSelectedAmazonScan(extractedAmazonScans);
  const formBindings = useAmazonFormBindings();
  const recommendedScanId = extractedAmazonScans[0]?.id ?? null;
  const recommendedAmazonScan = useMemo(
    () =>
      recommendedScanId !== null
        ? extractedAmazonScans.find((scan) => scan.id === recommendedScanId) ??
          extractedAmazonScans[0] ??
          null
        : null,
    [extractedAmazonScans, recommendedScanId]
  );

  if (selectedAmazonScan === null) return null;

  return {
    extractedAmazonScans,
    formBindings,
    recommendedAmazonScan,
    recommendedScanId,
    recommendedScanReason:
      recommendedAmazonScan !== null
        ? resolveAmazonScanRecommendationReason(recommendedAmazonScan)
        : null,
    selectedAmazonScan,
    selectedScanQualityHints: resolveScanQualityHintLabels(selectedAmazonScan),
    setSelectedScanId,
  };
};

export default function ProductFormLatestAmazonExtraction(): React.JSX.Element | null {
  const model = useLatestAmazonExtractionModel();
  if (model === null) return null;
  return <LatestAmazonExtractionView model={model} />;
}
