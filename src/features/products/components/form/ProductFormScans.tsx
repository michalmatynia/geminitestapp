'use client';

import Link from 'next/link';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { ChevronDown, ChevronUp, ExternalLink, Loader2, RefreshCw, Search, Trash2 } from 'lucide-react';
import { useContext, useEffect, useMemo, useRef, useState } from 'react';

import { ProductAmazonScanModal } from '@/features/products/components/list/ProductAmazonScanModal';
import {
  hasProductScanAmazonDetails,
  ProductScanAmazonQualitySummary,
  ProductScanAmazonProvenanceSummary,
  ProductScanAmazonDetails,
  resolveRejectedAmazonCandidateBreakdown,
  resolveAmazonScanRecommendationReason,
  resolvePreferredAmazonExtractedScans,
} from '@/features/products/components/scans/ProductScanAmazonDetails';
import {
  buildProductScan1688SectionId,
  formatProductScan1688ComparisonCountLabel,
  resolveProductScan1688ComparisonTargets,
  hasNewerApproved1688Scan,
  ProductScan1688Details,
  resolvePreferred1688SupplierScans,
  resolveProductScan1688RankingSummary,
  resolveProductScan1688RecommendationSignal,
  resolveProductScan1688ApplyPolicySummary,
  resolve1688ScanRecommendationReason,
} from '@/features/products/components/scans/ProductScan1688Details';
import { ProductScan1688ApplyPanel } from '@/features/products/components/scans/ProductScan1688ApplyPanel';
import { useProductScan1688ReviewState } from '@/features/products/components/scans/useProductScan1688ReviewState';
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
  resolveProductScanEvaluationPolicySummary,
  resolveProductScanLatestOutcomeSummary,
  resolveProductScanRejectedCandidateSummary,
} from '@/features/products/components/scans/ProductScanSteps';
import { useProductFormCustomFields } from '@/features/products/context/ProductFormCustomFieldContext';
import { useProductFormCore } from '@/features/products/context/ProductFormCoreContext';
import { ProductFormImageContext } from '@/features/products/context/ProductFormImageContext';
import { useProductFormParameters } from '@/features/products/context/ProductFormParameterContext';
import { PRODUCT_SCANNER_SETTINGS_HREF } from '@/features/products/scanner-settings';
import { useIntegrationsWithConnections } from '@/shared/hooks/useIntegrationQueries';
import type { ProductCustomFieldDefinition } from '@/shared/contracts/products/custom-fields';
import type { ProductFormData } from '@/shared/contracts/products/drafts';
import type {
  ProductScanListResponse,
  ProductScanProvider,
  ProductScanRecord,
} from '@/shared/contracts/product-scans';
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
  type ScanAttributeMapping,
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

const buildProductScanHistoryRowId = (scanId: string | null | undefined): string | null => {
  if (typeof scanId !== 'string') {
    return null;
  }

  const normalized = scanId.trim().replace(/[^a-zA-Z0-9_-]+/g, '-');
  return normalized.length > 0 ? `product-scan-history-${normalized}` : null;
};

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
  const productFormImages = useContext(ProductFormImageContext);
  const productId = product?.id?.trim() || '';
  const queryClient = useQueryClient();
  const invalidatedUpdatedScanIdsRef = useRef<Set<string>>(new Set());
  const pendingUpdatedScanIdsRef = useRef<Set<string>>(new Set());
  const invalidationSessionRef = useRef(0);
  const [scanModalProvider, setScanModalProvider] = useState<
    Extract<ProductScanProvider, 'amazon' | '1688'> | null
  >(null);
  const [expandedScanIds, setExpandedScanIds] = useState<Set<string>>(new Set());
  const [expandedDiagnosticScanIds, setExpandedDiagnosticScanIds] = useState<Set<string>>(new Set());
  const [expandedExtractedFieldScanIds, setExpandedExtractedFieldScanIds] = useState<Set<string>>(
    new Set()
  );
  const [expandedReviewedBlockedScanIds, setExpandedReviewedBlockedScanIds] = useState<Set<string>>(
    new Set()
  );
  const [isDeletingScanId, setIsDeletingScanId] = useState<string | null>(null);

  const {
    isBlockedScanReviewed,
    markBlockedScanReviewed,
    clearBlockedScanReviewed,
  } = useProductScan1688ReviewState();

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

  const handleDeleteScan = async (scanId: string): Promise<void> => {
    if (isDeletingScanId !== null) {
      return;
    }

    setIsDeletingScanId(scanId);
    try {
      await api.delete(`/api/v2/products/scans/${scanId}`);
      await queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.products.scans(productId),
      });
    } catch {
      // In a real app we would show a toast here, but for now we follow
      // existing patterns where errors are often handled implicitly
      // or by the caller if needed.
    } finally {
      setIsDeletingScanId(null);
    }
  };

  const scans = scansQuery.data?.scans ?? [];
  const integrationsWithConnectionsQuery = useIntegrationsWithConnections();
  const scansDataUpdatedAt = scansQuery.dataUpdatedAt;
  const connectionNamesById = useMemo(() => {
    const names = new Map<string, string>();
    const integrationData = integrationsWithConnectionsQuery.data;
    if (integrationData !== undefined && integrationData !== null) {
      for (const integration of integrationData) {
        const connections = integration.connections;
        if (connections !== undefined && connections !== null) {
          for (const connection of connections) {
            const connectionId = (connection.id ?? '').trim();
            const connectionName = (connection.name ?? '').trim();
            if (connectionId === '' || connectionName === '' || names.has(connectionId)) {
              continue;
            }
            names.set(connectionId, connectionName);
          }
        }
      }
    }
    return names;
  }, [integrationsWithConnectionsQuery.data]);
  const preferredAmazonExtractedScans = useMemo(
    () => resolvePreferredAmazonExtractedScans(scans),
    [scans]
  );
  const recommendedAmazonExtractedScanId = preferredAmazonExtractedScans[0]?.id ?? null;
  const scansById = useMemo(() => new Map(scans.map((scan) => [scan.id, scan])), [scans]);
  const preferred1688SupplierScans = useMemo(
    () => resolvePreferred1688SupplierScans(scans),
    [scans]
  );

  useEffect(() => {
    invalidationSessionRef.current += 1;
    invalidatedUpdatedScanIdsRef.current = new Set();
    pendingUpdatedScanIdsRef.current = new Set();
    setExpandedScanIds(new Set());
    setExpandedDiagnosticScanIds(new Set());
    setExpandedExtractedFieldScanIds(new Set());
    setExpandedReviewedBlockedScanIds(new Set());
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

  const toggleReviewedBlockedScan = (scanId: string): void => {
    setExpandedReviewedBlockedScanIds((current) => {
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

  const supplier1688FormBindings = {
    getTextFieldValue: (field: 'supplierName' | 'supplierLink' | 'priceComment') => {
      const value = getCurrentProductFormValue(field);
      return typeof value === 'string' ? value : null;
    },
    applyTextField: (field: 'supplierName' | 'supplierLink' | 'priceComment', value: string) => {
      applyProductFormValue(field, value);
    },
    imageLinks: (productFormImages?.imageLinks ?? null) !== null ? productFormImages?.imageLinks : undefined,
    imageBase64s: (productFormImages?.imageBase64s ?? null) !== null ? productFormImages?.imageBase64s : undefined,
    setImageLinkAt: (productFormImages?.setImageLinkAt ?? null) !== null ? productFormImages?.setImageLinkAt : undefined,
    setImageBase64At: (productFormImages?.setImageBase64At ?? null) !== null ? productFormImages?.setImageBase64At : undefined,
  } as const;

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
          return (normalizedLabel ?? null) !== null
            ? [
                normalizedLabel,
                {
                  id: parameter.id,
                  label: parameter.name_en || parameter.name_pl || parameter.name_de || 'Parameter',
                },
              ]
            : null;
        })
        .filter((entry): entry is [string, { id: string; label: string }] => entry !== null)
    );

    const customFieldByLabel = new Map(
      customFields
        .map((field) => {
          const normalizedLabel = normalizeMetadataLabel(field.name);
          return (normalizedLabel ?? null) !== null ? [normalizedLabel, field] : null;
        })
        .filter((entry): entry is [string, ProductCustomFieldDefinition] => entry !== null)
    );

    const usedTargets = new Set<string>();
    const mappings: ScanAttributeMapping[] = [];

    for (const entry of sourceEntries) {
      const normalizedSourceLabel = normalizeMetadataLabel(entry.sourceLabel);
      if (normalizedSourceLabel === null || normalizedSourceLabel === undefined || normalizedSourceLabel === '') {
        continue;
      }

      const parameterMatch = parameterByLabel.get(normalizedSourceLabel);
      if (parameterMatch !== undefined) {
        const targetKey = `parameter:${parameterMatch.id}`;
        if (usedTargets.has(targetKey) === false) {
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
      if (customFieldMatch !== undefined) {
        const targetKey = `custom_field:${customFieldMatch.id}`;
        if (usedTargets.has(targetKey) === false) {
          usedTargets.add(targetKey);
          if (customFieldMatch.type === 'checkbox_set') {
            const optionMatch = resolveCheckboxSetOptionMatch(customFieldMatch, entry.value);
            if (optionMatch !== null) {
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

    return formatCustomFieldSelectedOptionLabels(targetField, (existingValue?.selectedOptionIds ?? null) !== null ? existingValue?.selectedOptionIds : undefined);
  };

  useEffect(() => {
    if (productId === '' || scans.length === 0) {
      return;
    }

    const currentProductAsin = normalizeComparableAsin(product?.asin);
    const unseenUpdatedScanIds = scans
      .filter((scan) => {
        if (scan.asinUpdateStatus !== 'updated') {
          return false;
        }

        const scanAsin = normalizeComparableAsin(scan.asin);
        return (scanAsin === null || scanAsin === undefined || scanAsin === '') || scanAsin !== currentProductAsin;
      })
      .map((scan) => scan.id)
      .filter(
        (scanId) =>
          invalidatedUpdatedScanIdsRef.current.has(scanId) === false &&
          pendingUpdatedScanIdsRef.current.has(scanId) === false
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

  if (productId === '') {
    return (
      <div className='rounded-md border border-dashed border-border/60 px-4 py-6 text-sm text-muted-foreground'>
        Save the product before using scans.
      </div>
    );
  }

  if (scansQuery.isLoading === true) {
    return (
      <div className='flex min-h-[160px] items-center justify-center gap-3 text-sm text-muted-foreground'>
        <Loader2 className='h-4 w-4 animate-spin' />
        Loading scans...
      </div>
    );
  }

  if (scansQuery.isError === true && scans.length === 0) {
    return (
      <div className='space-y-3 rounded-md border border-destructive/40 px-4 py-5'>
        <p className='text-sm text-destructive'>
          {scansQuery.error.message || 'Failed to load product scans.'}
        </p>
        <Button
          type='button'
          variant='outline'
          size='sm'
          onClick={() => { void scansQuery.refetch(); }}
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
            Amazon and 1688 image scans for this product.
          </p>
        </div>
        <div className='flex items-center gap-2'>
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={() => setScanModalProvider('amazon')}
            className='h-8 gap-1.5 px-3 text-xs'
          >
            <Search className='h-3.5 w-3.5' />
            Scan Amazon
          </Button>
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={() => setScanModalProvider('1688')}
            className='h-8 gap-1.5 px-3 text-xs'
          >
            <Search className='h-3.5 w-3.5' />
            Scan 1688
          </Button>
          <Button type='button' variant='outline' size='sm' asChild className='h-8 px-3 text-xs'>
            <Link href={PRODUCT_SCANNER_SETTINGS_HREF}>Scanner settings</Link>
          </Button>
          <Button
            type='button'
            variant='outline'
            size='sm'
            onClick={() => { void scansQuery.refetch(); }}
            disabled={scansQuery.isFetching === true}
            className='h-8 gap-1.5 px-3 text-xs'
          >
            <RefreshCw className={`h-3.5 w-3.5 ${scansQuery.isFetching === true ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        </div>
      </div>

      {scansQuery.isError === true ? (
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
            const isAmazonScan = scan.provider !== '1688';
            const resolvedConnectionLabel =
              (scan.connectionId ? connectionNamesById.get(scan.connectionId) : null) ??
              scan.connectionId ??
              null;
            const supplierSummary = [
              (scan.supplierDetails?.supplierName ?? null) !== null ? scan.supplierDetails?.supplierName : null,
              (scan.supplierDetails?.priceText ?? scan.supplierDetails?.priceRangeText ?? null) !== null ? scan.supplierDetails?.priceText ?? scan.supplierDetails?.priceRangeText : null,
              (scan.supplierDetails?.moqText ?? null) !== null ? scan.supplierDetails?.moqText : null,
            ]
              .filter((val): val is string => typeof val === 'string')
              .join(' · ');
            const hasExtractedFields =
              isAmazonScan === true &&
              (hasProductScanAmazonDetails(scan.amazonDetails) || (scan.asin !== undefined && scan.asin !== null && scan.asin !== ''));
            const recommendationReason = isAmazonScan === true
              ? (hasExtractedFields === true
                ? resolveAmazonScanRecommendationReason(scan)
                : null)
              : resolve1688ScanRecommendationReason(scan);
            const supplierApplyPolicySummary = isAmazonScan === false
              ? resolveProductScan1688ApplyPolicySummary(scan)
              : null;
            const isBlocked1688ResultReviewed =
              supplierApplyPolicySummary?.blockActions === true &&
              isBlockedScanReviewed(scan.id);
            const hasNewerApproved1688Result =
              isBlocked1688ResultReviewed === true && hasNewerApproved1688Scan(scans, scan.id);
            const shouldCollapseReviewedBlocked1688 =
              hasNewerApproved1688Result === true && expandedReviewedBlockedScanIds.has(scan.id) === false;
            const blocked1688CandidateUrlsHref =
              isAmazonScan === false && supplierApplyPolicySummary?.blockActions === true
                ? buildProductScan1688SectionId(scan.id, 'candidate-urls')
                : null;
            const blocked1688MatchEvaluationHref =
              isAmazonScan === false && supplierApplyPolicySummary?.blockActions === true
                ? buildProductScan1688SectionId(scan.id, 'match-evaluation')
                : null;
            const recommendationRejectedBreakdown = isAmazonScan === true && hasExtractedFields === true
              ? resolveRejectedAmazonCandidateBreakdown(scan.steps)
              : null;
            const isRecommendedAmazonResult =
              isAmazonScan === true && hasExtractedFields === true && scan.id === recommendedAmazonExtractedScanId;
            const hasAlternativeRecommendedAmazonResult =
              isAmazonScan === true &&
              hasExtractedFields === true &&
              preferredAmazonExtractedScans.length > 1 &&
              recommendedAmazonExtractedScanId !== null &&
              scan.id !== recommendedAmazonExtractedScanId;
            const supplier1688RankingSummary = isAmazonScan === false
              ? resolveProductScan1688RankingSummary(preferred1688SupplierScans, scan.id)
              : null;
            const isPreferred1688SupplierResult = supplier1688RankingSummary?.isPreferred ?? false;
            const hasAlternativePreferred1688SupplierResult =
              supplier1688RankingSummary?.hasStrongerAlternative ?? false;
            const alternativePreferred1688SupplierScans =
              isAmazonScan === false && supplier1688RankingSummary !== null
                ? preferred1688SupplierScans.filter((preferredScan) =>
                    supplier1688RankingSummary.alternativeScanIds.includes(preferredScan.id)
                  )
                : [];
            const comparisonTargetSourceScans =
              isAmazonScan === false
                ? preferred1688SupplierScans.map(
                    (preferredScan) => scansById.get(preferredScan.id) ?? preferredScan
                  )
                : [];
            const supplier1688ComparisonTargets = isAmazonScan === false
              ? resolveProductScan1688ComparisonTargets(comparisonTargetSourceScans, scan.id)
              : null;
            const alternativePreferred1688SupplierResultLinks =
              supplier1688ComparisonTargets?.alternativeTargets
                .map((target) => {
                  const href = buildProductScanHistoryRowId(target.id);
                  return (href ?? null) !== null ? { href: href!, label: target.labelWithRank } : null;
                })
                .filter((entry): entry is { href: string; label: string } => entry !== null) ?? [];
            const preferred1688SupplierRank = supplier1688RankingSummary?.rank ?? null;
            const preferred1688SupplierRankCount = supplier1688RankingSummary?.count ?? 0;
            const preferred1688SupplierResultHref =
              isAmazonScan === false &&
              supplier1688RankingSummary?.preferredScanId !== undefined &&
              supplier1688RankingSummary?.preferredScanId !== null &&
              scan.id !== supplier1688RankingSummary.preferredScanId
                ? buildProductScanHistoryRowId(supplier1688RankingSummary.preferredScanId)
                : null;
            const preferred1688SupplierResultLabel =
              supplier1688ComparisonTargets?.preferredTarget?.label ?? null;
            const preferred1688SupplierResultLabelWithRank =
              supplier1688ComparisonTargets?.preferredTarget?.labelWithRank ?? null;
            const supplierRecommendationSignal =
              isAmazonScan === false && (recommendationReason ?? null) !== null
                ? resolveProductScan1688RecommendationSignal({
                    isPreferred: isPreferred1688SupplierResult,
                    hasAlternativeMeaningfulResult: alternativePreferred1688SupplierScans.length > 0,
                    hasStrongerAlternative: hasAlternativePreferred1688SupplierResult,
                  })
                : null;
            const diagnostics = resolveProductScanDiagnostics(scan);
            const latestFailureArtifact = diagnostics?.failureArtifacts[0] ?? null;
            const hasDiagnostics = diagnostics !== null;
            const failureArtifactCount = diagnostics?.failureArtifacts.length ?? 0;
            const latestFailureArtifactPath = latestFailureArtifact?.path ?? null;
            const latestFailureArtifactHref = latestFailureArtifact !== null
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
            const rejectedCandidateSummary =
              scanSteps.length > 0 && progressSummary === null && continuationSummary === null
                ? resolveProductScanRejectedCandidateSummary(scanSteps)
                : null;
            const evaluationPolicySummary =
              scanSteps.length > 0 && progressSummary === null
                ? resolveProductScanEvaluationPolicySummary(scanSteps)
                : null;
            const latestOutcomeSummary =
              scanSteps.length > 0 &&
              progressSummary === null &&
              (scan.status === 'failed' ||
                scan.status === 'conflict' ||
                isProductScanActiveStatus(scan.status))
                ? resolveProductScanLatestOutcomeSummary(scanSteps, {
                    allowStalled: isProductScanActiveStatus(scan.status),
                  })
                : null;
            const fallbackFailureSummary =
              latestOutcomeSummary === null && (scan.status === 'failed' || scan.status === 'conflict')
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
              parsedDimensions !== null &&
              (currentSizeLength !== parsedDimensions.sizeLength ||
                currentSizeWidth !== parsedDimensions.sizeWidth ||
                currentHeight !== parsedDimensions.length);
            const canApplyWeight = parsedWeight !== null && currentWeight !== parsedWeight;

            return (
              <section
                key={scan.id}
                id={buildProductScanHistoryRowId(scan.id) ?? undefined}
                className={`space-y-2 rounded-md border px-4 py-4 ${
                  shouldCollapseReviewedBlocked1688 === true
                    ? 'border-border/40 bg-muted/10'
                    : 'border-border/60'
                }`}
              >
                <div className='flex flex-wrap items-center justify-between gap-2'>
                  <div className='flex flex-wrap items-center gap-2'>
                    <span className='text-sm font-medium'>
                      {scan.provider === '1688' ? '1688' : 'Amazon'}
                    </span>
                    <span
                      className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium ${resolveStatusClassName(scan)}`}
                    >
                      {resolveStatusLabel(scan)}
                    </span>
                    {isAmazonScan === false && resolvedConnectionLabel !== null ? (
                      <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground'>
                        Profile {resolvedConnectionLabel}
                      </span>
                    ) : null}
                    {hasNewerApproved1688Result === true ? (
                      <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground'>
                        Superseded by newer approved 1688 match
                      </span>
                    ) : null}
                  </div>
                  <span className='text-xs text-muted-foreground'>
                    {formatTimestamp(scan.createdAt)}
                  </span>
                </div>

                <div className='flex items-center justify-end gap-1'>
                  {isProductScanActiveStatus(scan.status) === false && (
                    <Button
                      type='button'
                      variant='ghost'
                      size='sm'
                      onClick={() => { void handleDeleteScan(scan.id); }}
                      disabled={isDeletingScanId === scan.id}
                      className='h-7 gap-1.5 px-2 text-xs text-destructive hover:bg-destructive/10 hover:text-destructive'
                    >
                      {isDeletingScanId === scan.id ? (
                        <Loader2 className='h-3.5 w-3.5 animate-spin' />
                      ) : (
                        <Trash2 className='h-3.5 w-3.5' />
                      )}
                      Delete
                    </Button>
                  )}
                  {isAmazonScan === true ? (
                    <Button
                      type='button'
                      variant='ghost'
                      size='sm'
                      onClick={() => toggleExtractedFields(scan.id)}
                      disabled={hasExtractedFields === false}
                      className='h-7 gap-1.5 px-2 text-xs'
                    >
                      {extractedFieldsExpanded ? (
                        <ChevronUp className='h-3.5 w-3.5' />
                      ) : (
                        <ChevronDown className='h-3.5 w-3.5' />
                      )}
                      {extractedFieldsExpanded ? 'Hide extracted fields' : 'Show extracted fields'}
                    </Button>
                  ) : null}
                  <Button
                    type='button'
                    variant='ghost'
                    size='sm'
                    onClick={() => toggleDiagnostics(scan.id)}
                    disabled={hasDiagnostics === false}
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

                {progressSummary !== null ? (
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
                      {progressSummary.inputSource !== undefined && progressSummary.inputSource !== null ? (
                        <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 font-medium text-muted-foreground'>
                          {progressSummary.inputSource === 'url' ? 'URL input' : 'File input'}
                        </span>
                      ) : null}
                    </div>
                    {progressSummary.message !== undefined && progressSummary.message !== null && progressSummary.message !== '' ? (
                      <p className='text-sm text-muted-foreground'>{progressSummary.message}</p>
                    ) : null}
                  </div>
                ) : null}

                {continuationSummary !== null ? (
                  <div className='space-y-1 rounded-md border border-amber-500/20 bg-amber-500/5 px-3 py-2'>
                    <div className='flex flex-wrap items-center gap-2 text-xs'>
                      <span className='inline-flex items-center rounded-md border border-amber-500/20 px-2 py-0.5 font-medium text-amber-300'>
                        Candidate continuation
                      </span>
                      <span className='text-muted-foreground'>
                        {continuationSummary.rejectionKind === 'language'
                          ? 'After language rejection'
                          : 'After AI rejection'}
                      </span>
                      <span className='font-medium text-foreground'>{continuationSummary.stepLabel}</span>
                      {continuationSummary.resultCodeLabel !== undefined && continuationSummary.resultCodeLabel !== null && continuationSummary.resultCodeLabel !== '' ? (
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
                    {continuationSummary.message !== undefined && continuationSummary.message !== null && continuationSummary.message !== '' ? (
                      <p className='text-sm text-muted-foreground'>{continuationSummary.message}</p>
                    ) : null}
                    <div className='flex flex-wrap gap-3 text-xs text-muted-foreground'>
                      {continuationSummary.rejectedUrl !== undefined && continuationSummary.rejectedUrl !== null && continuationSummary.rejectedUrl !== '' ? (
                        <span>Rejected: {continuationSummary.rejectedUrl}</span>
                      ) : null}
                      {continuationSummary.nextUrl !== undefined && continuationSummary.nextUrl !== null && continuationSummary.nextUrl !== '' ? (
                        <span>Next: {continuationSummary.nextUrl}</span>
                      ) : null}
                    </div>
                  </div>
                ) : null}

                {rejectedCandidateSummary !== null ? (
                  <div className='space-y-1 rounded-md border border-amber-500/20 bg-amber-500/5 px-3 py-2'>
                    <div className='flex flex-wrap items-center gap-2 text-xs'>
                      <span className='inline-flex items-center rounded-md border border-amber-500/20 px-2 py-0.5 font-medium text-amber-300'>
                        {rejectedCandidateSummary.latestRejectionKind === 'language'
                          ? 'AI language rejections'
                          : 'AI candidate rejections'}
                      </span>
                      <span className='font-medium text-foreground'>
                        {rejectedCandidateSummary.rejectedCount} candidate
                        {rejectedCandidateSummary.rejectedCount === 1 ? '' : 's'} rejected before{' '}
                        {scan.status === 'completed' || scan.status === 'conflict'
                          ? 'match'
                          : scan.status === 'no_match'
                            ? 'no match'
                            : 'final result'}
                      </span>
                    </div>
                    {rejectedCandidateSummary.latestReason !== undefined && rejectedCandidateSummary.latestReason !== null && rejectedCandidateSummary.latestReason !== '' ? (
                      <p className='text-sm text-muted-foreground'>
                        {rejectedCandidateSummary.latestReason}
                      </p>
                    ) : null}
                    {rejectedCandidateSummary.languageRejectedCount > 0 ? (
                      <p className='text-xs text-muted-foreground'>
                        {rejectedCandidateSummary.languageRejectedCount} non-English page
                        {rejectedCandidateSummary.languageRejectedCount === 1 ? '' : 's'} rejected
                      </p>
                    ) : null}
                    {rejectedCandidateSummary.latestRejectedUrl !== undefined && rejectedCandidateSummary.latestRejectedUrl !== null && rejectedCandidateSummary.latestRejectedUrl !== '' ? (
                      <div className='flex flex-wrap gap-3 text-xs text-muted-foreground'>
                        <span>Latest rejected: {rejectedCandidateSummary.latestRejectedUrl}</span>
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {evaluationPolicySummary !== null ? (
                  <div className='space-y-1 rounded-md border border-border/50 bg-background/70 px-3 py-2'>
                    <div className='flex flex-wrap items-center gap-2 text-xs'>
                      <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 font-medium text-muted-foreground'>
                        AI evaluator policy
                      </span>
                      {evaluationPolicySummary.executionLabel !== undefined && evaluationPolicySummary.executionLabel !== null && evaluationPolicySummary.executionLabel !== '' ? (
                        <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 font-medium text-muted-foreground'>
                          {evaluationPolicySummary.executionLabel}
                        </span>
                      ) : null}
                      {evaluationPolicySummary.modelSource !== undefined && evaluationPolicySummary.modelSource !== null && evaluationPolicySummary.modelSource !== '' ? (
                        <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 font-medium text-muted-foreground'>
                          {evaluationPolicySummary.modelSource}
                        </span>
                      ) : null}
                      {evaluationPolicySummary.thresholdLabel !== undefined && evaluationPolicySummary.thresholdLabel !== null && evaluationPolicySummary.thresholdLabel !== '' ? (
                        <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 font-medium text-muted-foreground'>
                          {evaluationPolicySummary.thresholdLabel}
                        </span>
                      ) : null}
                      {evaluationPolicySummary.scopeLabel !== undefined && evaluationPolicySummary.scopeLabel !== null && evaluationPolicySummary.scopeLabel !== '' ? (
                        <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 font-medium text-muted-foreground'>
                          {evaluationPolicySummary.scopeLabel}
                        </span>
                      ) : null}
                      {evaluationPolicySummary.languageGateLabel !== undefined && evaluationPolicySummary.languageGateLabel !== null && evaluationPolicySummary.languageGateLabel !== '' ? (
                        <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 font-medium text-muted-foreground'>
                          {evaluationPolicySummary.languageGateLabel}
                        </span>
                      ) : null}
                      {evaluationPolicySummary.languageDetectionLabel !== undefined && evaluationPolicySummary.languageDetectionLabel !== null && evaluationPolicySummary.languageDetectionLabel !== '' ? (
                        <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 font-medium text-muted-foreground'>
                          {evaluationPolicySummary.languageDetectionLabel}
                        </span>
                      ) : null}
                    </div>
                    {evaluationPolicySummary.modelLabel !== undefined && evaluationPolicySummary.modelLabel !== null && evaluationPolicySummary.modelLabel !== '' ? (
                      <p className='text-sm text-muted-foreground'>
                        Model {evaluationPolicySummary.modelLabel}
                      </p>
                    ) : null}
                  </div>
                ) : null}

                {latestOutcomeSummary !== null || fallbackFailureSummary !== null ? (
                  <div
                    className={`space-y-1 rounded-md px-3 py-2 ${
                      latestOutcomeSummary?.kind === 'failed' || fallbackFailureSummary !== null
                        ? 'border border-destructive/20 bg-destructive/5'
                        : 'border border-amber-500/20 bg-amber-500/5'
                    }`}
                  >
                    <div className='flex flex-wrap items-center gap-2 text-xs'>
                      <span
                        className={`inline-flex items-center rounded-md px-2 py-0.5 font-medium ${
                          latestOutcomeSummary?.kind === 'failed' || fallbackFailureSummary !== null
                            ? 'border border-destructive/20 text-destructive'
                            : 'border border-amber-500/20 text-amber-300'
                        }`}
                      >
                        {latestOutcomeSummary?.phaseLabel ?? fallbackFailureSummary?.phaseLabel}
                      </span>
                      <span className='text-muted-foreground'>
                        {latestOutcomeSummary?.kind === 'failed' || fallbackFailureSummary !== null
                          ? 'Last failure'
                          : 'Last completed step'}
                      </span>
                      <span className='font-medium text-foreground'>
                        {latestOutcomeSummary?.stepLabel ?? fallbackFailureSummary?.stepLabel}
                      </span>
                      {(latestOutcomeSummary?.sourceLabel ?? fallbackFailureSummary?.sourceLabel) !== undefined && (latestOutcomeSummary?.sourceLabel ?? fallbackFailureSummary?.sourceLabel) !== null ? (
                        <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 font-medium text-muted-foreground'>
                          {latestOutcomeSummary?.sourceLabel ?? fallbackFailureSummary?.sourceLabel}
                        </span>
                      ) : null}
                      {(latestOutcomeSummary?.resultCodeLabel ?? fallbackFailureSummary?.resultCodeLabel) !== undefined && (latestOutcomeSummary?.resultCodeLabel ?? fallbackFailureSummary?.resultCodeLabel) !== null ? (
                        <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 font-medium text-muted-foreground'>
                          {latestOutcomeSummary?.resultCodeLabel ?? fallbackFailureSummary?.resultCodeLabel}
                        </span>
                      ) : null}
                      {latestOutcomeSummary?.attempt ? (
                        <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 font-medium text-muted-foreground'>
                          Attempt {latestOutcomeSummary.attempt}
                        </span>
                      ) : null}
                      {latestOutcomeSummary?.inputSource !== undefined && latestOutcomeSummary?.inputSource !== null ? (
                        <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 font-medium text-muted-foreground'>
                          {latestOutcomeSummary.inputSource === 'url' ? 'URL input' : 'File input'}
                        </span>
                      ) : null}
                      {failureArtifactCount > 0 ? (
                        <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 font-medium text-muted-foreground'>
                          {failureArtifactCount} artifact{failureArtifactCount === 1 ? '' : 's'}
                        </span>
                      ) : null}
                      {latestFailureArtifactPath !== null ? (
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
                    {(latestOutcomeSummary?.message ?? fallbackFailureSummary?.message) !== undefined && (latestOutcomeSummary?.message ?? fallbackFailureSummary?.message) !== null ? (
                      <p className='text-sm text-muted-foreground'>
                        {latestOutcomeSummary?.message ?? fallbackFailureSummary?.message}
                      </p>
                    ) : null}
                    {(latestOutcomeSummary?.timingLabel ?? fallbackFailureSummary?.timingLabel) !== undefined && (latestOutcomeSummary?.timingLabel ?? fallbackFailureSummary?.timingLabel) !== null ? (
                      <p className='text-xs text-muted-foreground'>
                        {latestOutcomeSummary?.timingLabel ?? fallbackFailureSummary?.timingLabel}
                      </p>
                    ) : null}
                    {(latestOutcomeSummary?.url ?? fallbackFailureSummary?.url) !== undefined && (latestOutcomeSummary?.url ?? fallbackFailureSummary?.url) !== null ? (
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
                    {latestFailureArtifactHref !== null ? (
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

                {(recommendationReason ?? null) !== null ? (
                  <div
                    className={`space-y-1 rounded-md px-3 py-2 ${
                      isAmazonScan === true && isRecommendedAmazonResult === true
                        ? 'border border-emerald-500/20 bg-emerald-500/5'
                        : supplierRecommendationSignal?.variant === 'preferred'
                          ? 'border border-cyan-500/20 bg-cyan-500/5'
                          : supplierRecommendationSignal?.variant === 'weaker'
                            ? 'border border-amber-500/20 bg-amber-500/5'
                        : 'border border-border/50 bg-background/70'
                    }`}
                  >
                    <div className='flex flex-wrap items-center gap-2 text-xs'>
                      <span
                        className={`inline-flex items-center rounded-md px-2 py-0.5 font-medium ${
                          isAmazonScan === true && isRecommendedAmazonResult === true
                            ? 'border border-emerald-500/20 text-emerald-300'
                            : supplierRecommendationSignal?.variant === 'preferred'
                              ? 'border border-cyan-500/20 text-cyan-300'
                              : supplierRecommendationSignal?.variant === 'weaker'
                                ? 'border border-amber-500/20 text-amber-300'
                            : 'border border-border/60 text-muted-foreground'
                        }`}
                      >
                        {isAmazonScan === true && isRecommendedAmazonResult === true
                          ? 'Recommended Amazon result'
                          : isAmazonScan === false
                            ? (supplierRecommendationSignal?.badgeLabel ?? '1688 supplier result')
                          : isAmazonScan === true
                            ? 'Amazon result signal'
                            : '1688 supplier result'}
                      </span>
                      {isAmazonScan === false &&
                      preferred1688SupplierRank !== null &&
                      preferred1688SupplierRankCount > 1 ? (
                        <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 font-medium text-muted-foreground'>
                          Rank {preferred1688SupplierRank} of {preferred1688SupplierRankCount}
                        </span>
                      ) : null}
                      <span className='font-medium text-foreground'>{recommendationReason}</span>
                    </div>
                    {supplierApplyPolicySummary !== null ? (
                      <div className='flex flex-wrap items-center gap-2 text-xs'>
                        <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 font-medium text-muted-foreground'>
                          Apply policy
                        </span>
                        <span
                          className={
                            isBlocked1688ResultReviewed === true
                              ? 'font-medium text-muted-foreground'
                              : supplierApplyPolicySummary.tone === 'destructive'
                              ? 'font-medium text-destructive'
                              : 'font-medium text-amber-300'
                          }
                        >
                          {isBlocked1688ResultReviewed === true
                            ? 'Blocked result reviewed'
                            : supplierApplyPolicySummary.label}
                        </span>
                        {blocked1688CandidateUrlsHref !== null ? (
                          <a
                            href={`#${blocked1688CandidateUrlsHref}`}
                            className='text-primary underline-offset-2 hover:underline'
                          >
                            Review candidates
                          </a>
                        ) : null}
                        {blocked1688MatchEvaluationHref !== null ? (
                          <a
                            href={`#${blocked1688MatchEvaluationHref}`}
                            className='text-primary underline-offset-2 hover:underline'
                          >
                            Review evaluation
                          </a>
                        ) : null}
                        {supplierApplyPolicySummary.blockActions === true ? (
                          <button
                            type='button'
                            onClick={() =>
                              isBlocked1688ResultReviewed === true
                                ? clearBlockedScanReviewed(scan.id)
                                : markBlockedScanReviewed(scan.id)
                            }
                            className='text-primary underline-offset-2 hover:underline'
                          >
                            {isBlocked1688ResultReviewed === true ? 'Undo review' : 'Mark reviewed'}
                          </button>
                        ) : null}
                      </div>
                    ) : null}
                    {isAmazonScan === true && hasAlternativeRecommendedAmazonResult === true ? (
                      <p className='text-sm text-muted-foreground'>
                        A stronger extracted Amazon run is available for this product.
                      </p>
                    ) : isAmazonScan === true && preferredAmazonExtractedScans.length > 1 ? (
                      <p className='text-sm text-muted-foreground'>
                        Preferred over other extracted Amazon runs for this product.
                      </p>
                    ) : isAmazonScan === false && (supplierRecommendationSignal?.detail ?? null) !== null ? (
                      <div className='flex flex-wrap items-center gap-2 text-sm text-muted-foreground'>
                        <p>{supplierRecommendationSignal?.detail}</p>
                        {supplierRecommendationSignal?.variant === 'weaker' &&
                        preferred1688SupplierResultHref !== null ? (
                          <span>
                            Preferred result: {preferred1688SupplierResultLabelWithRank ?? preferred1688SupplierResultLabel}
                          </span>
                        ) : null}
                        {supplierRecommendationSignal?.variant === 'weaker' &&
                        preferred1688SupplierResultHref !== null ? (
                          <a
                            href={`#${preferred1688SupplierResultHref}`}
                            className='text-primary underline-offset-2 hover:underline'
                          >
                            Open preferred: {preferred1688SupplierResultLabel}
                          </a>
                        ) : supplierRecommendationSignal?.variant === 'preferred' &&
                          alternativePreferred1688SupplierResultLinks.length > 0 ? (
                          <>
                            <span>
                              {formatProductScan1688ComparisonCountLabel(
                                alternativePreferred1688SupplierResultLinks.length
                              )}
                            </span>
                            {alternativePreferred1688SupplierResultLinks.map((link) => (
                              <a
                                key={link.href}
                                href={`#${link.href}`}
                                className='text-primary underline-offset-2 hover:underline'
                              >
                                {link.label}
                              </a>
                            ))}
                          </>
                        ) : null}
                      </div>
                    ) : null}
                    {recommendationRejectedBreakdown !== null &&
                    recommendationRejectedBreakdown.languageRejectedCount > 0 ? (
                      <p className='text-sm text-muted-foreground'>
                        Includes {recommendationRejectedBreakdown.languageRejectedCount} non-English
                        page
                        {recommendationRejectedBreakdown.languageRejectedCount === 1 ? '' : 's'} rejected
                        by the language gate.
                      </p>
                    ) : null}
                  </div>
                ) : null}

                {recommendationReason === null && supplierApplyPolicySummary !== null ? (
                  <div className='space-y-1 rounded-md border border-border/50 bg-background/70 px-3 py-2'>
                    <div className='flex flex-wrap items-center gap-2 text-xs'>
                      <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 font-medium text-muted-foreground'>
                        Apply policy
                      </span>
                      <span
                        className={
                          isBlocked1688ResultReviewed === true
                            ? 'font-medium text-muted-foreground'
                            : supplierApplyPolicySummary.tone === 'destructive'
                            ? 'font-medium text-destructive'
                            : 'font-medium text-amber-300'
                        }
                      >
                        {isBlocked1688ResultReviewed === true
                          ? 'Blocked result reviewed'
                          : supplierApplyPolicySummary.label}
                      </span>
                      {blocked1688CandidateUrlsHref !== null ? (
                        <a
                          href={`#${blocked1688CandidateUrlsHref}`}
                          className='text-primary underline-offset-2 hover:underline'
                        >
                          Review candidates
                        </a>
                      ) : null}
                      {blocked1688MatchEvaluationHref !== null ? (
                        <a
                          href={`#${blocked1688MatchEvaluationHref}`}
                          className='text-primary underline-offset-2 hover:underline'
                        >
                          Review evaluation
                        </a>
                      ) : null}
                      {supplierApplyPolicySummary.blockActions === true ? (
                        <button
                          type='button'
                          onClick={() =>
                            isBlocked1688ResultReviewed === true
                              ? clearBlockedScanReviewed(scan.id)
                              : markBlockedScanReviewed(scan.id)
                          }
                          className='text-primary underline-offset-2 hover:underline'
                        >
                          {isBlocked1688ResultReviewed === true ? 'Undo review' : 'Mark reviewed'}
                        </button>
                      ) : null}
                    </div>
                    <p className='text-sm text-muted-foreground'>{supplierApplyPolicySummary.detail}</p>
                  </div>
                ) : null}

                {hasNewerApproved1688Result === true ? (
                  <div className='space-y-2 rounded-md border border-border/40 bg-muted/10 px-3 py-2'>
                    <p className='text-sm text-muted-foreground'>
                      A newer AI-approved 1688 supplier match exists for this product, so this reviewed
                      blocked result is collapsed by default.
                    </p>
                    {preferred1688SupplierResultHref !== null ? (
                      <p className='text-sm text-muted-foreground'>
                        Current approved result: {preferred1688SupplierResultLabelWithRank ?? preferred1688SupplierResultLabel}
                      </p>
                    ) : null}
                    <div className='flex flex-wrap gap-2'>
                      <Button
                        type='button'
                        variant='outline'
                        size='sm'
                        onClick={() => toggleReviewedBlockedScan(scan.id)}
                        className='h-7 px-2 text-xs'
                      >
                        {shouldCollapseReviewedBlocked1688 === true
                          ? 'Show reviewed blocked result'
                          : 'Hide reviewed blocked result'}
                      </Button>
                      {preferred1688SupplierResultHref !== null ? (
                        <a
                          href={`#${preferred1688SupplierResultHref}`}
                          className='inline-flex h-7 items-center text-xs text-primary underline-offset-2 hover:underline'
                        >
                          Open newer approved: {preferred1688SupplierResultLabel}
                        </a>
                      ) : null}
                    </div>
                  </div>
                ) : null}

                {shouldCollapseReviewedBlocked1688 === false && (scan.title ?? null) !== null ? (
                  <p className='text-sm font-medium'>{scan.title}</p>
                ) : null}
                {shouldCollapseReviewedBlocked1688 === false && isAmazonScan === false && supplierSummary !== '' ? (
                  <p className='text-xs text-muted-foreground'>{supplierSummary}</p>
                ) : null}
                {shouldCollapseReviewedBlocked1688 === false ? renderScanMeta(scan) : null}
                {shouldCollapseReviewedBlocked1688 === false && (scan.url ?? null) !== null ? (
                  <a
                    href={scan.url ?? undefined}
                    target='_blank'
                    rel='noopener noreferrer'
                    className='inline-flex items-center gap-1 text-xs text-primary underline-offset-2 hover:underline'
                  >
                    {isAmazonScan === true ? 'Open Amazon Result' : 'Open 1688 Result'}
                    <ExternalLink className='h-3.5 w-3.5' />
                  </a>
                ) : null}
                {shouldCollapseReviewedBlocked1688 === false && (scan.description ?? null) !== null ? (
                  <p className='line-clamp-3 text-sm text-muted-foreground'>{scan.description}</p>
                ) : null}
                {shouldCollapseReviewedBlocked1688 === false && (infoMessage ?? null) !== null ? (
                  <p className='text-sm text-muted-foreground'>{infoMessage}</p>
                ) : null}
                {shouldCollapseReviewedBlocked1688 === false && (errorMessage ?? null) !== null ? (
                  <p className='text-sm text-destructive'>{errorMessage}</p>
                ) : null}
                {shouldCollapseReviewedBlocked1688 === false && isAmazonScan === false ? (
                  <ProductScan1688Details
                    scan={scan}
                    scanId={scan.id}
                    connectionLabel={resolvedConnectionLabel}
                  />
                ) : null}
                {shouldCollapseReviewedBlocked1688 === false && isAmazonScan === false ? (
                  <ProductScan1688ApplyPanel
                    scan={scan}
                    formBindings={supplier1688FormBindings}
                  />
                ) : null}
                {shouldCollapseReviewedBlocked1688 === false && isAmazonScan === true && extractedFieldsExpanded === true ? (
                  <div className='space-y-3'>
                    <ProductScanAmazonQualitySummary scan={scan} />
                    <ProductScanAmazonProvenanceSummary scan={scan} />
                    <div className='flex flex-wrap gap-2'>
                      {(scan.asin ?? null) !== null ? (
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
                      {(scan.amazonDetails?.ean ?? null) !== null ? (
                        <Button
                          type='button'
                          variant='outline'
                          size='sm'
                          disabled={currentEan === scan.amazonDetails?.ean}
                          onClick={() => applyProductFormValue('ean', scan.amazonDetails?.ean ?? '')}
                          className='h-7 px-2 text-xs'
                        >
                          Use EAN
                        </Button>
                      ) : null}
                      {(scan.amazonDetails?.gtin ?? null) !== null ? (
                        <Button
                          type='button'
                          variant='outline'
                          size='sm'
                          disabled={currentGtin === scan.amazonDetails?.gtin}
                          onClick={() =>
                            applyProductFormValue('gtin', scan.amazonDetails?.gtin ?? '')
                          }
                          className='h-7 px-2 text-xs'
                        >
                          Use GTIN
                        </Button>
                      ) : null}
                      {parsedWeight !== null ? (
                        <Button
                          type='button'
                          variant='outline'
                          size='sm'
                          disabled={canApplyWeight === false}
                          onClick={() => applyProductFormValue('weight', parsedWeight)}
                          className='h-7 px-2 text-xs'
                        >
                          Use Weight
                        </Button>
                      ) : null}
                      {parsedDimensions !== null ? (
                        <Button
                          type='button'
                          variant='outline'
                          size='sm'
                          disabled={canApplyDimensions === false}
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
                                  disabled={isPending === false}
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
                {shouldCollapseReviewedBlocked1688 === false && diagnosticsExpanded === true ? (
                  <ProductScanDiagnostics scan={scan} />
                ) : null}
                {shouldCollapseReviewedBlocked1688 === false && isExpanded === true && scanSteps.length > 0 ? (
                  <ProductScanSteps steps={scanSteps} />
                ) : null}
              </section>
            );
          })}
        </div>
      )}

      <ProductAmazonScanModal
        isOpen={scanModalProvider !== null}
        onClose={() => setScanModalProvider(null)}
        productIds={productId !== '' ? [productId] : []}
        products={product ? [product] : []}
        provider={scanModalProvider ?? 'amazon'}
      />
    </div>
  );
}
