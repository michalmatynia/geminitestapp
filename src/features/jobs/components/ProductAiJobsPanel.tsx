"use client";

import { Button, Input, Tabs, TabsContent, TabsList, TabsTrigger, useToast, AppModal, ModalShell, SectionHeader, SectionPanel } from "@/shared/ui";
import { Suspense, useMemo, useState, useCallback, useSyncExternalStore } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Loader2, RefreshCcw, Trash2, XCircle, Eye } from "lucide-react";
import ProductListingJobsPanel from "@/features/jobs/components/ProductListingJobsPanel";
import type { ProductAiJob } from "@/shared/types/jobs";
import type { ProductAiJobsPanelProps } from "@/features/jobs/types/jobs-ui";
import { useProductAiJobs } from "@/features/jobs/hooks/useJobQueries";
import { 
  useProductAiJobMutation, 
  useDeleteProductAiJobMutation, 
  useClearProductAiJobsMutation 
} from "@/features/jobs/hooks/useJobMutations";

type JobMeta = {
  payload: Record<string, unknown> | null;
  graph?: Record<string, unknown>;
  context?: Record<string, unknown>;
  entityType?: string;
  entityId?: string;
  pathName?: string;
  pathId?: string;
  nodeTitle?: string;
  source?: string;
  displayEntity: string;
  subEntity?: string;
};

interface JobPayload {
  modelId?: string;
  temperature?: number;
  maxTokens?: number;
  vision?: boolean;
  imageUrls?: string[];
  entityType?: string;
  entityId?: string;
  productId?: string;
  source?: string;
  graph?: Record<string, unknown>;
  context?: Record<string, unknown>;
  prompt?: string;
}

interface JobResult {
  visionModel?: string;
  generationModel?: string;
  visionOutputEnabled?: boolean;
  generationOutputEnabled?: boolean;
  analysisInitial?: string;
  analysisFinal?: string;
  analysis?: string;
  descriptionInitial?: string;
  descriptionFinal?: string;
  description?: string;
  translationModel?: string;
  sourceLanguage?: string;
  targetLanguages?: string[];
  translations?: Record<string, { name?: string; description?: string }>;
}

export default function ProductAiJobsPanel({
  title = "AI Jobs",
  description = "Monitor AI, import, and export jobs across the platform.",
  showTabs = true,
}: ProductAiJobsPanelProps): React.JSX.Element {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState("");
  const [selectedJob, setSelectedJob] = useState<ProductAiJob | null>(null);
  const isMounted = useSyncExternalStore(
    (): (() => void) => (): void => {},
    (): boolean => true,
    (): boolean => false
  );

  // Queries
  const jobsQuery = useProductAiJobs("all");
  const jobs = useMemo(
    () => (isMounted ? jobsQuery.data?.jobs || [] : []),
    [isMounted, jobsQuery.data],
  );
  const isFetching = isMounted ? jobsQuery.isFetching : true;
  const isLoading = isMounted ? jobsQuery.isLoading : true;

  // Mutations
  const actionMutation = useProductAiJobMutation();
  const deleteMutation = useDeleteProductAiJobMutation();
  const clearMutation = useClearProductAiJobsMutation();

  const getPayload = (job: ProductAiJob): Record<string, unknown> | null => {
    return job.payload && typeof job.payload === "object"
      ? (job.payload as Record<string, unknown>)
      : null;
  };

  const getJobMeta = (job: ProductAiJob): JobMeta => {
    const payload = getPayload(job);
    const graph = payload?.graph as Record<string, unknown> | undefined;
    const context = payload?.context as Record<string, unknown> | undefined;
    const entityType =
      (payload?.entityType as string | undefined) ??
      (context?.entityType as string | undefined) ??
      (graph?.entityType as string | undefined);
    const entityId =
      (payload?.entityId as string | undefined) ??
      (context?.entityId as string | undefined) ??
      (payload?.productId as string | undefined) ??
      job.productId;
    const pathName = (graph?.pathName as string | undefined) ?? undefined;
    const pathId = (graph?.pathId as string | undefined) ?? undefined;
    const nodeTitle = (graph?.nodeTitle as string | undefined) ?? undefined;
    const source = (payload?.source as string | undefined) ?? undefined;
    const displayEntity =
      job.product?.name_en || job.product?.sku
        ? `${job.product?.name_en || "Untitled"} (${job.product?.sku || "N/A"})`
        : entityType || entityId
          ? `${entityType ?? "entity"} · ${entityId ?? "unknown"}`
          : "N/A";
    const subEntity = job.product?.sku
      ? `SKU: ${job.product.sku}`
      : pathName || pathId
        ? `Path: ${pathName ?? pathId}`
        : entityId
          ? `ID: ${entityId}`
          : source
            ? `Source: ${source}`
            : undefined;

    return {
      payload,
      graph,
      context,
      entityType,
      entityId,
      pathName,
      pathId,
      nodeTitle,
      source,
      displayEntity,
      subEntity,
    };
  };

  const defaultTab = useMemo((): string => {
    if (!showTabs) return "ai";
    const tab = searchParams?.get("tab") ?? "ai";
    return ["ai", "import", "export"].includes(tab) ? tab : "ai";
  }, [searchParams, showTabs]);

  const cancelJob = async (jobId: string): Promise<void> => {
    try {
      await actionMutation.mutateAsync({ jobId, action: "cancel" });
      toast("Job canceled", { variant: "success" });
    } catch (error: unknown) {
      toast(error instanceof Error ? error.message : "Failed to cancel job.", { variant: "error" });
    }
  };

  const deleteJob = async (jobId: string): Promise<void> => {
    try {
      await deleteMutation.mutateAsync(jobId);
      toast("Job deleted", { variant: "success" });
    } catch (error: unknown) {
      toast(error instanceof Error ? error.message : "Failed to delete job.", { variant: "error" });
    }
  };

  const clearCompleted = async (): Promise<void> => {
    if (!window.confirm("Delete all completed jobs? This cannot be undone.")) return;
    try {
      await clearMutation.mutateAsync({ scope: "terminal" });
      toast("Jobs cleared", { variant: "success" });
    } catch (error: unknown) {
      toast(error instanceof Error ? error.message : "Failed to delete completed jobs.", { variant: "error" });
    }
  };

  const clearAllJobs = async (): Promise<void> => {
    if (!window.confirm("Delete ALL AI jobs (including running/pending)?")) return;
    try {
      await clearMutation.mutateAsync({ scope: "all" });
      toast("All jobs deleted", { variant: "success" });
    } catch (error: unknown) {
      toast(error instanceof Error ? error.message : "Failed to delete all jobs.", { variant: "error" });
    }
  };

  const filteredJobs = jobs.filter((job: ProductAiJob) => {
    const meta = getJobMeta(job);
    const searchStr = query.toLowerCase();
    return [
      job.id,
      job.status,
      job.type,
      meta.entityType,
      meta.entityId,
      meta.pathName,
      meta.pathId,
      meta.nodeTitle,
      meta.source,
      job.product?.name_en,
      job.product?.sku,
    ].some((val: string | null | undefined) => val && String(val).toLowerCase().includes(searchStr));
  });

  const formatTime = useCallback(
    (value?: string | Date | null): string => {
      if (!value) return "—";
      const date = new Date(value);
      return isMounted ? date.toLocaleTimeString() : date.toISOString().slice(11, 19);
    },
    [isMounted],
  );

  if (!isMounted) {
    return (
      <div className="container mx-auto py-10">
        <SectionHeader
          title={title}
          description={description}
          className="mb-6"
        />
        <SectionPanel className="p-6">
          <div className="text-sm text-gray-400">Loading jobs panel...</div>
        </SectionPanel>
      </div>
    );
  }

  const aiContent = (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Input
          placeholder="Search by ID, entity, path, or model..."
          value={query}
          onChange={(e: React.ChangeEvent<HTMLInputElement>): void => setQuery(e.target.value)}
          className="max-w-md bg-gray-900 border-border text-white"
        />
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={(): void => { void jobsQuery.refetch(); }} disabled={isFetching}>
            <RefreshCcw className={`mr-2 h-4 w-4 ${isFetching ? "animate-spin" : ""}`} />
            Refresh
          </Button>
          <Button variant="destructive" size="sm" onClick={(): void => { void clearCompleted(); }} disabled={clearMutation.isPending}>
            <Trash2 className="mr-2 h-4 w-4" />
            Clear Finished
          </Button>
          <Button variant="destructive" size="sm" onClick={(): void => { void clearAllJobs(); }} disabled={clearMutation.isPending}>
            <Trash2 className="mr-2 h-4 w-4" />
            Clear All
          </Button>
        </div>
      </div>

      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <table className="w-full text-left text-sm text-gray-300">
          <thead className="bg-gray-900 text-xs uppercase text-gray-500">
            <tr>
              <th className="px-4 py-3">Entity</th>
              <th className="px-4 py-3">Type / ID</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Timing</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredJobs.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-gray-500">
                  {isLoading ? "Loading jobs..." : "No jobs found."}
                </td>
              </tr>
            ) : (
              filteredJobs.map((job: ProductAiJob) => {
                const meta = getJobMeta(job);
                return (
                  <tr key={job.id} className="hover:bg-card/50">
                  <td className="px-4 py-4">
                    <div className="font-medium text-white">{meta.displayEntity}</div>
                    {meta.subEntity && (
                      <div className="text-xs text-gray-500">{meta.subEntity}</div>
                    )}
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
                    <div>Created: {formatTime(job.createdAt)}</div>
                    {job.finishedAt && (
                      <div className="text-gray-500">Finished: {formatTime(job.finishedAt)}</div>
                    )}
                  </td>
                  <td className="px-4 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-blue-500 hover:text-blue-400"
                        onClick={(): void => setSelectedJob(job)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      {(job.status === "pending" || job.status === "running") && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-yellow-500 hover:text-yellow-400"
                          onClick={(): void => { void cancelJob(job.id); }}
                          disabled={actionMutation.isPending && actionMutation.variables?.jobId === job.id}
                        >
                          {actionMutation.isPending && actionMutation.variables?.jobId === job.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4" />}
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-red-500 hover:text-red-400"
                        onClick={(): void => { void deleteJob(job.id); }}
                        disabled={deleteMutation.isPending && deleteMutation.variables === job.id}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </td>
                </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </>
  );

  return (
    <div className="container mx-auto py-10">
      <SectionHeader
        title={title}
        description={description}
        className="mb-6"
      />

      {showTabs ? (
        <Tabs defaultValue={defaultTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="ai">AI Jobs</TabsTrigger>
            <TabsTrigger value="import">Import Jobs</TabsTrigger>
            <TabsTrigger value="export">Export Jobs</TabsTrigger>
          </TabsList>

          <TabsContent value="ai" className="space-y-4">
            {aiContent}
          </TabsContent>

          <TabsContent value="import" className="space-y-4">
            <SectionPanel className="p-6">
              <h2 className="text-2xl font-bold text-white">Import Jobs</h2>
              <p className="mt-2 text-sm text-gray-400">
                Import jobs will appear here once import tracking is enabled.
              </p>
              <div className="mt-4">
                <Link href="/admin/integrations/imports" className="text-sm text-blue-400 underline">
                  Go to Imports
                </Link>
              </div>
            </SectionPanel>
          </TabsContent>

          <TabsContent value="export">
            <ProductListingJobsPanel showBackToProducts={false} />
          </TabsContent>
        </Tabs>
      ) : (
        <div className="space-y-4">
          {aiContent}
        </div>
      )}

      {selectedJob && (
        <AppModal
          open={true}
          onOpenChange={(open: boolean): void => { if (!open) setSelectedJob(null); }}
          title="Job Details"
        >
          <ModalShell title="Job Details" onClose={(): void => setSelectedJob(null)} size="xl">
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
                  <div className="text-gray-500 uppercase text-[10px] font-bold">Entity</div>
                  <div className="text-white font-medium">
                    {getJobMeta(selectedJob).displayEntity}
                  </div>
                </div>
                <div>
                  <div className="text-gray-500 uppercase text-[10px] font-bold">Job ID</div>
                  <div className="text-white font-mono text-xs">{selectedJob.id}</div>
                </div>
              </div>

                <div className="rounded-md border border-border bg-card/40 p-4">
                  <div className="text-gray-400 font-bold text-xs uppercase mb-3">
                    Run Metadata
                  </div>
                  {((): React.ReactNode => {
                    const meta = getJobMeta(selectedJob);
                    const payload = (meta.payload ?? {}) as JobPayload;
                    const modelId = payload.modelId;
                    const temperature = payload.temperature;
                    const maxTokens = payload.maxTokens;
                    const vision = payload.vision;
                    const imageUrls = payload.imageUrls;
                    return (
                      <div className="grid grid-cols-1 gap-3 text-xs md:grid-cols-2">
                        <div>
                          <div className="text-[10px] uppercase text-gray-500 font-bold">
                            Source
                          </div>
                          <div className="text-white">
                            {meta.source ?? "unknown"}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] uppercase text-gray-500 font-bold">
                            Entity
                          </div>
                          <div className="text-white">
                            {meta.entityType ?? "unknown"} · {meta.entityId ?? "n/a"}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] uppercase text-gray-500 font-bold">
                            Path
                          </div>
                          <div className="text-white">
                            {meta.pathName ?? meta.pathId ?? "n/a"}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] uppercase text-gray-500 font-bold">
                            Node
                          </div>
                          <div className="text-white">
                            {meta.nodeTitle ?? "n/a"}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] uppercase text-gray-500 font-bold">
                            Model
                          </div>
                          <div className="text-white font-mono">{modelId ?? "n/a"}</div>
                        </div>
                        <div>
                          <div className="text-[10px] uppercase text-gray-500 font-bold">
                            Tokens / Temp
                          </div>
                          <div className="text-white">
                            {maxTokens ?? "n/a"} / {temperature ?? "n/a"}
                          </div>
                        </div>
                        <div>
                          <div className="text-[10px] uppercase text-gray-500 font-bold">
                            Vision
                          </div>
                          <div className="text-white">{vision ? "Yes" : "No"}</div>
                        </div>
                        <div>
                          <div className="text-[10px] uppercase text-gray-500 font-bold">
                            Images
                          </div>
                          <div className="text-white">
                            {Array.isArray(imageUrls) ? imageUrls.length : 0}
                          </div>
                        </div>
                      </div>
                    );
                  })()}
                </div>

                {selectedJob.result && typeof selectedJob.result === 'object' && ((selectedJob.result as JobResult).visionModel || (selectedJob.result as JobResult).generationModel) && (
                  <div className="rounded-md bg-card/50 border border-border p-4">
                    <div className="text-gray-400 font-bold text-xs uppercase mb-3">AI Models Used</div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {(selectedJob.result as JobResult).visionModel && (
                        <div>
                          <div className="text-blue-400 text-[10px] font-bold uppercase mb-1">Vision Model (Path 1)</div>
                          <div className="text-white font-mono text-sm">{(selectedJob.result as JobResult).visionModel}</div>
                          {(selectedJob.result as JobResult).visionOutputEnabled !== undefined && (
                            <div className="text-gray-500 text-[10px] mt-1">
                              Refinement: {(selectedJob.result as JobResult).visionOutputEnabled ? "Enabled" : "Disabled"}
                            </div>
                          )}
                        </div>
                      )}
                      {(selectedJob.result as JobResult).generationModel && (
                        <div>
                          <div className="text-purple-400 text-[10px] font-bold uppercase mb-1">Generation Model (Path 2)</div>
                          <div className="text-white font-mono text-sm">{(selectedJob.result as JobResult).generationModel}</div>
                          {(selectedJob.result as JobResult).generationOutputEnabled !== undefined && (
                            <div className="text-gray-500 text-[10px] mt-1">
                              Refinement: {(selectedJob.result as JobResult).generationOutputEnabled ? "Enabled" : "Disabled"}
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

                {selectedJob.type === "graph_model" && (
                  <div className="rounded-md border border-border bg-card/40 p-4">
                    <div className="text-gray-400 font-bold text-xs uppercase mb-3">
                      Graph Model Inputs
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="text-[10px] uppercase text-gray-500 font-bold">Model</div>
                        <div className="text-white text-sm font-mono">
                          {(selectedJob.payload as JobPayload | null)?.modelId ||
                            "Unknown"}
                        </div>
                        <div className="text-[10px] uppercase text-gray-500 font-bold mt-2">
                          Vision Enabled
                        </div>
                        <div className="text-white text-sm">
                          {(selectedJob.payload as JobPayload | null)?.vision
                            ? "Yes"
                            : "No"}
                        </div>
                      </div>
                      <div className="space-y-2">
                        <div className="text-[10px] uppercase text-gray-500 font-bold">Image URLs</div>
                        {Array.isArray(
                          (selectedJob.payload as JobPayload | null)?.imageUrls
                        ) &&
                        (selectedJob.payload as JobPayload | null)?.imageUrls
                          ?.length ? (
                          <div className="rounded-md bg-gray-900 p-3 text-[11px] text-gray-300 border border-border max-h-40 overflow-auto">
                            {(selectedJob.payload as JobPayload | null)?.imageUrls?.map(
                              (url: string, index: number) => (
                                <div key={`${url}-${index}`} className="truncate">
                                  {url}
                                </div>
                              )
                            )}
                          </div>
                        ) : (
                          <div className="text-[11px] text-gray-500">No image URLs in payload.</div>
                        )}
                      </div>
                    </div>
                    <div className="mt-4 space-y-2">
                      <div className="text-[10px] uppercase text-gray-500 font-bold">Prompt</div>
                      <pre className="max-h-60 overflow-auto rounded-md bg-gray-900 p-3 text-[11px] text-gray-300 border border-border whitespace-pre-wrap">
                        {(selectedJob.payload as JobPayload | null)?.prompt ||
                          "No prompt provided."}
                      </pre>
                    </div>
                  </div>
                )}

                {selectedJob.result && typeof selectedJob.result === 'object' && 'analysisInitial' in (selectedJob.result as object) ? (
                  <div className="space-y-4">
                    <div className="text-gray-400 font-bold text-xs uppercase mb-2">AI Processing Results</div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="text-blue-400 uppercase text-[10px] font-bold">Path 1: Image Analysis (Initial)</div>
                        <div className="rounded-md bg-gray-900 p-3 text-[11px] text-gray-300 border border-border max-h-40 overflow-auto">
                          {(selectedJob.result as JobResult).analysisInitial || (selectedJob.result as JobResult).analysis || 'N/A'}
                        </div>
                      </div>

                      {(selectedJob.result as JobResult).analysisFinal && (
                        <div className="space-y-2">
                          <div className="text-blue-400 uppercase text-[10px] font-bold">Path 1: Image Analysis (Final)</div>
                          <div className="rounded-md bg-gray-900 p-3 text-[11px] text-gray-300 border border-border max-h-40 overflow-auto">
                            {(selectedJob.result as JobResult).analysisFinal}
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <div className="text-purple-400 uppercase text-[10px] font-bold">Path 2: Description (Initial)</div>
                        <div className="rounded-md bg-gray-900 p-3 text-[11px] text-gray-300 border border-border max-h-40 overflow-auto whitespace-pre-wrap">
                          {(selectedJob.result as JobResult).descriptionInitial || (selectedJob.result as JobResult).description || 'N/A'}
                        </div>
                      </div>

                      {(selectedJob.result as JobResult).descriptionFinal && (
                        <div className="space-y-2">
                          <div className="text-purple-400 uppercase text-[10px] font-bold">Path 2: Description (Final)</div>
                          <div className="rounded-md bg-gray-900 p-3 text-[11px] text-gray-300 border border-border max-h-40 overflow-auto whitespace-pre-wrap">
                            {(selectedJob.result as JobResult).descriptionFinal}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : selectedJob.result && typeof selectedJob.result === 'object' && 'translations' in (selectedJob.result as object) ? (
                  <div className="space-y-4">
                    <div className="text-gray-400 font-bold text-xs uppercase mb-2">Translation Results</div>

                    {(selectedJob.result as JobResult).translationModel && (
                      <div className="rounded-md bg-card/50 border border-border p-4 mb-4">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div>
                            <div className="text-green-400 text-[10px] font-bold uppercase mb-1">Translation Model</div>
                            <div className="text-white font-mono text-sm">{(selectedJob.result as JobResult).translationModel}</div>
                          </div>
                          {(selectedJob.result as JobResult).sourceLanguage && (
                            <div>
                              <div className="text-gray-500 text-[10px] font-bold uppercase mb-1">Source Language</div>
                              <div className="text-white text-sm">{(selectedJob.result as JobResult).sourceLanguage}</div>
                            </div>
                          )}
                          {(selectedJob.result as JobResult).targetLanguages && (
                            <div>
                              <div className="text-gray-500 text-[10px] font-bold uppercase mb-1">Target Languages</div>
                              <div className="text-white text-sm">{(selectedJob.result as JobResult).targetLanguages?.join(', ') || 'N/A'}</div>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="space-y-4">
                      {(selectedJob.result as JobResult).translations && Object.entries((selectedJob.result as JobResult).translations!).map(([lang, trans]: [string, { name?: string; description?: string }]) => (
                        <div key={lang} className="rounded-md border border-border bg-card/30 p-4">
                          <div className="text-green-400 uppercase text-[10px] font-bold mb-3">{lang}</div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <div className="text-gray-500 text-[10px] font-bold uppercase mb-1">Translated Name</div>
                              <div className="text-white text-sm p-2 bg-gray-900 rounded border border-border">
                                {trans.name || 'N/A'}
                              </div>
                            </div>
                            <div>
                              <div className="text-gray-500 text-[10px] font-bold uppercase mb-1">Translated Description</div>
                              <div className="text-white text-sm p-2 bg-gray-900 rounded border border-border max-h-32 overflow-auto whitespace-pre-wrap">
                                {trans.description || 'N/A'}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <div className="text-gray-500 uppercase text-[10px] font-bold">Payload (Input Config)</div>
                      <pre className="max-h-60 overflow-auto rounded-md bg-gray-900 p-3 text-[11px] text-gray-400 border border-border">
                        {JSON.stringify(selectedJob.payload, null, 2)}
                      </pre>
                    </div>
                    <div className="space-y-2">
                      <div className="text-gray-500 uppercase text-[10px] font-bold">Result (Output)</div>
                      <pre className="max-h-60 overflow-auto rounded-md bg-gray-900 p-3 text-[11px] text-gray-300 border border-border whitespace-pre-wrap">
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
        </AppModal>
      )}
    </div>
  );
}

export function ProductAiJobsPanelSuspense(props: ProductAiJobsPanelProps): React.JSX.Element {
  return (
    <Suspense fallback={<div className="container mx-auto py-10"><div className="text-gray-400">Loading...</div></div>}>
      <ProductAiJobsPanel {...props} />
    </Suspense>
  );
}
