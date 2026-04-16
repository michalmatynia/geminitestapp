'use client';

import React from 'react';
import type { ProductScanRecord } from '@/shared/contracts/product-scans';
import { ProductFormScansHistoryHeader } from './ProductFormScansHistoryHeader';
import { ProductFormScansHistoryList } from './ProductFormScansHistoryList';
import type { Supplier1688FormBindings, ProductFormBindings } from './ProductFormScans.types';

type ProductFormScansHistoryProps = {
  scans: ProductScanRecord[];
  productName: string;
  activeScansCount: number;
  isFetching: boolean;
  onRefetch: () => void;
  expandedScanIds: Set<string>;
  expandedDiagnosticScanIds: Set<string>;
  expandedExtractedFieldScanIds: Set<string>;
  isDeletingScanId: string | null;
  onDelete: (id: string) => void;
  onToggleSteps: (id: string) => void;
  onToggleExtractedFields: (id: string) => void;
  onToggleDiagnostics: (id: string) => void;
  connectionNamesById: Map<string, string>;
  isBlockedScanReviewed: (id: string | null | undefined) => boolean;
  markBlockedScanReviewed: (id: string | null | undefined) => void;
  clearBlockedScanReviewed: (id: string | null | undefined) => void;
  supplier1688FormBindings: Supplier1688FormBindings;
  productFormBindings: ProductFormBindings;
};

export function ProductFormScansHistory({
  scans,
  productName,
  activeScansCount,
  isFetching,
  onRefetch,
  expandedScanIds,
  expandedDiagnosticScanIds,
  expandedExtractedFieldScanIds,
  isDeletingScanId,
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
}: ProductFormScansHistoryProps): React.JSX.Element {
  return (
    <div className='space-y-4'>
      <ProductFormScansHistoryHeader
        activeScansCount={activeScansCount}
        totalScansCount={scans.length}
        isFetching={isFetching}
        onRefetch={onRefetch}
      />

      <ProductFormScansHistoryList
        scans={scans}
        productName={productName}
        expandedScanIds={expandedScanIds}
        expandedDiagnosticScanIds={expandedDiagnosticScanIds}
        expandedExtractedFieldScanIds={expandedExtractedFieldScanIds}
        isDeletingScanId={isDeletingScanId}
        onDelete={onDelete}
        onToggleSteps={onToggleSteps}
        onToggleExtractedFields={onToggleExtractedFields}
        onToggleDiagnostics={onToggleDiagnostics}
        connectionNamesById={connectionNamesById}
        isBlockedScanReviewed={isBlockedScanReviewed}
        markBlockedScanReviewed={markBlockedScanReviewed}
        clearBlockedScanReviewed={clearBlockedScanReviewed}
        supplier1688FormBindings={supplier1688FormBindings}
        productFormBindings={productFormBindings}
      />
    </div>
  );
}
