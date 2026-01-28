import { productService } from "@/features/products";
import { getProductAiJobRepository } from "@/features/jobs/services/product-ai-job-repository";
import { invalidStateError, notFoundError } from "@/shared/errors/app-error";
import type { ProductAiJobUpdate } from "@/features/jobs/types/product-ai-job-repository";
import type { ProductAiJobType } from "@/shared/types/jobs";

export async function enqueueProductAiJob(productId: string, type: ProductAiJobType, payload: unknown) {
  console.log(`[enqueueProductAiJob] Creating job for productId: ${productId}, type: ${type}`);
  const jobRepository = await getProductAiJobRepository();
  const job = await jobRepository.createJob(productId, type, payload);
  console.log(`[enqueueProductAiJob] Job created with id: ${job.id}`);
  return job;
}

export async function getProductAiJobs(productId?: string) {
  const jobRepository = await getProductAiJobRepository();
  const jobs = await jobRepository.findJobs(productId);

  const shouldFetchProduct = (job: { productId: string; payload: unknown }) => {
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
    ...new Set(jobs.filter(shouldFetchProduct).map((j) => j.productId)),
  ];

  // Fetch all unique products in parallel
  const productResults = await Promise.all(
    uniqueProductIds.map(async (id) => {
      try {
        const product = await productService.getProductById(id);
        return { id, product };
      } catch (error) {
        console.error(`[getProductAiJobs] Failed to fetch product ${id}:`, error);
        return { id, product: null };
      }
    })
  );

  // Create lookup map for O(1) access
  const productMap = new Map(
    productResults.map(({ id, product }) => [
      id,
      product ? { name_en: product.name_en, sku: product.sku } : null,
    ])
  );

  // Enrich jobs with product data from map
  return jobs.map((job) => ({
    ...job,
    product: productMap.get(job.productId) ?? null,
  }));
}

export async function getProductAiJob(jobId: string) {
  const jobRepository = await getProductAiJobRepository();
  const job = await jobRepository.findJobById(jobId);
  if (!job) return null;

  let product = null;
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
      product = await productService.getProductById(job.productId);
    } catch (error) {
      console.error(`[getProductAiJob] Failed to fetch product ${job.productId}:`, error);
      // Continue without product details if it fails
    }
  }

  return {
    ...job,
    product
  };
}

export async function updateProductAiJob(jobId: string, data: ProductAiJobUpdate) {
  const jobRepository = await getProductAiJobRepository();
  return jobRepository.updateJob(jobId, data);
}

export async function cancelProductAiJob(jobId: string) {
  const jobRepository = await getProductAiJobRepository();
  const job = await jobRepository.findJobById(jobId);
  if (!job) throw notFoundError("Job not found", { jobId });
  if (job.status !== "pending" && job.status !== "running") {
    throw invalidStateError("Only pending or running jobs can be canceled", {
      jobId,
      status: job.status,
    });
  }

  return jobRepository.updateJob(jobId, {
    status: "canceled",
    finishedAt: new Date(),
  });
}

export async function deleteProductAiJob(jobId: string) {
  const jobRepository = await getProductAiJobRepository();
  await jobRepository.deleteJob(jobId);
}

export async function deleteTerminalProductAiJobs() {
  const jobRepository = await getProductAiJobRepository();
  return jobRepository.deleteTerminalJobs();
}

export async function deleteAllProductAiJobs() {
  const jobRepository = await getProductAiJobRepository();
  return jobRepository.deleteAllJobs();
}

export async function cleanupStaleRunningProductAiJobs(maxAgeMs: number) {
  const jobRepository = await getProductAiJobRepository();
  return jobRepository.markStaleRunningJobs(maxAgeMs);
}
