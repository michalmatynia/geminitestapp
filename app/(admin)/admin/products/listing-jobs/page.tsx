"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { RefreshCw, ExternalLink, Clock, CheckCircle, XCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type ListingJob = {
  id: string;
  integrationName: string;
  connectionName: string;
  status: string;
  externalListingId: string | null;
  listedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type ProductJob = {
  productId: string;
  productName: string;
  productSku: string | null;
  listings: ListingJob[];
};

const getStatusIcon = (status: string) => {
  switch (status) {
    case "pending":
      return <Clock className="size-4 text-yellow-500" />;
    case "completed":
    case "success":
    case "listed":
      return <CheckCircle className="size-4 text-green-500" />;
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

export default function ProductListingJobsPage() {
  const [jobs, setJobs] = useState<ProductJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const fetchJobs = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/products/listing-jobs");
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

  useEffect(() => {
    void fetchJobs();

    // Auto-refresh every 10 seconds for pending jobs
    const interval = setInterval(() => {
      const hasPending = jobs.some((job) =>
        job.listings.some(
          (listing) =>
            listing.status === "pending" ||
            listing.status === "processing" ||
            listing.status === "in_progress"
        )
      );
      if (hasPending) {
        void fetchJobs();
      }
    }, 10000);

    return () => clearInterval(interval);
  }, [jobs]);

  const pendingJobs = jobs.filter((job) =>
    job.listings.some((listing) => listing.status === "pending")
  );

  const processingJobs = jobs.filter((job) =>
    job.listings.some(
      (listing) =>
        listing.status === "processing" || listing.status === "in_progress"
    )
  );

  const completedJobs = jobs.filter((job) =>
    job.listings.every(
      (listing) =>
        listing.status === "completed" ||
        listing.status === "success" ||
        listing.status === "listed"
    )
  );

  const failedJobs = jobs.filter((job) =>
    job.listings.some(
      (listing) => listing.status === "failed" || listing.status === "error"
    )
  );

  return (
    <div className="rounded-lg bg-gray-950 p-6 shadow-lg">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white">Product Listing Jobs</h1>
          <p className="mt-1 text-sm text-gray-400">
            Track product export and listing jobs across all integrations
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={() => void handleRefresh()}
            disabled={refreshing}
            variant="outline"
            size="sm"
            className="border-gray-700 bg-gray-800 hover:bg-gray-700"
          >
            <RefreshCw
              className={`mr-2 size-4 ${refreshing ? "animate-spin" : ""}`}
            />
            Refresh
          </Button>
          <Link href="/admin/products">
            <Button
              variant="outline"
              size="sm"
              className="border-gray-700 bg-gray-800 hover:bg-gray-700"
            >
              Back to Products
            </Button>
          </Link>
        </div>
      </div>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="size-8 animate-spin text-gray-500" />
        </div>
      )}

      {error && (
        <div className="rounded-md border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {!loading && !error && (
        <div className="space-y-6">
          {/* Stats Overview */}
          <div className="grid grid-cols-4 gap-4">
            <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
              <div className="flex items-center gap-2">
                <Clock className="size-5 text-yellow-500" />
                <div>
                  <div className="text-2xl font-bold text-white">
                    {pendingJobs.length}
                  </div>
                  <div className="text-xs text-gray-400">Pending</div>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
              <div className="flex items-center gap-2">
                <Loader2 className="size-5 animate-spin text-blue-500" />
                <div>
                  <div className="text-2xl font-bold text-white">
                    {processingJobs.length}
                  </div>
                  <div className="text-xs text-gray-400">Processing</div>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
              <div className="flex items-center gap-2">
                <CheckCircle className="size-5 text-green-500" />
                <div>
                  <div className="text-2xl font-bold text-white">
                    {completedJobs.length}
                  </div>
                  <div className="text-xs text-gray-400">Completed</div>
                </div>
              </div>
            </div>

            <div className="rounded-lg border border-gray-800 bg-gray-900 p-4">
              <div className="flex items-center gap-2">
                <XCircle className="size-5 text-red-500" />
                <div>
                  <div className="text-2xl font-bold text-white">
                    {failedJobs.length}
                  </div>
                  <div className="text-xs text-gray-400">Failed</div>
                </div>
              </div>
            </div>
          </div>

          {/* Jobs List */}
          {jobs.length === 0 ? (
            <div className="rounded-md border border-gray-800 bg-gray-900 px-4 py-12 text-center">
              <p className="text-sm text-gray-400">
                No listing jobs found. Create product listings to see them here.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {jobs.map((job) => (
                <div
                  key={job.productId}
                  className="rounded-md border border-gray-800 bg-gray-900 p-4"
                >
                  <div className="mb-3 flex items-start justify-between">
                    <div>
                      <h3 className="font-semibold text-white">
                        {job.productName}
                      </h3>
                      {job.productSku && (
                        <p className="text-xs text-gray-500">SKU: {job.productSku}</p>
                      )}
                    </div>
                    <Link
                      href={`/admin/products?id=${job.productId}`}
                      className="text-xs text-blue-400 hover:text-blue-300"
                    >
                      <ExternalLink className="size-4" />
                    </Link>
                  </div>

                  <div className="space-y-2">
                    {job.listings.map((listing) => (
                      <div
                        key={listing.id}
                        className="flex items-center justify-between rounded border border-gray-800 bg-gray-950 p-3"
                      >
                        <div className="flex items-center gap-3">
                          {getStatusIcon(listing.status)}
                          <div>
                            <div className="text-sm font-medium text-white">
                              {listing.integrationName} - {listing.connectionName}
                            </div>
                            <div className="text-xs text-gray-500">
                              Created:{" "}
                              {new Date(listing.createdAt).toLocaleString()}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <span
                            className={`rounded border px-2 py-1 text-xs ${getStatusColor(
                              listing.status
                            )}`}
                          >
                            {listing.status}
                          </span>
                          {listing.externalListingId && (
                            <span className="text-xs text-gray-500">
                              ID: {listing.externalListingId}
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
