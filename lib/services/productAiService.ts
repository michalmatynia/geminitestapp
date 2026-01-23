import { productService } from "./productService";
import { getProductAiJobRepository } from "@/lib/services/product-ai-job-repository";

export type ProductAiJobType = "description_generation" | "translation";

export async function enqueueProductAiJob(productId: string, type: ProductAiJobType, payload: any) {
  console.log(`[enqueueProductAiJob] Creating job for productId: ${productId}, type: ${type}`);
  const jobRepository = await getProductAiJobRepository();
  const job = await jobRepository.createJob(productId, type, payload);
  console.log(`[enqueueProductAiJob] Job created with id: ${job.id}`);
  return job;
}

export async function getProductAiJobs(productId?: string) {
  const jobRepository = await getProductAiJobRepository();
  const jobs = await jobRepository.findJobs(productId);

  // Manually enrich with product data
  const enrichedJobs = await Promise.all(jobs.map(async (job) => {
    try {
      const product = await productService.getProductById(job.productId);
      return {
        ...job,
        product: product ? {
          name_en: product.name_en,
          sku: product.sku
        } : null
      };
    } catch (error) {
      console.error(`[getProductAiJobs] Failed to fetch product ${job.productId}:`, error);
      return {
        ...job,
        product: null
      };
    }
  }));

  return enrichedJobs;
}

export async function getProductAiJob(jobId: string) {
  const jobRepository = await getProductAiJobRepository();
  const job = await jobRepository.findJobById(jobId);
  if (!job) return null;

  let product = null;
  try {
    product = await productService.getProductById(job.productId);
  } catch (error) {
    console.error(`[getProductAiJob] Failed to fetch product ${job.productId}:`, error);
    // Continue without product details if it fails
  }

  return {
    ...job,
    product
  };
}

export async function updateProductAiJob(jobId: string, data: any) {
  const jobRepository = await getProductAiJobRepository();
  return jobRepository.updateJob(jobId, data);
}

export async function cancelProductAiJob(jobId: string) {
  const jobRepository = await getProductAiJobRepository();
  const job = await jobRepository.findJobById(jobId);
  if (!job) throw new Error("Job not found");
  if (job.status !== "pending" && job.status !== "running") {
    throw new Error("Only pending or running jobs can be canceled");
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
