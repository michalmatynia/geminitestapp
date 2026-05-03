'use client';

/* eslint-disable complexity, max-lines-per-function */

import { Settings } from 'lucide-react';
import { useRouter } from 'nextjs-toploader/app';
import React, {
  startTransition,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from 'react';

import type { PanelAction } from '@/shared/contracts/ui/panels';
import type { FolderTreeViewportRenderNodeInput } from '@/shared/lib/foldertree/public';
import { useToast } from '@/shared/ui/primitives.public';

import { FilemakerInvoiceMasterTreeNode } from '../components/shared/FilemakerInvoiceMasterTreeNode';
import { buildFilemakerNavActions } from '../components/shared/filemaker-nav-actions';
import { buildFilemakerInvoiceListNodes } from '../entity-master-tree';
import {
  DEFAULT_INVOICE_PAGE_SIZE,
  EMPTY_INVOICES_RESPONSE,
  createDefaultInvoiceFilters,
  type InvoiceFilters,
  type InvoiceListState,
  type MongoFilemakerInvoice,
  type MongoFilemakerInvoicesResponse,
  type MongoFilemakerInvoicesState,
} from '../pages/AdminFilemakerInvoicesPage.types';

const ORGANIZATION_FILTERS = new Set(['with_organizations', 'without_organizations']);
const PAYMENT_FILTERS = new Set(['paid', 'unpaid']);

const normalizeSelectFilter = <T extends string>(
  value: string,
  allowed: Set<string>,
  fallback: T
): T => (allowed.has(value) ? (value as T) : fallback);

const FILTER_NORMALIZERS: Record<string, (value: string) => Partial<InvoiceFilters>> = {
  organization: (value: string) => ({
    organization: normalizeSelectFilter(value, ORGANIZATION_FILTERS, 'all'),
  }),
  payment: (value: string) => ({
    payment: normalizeSelectFilter(value, PAYMENT_FILTERS, 'all'),
  }),
  year: (value: string) => ({ year: value }),
};

const normalizeFilterValue = (key: string, value: unknown): Partial<InvoiceFilters> => {
  const normalizer = FILTER_NORMALIZERS[key];
  return normalizer ? normalizer(typeof value === 'string' ? value : '') : {};
};

const buildInvoiceListParams = (input: {
  filters: InvoiceFilters;
  page: number;
  pageSize: number;
  query: string;
}): URLSearchParams => {
  const params = new URLSearchParams({
    organization: input.filters.organization,
    page: String(input.page),
    pageSize: String(input.pageSize),
    payment: input.filters.payment,
  });
  if (input.query.length > 0) params.set('query', input.query);
  const year = input.filters.year.trim();
  if (year.length > 0) params.set('year', year);
  return params;
};

const readDownloadFilename = (response: Response, fallback: string): string => {
  const contentDisposition = response.headers.get('Content-Disposition') ?? '';
  const quoted = /filename="([^"]+)"/i.exec(contentDisposition);
  if (quoted?.[1] !== undefined && quoted[1].length > 0) return quoted[1];
  const unquoted = /filename=([^;]+)/i.exec(contentDisposition);
  const unquotedFilename = unquoted?.[1]?.trim() ?? '';
  return unquotedFilename.length > 0 ? unquotedFilename : fallback;
};

const downloadBlob = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
};

function useMongoFilemakerInvoices(input: {
  filters: InvoiceFilters;
  page: number;
  pageSize: number;
  query: string;
}): MongoFilemakerInvoicesState {
  const { filters, page, pageSize, query } = input;
  const [state, setState] = useState<MongoFilemakerInvoicesState>({
    ...EMPTY_INVOICES_RESPONSE,
    error: null,
    isLoading: true,
  });

  useEffect(() => {
    const controller = new AbortController();
    const params = buildInvoiceListParams({ filters, page, pageSize, query });
    setState((current) => ({ ...current, error: null, isLoading: true }));
    fetch(`/api/filemaker/invoices?${params.toString()}`, { signal: controller.signal })
      .then(async (response: Response): Promise<MongoFilemakerInvoicesResponse> => {
        if (!response.ok) throw new Error(`Failed to load invoices (${response.status}).`);
        return (await response.json()) as MongoFilemakerInvoicesResponse;
      })
      .then((response: MongoFilemakerInvoicesResponse): void => {
        setState({ ...response, error: null, isLoading: false });
      })
      .catch((error: unknown): void => {
        if (controller.signal.aborted) return;
        setState((current) => ({
          ...current,
          error: error instanceof Error ? error.message : 'Failed to load invoices.',
          isLoading: false,
        }));
      });
    return () => {
      controller.abort();
    };
  }, [filters, page, pageSize, query]);

  return state;
}

function useInvoiceActions(router: ReturnType<typeof useRouter>): PanelAction[] {
  return useMemo(
    () => [
      {
        key: 'invoice-pdf-settings',
        label: 'PDF Settings',
        icon: <Settings className='size-4' />,
        variant: 'outline' as const,
        onClick: () => {
          startTransition(() => {
            router.push('/admin/settings/filemaker-invoice-pdf');
          });
        },
      },
      ...buildFilemakerNavActions(router, 'invoices'),
    ],
    [router]
  );
}

function useInvoiceRenderNode(
  invoices: MongoFilemakerInvoice[],
  exportingInvoiceId: string | null,
  onExportInvoicePdf: (invoiceId: string) => void
): (input: FolderTreeViewportRenderNodeInput) => React.ReactNode {
  const invoiceById = useMemo(
    () => new Map<string, MongoFilemakerInvoice>(invoices.map((invoice) => [invoice.id, invoice])),
    [invoices]
  );
  return useCallback(
    (input: FolderTreeViewportRenderNodeInput): React.ReactNode => (
      <FilemakerInvoiceMasterTreeNode
        {...input}
        invoiceById={invoiceById}
        onExportInvoicePdf={onExportInvoicePdf}
        exportingInvoiceId={exportingInvoiceId}
      />
    ),
    [exportingInvoiceId, invoiceById, onExportInvoicePdf]
  );
}

export function useAdminFilemakerInvoicesListState(): InvoiceListState {
  const router = useRouter();
  const { toast } = useToast();
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_INVOICE_PAGE_SIZE);
  const [filters, setFilters] = useState<InvoiceFilters>(createDefaultInvoiceFilters);
  const [exportingInvoiceId, setExportingInvoiceId] = useState<string | null>(null);
  const deferredQuery = useDeferredValue(query.trim());
  const mongoInvoices = useMongoFilemakerInvoices({
    filters,
    page,
    pageSize,
    query: deferredQuery,
  });
  const actions = useInvoiceActions(router);
  const invoices = mongoInvoices.invoices;
  const nodes = useMemo(() => buildFilemakerInvoiceListNodes(invoices), [invoices]);

  const handleExportInvoicePdf = useCallback(
    (invoiceId: string): void => {
      setExportingInvoiceId(invoiceId);
      fetch('/api/filemaker/invoices/export-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ invoiceId }),
      })
        .then(async (response: Response): Promise<void> => {
          if (!response.ok) throw new Error(`Failed to export invoice (${response.status}).`);
          const filename = readDownloadFilename(response, `invoice-${invoiceId}.pdf`);
          downloadBlob(await response.blob(), filename);
          toast('Invoice PDF exported.', { variant: 'success' });
        })
        .catch((error: unknown): void => {
          toast(error instanceof Error ? error.message : 'Failed to export invoice PDF.', {
            variant: 'error',
          });
        })
        .finally((): void => {
          setExportingInvoiceId(null);
        });
    },
    [toast]
  );

  const renderNode = useInvoiceRenderNode(invoices, exportingInvoiceId, handleExportInvoicePdf);

  return {
    actions,
    error: mongoInvoices.error,
    exportingInvoiceId,
    filters,
    isLoading: mongoInvoices.isLoading,
    nodes,
    onExportInvoicePdf: handleExportInvoicePdf,
    onFilterChange: (key, value) => {
      setFilters((current) => ({ ...current, ...normalizeFilterValue(key, value) }));
      setPage(1);
    },
    onPageChange: setPage,
    onPageSizeChange: (value) => {
      setPageSize(value);
      setPage(1);
    },
    onQueryChange: (value) => {
      setQuery(value);
      setPage(1);
    },
    onResetFilters: () => {
      setQuery('');
      setFilters(createDefaultInvoiceFilters());
      setPage(1);
    },
    page,
    pageSize,
    query,
    renderNode,
    shownCount: invoices.length,
    totalCount: mongoInvoices.totalCount,
    totalPages: mongoInvoices.totalPages,
  };
}
