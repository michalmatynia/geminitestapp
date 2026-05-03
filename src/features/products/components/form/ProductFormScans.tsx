'use client';

import { useProductScan1688ReviewState } from '@/features/products/components/scans/useProductScan1688ReviewState';
import { ProductFormScansHeader } from './ProductFormScansHeader';
import { ProductFormScansHistory } from './ProductFormScansHistory';
import { useSupplier1688FormBindings } from './useSupplier1688FormBindings';
import { useProductGeneralFormBindings } from './useProductGeneralFormBindings';
import { useProductScansQuery } from './useProductScansQuery';
import { useProductFormScansState } from './useProductFormScansState';
import { useProductFormConnectionNames } from './useProductFormConnectionNames';
import { ProductFormRecommendedSummaries } from './ProductFormRecommendedSummaries';
import { useProductFormScanProductName } from './useProductFormScanProductName';
import { ProductFormScansModal } from './ProductFormScansModal';
import { useProductRecommendedScans } from './useProductRecommendedScans';
import { useProductFormScansContext } from './useProductFormScansContext';

export default function ProductFormScans(): React.JSX.Element {
  const ctx = useProductFormScansContext();
  const productId = (ctx.product?.id ?? '').trim();

  const state = useProductFormScansState(productId);
  const scanQuery = useProductScansQuery(productId);
  const { isBlockedScanReviewed, markBlockedScanReviewed, clearBlockedScanReviewed } = useProductScan1688ReviewState();

  const supplierBindings = useSupplier1688FormBindings(ctx);
  const productBindings = useProductGeneralFormBindings(ctx);

  const connectionNamesById = useProductFormConnectionNames();
  const productName = useProductFormScanProductName(ctx.product);
  const { recommendedAmazonScan, recommended1688Scan, recommendedAmazonExtractedScanId } = useProductRecommendedScans(scanQuery.scans);

  const isAmazonExtractedExpanded = recommendedAmazonExtractedScanId !== null && state.expandedExtractedFieldScanIds.has(recommendedAmazonExtractedScanId);
  const is1688BlockedReviewed = recommended1688Scan !== null && isBlockedScanReviewed(recommended1688Scan.id);

  const preferred1688Scans = scanQuery.scans.filter((s) => s.provider === '1688');

  return (
    <div className='space-y-6'>
      <ProductFormScansHeader onSetProvider={state.setScanModalProvider} />

      <ProductFormRecommendedSummaries
        recommendedAmazonScan={recommendedAmazonScan}
        recommended1688Scan={recommended1688Scan}
        preferred1688Scans={preferred1688Scans}
        isExtractedFieldsExpanded={isAmazonExtractedExpanded}
        onToggleExtractedFields={state.toggleExtractedFields}
        is1688BlockedReviewed={is1688BlockedReviewed}
        supplier1688FormBindings={supplierBindings}
        productFormBindings={productBindings}
      />

      <ProductFormScansHistory
        scans={scanQuery.scans}
        productName={productName}
        activeScansCount={scanQuery.scans.filter((s) => s.status === 'running' || s.status === 'queued' || s.status === 'enqueuing').length}
        isFetching={scanQuery.isFetching}
        onRefetch={scanQuery.refetch}
        expandedScanIds={state.expandedScanIds}
        expandedDiagnosticScanIds={state.expandedDiagnosticScanIds}
        expandedExtractedFieldScanIds={state.expandedExtractedFieldScanIds}
        isDeletingScanId={scanQuery.isDeletingScanId}
        onDelete={(id): void => { scanQuery.handleDeleteScan(id).catch(() => { /* no-op */ }); }}
        onToggleSteps={state.toggleScanSteps}
        onToggleExtractedFields={state.toggleExtractedFields}
        onToggleDiagnostics={state.toggleDiagnostics}
        connectionNamesById={connectionNamesById}
        isBlockedScanReviewed={isBlockedScanReviewed}
        markBlockedScanReviewed={markBlockedScanReviewed}
        clearBlockedScanReviewed={clearBlockedScanReviewed}
        supplier1688FormBindings={supplierBindings}
        productFormBindings={productBindings}
        onExtractAmazonCandidate={scanQuery.handleExtractAmazonCandidate}
        extractingAmazonCandidateScanId={scanQuery.extractingAmazonCandidateScanId}
        extractingAmazonCandidateUrl={scanQuery.extractingAmazonCandidateUrl}
      />

      <ProductFormScansModal provider={state.scanModalProvider} onClose={(): void => state.setScanModalProvider(null)} productId={productId} product={ctx.product} />
    </div>
  );
}
