'use client';

import React from 'react';
import type { ProductScanRecord } from '@/shared/contracts/product-scans';
import { ProductScanHistoryRow } from './ProductScanHistoryRow';
import type { Supplier1688FormBindings, ProductFormBindings } from './ProductFormScans.types';

type ProductFormScansHistoryListProps = {
  scans: ProductScanRecord[];
  productName: string;
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

export function ProductFormScansHistoryList({
  scans,
  productName,
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
}: ProductFormScansHistoryListProps): React.JSX.Element {
  if (scans.length === 0) {
    return (
      <div className='flex min-h-[120px] flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border/60 bg-muted/5 px-4 text-center'>
        <p className='text-sm font-medium text-muted-foreground'>No scan history available.</p>
        <p className='text-xs text-muted-foreground/60'>Start a new scan to discover product information.</p>
      </div>
    );
  }

  const sortedScans = [...scans].sort((a, b) => {
    const timeA = typeof a.createdAt === 'string' ? new Date(a.createdAt).getTime() : 0;
    const timeB = typeof b.createdAt === 'string' ? new Date(b.createdAt).getTime() : 0;
    return timeB - timeA;
  });

  return (
    <div className='grid gap-4'>
      {sortedScans.map((scan) => (
        <ProductScanHistoryRow
          key={scan.id}
          scan={scan}
          productName={productName}
          isExpanded={expandedScanIds.has(scan.id)}
          diagnosticsExpanded={expandedDiagnosticScanIds.has(scan.id)}
          extractedFieldsExpanded={expandedExtractedFieldScanIds.has(scan.id)}
          isDeleting={isDeletingScanId === scan.id}
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
      ))}
    </div>
  );
}
