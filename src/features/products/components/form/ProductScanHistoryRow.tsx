'use client';

import React from 'react';

import {
  hasProductScanAmazonDetails,
} from '@/features/products/components/scans/ProductScanAmazonDetails';
import type {
  ProductScanRecord,
} from '@/shared/contracts/product-scans';
import { ProductScanStatusHeader } from './ProductScanStatusHeader';
import { ProductScanActionButtons } from './ProductScanActionButtons';
import { ProductScanProgressInfo } from './ProductScanProgressInfo';
import { ProductScanPolicyBlock } from './ProductScanPolicyBlock';
import { ProductScanUrlInfo } from './ProductScanUrlInfo';
import { ProductScanExpansionPanels } from './ProductScanExpansionPanels';
import { ProductScan1688ActionSection } from './ProductScan1688ActionSection';
import { ProductScanInfoSection } from './ProductScanInfoSection';
import { useResolvedConnectionLabel } from './useResolvedConnectionLabel';
import type { Supplier1688FormBindings, ProductFormBindings } from './ProductFormScans.types';

type ProductScanHistoryRowProps = {
  scan: ProductScanRecord;
  productName: string;
  isExpanded: boolean;
  diagnosticsExpanded: boolean;
  extractedFieldsExpanded: boolean;
  isDeleting: boolean;
  onDelete: (scanId: string) => void;
  onToggleSteps: (scanId: string) => void;
  onToggleExtractedFields: (scanId: string) => void;
  onToggleDiagnostics: (scanId: string) => void;
  connectionNamesById: Map<string, string>;
  isBlockedScanReviewed: (scanId: string | null | undefined) => boolean;
  markBlockedScanReviewed: (scanId: string | null | undefined) => void;
  clearBlockedScanReviewed: (scanId: string | null | undefined) => void;
  supplier1688FormBindings: Supplier1688FormBindings;
  productFormBindings: ProductFormBindings;
};

export function ProductScanHistoryRow({
  scan,
  productName,
  isExpanded,
  diagnosticsExpanded,
  extractedFieldsExpanded,
  isDeleting,
  onDelete,
  onToggleSteps,
  onToggleExtractedFields,
  onToggleDiagnostics,
  connectionNamesById,
  isBlockedScanReviewed,
  markBlockedScanReviewed,
  clearBlockedScanReviewed,
  supplier1688FormBindings,
  productFormBindings,
}: ProductScanHistoryRowProps): React.JSX.Element {
  const isAmazonScan = scan.provider !== '1688';
  const resolvedLabel = useResolvedConnectionLabel(isAmazonScan, scan.connectionId, connectionNamesById);

  const hasExtracted =
    isAmazonScan === true &&
    (hasProductScanAmazonDetails(scan.amazonDetails) || (typeof scan.asin === 'string' && scan.asin !== ''));

  const steps = Array.isArray(scan.steps) ? scan.steps : [];

  return (
    <section className='space-y-2 rounded-md border border-border/60 px-4 py-4'>
      <ProductScanStatusHeader scan={scan} productName={productName} isAmazonScan={isAmazonScan} resolvedConnectionLabel={resolvedLabel} isDeleting={isDeleting} onDelete={onDelete} />

      <ProductScanActionButtons scanId={scan.id} isAmazonScan={isAmazonScan} hasExtractedFields={hasExtracted} isExpanded={isExpanded} diagnosticsExpanded={diagnosticsExpanded} extractedFieldsExpanded={extractedFieldsExpanded} hasSteps={steps.length > 0} onToggleSteps={onToggleSteps} onToggleExtractedFields={onToggleExtractedFields} onToggleDiagnostics={onToggleDiagnostics} />

      <ProductScanProgressInfo scan={scan} />

      <ProductScanInfoSection scan={scan} isAmazonScan={isAmazonScan} hasExtractedFields={hasExtracted} />

      <ProductScanPolicyBlock scan={scan} isAmazonScan={isAmazonScan} isBlockedScanReviewed={isBlockedScanReviewed} markBlockedScanReviewed={markBlockedScanReviewed} clearBlockedScanReviewed={clearBlockedScanReviewed} />

      <ProductScanUrlInfo scan={scan} isAmazonScan={isAmazonScan} />

      <ProductScanExpansionPanels scan={scan} isAmazonScan={isAmazonScan} extractedFieldsExpanded={extractedFieldsExpanded} diagnosticsExpanded={diagnosticsExpanded} isExpanded={isExpanded} productFormBindings={productFormBindings} />

      <ProductScan1688ActionSection scan={scan} isAmazonScan={isAmazonScan} resolvedConnectionLabel={resolvedLabel} supplier1688FormBindings={supplier1688FormBindings} />
    </section>
  );
}
