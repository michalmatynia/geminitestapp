'use client';

import { ChevronDown, ChevronUp } from 'lucide-react';
import React from 'react';

import { Button } from '@/shared/ui/button';

type ProductScanActionButtonsProps = {
  scanId: string;
  isAmazonScan: boolean;
  hasExtractedFields: boolean;
  isExpanded: boolean;
  diagnosticsExpanded: boolean;
  extractedFieldsExpanded: boolean;
  hasSteps: boolean;
  onToggleSteps: (scanId: string) => void;
  onToggleExtractedFields: (scanId: string) => void;
  onToggleDiagnostics: (scanId: string) => void;
};

export function ProductScanActionButtons({
  scanId,
  isAmazonScan,
  hasExtractedFields,
  isExpanded,
  diagnosticsExpanded,
  extractedFieldsExpanded,
  hasSteps,
  onToggleSteps,
  onToggleExtractedFields,
  onToggleDiagnostics,
}: ProductScanActionButtonsProps): React.JSX.Element {
  return (
    <div className='flex items-center justify-end gap-1'>
      {isAmazonScan === true ? (
        <Button
          type='button'
          variant='ghost'
          size='sm'
          onClick={() => onToggleExtractedFields(scanId)}
          disabled={hasExtractedFields === false}
          className='h-7 gap-1.5 px-2 text-xs'
        >
          {extractedFieldsExpanded ? (
            <ChevronUp className='h-3.5 w-3.5' />
          ) : (
            <ChevronDown className='h-3.5 w-3.5' />
          )}
          {extractedFieldsExpanded ? 'Hide extracted fields' : 'Show extracted fields'}
        </Button>
      ) : null}
      <Button
        type='button'
        variant='ghost'
        size='sm'
        onClick={() => onToggleDiagnostics(scanId)}
        className='h-7 gap-1.5 px-2 text-xs'
      >
        {diagnosticsExpanded ? (
          <ChevronUp className='h-3.5 w-3.5' />
        ) : (
          <ChevronDown className='h-3.5 w-3.5' />
        )}
        {diagnosticsExpanded ? 'Hide diagnostics' : 'Show diagnostics'}
      </Button>
      <Button
        type='button'
        variant='ghost'
        size='sm'
        onClick={() => onToggleSteps(scanId)}
        disabled={hasSteps === false}
        className='h-7 gap-1.5 px-2 text-xs'
      >
        {isExpanded ? <ChevronUp className='h-3.5 w-3.5' /> : <ChevronDown className='h-3.5 w-3.5' />}
        {isExpanded ? 'Hide steps' : 'Show steps'}
      </Button>
    </div>
  );
}
