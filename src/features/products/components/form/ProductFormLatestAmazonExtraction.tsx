'use client';

import { useQuery } from '@tanstack/react-query';
import { useContext, useEffect, useMemo, useState } from 'react';

import { ProductScanAmazonExtractedFieldsPanel } from '@/features/products/components/scans/ProductScanAmazonExtractedFieldsPanel';
import {
  resolveAmazonScanRecommendationReason,
  resolvePreferredAmazonExtractedScans,
  resolveAmazonScanQualitySummary,
  resolveRejectedAmazonCandidateBreakdown,
} from '@/features/products/components/scans/ProductScanAmazonDetails';
import { ProductFormCustomFieldContext } from '@/features/products/context/ProductFormCustomFieldContext';
import {
  ProductFormCoreActionsContext,
  ProductFormCoreStateContext,
} from '@/features/products/context/ProductFormCoreContext';
import { ProductFormParameterContext } from '@/features/products/context/ProductFormParameterContext';
import type { ProductScanListResponse, ProductScanRecord } from '@/shared/contracts/product-scans';
import { api } from '@/shared/lib/api-client';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import { Button } from '@/shared/ui/button';
import { FormSection } from '@/shared/ui/form-section';

const resolveScanSelectionLabel = (scan: ProductScanRecord): string => {
  const statusLabel = scan.status.replace(/_/g, ' ');
  const asinLabel = scan.asin?.trim() ? `ASIN ${scan.asin.trim()}` : 'No ASIN';
  return `${formatTimestamp(scan.updatedAt)} · ${statusLabel} · ${asinLabel}`;
};

const resolveScanQualityHintLabels = (scan: ProductScanRecord): string[] => {
  const quality = resolveAmazonScanQualitySummary(scan);
  const rejectedCandidateBreakdown = resolveRejectedAmazonCandidateBreakdown(scan.steps);
  const rejectedCandidateCount = rejectedCandidateBreakdown.totalCount;
  if (!quality) {
    return rejectedCandidateCount > 0
      ? [
          `${rejectedCandidateCount} rejected candidate${
            rejectedCandidateCount === 1 ? '' : 's'
          }`,
          rejectedCandidateBreakdown.languageRejectedCount > 0
            ? `${rejectedCandidateBreakdown.languageRejectedCount} non-English`
            : null,
        ]
          .filter((value): value is string => Boolean(value))
      : [];
  }

  return [
    quality.primaryLabel,
    quality.usedFallback ? 'Fallback used' : null,
    quality.usedCaptcha ? 'Captcha path' : null,
    rejectedCandidateCount > 0
      ? `${rejectedCandidateCount} rejected candidate${
          rejectedCandidateCount === 1 ? '' : 's'
        }`
      : null,
    rejectedCandidateBreakdown.languageRejectedCount > 0
      ? `${rejectedCandidateBreakdown.languageRejectedCount} non-English`
      : null,
  ].filter((value): value is string => Boolean(value));
};

const formatTimestamp = (value: string | null | undefined): string => {
  if (!value) return 'Unknown time';
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  return parsed.toLocaleString();
};

export default function ProductFormLatestAmazonExtraction(): React.JSX.Element | null {
  const productFormCoreState = useContext(ProductFormCoreStateContext);
  const productFormCoreActions = useContext(ProductFormCoreActionsContext);
  const productFormParameters = useContext(ProductFormParameterContext);
  const productFormCustomFields = useContext(ProductFormCustomFieldContext);

  const productId = productFormCoreState?.product?.id?.trim() || '';

  const latestAmazonScanQuery = useQuery<ProductScanListResponse, Error>({
    queryKey: QUERY_KEYS.products.scans(productId),
    enabled: productId.length > 0,
    queryFn: async () =>
      await api.get<ProductScanListResponse>(`/api/v2/products/${productId}/scans`, {
        cache: 'no-store',
        params: { limit: 10 },
      }),
  });

  const extractedAmazonScans = useMemo(
    () => resolvePreferredAmazonExtractedScans(latestAmazonScanQuery.data?.scans ?? []),
    [latestAmazonScanQuery.data?.scans]
  );
  const [selectedScanId, setSelectedScanId] = useState<string | null>(null);

  useEffect(() => {
    if (extractedAmazonScans.length === 0) {
      setSelectedScanId(null);
      return;
    }

    setSelectedScanId((current) =>
      current && extractedAmazonScans.some((scan) => scan.id === current)
        ? current
        : extractedAmazonScans[0]!.id
    );
  }, [extractedAmazonScans]);

  const selectedAmazonScan = useMemo(
    () =>
      extractedAmazonScans.find((scan) => scan.id === selectedScanId) ??
      extractedAmazonScans[0] ??
      null,
    [extractedAmazonScans, selectedScanId]
  );
  const selectedScanQualityHints = useMemo(
    () => (selectedAmazonScan ? resolveScanQualityHintLabels(selectedAmazonScan) : []),
    [selectedAmazonScan]
  );
  const recommendedScanId = extractedAmazonScans[0]?.id ?? null;
  const recommendedAmazonScan = useMemo(
    () =>
      recommendedScanId
        ? extractedAmazonScans.find((scan) => scan.id === recommendedScanId) ??
          extractedAmazonScans[0] ??
          null
        : null,
    [extractedAmazonScans, recommendedScanId]
  );
  const recommendedScanReason = useMemo(
    () =>
      recommendedAmazonScan
        ? resolveAmazonScanRecommendationReason(recommendedAmazonScan)
        : null,
    [recommendedAmazonScan]
  );

  const formBindings = useMemo(() => {
    if (
      !productFormCoreState ||
      !productFormCoreActions ||
      !productFormParameters ||
      !productFormCustomFields
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

  if (!selectedAmazonScan) {
    return null;
  }

  return (
    <FormSection title='Latest Amazon Extraction'>
      <div className='space-y-3'>
        <div className='rounded-md border border-border/50 bg-muted/20 px-3 py-2 text-sm text-muted-foreground'>
          <p>
            {extractedAmazonScans.length > 1
              ? `Showing ${resolveScanSelectionLabel(selectedAmazonScan)}.`
              : `Latest extracted Amazon scan from ${formatTimestamp(selectedAmazonScan.updatedAt)}.`}
          </p>
          {selectedScanQualityHints.length > 0 ? (
            <div className='mt-2 flex flex-wrap gap-2'>
              {selectedAmazonScan.id === recommendedScanId ? (
                <span className='inline-flex items-center rounded-md border border-emerald-500/40 bg-background/70 px-2 py-0.5 text-[11px] font-medium text-emerald-300'>
                  Recommended
                </span>
              ) : null}
              {selectedAmazonScan.id === recommendedScanId && recommendedScanReason ? (
                <span className='inline-flex items-center rounded-md border border-emerald-500/20 bg-background/70 px-2 py-0.5 text-[11px] font-medium text-emerald-200'>
                  {recommendedScanReason}
                </span>
              ) : null}
              {selectedScanQualityHints.map((label) => (
                <span
                  key={`selected-quality-${label}`}
                  className='inline-flex items-center rounded-md border border-border/60 bg-background/70 px-2 py-0.5 text-[11px] font-medium'
                >
                  {label}
                </span>
              ))}
            </div>
          ) : null}
          {recommendedAmazonScan && selectedAmazonScan.id !== recommendedAmazonScan.id ? (
            <div className='mt-2 rounded-md border border-emerald-500/20 bg-background/70 px-3 py-2 text-[11px] text-emerald-100'>
              <p className='font-medium text-emerald-200'>Recommended instead:</p>
              <p className='mt-1 truncate'>{resolveScanSelectionLabel(recommendedAmazonScan)}</p>
              {recommendedScanReason ? (
                <p className='mt-1 text-emerald-200'>{recommendedScanReason}</p>
              ) : null}
            </div>
          ) : null}
        </div>
        {extractedAmazonScans.length > 1 ? (
          <div className='space-y-2'>
            <p className='text-[11px] font-medium uppercase tracking-wide text-muted-foreground'>
              Recent extracted scans
            </p>
            <div className='flex flex-wrap gap-2'>
              {extractedAmazonScans.map((scan, index) => {
                const isSelected = scan.id === selectedAmazonScan.id;
                const qualityHintLabels = resolveScanQualityHintLabels(scan);
                const isRecommended = scan.id === recommendedScanId;
                const recommendedReason = isRecommended
                  ? resolveAmazonScanRecommendationReason(scan)
                  : null;
                return (
                  <Button
                    key={scan.id}
                    type='button'
                    variant={isSelected ? 'default' : 'outline'}
                    size='sm'
                    onClick={() => setSelectedScanId(scan.id)}
                    className='h-auto min-h-8 max-w-full px-3 py-1.5 text-left text-[11px]'
                    aria-label={`Show Amazon extraction ${index + 1}`}
                  >
                    <span className='block truncate'>{resolveScanSelectionLabel(scan)}</span>
                    {isRecommended ? (
                      <span className='mt-1 block truncate text-[10px] font-medium text-emerald-300'>
                        Recommended
                      </span>
                    ) : null}
                    {isRecommended && recommendedReason ? (
                      <span className='mt-1 block truncate text-[10px] text-emerald-200'>
                        {recommendedReason}
                      </span>
                    ) : null}
                    {qualityHintLabels.length > 0 ? (
                      <span className='mt-1 block truncate text-[10px] opacity-80'>
                        {qualityHintLabels.join(' · ')}
                      </span>
                    ) : null}
                  </Button>
                );
              })}
            </div>
          </div>
        ) : null}
        <ProductScanAmazonExtractedFieldsPanel
          scan={selectedAmazonScan}
          formBindings={formBindings}
        />
      </div>
    </FormSection>
  );
}
