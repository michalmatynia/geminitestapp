import { productService } from "@/features/products/server";
import { getProductAiJobRepository } from "@/features/jobs/services/product-ai-job-repository";
import { invalidStateError, notFoundError } from "@/shared/errors/app-error";
import type { ProductAiJobRecord, ProductAiJobUpdate } from "@/features/jobs/types/product-ai-job-repository";
import type { ProductAiJobType, ProductAiJob, ProductAiJobResult } from "@/shared/types/jobs";

type ProductSummary = {
  name_en: string | null;
  sku: string | null;
};

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object";

const toJobResult = (value: unknown): ProductAiJobResult | null => {
  if (value === null || value === undefined) return null;
  return isRecord(value) ? (value as ProductAiJobResult) : null;
};

const toIsoString = (value?: Date | null): string | null => {
  if (!value) return null;
  return value.toISOString();
};

const toProductAiJob = (record: ProductAiJobRecord): ProductAiJob => ({
  id: record.id,
  productId: record.productId,
  status: record.status,
  type: record.type,
  payload: record.payload,
  result: toJobResult(record.result),
  errorMessage: record.errorMessage ?? null,
  createdAt: record.createdAt.toISOString(),
  startedAt: toIsoString(record.startedAt),
  finishedAt: toIsoString(record.finishedAt),
});

const toProductSummary = (product: Record<string, unknown> | null): ProductSummary | null => {
  if (!product) return null;
  const record = product;
  const name = typeof record.name_en === "string" ? record.name_en : null;
  const sku = typeof record.sku === "string" ? record.sku : null;
  return { name_en: name, sku };
};

export async function enqueueProductAiJob(productId: string, type: ProductAiJobType, payload: unknown): Promise<ProductAiJob> {
  console.log(`[enqueueProductAiJob] Creating job for productId: ${productId}, type: ${type}`);
  const jobRepository = await getProductAiJobRepository();
  const jobRecord = await jobRepository.createJob(productId, type, payload);
  console.log(`[enqueueProductAiJob] Job created with id: ${jobRecord.id}`);
  return toProductAiJob(jobRecord);
}

export async function getProductAiJobs(
  productId?: string
): Promise<Array<Omit<ProductAiJob, "product"> & { product: ProductSummary | null }>> {
  const jobRepository = await getProductAiJobRepository();
  const jobRecords = await jobRepository.findJobs(productId);
  const jobs = jobRecords.map(toProductAiJob);

  const shouldFetchProduct = (job: { productId: string; payload: unknown }): boolean => {
    const payload =
      job.payload && typeof job.payload === "object"
        ? (job.payload as Record<string, unknown>)
        : null;
    const entityType =
      (payload?.entityType as string | undefined) ??
      ((payload?.context as Record<string, unknown> | undefined)?.entityType as
        | string
        | undefined);
    const source = payload?.source as string | undefined;
    const graph = payload?.graph as Record<string, unknown> | undefined;
    if (entityType && entityType !== "product") return false;
    if (source === "ai_paths" && graph) return false;
    if (job.productId.startsWith("path_")) return false;
    return true;
  };

  // Batch fetch products - deduplicate IDs to avoid redundant queries
  const uniqueProductIds = [
    ...new Set(jobs.filter(shouldFetchProduct).map((j: ProductAiJob) => j.productId)),
  ];

  // Fetch all unique products in parallel
  const productResults = await Promise.all(
    uniqueProductIds.map(async (id: string): Promise<{ id: string; product: Record<string, unknown> | null }> => {
      try {
        const product = await productService.getProductById(id);
        return { id, product: isRecord(product) ? product : null };
      } catch (error: unknown) {
        console.error(`[getProductAiJobs] Failed to fetch product ${id}:`, error);
        return { id, product: null };
      }
    })
  );

  // Create lookup map for O(1) access
  const productMap = new Map(
    productResults.map(({ id, product }: { id: string; product: Record<string, unknown> | null }) => [
      id,
      toProductSummary(product),
    ])
  );

  // Enrich jobs with product data from map
  return jobs.map((job: ProductAiJob) => ({
    ...job,
    product: productMap.get(job.productId) ?? null,
  }));
}

export async function getProductAiJob(
  jobId: string
): Promise<(Omit<ProductAiJob, "product"> & { product: Record<string, unknown> | null }) | null> {
  const jobRepository = await getProductAiJobRepository();
  const jobRecord = await jobRepository.findJobById(jobId);
  if (!jobRecord) return null;
  const job = toProductAiJob(jobRecord);

  let product: Record<string, unknown> | null = null;
  const payload =
    job.payload && typeof job.payload === "object"
      ? (job.payload as Record<string, unknown>)
      : null;
  const entityType =
    (payload?.entityType as string | undefined) ??
    ((payload?.context as Record<string, unknown> | undefined)?.entityType as
      | string
      | undefined);
  const source = payload?.source as string | undefined;
  const graph = payload?.graph as Record<string, unknown> | undefined;
  const shouldFetch =
    !job.productId.startsWith("path_") &&
    entityType !== "note" &&
    entityType !== "user" &&
    entityType !== "system" &&
    !(source === "ai_paths" && graph) &&
    (entityType ? entityType === "product" : true);
  if (shouldFetch) {
    try {
      const result = await productService.getProductById(job.productId);
      product = isRecord(result) ? result : null;
    } catch (error: unknown) {
      console.error(`[getProductAiJob] Failed to fetch product ${job.productId}:`, error);
      // Continue without product details if it fails
    }
  }

  return {
    ...job,
    product
  };
}

export async function updateProductAiJob(jobId: string, data: ProductAiJobUpdate): Promise<ProductAiJob> {
  const jobRepository = await getProductAiJobRepository();
  const updated = await jobRepository.updateJob(jobId, data);
  return toProductAiJob(updated);
}

export async function cancelProductAiJob(jobId: string): Promise<ProductAiJob> {
  const jobRepository = await getProductAiJobRepository();
  const jobRecord = await jobRepository.findJobById(jobId);
  if (!jobRecord) throw notFoundError("Job not found", { jobId });
  if (jobRecord.status !== "pending" && jobRecord.status !== "running") {
    throw invalidStateError("Only pending or running jobs can be canceled", {
      jobId,
      status: jobRecord.status,
    });
  }

  const updated = await jobRepository.updateJob(jobId, {
    status: "canceled",
    finishedAt: new Date(),
  });
  return toProductAiJob(updated);
}

export async function deleteProductAiJob(jobId: string): Promise<void> {
  const jobRepository = await getProductAiJobRepository();
  await jobRepository.deleteJob(jobId);
}

export async function deleteTerminalProductAiJobs(): Promise<number> {
  const jobRepository = await getProductAiJobRepository();
  const { count } = await jobRepository.deleteTerminalJobs();
  return count;
}

export async function deleteAllProductAiJobs(): Promise<number> {
  const jobRepository = await getProductAiJobRepository();
  const { count } = await jobRepository.deleteAllJobs();
  return count;
}

export async function cleanupStaleRunningProductAiJobs(maxAgeMs: number): Promise<number> {
  const jobRepository = await getProductAiJobRepository();
  const { count } = await jobRepository.markStaleRunningJobs(maxAgeMs);
  return count;
}
