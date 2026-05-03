import { AppModal } from '@/shared/ui/app-modal';

import { ProductScanAmazonSelectorProfilePanel } from './ProductScanModal.amazon-panel';
import {
  ProductScan1688SessionPanel,
  ProductScanModalEmptyState,
  ProductScanModalHeaderActions,
} from './ProductScanModal.panels';
import { ProductScanRow } from './ProductScanModal.row';
import { formatProductScanRowsSummary } from './ProductScanModal.summary';
import type {
  ProductScanModal1688Connection,
  ProductScanModalConfig,
  ProductScanModalProvider,
  ScanModalRow,
} from './ProductScanModal.types';

export type ProductScanModalViewProps = {
  active1688Connection: ProductScanModal1688Connection | null;
  active1688ConnectionName: string | null;
  active1688PostureWarnings: string[];
  amazonImageSearchPageDraftUrl: string;
  amazonImageSearchPageUrl: string;
  amazonSelectorProfile: string;
  amazonSelectorProfileOptions: string[];
  amazonSelectorRegistryQuery: {
    data?: { profiles?: string[] };
    isError: boolean;
    isLoading: boolean;
  };
  connectionNamesById: Map<string, string>;
  expandedDiagnosticRowIds: Set<string>;
  expandedExtractedFieldRowIds: Set<string>;
  expandedRowIds: Set<string>;
  extractingCandidateUrlsByProductId: Record<string, string | null>;
  formBindings: React.ComponentProps<typeof ProductScanRow>['formBindings'];
  handle1688RefreshSession: () => Promise<{ ok: boolean; message: string }>;
  handleExtractAmazonCandidate: React.ComponentProps<typeof ProductScanRow>['onExtractAmazonCandidate'];
  handleManualRefresh: () => void;
  hasResolved1688Session: boolean;
  is1688ConnectionBootstrapPending: boolean;
  is1688LoginPending: boolean;
  isBlockedScanReviewed: (scanId: string | null | undefined) => boolean;
  isOpen: boolean;
  isPolling: boolean;
  isSubmitting: boolean;
  latest1688SessionError: string | null;
  latest1688SessionMessage: string | null;
  markBlockedScanReviewed: (scanId: string | null | undefined) => void;
  modalConfig: ProductScanModalConfig;
  onClose: () => void;
  provider: ProductScanModalProvider;
  rows: ScanModalRow[];
  setAmazonImageSearchPageDraftUrl: React.Dispatch<React.SetStateAction<string>>;
  setAmazonImageSearchPageUrl: React.Dispatch<React.SetStateAction<string>>;
  setAmazonSelectorProfile: React.Dispatch<React.SetStateAction<string>>;
  supplierFormBindings: React.ComponentProps<typeof ProductScanRow>['supplierFormBindings'];
  toggleRowDiagnostics: (productId: string) => void;
  toggleRowExtractedFields: (productId: string) => void;
  toggleRowSteps: (productId: string) => void;
};

export function ProductScanModalView(props: ProductScanModalViewProps): React.JSX.Element {
  return (
    <AppModal
      isOpen={props.isOpen}
      onClose={props.onClose}
      title={props.modalConfig.modalTitle}
      subtitle={formatProductScanRowsSummary(props.rows)}
      size='lg'
      headerActions={<ProductScanModalHeaderActions {...props} />}
    >
      <div className='space-y-3'>
        <ProductScanAmazonSelectorProfilePanel {...props} />
        <ProductScan1688SessionPanel {...props} />
        {props.rows.length === 0 ? (
          <ProductScanModalEmptyState
            provider={props.provider}
            is1688ConnectionBootstrapPending={props.is1688ConnectionBootstrapPending}
            is1688LoginPending={props.is1688LoginPending}
            hasResolved1688Session={props.hasResolved1688Session}
            preparingLabel={props.modalConfig.preparingLabel}
          />
        ) : (
          props.rows.map((row) => (
            <ProductScanRow
              key={row.productId}
              row={row}
              modalConfig={props.modalConfig}
              connectionNamesById={props.connectionNamesById}
              active1688ConnectionName={props.active1688ConnectionName}
              expandedRowIds={props.expandedRowIds}
              expandedDiagnosticRowIds={props.expandedDiagnosticRowIds}
              expandedExtractedFieldRowIds={props.expandedExtractedFieldRowIds}
              isBlockedScanReviewed={props.isBlockedScanReviewed}
              markBlockedScanReviewed={props.markBlockedScanReviewed}
              toggleRowExtractedFields={props.toggleRowExtractedFields}
              toggleRowDiagnostics={props.toggleRowDiagnostics}
              toggleRowSteps={props.toggleRowSteps}
              provider={props.provider}
              formBindings={props.formBindings}
              supplierFormBindings={props.supplierFormBindings}
              extractingCandidateUrl={props.extractingCandidateUrlsByProductId[row.productId] ?? null}
              onExtractAmazonCandidate={props.handleExtractAmazonCandidate}
            />
          ))
        )}
      </div>
    </AppModal>
  );
}
