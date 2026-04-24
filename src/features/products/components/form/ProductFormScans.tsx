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
  const {
    scans,
    isFetching,
    refetch,
    handleDeleteScan,
    handleExtractAmazonCandidate,
    extractingAmazonCandidateScanId,
    extractingAmazonCandidateUrl,
    isDeletingScanId,
  } = useProductScansQuery(productId);
  const { isBlockedScanReviewed, markBlockedScanReviewed, clearBlockedScanReviewed } = useProductScan1688ReviewState();

  const supplierBindings = useSupplier1688FormBindings({ getValues: ctx.getValues, setValue: ctx.setValue, productFormImages: ctx.productFormImages });
  const productBindings = useProductGeneralFormBindings({
    getValues: ctx.getValues, setValue: ctx.setValue, parameters: ctx.parameters, parameterValues: ctx.parameterValues,
    addParameterValue: ctx.addParameterValue, updateParameterId: ctx.updateParameterId, updateParameterValue: ctx.updateParameterValue,
    customFields: ctx.customFields, customFieldValues: ctx.customFieldValues, setTextValue: ctx.setTextValue, toggleSelectedOption: ctx.toggleSelectedOption,
  });

  const connectionNamesById = useProductFormConnectionNames();
  const productName = useProductFormScanProductName(ctx.product);
  const { recommendedAmazonScan, recommended1688Scan, recommendedAmazonExtractedScanId } = useProductRecommendedScans(scans);

  const isAmazonExtractedExpanded = recommendedAmazonExtractedScanId !== null && state.expandedExtractedFieldScanIds.has(recommendedAmazonExtractedScanId);
  const is1688BlockedReviewed = recommended1688Scan !== null && isBlockedScanReviewed(recommended1688Scan.id);

  const preferred1688Scans = scans.filter((s) => s.provider === '1688');

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
        scans={scans}
        productName={productName}
        activeScansCount={scans.filter((s) => s.status === 'running' || s.status === 'queued' || s.status === 'enqueuing').length}
        isFetching={isFetching}
        onRefetch={refetch}
        expandedScanIds={state.expandedScanIds}
        expandedDiagnosticScanIds={state.expandedDiagnosticScanIds}
        expandedExtractedFieldScanIds={state.expandedExtractedFieldScanIds}
        isDeletingScanId={isDeletingScanId}
        onDelete={(id): void => { handleDeleteScan(id).catch(() => { /* no-op */ }); }}
        onToggleSteps={state.toggleScanSteps}
        onToggleExtractedFields={state.toggleExtractedFields}
        onToggleDiagnostics={state.toggleDiagnostics}
        connectionNamesById={connectionNamesById}
        isBlockedScanReviewed={isBlockedScanReviewed}
        markBlockedScanReviewed={markBlockedScanReviewed}
        clearBlockedScanReviewed={clearBlockedScanReviewed}
        supplier1688FormBindings={supplierBindings}
        productFormBindings={productBindings}
        onExtractAmazonCandidate={handleExtractAmazonCandidate}
        extractingAmazonCandidateScanId={extractingAmazonCandidateScanId}
        extractingAmazonCandidateUrl={extractingAmazonCandidateUrl}
      />

      <ProductFormScansModal provider={state.scanModalProvider} onClose={(): void => state.setScanModalProvider(null)} productId={productId} product={ctx.product} />
    </div>
  );
}
