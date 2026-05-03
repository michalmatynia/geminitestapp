import { ChevronDown, ChevronUp, Loader2 } from 'lucide-react';

import { Button } from '@/shared/ui/button';

import { formatTimestamp } from './ProductScanModal.helpers';
import type { ProductScanRowViewModel } from './ProductScanModal.row-model';
import {
  resolveRowStatusClassName,
  resolveRowStatusLabel,
} from './ProductScanModal.row-status';
import type { ProductScanModalConfig, ScanModalRow } from './ProductScanModal.types';

type ProductScanRowHeaderProps = {
  row: ScanModalRow;
  modalConfig: ProductScanModalConfig;
  view: ProductScanRowViewModel;
};

type ProductScanRowActionsProps = {
  row: ScanModalRow;
  view: ProductScanRowViewModel;
  toggleRowExtractedFields: (productId: string) => void;
  toggleRowDiagnostics: (productId: string) => void;
  toggleRowSteps: (productId: string) => void;
};

type ToggleIconProps = {
  isOpen: boolean;
};

function ToggleIcon(props: ToggleIconProps): React.JSX.Element {
  if (props.isOpen) return <ChevronUp className='h-3.5 w-3.5' />;
  return <ChevronDown className='h-3.5 w-3.5' />;
}

export function ProductScanRowHeader(
  props: ProductScanRowHeaderProps
): React.JSX.Element {
  const { row, modalConfig, view } = props;

  return (
    <div className='flex flex-wrap items-center justify-between gap-2'>
      <div className='flex flex-wrap items-center gap-2'>
        <span className='text-sm font-medium'>{row.productName}</span>
        <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground'>
          {modalConfig.resultTypeLabel}
        </span>
        <span
          className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[11px] font-medium ${resolveRowStatusClassName(row)}`}
        >
          {row.status === 'running' ? <Loader2 className='mr-1 h-3 w-3 animate-spin' /> : null}
          {resolveRowStatusLabel(row)}
        </span>
        {view.isAmazonScan === false && view.resolvedConnectionLabel !== null ? (
          <span className='inline-flex items-center rounded-md border border-border/60 px-2 py-0.5 text-[11px] font-medium text-muted-foreground'>
            Profile {view.resolvedConnectionLabel}
          </span>
        ) : null}
      </div>
      <span className='text-xs text-muted-foreground'>
        {formatTimestamp(row.scan?.createdAt)}
      </span>
    </div>
  );
}

export function ProductScanRowActions(
  props: ProductScanRowActionsProps
): React.JSX.Element {
  const { row, view, toggleRowExtractedFields, toggleRowDiagnostics, toggleRowSteps } = props;

  return (
    <div className='flex items-center justify-end gap-1'>
      {view.isAmazonScan === true ? (
        <Button
          type='button'
          variant='ghost'
          size='sm'
          onClick={() => toggleRowExtractedFields(row.productId)}
          disabled={view.hasExtractedFields === false}
          className='h-7 gap-1.5 px-2 text-xs'
        >
          <ToggleIcon isOpen={view.extractedFieldsExpanded} />
          {view.extractedFieldsExpanded ? 'Hide extracted fields' : 'Show extracted fields'}
        </Button>
      ) : null}
      <Button
        type='button'
        variant='ghost'
        size='sm'
        onClick={() => toggleRowDiagnostics(row.productId)}
        disabled={view.diagnostics.hasDiagnostics === false}
        className='h-7 gap-1.5 px-2 text-xs'
      >
        <ToggleIcon isOpen={view.diagnosticsExpanded} />
        {view.diagnosticsExpanded ? 'Hide diagnostics' : 'Show diagnostics'}
      </Button>
      <Button
        type='button'
        variant='ghost'
        size='sm'
        onClick={() => toggleRowSteps(row.productId)}
        disabled={view.scanSteps.length === 0}
        className='h-7 gap-1.5 px-2 text-xs'
      >
        <ToggleIcon isOpen={view.isExpanded} />
        {view.isExpanded ? 'Hide steps' : 'Show steps'}
      </Button>
    </div>
  );
}
