"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  RefreshCw,
  ExternalLink,
  Clock,
  CheckCircle,
  XCircle,
  Loader2,
  Trash2,
  Eye,
} from "lucide-react";
import { Button } from "@/shared/ui/button";
import ModalShell from "@/shared/ui/modal-shell";
import { Input } from "@/shared/ui/input";
import { AppModal } from "@/shared/ui/app-modal";
import type { ListingJob, ListingAttempt, ProductJob } from "@/shared/types/listing-jobs";
import { Label } from "@/shared/ui/label";
import { ListPanel } from "@/shared/ui/list-panel";
import { SectionHeader } from "@/shared/ui/section-header";
import { SectionPanel } from "@/shared/ui/section-panel";

type ProductListingJobsPanelProps = {
  showBackToProducts?: boolean;
};

type ListingRow = {
  job: ProductJob;
  listing: ListingJob;
  attempt: ListingAttempt | null;
  attemptIndex: number | null;
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case "pending":
      return <Clock className="size-4 text-yellow-500" />;
    case "completed":
    case "success":
    case "listed":
      return <CheckCircle className="size-4 text-green-500" />;
    case "deleted":
    case "removed":
      return <XCircle className="size-4 text-gray-400" />;
    case "failed":
    case "error":
      return <XCircle className="size-4 text-red-500" />;
    case "processing":
    case "in_progress":
      return <Loader2 className="size-4 animate-spin text-blue-500" />;
    default:
      return <Clock className="size-4 text-gray-500" />;
  }
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "pending":
      return "bg-yellow-900/20 text-yellow-300 border-yellow-900/50";
    case "completed":
    case "success":
    case "listed":
      return "bg-green-900/20 text-green-300 border-green-900/50";
    case "deleted":
    case "removed":
      return "bg-gray-900/40 text-gray-300 border-gray-800";
    case "failed":
    case "error":
      return "bg-red-900/20 text-red-300 border-red-900/50";
    case "processing":
    case "in_progress":
      return "bg-blue-900/20 text-blue-300 border-blue-900/50";
    default:
      return "bg-gray-900/20 text-gray-300 border-gray-900/50";
  }
};

export default function ProductListingJobsPanel({
  showBackToProducts = true,
}: ProductListingJobsPanelProps) {
  const [jobs, setJobs] = useState<ProductJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
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

  const fetchJobs = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/integrations/jobs");
      if (!res.ok) {
        throw new Error("Failed to fetch listing jobs");
      }
      const data = (await res.json()) as ProductJob[];
      setJobs(data);
    } catch (err) {
      console.error("Failed to fetch jobs:", err);
      setError(err instanceof Error ? err.message : "Failed to fetch jobs");
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchJobs();
    setRefreshing(false);
  };

  const handleCancelListing = async (productId: string, listingId: string) => {
    if (!window.confirm("Cancel this listing job? This will remove it from the queue.")) {
      return;
    }

    try {
      setDeleting(listingId);
      const res = await fetch(`/api/integrations/products/${productId}/listings/${listingId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        throw new Error("Failed to cancel listing");
      }

      setJobs((prev) =>
        prev
          .map((job) => ({
            ...job,
            listings: job.listings.filter((l) => l.id !== listingId),
          }))
          .filter((job) => job.listings.length > 0)
      );
    } catch (err) {
      console.error("Failed to cancel listing:", err);
      setError(err instanceof Error ? err.message : "Failed to cancel listing");
    } finally {
      setDeleting(null);
    }
  };

  useEffect(() => {
    void fetchJobs();
  }, []);

  useEffect(() => {
    setHistoryExpanded(false);
    setHistorySort("desc");
  }, [selectedListing?.listing.id]);

  useEffect(() => {
    setPage(1);
  }, [query, jobs]);

  useEffect(() => {
    const hasPending = jobs.some((job) =>
      job.listings.some(
        (listing) =>
          listing.status === "pending" ||
          listing.status === "processing" ||
          listing.status === "in_progress"
      )
    );

    if (!hasPending) {
      return;
    }

    const interval = setInterval(() => {
      void fetchJobs();
    }, 10000);

    return () => clearInterval(interval);
  }, [jobs]);

  const formatDateTime = (value: Date | string | null) => {
    if (!value) return "—";
    const date = value instanceof Date ? value : new Date(value);
    if (Number.isNaN(date.getTime())) return "—";
    return date.toLocaleString();
  };

  const getSortedHistory = (history: ListingJob["exportHistory"]) => {
    if (!history?.length) return [];
    const sorted = [...history].sort((a, b) => {
      const aTime = new Date(a.exportedAt).getTime();
      const bTime = new Date(b.exportedAt).getTime();
      return historySort === "asc" ? aTime - bTime : bTime - aTime;
    });
    return sorted;
  };

  const listingRows: ListingRow[] = jobs.flatMap((job) =>
    job.listings.flatMap((listing): ListingRow[] => {
      const history = listing.exportHistory ?? [];
      if (history.length === 0) {
        return [{ job, listing, attempt: null, attemptIndex: null }];
      }
      return history.map((attempt, index) => ({
        job,
        listing,
        attempt,
        attemptIndex: index,
      }));
    })
  );

  const filteredRows = listingRows.filter(({ job, listing, attempt }) => {
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
  });

  const sortedRows = [...filteredRows].sort((a, b) => {
    const aTime = new Date(a.attempt?.exportedAt ?? a.listing.updatedAt ?? a.listing.createdAt).getTime();
    const bTime = new Date(b.attempt?.exportedAt ?? b.listing.updatedAt ?? b.listing.createdAt).getTime();
    return bTime - aTime;
  });
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
          <Button
            onClick={() => void handleRefresh()}
            disabled={refreshing}
            variant="outline"
            size="sm"
          >
            <RefreshCw
              className={`mr-2 size-4 ${refreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
          {showBackToProducts && (
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/products">Back to Products</Link>
            </Button>
          )}
        </>
      }
    />
  );

  const filters = !loading && !error ? (
    <SectionPanel>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Input
          placeholder="Search by product, SKU, integration, or ID..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="h-8 text-sm sm:max-w-md"
        />
      </div>
    </SectionPanel>
  ) : null;

  const footer = !loading && !error ? (
    <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-gray-400">
      <div>
        Showing {totalRows === 0 ? 0 : startIndex + 1}–{Math.min(endIndex, totalRows)} of {totalRows}
      </div>
      <div className="flex items-center gap-2">
        <Label htmlFor="exportJobsPageSize">Rows</Label>
        <select
          id="exportJobsPageSize"
          className="rounded-md border border-gray-800 bg-gray-900 px-2 py-1 text-xs text-white"
          value={pageSize}
          onChange={(event) => {
            setPageSize(Number(event.target.value));
            setPage(1);
          }}
        >
          {[10, 25, 50, 100].map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage((current) => Math.max(1, current - 1))}
          disabled={clampedPage <= 1}
          className="border-gray-700 bg-gray-800 hover:bg-gray-700"
        >
          Prev
        </Button>
        <span className="min-w-[72px] text-center">
          {clampedPage} / {totalPages}
        </span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
          disabled={clampedPage >= totalPages}
          className="border-gray-700 bg-gray-800 hover:bg-gray-700"
        >
          Next
        </Button>
      </div>
    </div>
  ) : null;

  return (
    <>
      <ListPanel
        header={header}
        alerts={
          error ? (
            <div className="rounded-md border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
              {error}
            </div>
          ) : null
        }
        filters={filters}
        footer={footer}
      >
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="size-8 animate-spin text-gray-500" />
          </div>
        ) : !error ? (
          <div className="rounded-lg border border-gray-800 bg-gray-950 overflow-hidden">
            <table className="w-full text-left text-sm text-gray-300">
              <thead className="bg-gray-900 text-xs uppercase text-gray-500">
                <tr>
                  <th className="px-4 py-3">Product</th>
                  <th className="px-4 py-3">Type / ID</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Timing</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {pagedRows.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-gray-500">
                      {loading ? "Loading export jobs..." : "No export jobs found."}
                    </td>
                  </tr>
                ) : (
                  pagedRows.map(({ job, listing, attempt, attemptIndex }) => {
                    const status = attempt?.status ?? listing.status ?? "unknown";
                    const typeLabel =
                      status === "deleted" || status === "removed" ? "Removal" : "Export";
                    const attemptLabel =
                      attemptIndex !== null ? `Attempt ${attemptIndex + 1}` : "Listing";
                    return (
                      <tr
                        key={`${job.productId}-${listing.id}-${attemptIndex ?? "current"}`}
                        className="hover:bg-gray-900/50"
                      >
                        <td className="px-4 py-4">
                          <div className="flex items-start gap-2">
                            <div>
                              <div className="font-medium text-white">{job.productName}</div>
                              <div className="text-xs text-gray-500">
                                SKU: {job.productSku || "N/A"}
                              </div>
                            </div>
                            <Link
                              href={`/admin/products?id=${job.productId}`}
                              className="text-blue-400 hover:text-blue-300"
                              aria-label="Open product"
                            >
                              <ExternalLink className="size-4" />
                            </Link>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="text-xs font-mono">
                            {typeLabel}: {listing.integrationName}
                          </div>
                          <div className="text-[10px] text-gray-600">
                            {attemptLabel} · {listing.id}
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium ${getStatusColor(
                              status
                            )}`}
                          >
                            {getStatusIcon(status)}
                            {status.toUpperCase()}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-xs">
                          {attempt?.exportedAt ? (
                            <>
                              <div>Attempted: {formatDateTime(attempt.exportedAt)}</div>
                              <div className="text-gray-500">
                                Listing updated: {formatDateTime(listing.updatedAt)}
                              </div>
                            </>
                          ) : (
                            <>
                              <div>Created: {formatDateTime(listing.createdAt)}</div>
                              <div className="text-gray-500">
                                Updated: {formatDateTime(listing.updatedAt)}
                              </div>
                            </>
                          )}
                        </td>
                        <td className="px-4 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-8 w-8 text-blue-500 hover:text-blue-400"
                              onClick={() =>
                                setSelectedListing({
                                  job,
                                  listing,
                                  attempt: attempt ?? null,
                                  attemptIndex,
                                })
                              }
                              aria-label="View export job details"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {attempt === null &&
                              (listing.status === "pending" || listing.status === "failed") && (
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 text-red-500 hover:text-red-400"
                                  onClick={() => void handleCancelListing(job.productId, listing.id)}
                                  disabled={deleting === listing.id}
                                  aria-label="Cancel export job"
                                >
                                  {deleting === listing.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-4 w-4" />
                                  )}
                                </Button>
                              )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        ) : null}
      </ListPanel>
      {selectedListing && (
        <AppModal
          open={true}
          onOpenChange={(open) => !open && setSelectedListing(null)}
          title="Export Job Details"
        >
          <ModalShell
            title="Export Job Details"
            onClose={() => setSelectedListing(null)}
            size="lg"
          >
            <div className="space-y-6 text-sm">
              <div className="grid grid-cols-2 gap-4 rounded-md bg-gray-900 p-4">
                <div>
                  <div className="text-gray-500 uppercase text-[10px] font-bold">Status</div>
                  <div className="text-white font-medium">
                    {selectedStatus || selectedListing.listing.status}
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

              <div className="grid grid-cols-2 gap-4 rounded-md border border-gray-800 bg-gray-950/60 p-4">
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

              <div className="rounded-md border border-gray-800 bg-gray-950/60 p-4">
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

              <div className="rounded-md border border-gray-800 bg-gray-950/60 p-4">
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
                      onClick={() =>
                        setHistorySort((prev) => (prev === "desc" ? "asc" : "desc"))
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
                      onClick={() => setHistoryExpanded((prev) => !prev)}
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
                          (event, index) => (
                            <div
                              key={`${selectedListing.listing.id}-history-${index}`}
                              className="rounded border border-gray-800 bg-gray-900/60 p-3 text-xs text-gray-300"
                            >
                              <div className="flex flex-wrap gap-4">
                                <div>
                                  <div className="text-[10px] uppercase text-gray-500">Exported At</div>
                                  <div>{formatDateTime(event.exportedAt)}</div>
                                </div>
                                <div>
                                  <div className="text-[10px] uppercase text-gray-500">Status</div>
                                  <div>{event.status ?? "—"}</div>
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
                  <pre className="max-h-72 overflow-auto rounded-md bg-gray-900 p-3 text-[11px] text-gray-400 border border-gray-800">
                    {JSON.stringify(selectedListing.listing, null, 2)}
                  </pre>
                </div>
                <div className="space-y-2">
                  <div className="text-gray-500 uppercase text-[10px] font-bold">
                    Job Payload
                  </div>
                  <pre className="max-h-72 overflow-auto rounded-md bg-gray-900 p-3 text-[11px] text-gray-400 border border-gray-800">
                    {JSON.stringify(selectedListing.job, null, 2)}
                  </pre>
                </div>
              </div>
            </div>
          </ModalShell>
        </AppModal>
      )}
    </>
  );
}
