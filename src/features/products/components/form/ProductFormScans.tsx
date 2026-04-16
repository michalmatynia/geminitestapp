'use client';

import { useContext } from 'react';

import { useProductScan1688ReviewState } from '@/features/products/components/scans/useProductScan1688ReviewState';
import { useProductFormCustomFields } from '@/features/products/context/ProductFormCustomFieldContext';
import { useProductFormCore } from '@/features/products/context/ProductFormCoreContext';
import { ProductFormImageContext } from '@/features/products/context/ProductFormImageContext';
import { useProductFormParameters } from '@/features/products/context/ProductFormParameterContext';
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
  const productId = product?.id?.trim() ?? '';

  const {
    scanModalProvider,
    setScanModalProvider,
    expandedScanIds,
    expandedDiagnosticScanIds,
    expandedExtractedFieldScanIds,
    toggleScanSteps,
    toggleDiagnostics,
    toggleExtractedFields,
  } = useProductFormScansState(productId);

  const { scans, isFetching, refetch, handleDeleteScan, isDeletingScanId } = useProductScansQuery(productId);

  const { isBlockedScanReviewed, markBlockedScanReviewed, clearBlockedScanReviewed } = useProductScan1688ReviewState();

  const supplier1688FormBindings = useSupplier1688FormBindings({ getValues, setValue, productFormImages });
  const productFormBindings = useProductGeneralFormBindings({
    getValues,
    setValue,
    parameters,
    parameterValues,
    addParameterValue,
    updateParameterId,
    updateParameterValue,
    customFields,
    customFieldValues,
    setTextValue,
    toggleSelectedOption,
  });

  const connectionNamesById = useProductFormConnectionNames();
  const productName = useProductFormScanProductName(product);
  const { recommendedAmazonScan, recommended1688Scan, recommendedAmazonExtractedScanId } = useProductRecommendedScans(scans);

  const isAmazonExtractedExpanded = recommendedAmazonExtractedScanId !== null && expandedExtractedFieldScanIds.has(recommendedAmazonExtractedScanId);
  const is1688BlockedReviewed = recommended1688Scan !== null && isBlockedScanReviewed(recommended1688Scan.id);

  return (
    <div className='space-y-6'>
      <ProductFormScansHeader onSetProvider={setScanModalProvider} />

      <ProductFormRecommendedSummaries
        recommendedAmazonScan={recommendedAmazonScan}
        recommended1688Scan={recommended1688Scan}
        isExtractedFieldsExpanded={isAmazonExtractedExpanded}
        onToggleExtractedFields={toggleExtractedFields}
        is1688BlockedReviewed={is1688BlockedReviewed}
        supplier1688FormBindings={supplier1688FormBindings}
        productFormBindings={productFormBindings}
      />

      <ProductFormScansHistory
        scans={scans}
        productName={productName}
        activeScansCount={scans.filter((s) => s.status === 'running' || s.status === 'queued' || s.status === 'enqueuing').length}
        isFetching={isFetching}
        onRefetch={refetch}
        expandedScanIds={expandedScanIds}
        expandedDiagnosticScanIds={expandedDiagnosticScanIds}
        expandedExtractedFieldScanIds={expandedExtractedFieldScanIds}
        isDeletingScanId={isDeletingScanId}
        onDelete={(id) => { void handleDeleteScan(id); }}
        onToggleSteps={toggleScanSteps}
        onToggleExtractedFields={toggleExtractedFields}
        onToggleDiagnostics={toggleDiagnostics}
        connectionNamesById={connectionNamesById}
        isBlockedScanReviewed={isBlockedScanReviewed}
        markBlockedScanReviewed={markBlockedScanReviewed}
        clearBlockedScanReviewed={clearBlockedScanReviewed}
        supplier1688FormBindings={supplier1688FormBindings}
        productFormBindings={productFormBindings}
      />

      <ProductFormScansModal
        provider={scanModalProvider}
        onClose={(): void => setScanModalProvider(null)}
        productId={productId}
        product={product}
      />
    </div>
  );
}
