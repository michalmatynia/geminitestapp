'use client';

import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, ChevronUp, ExternalLink, Loader2, RefreshCw, Search } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import { ProductAmazonScanModal } from '@/features/products/components/list/ProductAmazonScanModal';
import {
  hasProductScanAmazonDetails,
  ProductScanAmazonQualitySummary,
  ProductScanAmazonProvenanceSummary,
  ProductScanAmazonDetails,
} from '@/features/products/components/scans/ProductScanAmazonDetails';
import {
  buildProductScanArtifactHref,
  ProductScanDiagnostics,
  resolveProductScanDiagnosticFailureSummary,
  resolveProductScanDiagnostics,
} from '@/features/products/components/scans/ProductScanDiagnostics';
import {
  ProductScanSteps,
  resolveProductScanActiveStepSummary,
  resolveProductScanContinuationSummary,
  resolveProductScanLatestOutcomeSummary,
} from '@/features/products/components/scans/ProductScanSteps';
import { useProductFormCustomFields } from '@/features/products/context/ProductFormCustomFieldContext';
import { useProductFormCore } from '@/features/products/context/ProductFormCoreContext';
import { useProductFormParameters } from '@/features/products/context/ProductFormParameterContext';
import { PRODUCT_SCANNER_SETTINGS_HREF } from '@/features/products/scanner-settings';
import type { ProductCustomFieldDefinition } from '@/shared/contracts/products/custom-fields';
import type { ProductFormData } from '@/shared/contracts/products/drafts';
import type { ProductScanListResponse, ProductScanRecord } from '@/shared/contracts/product-scans';
import { isProductScanActiveStatus } from '@/shared/contracts/product-scans';
import { api } from '@/shared/lib/api-client';
import { invalidateProductsCountsAndDetail } from '@/shared/lib/query-invalidation';
import { QUERY_KEYS } from '@/shared/lib/query-keys';
import { Button } from '@/shared/ui/button';
import { CopyButton } from '@/shared/ui/copy-button';
import {
  resolveStatusLabel,
  resolveStatusClassName,
  normalizeComparableAsin,
  normalizeComparableText,
  normalizeMetadataLabel,
  ScanAttributeMapping,
  parseAmazonWeightKg,
  parseAmazonDimensionsCm,
  buildAmazonMappedFields,
  resolveAmazonMappedFieldKey,
  resolveUnmappedAmazonFields,
  resolveCheckboxSetOptionMatch,
  haveSameSelectedOptions,
  formatCustomFieldSelectedOptionLabels,
  formatTimestamp,
  renderScanMeta,
  resolveScanMessages,
} from './ProductFormScans.helpers';

export default function ProductFormScans(): React.JSX.Element {
  const { product, getValues, setValue } = useProductFormCore();
  const {
    parameters,
    parameterValues,
    addParameterValue,
    updateParameterId,
    updateParameterValue,
  } = useProductFormParameters();
  const { customFields, customFieldValues, setTextValue, toggleSelectedOption } =
    useProductFormCustomFields();
  const productId = product?.id?.trim() || '';
  const queryClient = useQueryClient();
  const invalidatedUpdatedScanIdsRef = useRef<Set<string>>(new Set());
  const pendingUpdatedScanIdsRef = useRef<Set<string>>(new Set());
  const invalidationSessionRef = useRef(0);
  const [isScanModalOpen, setIsScanModalOpen] = useState(false);
  const [expandedScanIds, setExpandedScanIds] = useState<Set<string>>(new Set());
  const [expandedDiagnosticScanIds, setExpandedDiagnosticScanIds] = useState<Set<string>>(new Set());
  const [expandedExtractedFieldScanIds, setExpandedExtractedFieldScanIds] = useState<Set<string>>(
    new Set()
  );

  const scansQuery = useQuery<ProductScanListResponse, Error>({
    queryKey: QUERY_KEYS.products.scans(productId),
    enabled: productId.length > 0,
    queryFn: async () =>
      await api.get<ProductScanListResponse>(`/api/v2/products/${productId}/scans`, {
        cache: 'no-store',
      }),
    refetchInterval: (query) => {
      const scans = query.state.data?.scans ?? [];
      return scans.some((scan) => isProductScanActiveStatus(scan.status)) ? 3000 : false;
    },
  });
  const scans = scansQuery.data?.scans ?? [];
  const scansDataUpdatedAt = scansQuery.dataUpdatedAt;

  useEffect(() => {
    invalidationSessionRef.current += 1;
    invalidatedUpdatedScanIdsRef.current = new Set();
    pendingUpdatedScanIdsRef.current = new Set();
    setExpandedScanIds(new Set());
    setExpandedDiagnosticScanIds(new Set());
    setExpandedExtractedFieldScanIds(new Set());
  }, [productId]);

  const toggleScanSteps = (scanId: string): void => {
    setExpandedScanIds((current) => {
      const next = new Set(current);
      if (next.has(scanId)) {
        next.delete(scanId);
      } else {
        next.add(scanId);
      }
      return next;
    });
  };

  const toggleExtractedFields = (scanId: string): void => {
    setExpandedExtractedFieldScanIds((current) => {
      const next = new Set(current);
      if (next.has(scanId)) {
        next.delete(scanId);
      } else {
        next.add(scanId);
      }
      return next;
    });
  };

  const toggleDiagnostics = (scanId: string): void => {
    setExpandedDiagnosticScanIds((current) => {
      const next = new Set(current);
      if (next.has(scanId)) {
        next.delete(scanId);
      } else {
        next.add(scanId);
      }
      return next;
    });
  };

  const applyProductFormValue = <TField extends keyof ProductFormData>(
    field: TField,
    value: ProductFormData[TField]
  ): void => {
    if (typeof setValue !== 'function') {
      return;
    }
    setValue(field, value as never, {
      shouldDirty: true,
      shouldTouch: true,
      shouldValidate: true,
    });
  };

  const getCurrentProductFormValue = <TField extends keyof ProductFormData>(
    field: TField
  ): ProductFormData[TField] | undefined =>
    typeof getValues === 'function' ? getValues(field) : undefined;

  const buildAttributeMappings = (
    scan: Pick<ProductScanRecord, 'amazonDetails'>
  ): ScanAttributeMapping[] => {
    const sourceEntries = buildAmazonMappedFields(scan);
    if (sourceEntries.length === 0) {
      return [];
    }

    const parameterByLabel = new Map(
      parameters
        .map((parameter) => {
          const normalizedLabel =
            normalizeMetadataLabel(parameter.name_en) ??
            normalizeMetadataLabel(parameter.name_pl) ??
            normalizeMetadataLabel(parameter.name_de);
          return normalizedLabel
            ? [
                normalizedLabel,
                {
                  id: parameter.id,
                  label: parameter.name_en || parameter.name_pl || parameter.name_de || 'Parameter',
                },
              ]
            : null;
        })
        .filter((entry): entry is [string, { id: string; label: string }] => Boolean(entry))
    );

    const customFieldByLabel = new Map(
      customFields
        .map((field) => {
          const normalizedLabel = normalizeMetadataLabel(field.name);
          return normalizedLabel ? [normalizedLabel, field] : null;
        })
        .filter((entry): entry is [string, ProductCustomFieldDefinition] => Boolean(entry))
    );

    const usedTargets = new Set<string>();
    const mappings: ScanAttributeMapping[] = [];

    for (const entry of sourceEntries) {
      const normalizedSourceLabel = normalizeMetadataLabel(entry.sourceLabel);
      if (!normalizedSourceLabel) {
        continue;
      }

      const parameterMatch = parameterByLabel.get(normalizedSourceLabel);
      if (parameterMatch) {
        const targetKey = `parameter:${parameterMatch.id}`;
        if (!usedTargets.has(targetKey)) {
          usedTargets.add(targetKey);
          mappings.push({
            targetType: 'parameter',
            targetId: parameterMatch.id,
            targetLabel: parameterMatch.label,
            sourceLabel: entry.sourceLabel,
            value: entry.value,
          });
        }
        continue;
      }

      const customFieldMatch = customFieldByLabel.get(normalizedSourceLabel);
      if (customFieldMatch) {
        const targetKey = `custom_field:${customFieldMatch.id}`;
        if (!usedTargets.has(targetKey)) {
          usedTargets.add(targetKey);
          if (customFieldMatch.type === 'checkbox_set') {
            const optionMatch = resolveCheckboxSetOptionMatch(customFieldMatch, entry.value);
            if (optionMatch) {
              mappings.push({
                targetType: 'custom_field_checkbox_set',
                targetId: customFieldMatch.id,
                targetLabel: customFieldMatch.name,
                sourceLabel: entry.sourceLabel,
                value: entry.value,
                targetOptionIds: optionMatch.optionIds,
                targetOptionLabels: optionMatch.optionLabels,
              });
            } else {
              usedTargets.delete(targetKey);
            }
          } else {
            mappings.push({
              targetType: 'custom_field_text',
              targetId: customFieldMatch.id,
              targetLabel: customFieldMatch.name,
              sourceLabel: entry.sourceLabel,
              value: entry.value,
            });
          }
        }
      }
    }

    return mappings;
  };

  const applyMatchedAttributeMappings = (mappings: ScanAttributeMapping[]): void => {
    const parameterValueCount = parameterValues.length;
    let queuedParameterAdds = 0;

    for (const mapping of mappings) {
      if (mapping.targetType === 'parameter') {
        const existingIndex = parameterValues.findIndex(
          (entry) => entry.parameterId === mapping.targetId
        );
        if (existingIndex >= 0) {
          updateParameterValue(existingIndex, mapping.value);
          continue;
        }

        const nextIndex = parameterValueCount + queuedParameterAdds;
        queuedParameterAdds += 1;
        addParameterValue();
        updateParameterId(nextIndex, mapping.targetId);
        updateParameterValue(nextIndex, mapping.value);
        continue;
      }

      if (mapping.targetType === 'custom_field_text') {
        setTextValue(mapping.targetId, mapping.value);
        continue;
      }

      const currentSelectedOptionIds =
        customFieldValues.find((entry) => entry.fieldId === mapping.targetId)?.selectedOptionIds ?? [];
      const currentSelectedOptionIdSet = new Set(currentSelectedOptionIds);
      const targetOptionIdSet = new Set(mapping.targetOptionIds);
      const targetField = customFields.find((field) => field.id === mapping.targetId);
      if (targetField?.type !== 'checkbox_set') {
        continue;
      }

      for (const option of targetField.options) {
        const shouldBeChecked = targetOptionIdSet.has(option.id);
        if (currentSelectedOptionIdSet.has(option.id) !== shouldBeChecked) {
          toggleSelectedOption(mapping.targetId, option.id, shouldBeChecked);
        }
      }
    }
  };

  const isAttributeMappingPending = (mapping: ScanAttributeMapping): boolean => {
    if (mapping.targetType === 'parameter') {
      const existingValue = parameterValues.find((entry) => entry.parameterId === mapping.targetId)?.value;
      return normalizeComparableText(existingValue) !== normalizeComparableText(mapping.value);
    }

    const existingValue = customFieldValues.find((entry) => entry.fieldId === mapping.targetId);
    if (mapping.targetType === 'custom_field_text') {
      return normalizeComparableText(existingValue?.textValue) !== normalizeComparableText(mapping.value);
    }

    return !haveSameSelectedOptions(existingValue?.selectedOptionIds, mapping.targetOptionIds);
  };

  const getAttributeMappingCurrentValue = (mapping: ScanAttributeMapping): string | null => {
    if (mapping.targetType === 'parameter') {
      return (
        normalizeComparableText(
          parameterValues.find((entry) => entry.parameterId === mapping.targetId)?.value
        ) ?? null
      );
    }

    const existingValue = customFieldValues.find((entry) => entry.fieldId === mapping.targetId);
    if (mapping.targetType === 'custom_field_text') {
      return normalizeComparableText(existingValue?.textValue) ?? null;
    }

    const targetField = customFields.find((field) => field.id === mapping.targetId);
    if (targetField?.type !== 'checkbox_set') {
      return null;
    }

    return formatCustomFieldSelectedOptionLabels(targetField, existingValue?.selectedOptionIds);
  };

  useEffect(() => {
    if (!productId || scans.length === 0) {
      return;
    }

    const currentProductAsin = normalizeComparableAsin(product?.asin);
    const unseenUpdatedScanIds = scans
      .filter((scan) => {
        if (scan.asinUpdateStatus !== 'updated') {
          return false;
        }

        const scanAsin = normalizeComparableAsin(scan.asin);
        return !scanAsin || scanAsin !== currentProductAsin;
      })
      .map((scan) => scan.id)
      .filter(
        (scanId) =>
          !invalidatedUpdatedScanIdsRef.current.has(scanId) &&
          !pendingUpdatedScanIdsRef.current.has(scanId)
      );

    if (unseenUpdatedScanIds.length === 0) {
      return;
    }

    unseenUpdatedScanIds.forEach((scanId) => {
      pendingUpdatedScanIdsRef.current.add(scanId);
    });

    const invalidationSession = invalidationSessionRef.current;
    void invalidateProductsCountsAndDetail(queryClient, productId)
      .then(() => {
        if (invalidationSession !== invalidationSessionRef.current) {
          return;
        }
        unseenUpdatedScanIds.forEach((scanId) => {
          pendingUpdatedScanIdsRef.current.delete(scanId);
          invalidatedUpdatedScanIdsRef.current.add(scanId);
        });
      })
      .catch(() => {
        if (invalidationSession !== invalidationSessionRef.current) {
          return;
        }
        unseenUpdatedScanIds.forEach((scanId) => {
          pendingUpdatedScanIdsRef.current.delete(scanId);
        });
      });
  }, [product?.asin, productId, queryClient, scans, scansDataUpdatedAt]);

  if (!productId) {
    return (
      <div className='rounded-md border border-dashed border-border/60 px-4 py-6 text-sm text-muted-foreground'>
        Save the product before using scans.
      </div>
    );
  }

  if (scansQuery.isLoading) {
    return (
      <div className='flex min-h-[160px] items-center justify-center gap-3 text-sm text-muted-foreground'>
        <Loader2 className='h-4 w-4 animate-spin' />
        Loading scans...
      </div>
    );
  }

  if (scansQuery.isError && scans.length === 0) {
    return (
      <div className='space-y-3 rounded-md border border-destructive/40 px-4 py-5'>
        <p className='text-sm text-destructive'>
          {scansQuery.error.message || 'Failed to load product scans.'}
        </p>
        <Button
          type='button'
          variant='outline'
          size='sm'
          onClick={() => void scansQuery.refetch()}
          className='h-8 gap-1.5 px-3 text-xs'
        >
          <RefreshCw className='h-3.5 w-3.5' />
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className='space-y-4'>
      <div className='flex items-center justify-between gap-3'>
        <div>
          <h3 className='text-sm font-medium'>Scan History</h3>
          <p className='text-xs text-muted-foreground'>
            Amazon reverse image scans for this product.
          </p>
        </div>
        <div className='flex items-center gap-2'>
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={() => setIsScanModalOpen(true)}
            className='h-8 gap-1.5 px-3 text-xs'
          >
            <Search className='h-3.5 w-3.5' />
            Scan Amazon
          </Button>
          <Button type='button' variant='outline' size='sm' asChild className='h-8 px-3 text-xs'>
            <Link href={PRODUCT_SCANNER_SETTINGS_HREF}>Scanner settings</Link>
          </Button>
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={() => void scansQuery.refetch()}
            disabled={scansQuery.isFetching}
            className='h-8 gap-1.5 px-3 text-xs'
          >
            <RefreshCw className={`h-3.5 w-3.5 ${scansQuery.isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {scansQuery.isError ? (
        <div className='rounded-md border border-amber-500/40 px-4 py-3 text-sm text-amber-300'>
          {scansQuery.error.message || 'Failed to refresh product scans.'}
        </div>
      ) : null}

      {scans.length === 0 ? (
        <div className='rounded-md border border-dashed border-border/60 px-4 py-6 text-sm text-muted-foreground'>
          No scans have been recorded for this product yet.
        </div>
      ) : (
        <div className='space-y-3'>
          {scans.map((scan) => {
            const { infoMessage, errorMessage } = resolveScanMessages(scan);
            const scanSteps = Array.isArray(scan.steps) ? scan.steps : [];
            const isExpanded = expandedScanIds.has(scan.id);
            const diagnosticsExpanded = expandedDiagnosticScanIds.has(scan.id);
            const hasExtractedFields = hasProductScanAmazonDetails(scan.amazonDetails) || Boolean(scan.asin);
            const diagnostics = resolveProductScanDiagnostics(scan);
            const latestFailureArtifact = diagnostics?.failureArtifacts[0] ?? null;
            const hasDiagnostics = Boolean(diagnostics);
            const failureArtifactCount = diagnostics?.failureArtifacts.length ?? 0;
            const latestFailureArtifactPath = latestFailureArtifact?.path ?? null;
            const latestFailureArtifactHref = latestFailureArtifact
              ? buildProductScanArtifactHref(scan.id, latestFailureArtifact)
              : null;
            const extractedFieldsExpanded = expandedExtractedFieldScanIds.has(scan.id);
            const progressSummary =
              isProductScanActiveStatus(scan.status) && scanSteps.length > 0
                ? resolveProductScanActiveStepSummary(scanSteps)
                : null;
            const continuationSummary =
              isProductScanActiveStatus(scan.status) && scanSteps.length > 0
                ? resolveProductScanContinuationSummary(scanSteps)
                : null;
            const latestOutcomeSummary =
              scanSteps.length > 0 &&
              !progressSummary &&
              (scan.status === 'failed' ||
                scan.status === 'conflict' ||
                isProductScanActiveStatus(scan.status))
                ? resolveProductScanLatestOutcomeSummary(scanSteps, {
                    allowStalled: isProductScanActiveStatus(scan.status),
                  })
                : null;
            const fallbackFailureSummary =
              !latestOutcomeSummary && (scan.status === 'failed' || scan.status === 'conflict')
                ? resolveProductScanDiagnosticFailureSummary(scan)
                : null;
            const currentAsin = normalizeComparableText(getCurrentProductFormValue('asin'));
            const currentEan = normalizeComparableText(getCurrentProductFormValue('ean'));
            const currentGtin = normalizeComparableText(getCurrentProductFormValue('gtin'));
            const currentWeightValue = getCurrentProductFormValue('weight');
            const currentWeight = typeof currentWeightValue === 'number' ? currentWeightValue : null;
            const currentSizeLengthValue = getCurrentProductFormValue('sizeLength');
            const currentSizeLength =
              typeof currentSizeLengthValue === 'number' ? currentSizeLengthValue : null;
            const currentSizeWidthValue = getCurrentProductFormValue('sizeWidth');
            const currentSizeWidth =
              typeof currentSizeWidthValue === 'number' ? currentSizeWidthValue : null;
            const currentHeightValue = getCurrentProductFormValue('length');
            const currentHeight = typeof currentHeightValue === 'number' ? currentHeightValue : null;
            const parsedDimensions = parseAmazonDimensionsCm(
              scan.amazonDetails?.itemDimensions ?? scan.amazonDetails?.packageDimensions ?? null
            );
            const parsedWeight = parseAmazonWeightKg(
              scan.amazonDetails?.itemWeight ?? scan.amazonDetails?.packageWeight ?? null
            );
            const attributeMappings = buildAttributeMappings(scan);
            const unmappedFields = resolveUnmappedAmazonFields(scan, attributeMappings);
            const pendingAttributeMappings = attributeMappings.filter((mapping) =>
              isAttributeMappingPending(mapping)
            );
            const canApplyDimensions =
              parsedDimensions != null &&
              (currentSizeLength !== parsedDimensions.sizeLength ||
                currentSizeWidth !== parsedDimensions.sizeWidth ||
                currentHeight !== parsedDimensions.length);
            const canApplyWeight = parsedWeight != null && currentWeight !== parsedWeight;

            return (
              <section
                key={scan.id}
                className='space-y-2 rounded-md border border-border/60 px-4 py-4'
              >
                <div className='flex flex-wrap items-center justify-between gap-2'>
                  <div className='flex flex-wrap items-center gap-2'>
                    <span className='text-sm font-medium'>Amazon</span>
                    <span
                      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium ${resolveStatusClassName(scan)}`}
                    >
                      {resolveStatusLabel(scan)}
                    </span>
                  </div>
                  <span className='text-xs text-muted-foreground'>
                    {formatTimestamp(scan.createdAt)}
                  </span>
                </div>

                <div className='flex items-center justify-end gap-1'>
                  <Button
                    type='button'
                    variant='ghost'
                    size='sm'
                    onClick={() => toggleExtractedFields(scan.id)}
                    disabled={!hasExtractedFields}
                    className='h-7 gap-1.5 px-2 text-xs'
                  >
                    {extractedFieldsExpanded ? (
                      <ChevronUp className='h-3.5 w-3.5' />
                    ) : (
                      <ChevronDown className='h-3.5 w-3.5' />
                    )}
                    {extractedFieldsExpanded ? 'Hide extracted fields' : 'Show extracted fields'}
                  </Button>
                  <Button
                    type='button'
                    variant='ghost'
                    size='sm'
                    onClick={() => toggleDiagnostics(scan.id)}
                    disabled={!hasDiagnostics}
                    className='h-7 gap-1.5 px-2 text-xs'
                  >
                    {diagnosticsExpanded ? (
                      <ChevronUp className='h-3.5 w-3.5' />
                    ) : (
                      <ChevronDown className='h-3.5 w-3.5' />
                    )}
                    {diagnosticsExpanded ? 'Hide diagnostics' : 'Show diagnostics'}
                  </Button>
                  <Button
                    type='button'
                    variant='ghost'
                    size='sm'
                    onClick={() => toggleScanSteps(scan.id)}
                    disabled={scanSteps.length === 0}
                    className='h-7 gap-1.5 px-2 text-xs'
                  >
                    {isExpanded ? (
                      <ChevronUp className='h-3.5 w-3.5' />
                    ) : (
                      <ChevronDown className='h-3.5 w-3.5' />
                    )}
                    {isExpanded ? 'Hide steps' : 'Show steps'}
                  </Button>
                </div>

                {progressSummary ? (
                  <div className='space-y-1 rounded-md border border-blue-500/20 bg-blue-500/5 px-3 py-2'>
                    <div className='flex flex-wrap items-center gap-2 text-xs'>
                      <span className='inline-flex items-center rounded-md border border-blue-500/20 px-2 py-0.5 font-medium text-foreground'>
                        {progressSummary.phaseLabel}
                      </span>
                      <span className='text-muted-foreground'>Current step</span>
                      <span className='font-medium text-foreground'>{progressSummary.stepLabel}</span>
                      {progressSummary.attempt ? (
                        <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 font-medium text-muted-foreground'>
                          Attempt {progressSummary.attempt}
                        </span>
                      ) : null}
                      {progressSummary.inputSource ? (
                        <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 font-medium text-muted-foreground'>
                          {progressSummary.inputSource === 'url' ? 'URL input' : 'File input'}
                        </span>
                      ) : null}
                    </div>
                    {progressSummary.message ? (
                      <p className='text-sm text-muted-foreground'>{progressSummary.message}</p>
                    ) : null}
                  </div>
                ) : null}

                {continuationSummary ? (
                  <div className='space-y-1 rounded-md border border-amber-500/20 bg-amber-500/5 px-3 py-2'>
                    <div className='flex flex-wrap items-center gap-2 text-xs'>
                      <span className='inline-flex items-center rounded-md border border-amber-500/20 px-2 py-0.5 font-medium text-amber-300'>
                        Candidate continuation
                      </span>
                      <span className='text-muted-foreground'>After AI rejection</span>
                      <span className='font-medium text-foreground'>{continuationSummary.stepLabel}</span>
                      {continuationSummary.resultCodeLabel ? (
                        <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 font-medium text-muted-foreground'>
                          {continuationSummary.resultCodeLabel}
                        </span>
                      ) : null}
                      {continuationSummary.attempt ? (
                        <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 font-medium text-muted-foreground'>
                          Attempt {continuationSummary.attempt}
                        </span>
                      ) : null}
                    </div>
                    {continuationSummary.message ? (
                      <p className='text-sm text-muted-foreground'>{continuationSummary.message}</p>
                    ) : null}
                    <div className='flex flex-wrap gap-3 text-xs text-muted-foreground'>
                      {continuationSummary.rejectedUrl ? (
                        <span>Rejected: {continuationSummary.rejectedUrl}</span>
                      ) : null}
                      {continuationSummary.nextUrl ? (
                        <span>Next: {continuationSummary.nextUrl}</span>
                      ) : null}
                    </div>
                  </div>
                ) : null}

                {latestOutcomeSummary || fallbackFailureSummary ? (
                  <div
                    className={`space-y-1 rounded-md px-3 py-2 ${
                      latestOutcomeSummary?.kind === 'failed' || fallbackFailureSummary
                        ? 'border border-destructive/20 bg-destructive/5'
                        : 'border border-amber-500/20 bg-amber-500/5'
                    }`}
                  >
                    <div className='flex flex-wrap items-center gap-2 text-xs'>
                      <span
                        className={`inline-flex items-center rounded-md px-2 py-0.5 font-medium ${
                          latestOutcomeSummary?.kind === 'failed' || fallbackFailureSummary
                            ? 'border border-destructive/20 text-destructive'
                            : 'border border-amber-500/20 text-amber-300'
                        }`}
                      >
                        {latestOutcomeSummary?.phaseLabel ?? fallbackFailureSummary?.phaseLabel}
                      </span>
                      <span className='text-muted-foreground'>
                        {latestOutcomeSummary?.kind === 'failed' || fallbackFailureSummary
                          ? 'Last failure'
                          : 'Last completed step'}
                      </span>
                      <span className='font-medium text-foreground'>
                        {latestOutcomeSummary?.stepLabel ?? fallbackFailureSummary?.stepLabel}
                      </span>
                      {(latestOutcomeSummary?.sourceLabel ?? fallbackFailureSummary?.sourceLabel) ? (
                        <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 font-medium text-muted-foreground'>
                          {latestOutcomeSummary?.sourceLabel ?? fallbackFailureSummary?.sourceLabel}
                        </span>
                      ) : null}
                      {(latestOutcomeSummary?.resultCodeLabel ?? fallbackFailureSummary?.resultCodeLabel) ? (
                        <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 font-medium text-muted-foreground'>
                          {latestOutcomeSummary?.resultCodeLabel ?? fallbackFailureSummary?.resultCodeLabel}
                        </span>
                      ) : null}
                      {latestOutcomeSummary?.attempt ? (
                        <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 font-medium text-muted-foreground'>
                          Attempt {latestOutcomeSummary.attempt}
                        </span>
                      ) : null}
                      {latestOutcomeSummary?.inputSource ? (
                        <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 font-medium text-muted-foreground'>
                          {latestOutcomeSummary.inputSource === 'url' ? 'URL input' : 'File input'}
                        </span>
                      ) : null}
                      {failureArtifactCount > 0 ? (
                        <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 font-medium text-muted-foreground'>
                          {failureArtifactCount} artifact{failureArtifactCount === 1 ? '' : 's'}
                        </span>
                      ) : null}
                      {latestFailureArtifactPath ? (
                        <CopyButton
                          value={latestFailureArtifactPath}
                          variant='outline'
                          size='sm'
                          showText
                          className='h-6 px-2 text-[11px]'
                          ariaLabel='Copy artifact path'
                        />
                      ) : null}
                    </div>
                    {(latestOutcomeSummary?.message ?? fallbackFailureSummary?.message) ? (
                      <p className='text-sm text-muted-foreground'>
                        {latestOutcomeSummary?.message ?? fallbackFailureSummary?.message}
                      </p>
                    ) : null}
                    {(latestOutcomeSummary?.timingLabel ?? fallbackFailureSummary?.timingLabel) ? (
                      <p className='text-xs text-muted-foreground'>
                        {latestOutcomeSummary?.timingLabel ?? fallbackFailureSummary?.timingLabel}
                      </p>
                    ) : null}
                    {(latestOutcomeSummary?.url ?? fallbackFailureSummary?.url) ? (
                      <a
                        href={latestOutcomeSummary?.url ?? fallbackFailureSummary?.url ?? undefined}
                        target='_blank'
                        rel='noopener noreferrer'
                        className='inline-flex items-center gap-1 text-xs text-primary underline-offset-2 hover:underline'
                      >
                        Open stage URL
                        <ExternalLink className='h-3.5 w-3.5' />
                      </a>
                    ) : null}
                    {latestFailureArtifactHref ? (
                      <a
                        href={latestFailureArtifactHref}
                        target='_blank'
                        rel='noopener noreferrer'
                        className='inline-flex items-center gap-1 text-xs text-primary underline-offset-2 hover:underline'
                      >
                        Open latest artifact
                        <ExternalLink className='h-3.5 w-3.5' />
                      </a>
                    ) : null}
                  </div>
                ) : null}

                {scan.title ? <p className='text-sm font-medium'>{scan.title}</p> : null}
                {renderScanMeta(scan)}
                {scan.url ? (
                  <a
                    href={scan.url}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='inline-flex items-center gap-1 text-xs text-primary underline-offset-2 hover:underline'
                  >
                    Open Result
                    <ExternalLink className='h-3.5 w-3.5' />
                  </a>
                ) : null}
                {scan.description ? (
                  <p className='line-clamp-3 text-sm text-muted-foreground'>{scan.description}</p>
                ) : null}
                {infoMessage ? <p className='text-sm text-muted-foreground'>{infoMessage}</p> : null}
                {errorMessage ? <p className='text-sm text-destructive'>{errorMessage}</p> : null}
                {extractedFieldsExpanded ? (
                  <div className='space-y-3'>
                    <ProductScanAmazonQualitySummary scan={scan} />
                    <ProductScanAmazonProvenanceSummary scan={scan} />
                    <div className='flex flex-wrap gap-2'>
                      {scan.asin ? (
                        <Button
                          type='button'
                          variant='outline'
                          size='sm'
                          disabled={currentAsin === scan.asin}
                          onClick={() => applyProductFormValue('asin', scan.asin ?? '')}
                          className='h-7 px-2 text-xs'
                        >
                          Use ASIN
                        </Button>
                      ) : null}
                      {scan.amazonDetails?.ean ? (
                        <Button
                          type='button'
                          variant='outline'
                          size='sm'
                          disabled={currentEan === scan.amazonDetails.ean}
                          onClick={() => applyProductFormValue('ean', scan.amazonDetails?.ean ?? '')}
                          className='h-7 px-2 text-xs'
                        >
                          Use EAN
                        </Button>
                      ) : null}
                      {scan.amazonDetails?.gtin ? (
                        <Button
                          type='button'
                          variant='outline'
                          size='sm'
                          disabled={currentGtin === scan.amazonDetails.gtin}
                          onClick={() =>
                            applyProductFormValue('gtin', scan.amazonDetails?.gtin ?? '')
                          }
                          className='h-7 px-2 text-xs'
                        >
                          Use GTIN
                        </Button>
                      ) : null}
                      {parsedWeight != null ? (
                        <Button
                          type='button'
                          variant='outline'
                          size='sm'
                          disabled={!canApplyWeight}
                          onClick={() => applyProductFormValue('weight', parsedWeight)}
                          className='h-7 px-2 text-xs'
                        >
                          Use Weight
                        </Button>
                      ) : null}
                      {parsedDimensions ? (
                        <Button
                          type='button'
                          variant='outline'
                          size='sm'
                          disabled={!canApplyDimensions}
                          onClick={() => {
                            applyProductFormValue('sizeLength', parsedDimensions.sizeLength);
                            applyProductFormValue('sizeWidth', parsedDimensions.sizeWidth);
                            applyProductFormValue('length', parsedDimensions.length);
                          }}
                          className='h-7 px-2 text-xs'
                        >
                          Use Dimensions
                        </Button>
                      ) : null}
                      {attributeMappings.length > 0 ? (
                        <Button
                          type='button'
                          variant='outline'
                          size='sm'
                          disabled={pendingAttributeMappings.length === 0}
                          onClick={() => applyMatchedAttributeMappings(pendingAttributeMappings)}
                          className='h-7 px-2 text-xs'
                        >
                          Apply matched attributes
                        </Button>
                      ) : null}
                    </div>
                    {attributeMappings.length > 0 ? (
                      <div className='space-y-1 rounded-md border border-border/50 bg-background/70 px-3 py-2'>
                        <p className='text-[11px] font-medium uppercase tracking-wide text-muted-foreground'>
                          Matched product metadata targets
                        </p>
                        <ul className='space-y-1 text-xs text-muted-foreground'>
                          {attributeMappings.map((mapping) => {
                            const isPending = isAttributeMappingPending(mapping);
                            const currentValue = getAttributeMappingCurrentValue(mapping);
                            const mappingLabel = `${mapping.sourceLabel} -> ${
                              mapping.targetType === 'parameter' ? 'Parameter' : 'Custom field'
                            }: ${mapping.targetLabel}${
                              mapping.targetType === 'custom_field_checkbox_set' &&
                              mapping.targetOptionLabels.length > 0
                                ? ` [${mapping.targetOptionLabels.join(', ')}]`
                                : ''
                            }`;

                            return (
                              <li
                                key={`${mapping.targetType}-${mapping.targetId}`}
                                className='flex items-start justify-between gap-3'
                              >
                                <div className='min-w-0 space-y-1'>
                                  <p>{mappingLabel}</p>
                                  <p className='text-[11px] text-muted-foreground'>
                                    Current: {currentValue ?? 'Not set'}
                                  </p>
                                  <p className='text-[11px] text-muted-foreground'>
                                    Amazon: {mapping.value}
                                  </p>
                                </div>
                                <Button
                                  type='button'
                                  variant='ghost'
                                  size='sm'
                                  disabled={!isPending}
                                  onClick={() => applyMatchedAttributeMappings([mapping])}
                                  aria-label={`Apply ${mapping.sourceLabel} mapping`}
                                  className='h-6 px-2 text-[11px]'
                                >
                                  Apply
                                </Button>
                              </li>
                            );
                          })}
                        </ul>
                      </div>
                    ) : null}
                    {unmappedFields.length > 0 ? (
                      <div className='space-y-1 rounded-md border border-amber-500/30 bg-background/70 px-3 py-2'>
                        <div className='flex flex-wrap items-center justify-between gap-2'>
                          <p className='text-[11px] font-medium uppercase tracking-wide text-muted-foreground'>
                            Unmapped extracted attributes
                          </p>
                          <span className='inline-flex items-center rounded-md border border-amber-500/40 px-2 py-0.5 text-[11px] font-medium text-amber-300'>
                            {unmappedFields.length} unmapped
                          </span>
                        </div>
                        <ul className='space-y-1 text-xs text-muted-foreground'>
                          {unmappedFields.map((field, index) => (
                            <li
                              key={`${resolveAmazonMappedFieldKey(field)}-${index}`}
                              className='space-y-1 rounded-md border border-border/40 bg-muted/20 px-2 py-2'
                            >
                              <p>{field.sourceLabel}</p>
                              <p className='text-[11px] text-muted-foreground'>Amazon: {field.value}</p>
                              <p className='text-[11px] text-amber-300'>No matching product target yet.</p>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null}
                    <ProductScanAmazonDetails scan={scan} />
                  </div>
                ) : null}
                {diagnosticsExpanded ? <ProductScanDiagnostics scan={scan} /> : null}
                {isExpanded && scanSteps.length > 0 ? <ProductScanSteps steps={scanSteps} /> : null}
              </section>
            );
          })}
        </div>
      )}

      <ProductAmazonScanModal
        isOpen={isScanModalOpen}
        onClose={() => setIsScanModalOpen(false)}
        productIds={productId ? [productId] : []}
        products={product ? [product] : []}
      />
    </div>
  );
}
