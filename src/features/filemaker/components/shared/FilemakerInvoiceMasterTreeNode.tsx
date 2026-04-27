'use client';

import { Download, FileText } from 'lucide-react';
import React from 'react';

import type { FolderTreeViewportRenderNodeInput } from '@/shared/lib/foldertree/public';
import { Button } from '@/shared/ui/primitives.public';
import { cn } from '@/shared/utils/ui-utils';

import { fromFilemakerInvoiceNodeId } from '../../entity-master-tree';
import type { MongoFilemakerInvoice } from '../../pages/AdminFilemakerInvoicesPage.types';

type FilemakerInvoiceTreeNodeProps = FolderTreeViewportRenderNodeInput & {
  exportingInvoiceId: string | null;
  invoiceById: ReadonlyMap<string, MongoFilemakerInvoice>;
  onExportInvoicePdf: (invoiceId: string) => void;
};

type InvoiceLeafNodeProps = Pick<FolderTreeViewportRenderNodeInput, 'depth' | 'select'> & {
  exportingInvoiceId: string | null;
  invoice: MongoFilemakerInvoice;
  onExportInvoicePdf: (invoiceId: string) => void;
  stateClassName: string;
};

const resolveInvoiceTreeNodeStateClassName = (input: {
  isSearchMatch: boolean;
  isSelected: boolean;
}): string => {
  if (input.isSelected) return 'bg-blue-600 text-white shadow-sm';
  if (input.isSearchMatch) {
    return 'bg-blue-500/10 text-blue-100 ring-1 ring-inset ring-blue-500/30';
  }
  return 'text-gray-300 hover:bg-muted/40';
};

const formatOptionalInvoiceField = (value: string | null | undefined): string => {
  const normalized = value?.trim() ?? '';
  return normalized.length > 0 ? normalized : 'n/a';
};

const isTreeActivationKey = (event: React.KeyboardEvent<HTMLElement>): boolean =>
  event.key === 'Enter' || event.key === ' ';

const createTreeIndentStyle = (depth: number): React.CSSProperties => ({
  paddingLeft: `${depth * 16 + 8}px`,
});

function TreeNodeSpacer(): React.JSX.Element {
  return <span className='inline-flex size-5 shrink-0' aria-hidden='true' />;
}

const formatInvoiceTitle = (invoice: MongoFilemakerInvoice): string => {
  const invoiceNo = invoice.invoiceNo?.trim() ?? '';
  if (invoiceNo.length > 0) return invoiceNo;
  const signature = invoice.signature?.trim() ?? '';
  return signature.length > 0 ? signature : invoice.id;
};

const formatPartyPreview = (invoice: MongoFilemakerInvoice): string => {
  const seller = formatOptionalInvoiceField(invoice.organizationSName);
  const buyer = formatOptionalInvoiceField(invoice.organizationBName);
  return `${seller} -> ${buyer}`;
};

function FilemakerInvoiceLeafDetails(props: {
  invoice: MongoFilemakerInvoice;
}): React.JSX.Element {
  const { invoice } = props;
  return (
    <div className='min-w-0 flex-1'>
      <div className='truncate font-semibold text-white'>{formatInvoiceTitle(invoice)}</div>
      <div className='truncate text-xs text-gray-300'>{formatPartyPreview(invoice)}</div>
      <div className='truncate text-[11px] text-gray-400'>
        Issue: {formatOptionalInvoiceField(invoice.issueDate)} | Due:{' '}
        {formatOptionalInvoiceField(invoice.cPaymentDue)}
      </div>
      <div className='truncate text-[10px] text-gray-600'>
        Sum: {formatOptionalInvoiceField(invoice.servicesSum)}{' '}
        {formatOptionalInvoiceField(invoice.servicesCurrency)} | Links:{' '}
        {invoice.organizationLinkCount}
      </div>
    </div>
  );
}

function FilemakerInvoiceLeafNode(props: InvoiceLeafNodeProps): React.JSX.Element {
  const { invoice, depth, select, stateClassName, onExportInvoicePdf, exportingInvoiceId } = props;
  const isExporting = exportingInvoiceId === invoice.id;
  const title = formatInvoiceTitle(invoice);
  return (
    <div
      className={cn('flex items-center gap-2 rounded px-2 py-2 text-sm transition', stateClassName)}
      style={createTreeIndentStyle(depth)}
      role='button'
      tabIndex={0}
      onClick={(clickEvent: React.MouseEvent<HTMLDivElement>): void => {
        select(clickEvent);
      }}
      onKeyDown={(keyEvent: React.KeyboardEvent<HTMLDivElement>): void => {
        if (!isTreeActivationKey(keyEvent)) return;
        keyEvent.preventDefault();
        onExportInvoicePdf(invoice.id);
      }}
    >
      <TreeNodeSpacer />
      <FileText className='size-4 shrink-0 text-blue-300' />
      <FilemakerInvoiceLeafDetails invoice={invoice} />
      <Button
        type='button'
        variant='outline'
        size='sm'
        className='h-7 shrink-0'
        aria-label={`Export invoice ${title} as PDF`}
        title={`Export invoice ${title} as PDF`}
        disabled={isExporting}
        onClick={(clickEvent: React.MouseEvent<HTMLButtonElement>): void => {
          clickEvent.preventDefault();
          clickEvent.stopPropagation();
          onExportInvoicePdf(invoice.id);
        }}
      >
        <Download className='mr-1 size-3.5' />
        {isExporting ? 'PDF...' : 'PDF'}
      </Button>
    </div>
  );
}

export function FilemakerInvoiceMasterTreeNode(
  props: FilemakerInvoiceTreeNodeProps
): React.JSX.Element | null {
  const { node, isSelected, isSearchMatch, invoiceById } = props;
  const invoiceId = fromFilemakerInvoiceNodeId(node.id);
  const invoice = invoiceId !== null ? (invoiceById.get(invoiceId) ?? null) : null;
  if (invoice === null) return null;
  const stateClassName = resolveInvoiceTreeNodeStateClassName({ isSelected, isSearchMatch });

  return (
    <FilemakerInvoiceLeafNode
      invoice={invoice}
      depth={props.depth}
      select={props.select}
      stateClassName={stateClassName}
      onExportInvoicePdf={props.onExportInvoicePdf}
      exportingInvoiceId={props.exportingInvoiceId}
    />
  );
}
