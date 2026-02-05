"use client";

import { Button, SharedModal, ListPanel, SectionHeader, StatusBadge, Pagination, DynamicFilters, RefreshButton, type FilterField } from "@/shared/ui";
import { useMemo, useState } from "react";
import Link from "next/link";
import {
  RefreshCw,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
} from "lucide-react";

import type { ListingJob, ListingAttempt, ProductJob } from "@/shared/types/listing-jobs";
import { useIntegrationJobs } from "@/features/jobs/hooks/useJobQueries";
import { useCancelListingMutation } from "@/features/jobs/hooks/useJobMutations";
import { logClientError } from "@/features/observability";
import { JobTable, type JobRowData } from "./JobTable";

type ProductListingJobsPanelProps = {
  showBackToProducts?: boolean;
};

type ListingRow = {
  job: ProductJob;
  listing: ListingJob;
  attempt: ListingAttempt | null;
  attemptIndex: number | null;
};

const getStatusIcon = (status: string): React.JSX.Element => {
  switch (status) {
    case "pending":
      return <Clock className="size-3" />;
    case "completed":
    case "success":
    case "listed":
      return <CheckCircle className="size-3" />;
    case "deleted":
    case "removed":
      return <XCircle className="size-3" />;
    case "failed":
    case "error":
      return <XCircle className="size-3" />;
    case "processing":
    case "in_progress":
      return <Loader2 className="size-3 animate-spin" />;
    default:
      return <Clock className="size-3" />;
  }
};

export default function ProductListingJobsPanel({
  showBackToProducts = true,
}: ProductListingJobsPanelProps): React.JSX.Element {
  // Queries
  const jobsQuery = useIntegrationJobs();
  const jobs = useMemo(() => (jobsQuery.data as ProductJob[]) || [], [jobsQuery.data]);

  // Mutations
  const cancelMutation = useCancelListingMutation();

  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [selectedListing, setSelectedListing] = useState<{
    job: ProductJob;
    listing: ListingJob;
    attempt: ListingAttempt | null;
    attemptIndex: number | null;
  } | null>(null);
  const [historyExpanded, setHistoryExpanded] = useState(false);
  const [historySort, setHistorySort] = useState<"desc" | "asc">("desc");

  const handleCancelListing = async (productId: string, listingId: string): Promise<void> => {
    if (!window.confirm("Cancel this listing job? This will remove it from the queue.")) {
      return;
    }

    try {
      await cancelMutation.mutateAsync({ productId, listingId });
    } catch (err: unknown) {
      logClientError(err, { context: { source: "ProductListingJobsPanel", action: "cancelListing", productId, listingId } });
    }
  };

  const formatDateTime = (value: Date | string | null): string => {
    if (!value) return "—";
    const date: Date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return date.toLocaleString();
  };

  const getSortedHistory = (history: ListingJob["exportHistory"]): ListingAttempt[] => {
    if (!history?.length) return [];
    const sorted = [...history].sort((a: ListingAttempt, b: ListingAttempt) => {
      const aTime: number = new Date(a.exportedAt).getTime();
      const bTime: number = new Date(b.exportedAt).getTime();
      return historySort === "asc" ? aTime - bTime : bTime - aTime;
    });
    return sorted;
  };

  const listingRows: ListingRow[] = useMemo(() => 
    jobs.flatMap((job: ProductJob) =>
      job.listings.flatMap((listing: ListingJob): ListingRow[] => {
        const history = listing.exportHistory ?? [];
        if (history.length === 0) {
          return [{ job, listing, attempt: null, attemptIndex: null }];
        }
        return history.map((attempt: ListingAttempt, index: number) => ({
          job,
          listing,
          attempt,
          attemptIndex: index,
        }));
      })
    ), [jobs]
  );

  const filteredRows = useMemo(() => listingRows.filter(({ job, listing, attempt }: ListingRow) => {
    if (!query.trim()) return true;
    const target = [
      job.productName,
      job.productSku ?? "",
      job.productId,
      listing.integrationName,
      listing.connectionName,
      attempt?.status ?? listing.status,
      listing.id,
      listing.externalListingId ?? "",
      attempt?.inventoryId ?? "",
      attempt?.templateId ?? "",
      attempt?.warehouseId ?? "",
      attempt?.externalListingId ?? "",
      ...(attempt?.fields ?? []),
    ]
      .join(" ")
      .toLowerCase();
    return target.includes(query.trim().toLowerCase());
  }), [listingRows, query]);

  const sortedRows = useMemo(() => [...filteredRows].sort((a: ListingRow, b: ListingRow) => {
    const aTime: number = new Date(a.attempt?.exportedAt ?? a.listing.updatedAt ?? a.listing.createdAt).getTime();
    const bTime: number = new Date(b.attempt?.exportedAt ?? b.listing.updatedAt ?? b.listing.createdAt).getTime();
    return bTime - aTime;
  }), [filteredRows]);

  const totalRows = sortedRows.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
  const clampedPage = Math.min(page, totalPages);
  const startIndex = (clampedPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const pagedRows = sortedRows.slice(startIndex, endIndex);

  const selectedAttempt = selectedListing?.attempt ?? null;
  const selectedStatus = selectedAttempt?.status ?? selectedListing?.listing.status ?? "";

  const header = (
    <SectionHeader
      title="Export Jobs"
      description="Track product export and listing jobs across all integrations"
      size="md"
      actions={
        <>
          <RefreshButton
            onRefresh={() => void jobsQuery.refetch()}
            isRefreshing={jobsQuery.isFetching}
          />
          {showBackToProducts && (
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/products">Back to Products</Link>
            </Button>
          )}
        </>
      }
    />
  );

  const filterFields: FilterField[] = [
    { key: "query", label: "Search", type: "search", placeholder: "Search by product, SKU, integration, or ID..." },
  ];

  const filters = !jobsQuery.isLoading && !jobsQuery.error ? (
    <DynamicFilters
      fields={filterFields}
      values={{ query }}
      onChange={(_, value) => setQuery(value)}
      onReset={() => setQuery("")}
      hasActiveFilters={Boolean(query)}
    />
  ) : null;

  const footer = !jobsQuery.isLoading && !jobsQuery.error ? (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/5 pt-4">
      <div className="text-xs text-gray-400">
        Showing {totalRows === 0 ? 0 : startIndex + 1}–{Math.min(endIndex, totalRows)} of {totalRows}
      </div>
      <Pagination
        page={clampedPage}
        totalPages={totalPages}
        onPageChange={setPage}
        showPageSize
        pageSize={pageSize}
        onPageSizeChange={setPageSize}
        variant="compact"
      />
    </div>
  ) : null;

  return (
    <>
      <ListPanel
        header={header}
        alerts={
          jobsQuery.error ? (
            <div className="rounded-md border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {(jobsQuery.error).message}
            </div>
          ) : null
        }
        filters={filters}
        footer={footer}
      >
        {jobsQuery.isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="size-8 animate-spin text-gray-500" />
          </div>
        ) : !jobsQuery.error ? (
          <JobTable
            data={pagedRows.map((row: ListingRow): JobRowData => {
              const { job, listing, attempt, attemptIndex } = row;
              const status = attempt?.status ?? listing.status ?? "unknown";
              const typeLabel =
                status === "deleted" || status === "removed" ? "Removal" : "Export";
              const attemptLabel =
                attemptIndex !== null ? `Attempt ${attemptIndex + 1}` : "Listing";
              
              return {
                id: listing.id,
                type: `${typeLabel}: ${listing.integrationName}`,
                status: status as JobRowData["status"],
                entityName: job.productName,
                entitySubText: `SKU: ${job.productSku || "N/A"} · ${attemptLabel}`,
                productId: job.productId,
                createdAt: attempt?.exportedAt ?? listing.createdAt,
                finishedAt: listing.updatedAt,
              };
            })}
            isLoading={jobsQuery.isLoading}
            onViewDetails={(id: string) => {
              const row = pagedRows.find((r: ListingRow) => r.listing.id === id);
              if (row) setSelectedListing(row);
            }}
            onCancel={(id: string) => {
              const row = pagedRows.find((r: ListingRow) => r.listing.id === id);
              if (row) void handleCancelListing(row.job.productId, row.listing.id);
            }}
            isCancelling={(id: string) => cancelMutation.isPending && cancelMutation.variables?.listingId === id}
          />
        ) : null}
      </ListPanel>
      {selectedListing && (
        <SharedModal
          open={true}
          onClose={(): void => setSelectedListing(null)}
          title="Export Job Details"
          size="lg"
        >
            <div className="space-y-6 text-sm">
              <div className="grid grid-cols-2 gap-4 rounded-md bg-gray-900 p-4">
                <div>
                  <div className="text-gray-500 uppercase text-[10px] font-bold">Status</div>
                  <div className="mt-1">
                    <StatusBadge 
                      status={selectedStatus || selectedListing.listing.status} 
                      icon={getStatusIcon(selectedStatus || selectedListing.listing.status)}
                    />
                  </div>
                </div>
                <div>
                  <div className="text-gray-500 uppercase text-[10px] font-bold">Integration</div>
                  <div className="text-white font-medium">
                    {selectedListing.listing.integrationName}
                  </div>
                </div>
                <div>
                  <div className="text-gray-500 uppercase text-[10px] font-bold">Connection</div>
                  <div className="text-white font-medium">
                    {selectedListing.listing.connectionName}
                  </div>
                </div>
                <div>
                  <div className="text-gray-500 uppercase text-[10px] font-bold">Product</div>
                  <div className="text-white font-medium">
                    {selectedListing.job.productName}
                  </div>
                  <div className="text-xs text-gray-500">
                    SKU: {selectedListing.job.productSku ?? "—"}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 rounded-md border border-border bg-card/60 p-4">
                <div>
                  <div className="text-gray-500 uppercase text-[10px] font-bold">Job ID</div>
                  <div className="text-white font-mono text-xs">
                    {selectedListing.listing.id}
                  </div>
                </div>
                <div>
                  <div className="text-gray-500 uppercase text-[10px] font-bold">External ID</div>
                  <div className="text-white font-mono text-xs">
                    {selectedListing.listing.externalListingId ?? "—"}
                  </div>
                </div>
                <div>
                  <div className="text-gray-500 uppercase text-[10px] font-bold">Inventory ID</div>
                  <div className="text-white font-mono text-xs">
                    {selectedListing.listing.inventoryId ?? "—"}
                  </div>
                </div>
                <div>
                  <div className="text-gray-500 uppercase text-[10px] font-bold">Created</div>
                  <div className="text-white">
                    {formatDateTime(selectedListing.listing.createdAt)}
                  </div>
                </div>
                <div>
                  <div className="text-gray-500 uppercase text-[10px] font-bold">Updated</div>
                  <div className="text-white">
                    {formatDateTime(selectedListing.listing.updatedAt)}
                  </div>
                </div>
                <div>
                  <div className="text-gray-500 uppercase text-[10px] font-bold">Listed At</div>
                  <div className="text-white">
                    {formatDateTime(selectedListing.listing.listedAt)}
                  </div>
                </div>
                <div>
                  <div className="text-gray-500 uppercase text-[10px] font-bold">Integration ID</div>
                  <div className="text-white font-mono text-xs">
                    {selectedListing.listing.integrationId}
                  </div>
                </div>
                <div>
                  <div className="text-gray-500 uppercase text-[10px] font-bold">Integration Slug</div>
                  <div className="text-white font-mono text-xs">
                    {selectedListing.listing.integrationSlug}
                  </div>
                </div>
                <div>
                  <div className="text-gray-500 uppercase text-[10px] font-bold">Connection ID</div>
                  <div className="text-white font-mono text-xs">
                    {selectedListing.listing.connectionId}
                  </div>
                </div>
                <div>
                  <div className="text-gray-500 uppercase text-[10px] font-bold">Product ID</div>
                  <div className="text-white font-mono text-xs">
                    {selectedListing.job.productId}
                  </div>
                </div>
                <div>
                  <div className="text-gray-500 uppercase text-[10px] font-bold">Product Link</div>
                  <Link
                    href={`/admin/products?id=${selectedListing.job.productId}`}
                    className="text-blue-400 hover:text-blue-300"
                  >
                    Open product
                  </Link>
                </div>
              </div>

              <div className="rounded-md border border-border bg-card/60 p-4">
                <div className="text-gray-400 font-bold text-xs uppercase mb-3">
                  Export Attempt
                </div>
                {selectedAttempt ? (
                  <div className="grid grid-cols-2 gap-4 text-xs text-gray-300">
                    <div>
                      <div className="text-[10px] uppercase text-gray-500">Attempt</div>
                      <div>{selectedListing.attemptIndex !== null ? selectedListing.attemptIndex + 1 : "—"}</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase text-gray-500">Status</div>
                      <div>{selectedAttempt.status ?? "—"}</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase text-gray-500">Exported At</div>
                      <div>{formatDateTime(selectedAttempt.exportedAt)}</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase text-gray-500">Inventory ID</div>
                      <div>{selectedAttempt.inventoryId ?? "—"}</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase text-gray-500">Template ID</div>
                      <div>{selectedAttempt.templateId ?? "—"}</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase text-gray-500">Warehouse ID</div>
                      <div>{selectedAttempt.warehouseId ?? "—"}</div>
                    </div>
                    <div>
                      <div className="text-[10px] uppercase text-gray-500">External ID</div>
                      <div>{selectedAttempt.externalListingId ?? "—"}</div>
                    </div>
                    <div className="col-span-2">
                      <div className="text-[10px] uppercase text-gray-500">Fields</div>
                      <div className="text-gray-400">
                        {selectedAttempt.fields?.length ? selectedAttempt.fields.join(", ") : "—"}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-gray-500">No export attempt selected.</div>
                )}
              </div>

              <div className="rounded-md border border-border bg-card/60 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div className="text-gray-400 font-bold text-xs uppercase">
                    Export History
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs text-gray-300 hover:text-white"
                      onClick={(): void =>
                        setHistorySort((prev: "desc" | "asc") => (prev === "desc" ? "asc" : "desc"))
                      }
                      aria-label="Toggle export history sort"
                    >
                      {historySort === "desc" ? "Newest first" : "Oldest first"}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-7 px-2 text-xs text-gray-300 hover:text-white"
                      onClick={(): void => setHistoryExpanded((prev: boolean) => !prev)}
                      aria-expanded={historyExpanded}
                    >
                      {historyExpanded ? "Collapse" : "Expand"}
                    </Button>
                  </div>
                </div>
                {historyExpanded && (
                  <>
                    {selectedListing.listing.exportHistory?.length ? (
                      <div className="mt-3 space-y-3">
                        {getSortedHistory(selectedListing.listing.exportHistory).map(
                          (event: ListingAttempt, index: number) => (
                            <div
                              key={`${selectedListing.listing.id}-history-${index}`}
                              className="rounded border border-border bg-card/60 p-3 text-xs text-gray-300"
                            >
                              <div className="flex flex-wrap gap-4">
                                <div>
                                  <div className="text-[10px] uppercase text-gray-500">Exported At</div>
                                  <div>{formatDateTime(event.exportedAt)}</div>
                                </div>
                                <div>
                                  <div className="text-[10px] uppercase text-gray-500">Status</div>
                                  <div className="mt-1">
                                    <StatusBadge 
                                      status={event.status ?? "success"} 
                                      icon={getStatusIcon(event.status ?? "success")}
                                    />
                                  </div>
                                </div>
                                <div>
                                  <div className="text-[10px] uppercase text-gray-500">Inventory ID</div>
                                  <div>{event.inventoryId ?? "—"}</div>
                                </div>
                                <div>
                                  <div className="text-[10px] uppercase text-gray-500">Template ID</div>
                                  <div>{event.templateId ?? "—"}</div>
                                </div>
                                <div>
                                  <div className="text-[10px] uppercase text-gray-500">Warehouse ID</div>
                                  <div>{event.warehouseId ?? "—"}</div>
                                </div>
                                <div>
                                  <div className="text-[10px] uppercase text-gray-500">External ID</div>
                                  <div>{event.externalListingId ?? "—"}</div>
                                </div>
                              </div>
                              <div className="mt-2">
                                <div className="text-[10px] uppercase text-gray-500">Fields</div>
                                <div className="text-gray-400">
                                  {event.fields?.length ? event.fields.join(", ") : "—"}
                                </div>
                              </div>
                            </div>
                          )
                        )}
                      </div>
                    ) : (
                      <div className="mt-3 text-xs text-gray-500">
                        No export history recorded.
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-2">
                  <div className="text-gray-500 uppercase text-[10px] font-bold">
                    Listing Payload
                  </div>
                  <pre className="max-h-72 overflow-auto rounded-md bg-gray-900 p-3 text-[11px] text-gray-400 border border-border">
                    {JSON.stringify(selectedListing.listing, null, 2)}
                  </pre>
                </div>
                <div className="space-y-2">
                  <div className="text-gray-500 uppercase text-[10px] font-bold">
                    Job Payload
                  </div>
                  <pre className="max-h-72 overflow-auto rounded-md bg-gray-900 p-3 text-[11px] text-gray-400 border border-border">
                    {JSON.stringify(selectedListing.job, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
        </SharedModal>
      )}
    </>
  );
}