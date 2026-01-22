"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/toast";
import { Loader2, RefreshCcw, Trash2, XCircle, Eye } from "lucide-react";
import ModalShell from "@/components/ui/modal-shell";
import ProductListingJobsPanel from "@/components/products/jobs/ProductListingJobsPanel";
import type { ProductAiJob } from "@/types/product-jobs";

export default function ProductAiJobsPage() {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const [jobs, setJobs] = useState<ProductAiJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [actionId, setActionId] = useState<string | null>(null);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [selectedJob, setSelectedJob] = useState<ProductAiJob | null>(null);

  const defaultTab = useMemo(() => {
    const tab = searchParams?.get("tab") ?? "ai";
    return ["ai", "import", "export"].includes(tab) ? tab : "ai";
  }, [searchParams]);

  const loadJobs = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/products/ai-jobs");
      if (!res.ok) throw new Error("Failed to load jobs.");
      const data = (await res.json()) as { jobs?: ProductAiJob[] };
      setJobs(data.jobs ?? []);
    } catch (error) {
      toast(error instanceof Error ? error.message : "Failed to load jobs.", { variant: "error" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    void loadJobs();
  }, [loadJobs]);

  useEffect(() => {
    // Only poll if there are pending or running jobs
    const hasPendingJobs = jobs.some(job => job.status === "pending" || job.status === "running");
    if (!hasPendingJobs) {
      console.log("[jobs page] No pending/running jobs, stopping poll");
      return;
    }

    console.log("[jobs page] Starting poll for pending/running jobs");
    const interval = setInterval(() => void loadJobs(), 5000);
    return () => {
      console.log("[jobs page] Cleaning up poll interval");
      clearInterval(interval);
    };
  }, [jobs, loadJobs]);

  const cancelJob = async (jobId: string) => {
    setActionId(jobId);
    try {
      const res = await fetch(`/api/products/ai-jobs/${jobId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      });
      if (!res.ok) throw new Error("Failed to cancel job.");
      await loadJobs();
      toast("Job canceled", { variant: "success" });
    } catch (error) {
      toast(error instanceof Error ? error.message : "Failed to cancel job.", { variant: "error" });
    } finally {
      setActionId(null);
    }
  };

  const deleteJob = async (jobId: string) => {
    if (!window.confirm("Delete this job?")) return;
    setActionId(jobId);
    try {
      const res = await fetch(`/api/products/ai-jobs/${jobId}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete job.");
      await loadJobs();
      toast("Job deleted", { variant: "success" });
    } catch (error) {
      toast(error instanceof Error ? error.message : "Failed to delete job.", { variant: "error" });
    } finally {
      setActionId(null);
    }
  };

  const clearCompleted = async () => {
    if (!window.confirm("Clear all completed/failed/canceled jobs?")) return;
    setBulkDeleting(true);
    try {
      const res = await fetch("/api/products/ai-jobs?scope=terminal", { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to clear jobs.");
      await loadJobs();
      toast("Jobs cleared", { variant: "success" });
    } catch (error) {
      toast(error instanceof Error ? error.message : "Failed to clear jobs.", { variant: "error" });
    } finally {
      setBulkDeleting(false);
    }
  };

  const filteredJobs = jobs.filter(job => 
    [job.id, job.status, job.product?.name_en, job.product?.sku]
      .some(val => val?.toLowerCase().includes(query.toLowerCase()))
  );

  return (
    <div className="container mx-auto py-10">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-white">Product Jobs</h1>
        <p className="text-gray-400">
          Monitor AI, import, and export jobs for your products.
        </p>
      </div>

      <Tabs defaultValue={defaultTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="ai">AI Jobs</TabsTrigger>
          <TabsTrigger value="import">Import Jobs</TabsTrigger>
          <TabsTrigger value="export">Export Jobs</TabsTrigger>
        </TabsList>

        <TabsContent value="ai" className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Input
              placeholder="Search by ID, SKU, or name..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="max-w-md bg-gray-900 border-gray-800 text-white"
            />
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => void loadJobs()} disabled={loading}>
                <RefreshCcw className={`mr-2 h-4 w-4 ${loading ? "animate-spin" : ""}`} />
                Refresh
              </Button>
              <Button variant="destructive" size="sm" onClick={() => void clearCompleted()} disabled={bulkDeleting}>
                <Trash2 className="mr-2 h-4 w-4" />
                Clear Finished
              </Button>
            </div>
          </div>

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
                {filteredJobs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-10 text-center text-gray-500">
                      {loading ? "Loading jobs..." : "No jobs found."}
                    </td>
                  </tr>
                ) : (
                  filteredJobs.map((job) => (
                    <tr key={job.id} className="hover:bg-gray-900/50">
                      <td className="px-4 py-4">
                        <div className="font-medium text-white">{job.product?.name_en || "N/A"}</div>
                        <div className="text-xs text-gray-500">SKU: {job.product?.sku || "N/A"}</div>
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-xs font-mono">{job.type}</div>
                        <div className="text-[10px] text-gray-600">{job.id}</div>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium 
                          ${job.status === "completed" ? "bg-green-500/10 text-green-400" : 
                            job.status === "failed" ? "bg-red-500/10 text-red-400" :
                            job.status === "running" ? "bg-blue-500/10 text-blue-400" :
                            job.status === "canceled" ? "bg-gray-500/10 text-gray-400" :
                            "bg-yellow-500/10 text-yellow-400"}`}>
                          {job.status.toUpperCase()}
                        </span>
                        {job.errorMessage && (
                          <div className="mt-1 max-w-[200px] truncate text-[10px] text-red-400" title={job.errorMessage}>
                            {job.errorMessage}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4 text-xs">
                        <div>Created: {new Date(job.createdAt).toLocaleTimeString()}</div>
                        {job.finishedAt && (
                          <div className="text-gray-500">Finished: {new Date(job.finishedAt).toLocaleTimeString()}</div>
                        )}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex justify-end gap-2">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-blue-500 hover:text-blue-400"
                            onClick={() => setSelectedJob(job)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {(job.status === "pending" || job.status === "running") && (
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-8 w-8 text-yellow-500 hover:text-yellow-400"
                              onClick={() => void cancelJob(job.id)}
                              disabled={actionId === job.id}
                            >
                              {actionId === job.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                            </Button>
                          )}
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 text-red-500 hover:text-red-400"
                            onClick={() => void deleteJob(job.id)}
                            disabled={actionId === job.id}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </TabsContent>

        <TabsContent value="import" className="space-y-4">
          <div className="rounded-lg border border-gray-800 bg-gray-950 p-6">
            <h2 className="text-2xl font-bold text-white">Import Jobs</h2>
            <p className="mt-2 text-sm text-gray-400">
              Import jobs will appear here once import tracking is enabled.
            </p>
            <div className="mt-4">
              <Link href="/admin/products/imports" className="text-sm text-blue-400 underline">
                Go to Imports
              </Link>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="export">
          <ProductListingJobsPanel showBackToProducts={false} />
        </TabsContent>
      </Tabs>

      {selectedJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4" onClick={() => setSelectedJob(null)}>
          <div onClick={(e) => e.stopPropagation()} className="w-full max-w-4xl">
            <ModalShell title="Job Details" onClose={() => setSelectedJob(null)} size="xl">
              <div className="space-y-6 text-sm">
                <div className="grid grid-cols-2 gap-4 rounded-md bg-gray-900 p-4">
                  <div>
                    <div className="text-gray-500 uppercase text-[10px] font-bold">Status</div>
                    <div className="text-white font-medium">{selectedJob.status.toUpperCase()}</div>
                  </div>
                  <div>
                    <div className="text-gray-500 uppercase text-[10px] font-bold">Type</div>
                    <div className="text-white font-medium">{selectedJob.type}</div>
                  </div>
                  <div>
                    <div className="text-gray-500 uppercase text-[10px] font-bold">Product</div>
                    <div className="text-white font-medium">{selectedJob.product?.name_en || "N/A"} ({selectedJob.product?.sku || "N/A"})</div>
                  </div>
                  <div>
                    <div className="text-gray-500 uppercase text-[10px] font-bold">Job ID</div>
                    <div className="text-white font-mono text-xs">{selectedJob.id}</div>
                  </div>
                </div>

                {/* Model Information */}
                {selectedJob.result && (selectedJob.result.visionModel || selectedJob.result.generationModel) && (
                  <div className="rounded-md bg-gray-900/50 border border-gray-800 p-4">
                    <div className="text-gray-400 font-bold text-xs uppercase mb-3">AI Models Used</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectedJob.result.visionModel && (
                        <div>
                          <div className="text-blue-400 text-[10px] font-bold uppercase mb-1">Vision Model (Path 1)</div>
                          <div className="text-white font-mono text-sm">{selectedJob.result.visionModel}</div>
                          {selectedJob.result.visionOutputEnabled !== undefined && (
                            <div className="text-gray-500 text-[10px] mt-1">
                              Refinement: {selectedJob.result.visionOutputEnabled ? "Enabled" : "Disabled"}
                            </div>
                          )}
                        </div>
                      )}
                      {selectedJob.result.generationModel && (
                        <div>
                          <div className="text-purple-400 text-[10px] font-bold uppercase mb-1">Generation Model (Path 2)</div>
                          <div className="text-white font-mono text-sm">{selectedJob.result.generationModel}</div>
                          {selectedJob.result.generationOutputEnabled !== undefined && (
                            <div className="text-gray-500 text-[10px] mt-1">
                              Refinement: {selectedJob.result.generationOutputEnabled ? "Enabled" : "Disabled"}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {selectedJob.errorMessage && (
                  <div className="rounded-md border border-red-900/50 bg-red-950/20 p-4">
                    <div className="text-red-400 font-bold text-[10px] uppercase mb-1">Error Message</div>
                    <div className="text-red-200">{selectedJob.errorMessage}</div>
                  </div>
                )}

                {selectedJob.result && typeof selectedJob.result === 'object' && 'analysisInitial' in (selectedJob.result as object) ? (
                  <div className="space-y-4">
                    <div className="text-gray-400 font-bold text-xs uppercase mb-2">AI Processing Results</div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="text-blue-400 uppercase text-[10px] font-bold">Path 1: Image Analysis (Initial)</div>
                        <div className="rounded-md bg-gray-900 p-3 text-[11px] text-gray-300 border border-gray-800 max-h-40 overflow-auto">
                          {selectedJob.result.analysisInitial || selectedJob.result.analysis || 'N/A'}
                        </div>
                      </div>

                      {selectedJob.result.analysisFinal && (
                        <div className="space-y-2">
                          <div className="text-blue-400 uppercase text-[10px] font-bold">Path 1: Image Analysis (Final)</div>
                          <div className="rounded-md bg-gray-900 p-3 text-[11px] text-gray-300 border border-gray-800 max-h-40 overflow-auto">
                            {selectedJob.result.analysisFinal}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="text-purple-400 uppercase text-[10px] font-bold">Path 2: Description (Initial)</div>
                        <div className="rounded-md bg-gray-900 p-3 text-[11px] text-gray-300 border border-gray-800 max-h-40 overflow-auto whitespace-pre-wrap">
                          {selectedJob.result.descriptionInitial || selectedJob.result.description || 'N/A'}
                        </div>
                      </div>

                      {selectedJob.result.descriptionFinal && (
                        <div className="space-y-2">
                          <div className="text-purple-400 uppercase text-[10px] font-bold">Path 2: Description (Final)</div>
                          <div className="rounded-md bg-gray-900 p-3 text-[11px] text-gray-300 border border-gray-800 max-h-40 overflow-auto whitespace-pre-wrap">
                            {selectedJob.result.descriptionFinal}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <div className="text-gray-500 uppercase text-[10px] font-bold">Payload (Input Config)</div>
                      <pre className="max-h-60 overflow-auto rounded-md bg-gray-900 p-3 text-[11px] text-gray-400 border border-gray-800">
                        {JSON.stringify(selectedJob.payload, null, 2)}
                      </pre>
                    </div>
                    <div className="space-y-2">
                      <div className="text-gray-500 uppercase text-[10px] font-bold">Result (Output)</div>
                      <pre className="max-h-60 overflow-auto rounded-md bg-gray-900 p-3 text-[11px] text-gray-300 border border-gray-800 whitespace-pre-wrap">
                        {selectedJob.result ? JSON.stringify(selectedJob.result, null, 2) : "No result yet."}
                      </pre>
                    </div>
                  </div>
                )}

                <div className="text-[10px] text-gray-600">
                  Created: {new Date(selectedJob.createdAt).toLocaleString()} 
                  {selectedJob.startedAt && ` | Started: ${new Date(selectedJob.startedAt).toLocaleString()}`}
                  {selectedJob.finishedAt && ` | Finished: ${new Date(selectedJob.finishedAt).toLocaleString()}`}
                </div>
              </div>
            </ModalShell>
          </div>
        </div>
      )}
    </div>
  );
}
