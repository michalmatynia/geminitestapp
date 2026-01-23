import prisma from "@/lib/prisma";
import { getMongoDb } from "@/lib/db/mongo-client";
import { productService } from "./productService";

export type ProductAiJobType = "description_generation" | "translation";

const JOBS_COLLECTION = "product_ai_jobs";

// Why: Supporting both Prisma and MongoDB requires keeping both stores in sync.
// We write to both on every job change. MongoDB failures are logged but silent
// to prevent blocking Prisma writes (MongoDB may not be available in all environments).
// This ensures jobs can be queried from either database without rebuilding data.
async function saveToMongo(job: any) {
  if (!process.env.MONGODB_URI) return;
  try {
    const mongo = await getMongoDb();
    const { id, createdAt, ...data } = job;
    await mongo.collection(JOBS_COLLECTION).updateOne(
      { _id: id },
      {
        $set: { ...data, updatedAt: new Date() },
        $setOnInsert: { createdAt: createdAt || new Date() },
      },
      { upsert: true }
    );
  } catch (error) {
    console.error("Failed to save job to MongoDB:", error);
  }
}

export async function enqueueProductAiJob(productId: string, type: ProductAiJobType, payload: any) {
  console.log(`[enqueueProductAiJob] Creating job for productId: ${productId}, type: ${type}`);
  const job = await prisma.productAiJob.create({
    data: {
      productId,
      type,
      payload,
      status: "pending",
    },
  });
  console.log(`[enqueueProductAiJob] Job created with id: ${job.id}`);
  await saveToMongo(job);
  return job;
}

export async function getProductAiJobs(productId?: string) {
  const jobs = await prisma.productAiJob.findMany({
    where: productId ? { productId } : {},
    orderBy: { createdAt: "desc" },
  });

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
  const job = await prisma.productAiJob.findUnique({
    where: { id: jobId },
  });
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
  const job = await prisma.productAiJob.update({
    where: { id: jobId },
    data,
  });
  await saveToMongo(job);
  return job;
}

export async function cancelProductAiJob(jobId: string) {
  const job = await prisma.productAiJob.findUnique({ where: { id: jobId } });
  if (!job) throw new Error("Job not found");
  if (job.status !== "pending" && job.status !== "running") {
    throw new Error("Only pending or running jobs can be canceled");
  }

  const updated = await prisma.productAiJob.update({
    where: { id: jobId },
    data: {
      status: "canceled",
      finishedAt: new Date(),
    },
  });
  await saveToMongo(updated);
  return updated;
}

export async function deleteProductAiJob(jobId: string) {
  await prisma.productAiJob.delete({
    where: { id: jobId },
  });
  if (process.env.MONGODB_URI) {
    const mongo = await getMongoDb();
    await mongo.collection(JOBS_COLLECTION).deleteOne({ _id: jobId } as any);
  }
}

export async function deleteTerminalProductAiJobs() {
  const result = await prisma.productAiJob.deleteMany({
    where: {
      status: {
        in: ["completed", "failed", "canceled"],
      },
    },
  });
  if (process.env.MONGODB_URI) {
    const mongo = await getMongoDb();
    await mongo.collection(JOBS_COLLECTION).deleteMany({
      status: { $in: ["completed", "failed", "canceled"] }
    });
  }
  return result;
}
