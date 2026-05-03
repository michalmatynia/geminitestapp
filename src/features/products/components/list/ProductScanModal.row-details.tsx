import { ExternalLink } from 'lucide-react';

import { ProductScanAmazonCandidateSelectionPanel } from '@/features/products/components/scans/ProductScanAmazonCandidateSelectionPanel';
import {
  ProductScanAmazonExtractedFieldsPanel,
  type ProductScanAmazonFormBindings,
} from '@/features/products/components/scans/ProductScanAmazonExtractedFieldsPanel';
import {
  ProductScan1688ApplyPanel,
  type ProductScan1688FormBindings,
} from '@/features/products/components/scans/ProductScan1688ApplyPanel';
import { ProductScan1688Details } from '@/features/products/components/scans/ProductScan1688Details';
import { ProductScanDiagnostics } from '@/features/products/components/scans/ProductScanDiagnostics';
import { ProductScanSteps } from '@/features/products/components/scans/ProductScanSteps';
import type { ProductScanAmazonCandidatePreview } from '@/features/products/lib/product-scan-amazon-candidates';

import type { ProductScanRowViewModel } from './ProductScanModal.row-model';
import type { ScanModalRow } from './ProductScanModal.types';

type ProductScanRowDetailPanelsProps = {
  row: ScanModalRow;
  view: ProductScanRowViewModel;
  formBindings: ProductScanAmazonFormBindings | null;
  supplierFormBindings: ProductScan1688FormBindings | null;
  extractingCandidateUrl: string | null;
  onExtractAmazonCandidate: (
    row: ScanModalRow,
    candidate: ProductScanAmazonCandidatePreview
  ) => Promise<void>;
};

function AmazonCandidateSelectionPanel(
  props: ProductScanRowDetailPanelsProps
): React.JSX.Element | null {
  if (props.view.isAmazonScan === false || props.row.scan === null) return null;

  return (
    <ProductScanAmazonCandidateSelectionPanel
      scan={props.row.scan}
      extractingCandidateUrl={props.extractingCandidateUrl}
      onExtractCandidate={(candidate) => props.onExtractAmazonCandidate(props.row, candidate)}
    />
  );
}

function AmazonExtractedFieldsPanel(
  props: ProductScanRowDetailPanelsProps
): React.JSX.Element | null {
  if (
    props.view.extractedFieldsExpanded === false ||
    props.view.isAmazonScan === false ||
    props.row.scan === null
  ) {
    return null;
  }

  return (
    <div className='mt-3 space-y-3'>
      <ProductScanAmazonExtractedFieldsPanel
        scan={props.row.scan}
        formBindings={props.formBindings}
      />
    </div>
  );
}

function DiagnosticsPanel(props: ProductScanRowDetailPanelsProps): React.JSX.Element | null {
  if (
    props.view.diagnosticsExpanded === false ||
    props.view.diagnostics.diagnostics === null ||
    props.row.scan === null
  ) {
    return null;
  }

  return (
    <div className='mt-3 space-y-3'>
      <div className='flex flex-wrap items-center justify-between gap-2'>
        <h6 className='text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
          Scan Diagnostics
        </h6>
        <LatestFailureScreenshotLink href={props.view.diagnostics.latestFailureArtifactHref} />
      </div>
      <ProductScanDiagnostics scan={props.row.scan} />
    </div>
  );
}

function LatestFailureScreenshotLink(props: {
  href: string | null;
}): React.JSX.Element | null {
  if (props.href === null) return null;

  return (
    <a
      href={props.href}
      target='_blank'
      rel='noopener noreferrer'
      className='inline-flex items-center gap-1 text-xs text-destructive hover:underline'
    >
      Open Latest Failure Screenshot
      <ExternalLink className='h-3 w-3' />
    </a>
  );
}

function ScanStepsPanel(props: ProductScanRowDetailPanelsProps): React.JSX.Element | null {
  if (props.view.isExpanded === false || props.view.scanSteps.length === 0) return null;

  return (
    <div className='mt-3 space-y-2'>
      <h6 className='text-xs font-semibold uppercase tracking-wide text-muted-foreground'>
        Detailed Scan Steps
      </h6>
      <ProductScanSteps steps={props.view.scanSteps} />
    </div>
  );
}

function SupplierDetailsPanels(props: ProductScanRowDetailPanelsProps): React.JSX.Element | null {
  if (props.view.isAmazonScan === true || props.row.scan === null) return null;

  return (
    <div className='mt-3 space-y-3'>
      <div className='border-t border-border/40 pt-3'>
        <ProductScan1688Details
          scan={props.row.scan}
          scanId={props.row.scan.id}
          connectionLabel={props.view.resolvedConnectionLabel}
        />
      </div>
      <div className='border-t border-border/40 pt-3'>
        <ProductScan1688ApplyPanel
          scan={props.row.scan}
          formBindings={props.supplierFormBindings}
        />
      </div>
    </div>
  );
}

export function ProductScanRowDetailPanels(
  props: ProductScanRowDetailPanelsProps
): React.JSX.Element {
  return (
    <>
      <AmazonCandidateSelectionPanel {...props} />
      <AmazonExtractedFieldsPanel {...props} />
      <DiagnosticsPanel {...props} />
      <ScanStepsPanel {...props} />
      <SupplierDetailsPanels {...props} />
    </>
  );
}
