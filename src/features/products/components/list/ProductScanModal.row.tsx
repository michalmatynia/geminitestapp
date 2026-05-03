'use client';

import type { ProductScanAmazonFormBindings } from '@/features/products/components/scans/ProductScanAmazonExtractedFieldsPanel';
import type { ProductScan1688FormBindings } from '@/features/products/components/scans/ProductScan1688ApplyPanel';
import type { ProductScanAmazonCandidatePreview } from '@/features/products/lib/product-scan-amazon-candidates';

import { ProductScanRowDetailPanels } from './ProductScanModal.row-details';
import { ProductScanRowActions, ProductScanRowHeader } from './ProductScanModal.row-header';
import { buildProductScanRowViewModel } from './ProductScanModal.row-model';
import { ProductScanRowProgressPanels } from './ProductScanModal.row-progress';
import { ProductScanRowSummaryPanels } from './ProductScanModal.row-summary';
import type {
  ProductScanModalConfig,
  ProductScanModalProvider,
  ScanModalRow,
} from './ProductScanModal.types';

type ProductScanRowProps = {
  row: ScanModalRow;
  modalConfig: ProductScanModalConfig;
  connectionNamesById: Map<string, string>;
  active1688ConnectionName: string | null;
  expandedRowIds: Set<string>;
  expandedDiagnosticRowIds: Set<string>;
  expandedExtractedFieldRowIds: Set<string>;
  isBlockedScanReviewed: (scanId: string | null | undefined) => boolean;
  markBlockedScanReviewed: (scanId: string | null | undefined) => void;
  toggleRowExtractedFields: (productId: string) => void;
  toggleRowDiagnostics: (productId: string) => void;
  toggleRowSteps: (productId: string) => void;
  provider: ProductScanModalProvider;
  formBindings: ProductScanAmazonFormBindings | null;
  supplierFormBindings: ProductScan1688FormBindings | null;
  extractingCandidateUrl: string | null;
  onExtractAmazonCandidate: (
    row: ScanModalRow,
    candidate: ProductScanAmazonCandidatePreview
  ) => Promise<void>;
};

export function ProductScanRow(props: ProductScanRowProps): React.JSX.Element {
  const view = buildProductScanRowViewModel({
    row: props.row,
    connectionNamesById: props.connectionNamesById,
    active1688ConnectionName: props.active1688ConnectionName,
    expandedRowIds: props.expandedRowIds,
    expandedDiagnosticRowIds: props.expandedDiagnosticRowIds,
    expandedExtractedFieldRowIds: props.expandedExtractedFieldRowIds,
    isBlockedScanReviewed: props.isBlockedScanReviewed,
    provider: props.provider,
  });

  return (
    <section className='space-y-2 rounded-md border border-border/60 px-4 py-4'>
      <ProductScanRowHeader row={props.row} modalConfig={props.modalConfig} view={view} />
      <ProductScanRowActions
        row={props.row}
        view={view}
        toggleRowExtractedFields={props.toggleRowExtractedFields}
        toggleRowDiagnostics={props.toggleRowDiagnostics}
        toggleRowSteps={props.toggleRowSteps}
      />
      <ProductScanRowProgressPanels view={view} />
      <ProductScanRowSummaryPanels
        row={props.row}
        modalConfig={props.modalConfig}
        view={view}
        markBlockedScanReviewed={props.markBlockedScanReviewed}
      />
      <ProductScanRowDetailPanels
        row={props.row}
        view={view}
        formBindings={props.formBindings}
        supplierFormBindings={props.supplierFormBindings}
        extractingCandidateUrl={props.extractingCandidateUrl}
        onExtractAmazonCandidate={props.onExtractAmazonCandidate}
      />
    </section>
  );
}
