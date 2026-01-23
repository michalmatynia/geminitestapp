import prisma from "@/lib/prisma";
import type {
  ProductAiJobRecord,
  ProductAiJobRepository,
  ProductAiJobUpdate,
} from "@/types/services/product-ai-job-repository";

const mapJob = (job: any): ProductAiJobRecord => ({
  id: job.id,
  productId: job.productId,
  status: job.status,
  type: job.type,
  payload: job.payload,
  result: job.result ?? null,
  errorMessage: job.errorMessage ?? null,
  createdAt: job.createdAt,
  startedAt: job.startedAt ?? null,
  finishedAt: job.finishedAt ?? null,
});

export const prismaProductAiJobRepository: ProductAiJobRepository = {
  async createJob(productId, type, payload) {
    const job = await prisma.productAiJob.create({
      data: {
        productId,
        type,
        payload,
        status: "pending",
      },
    });
    return mapJob(job);
  },

  async findJobs(productId) {
    const jobs = await prisma.productAiJob.findMany({
      where: productId ? { productId } : {},
      orderBy: { createdAt: "desc" },
    });
    return jobs.map(mapJob);
  },

  async findJobById(jobId) {
    const job = await prisma.productAiJob.findUnique({ where: { id: jobId } });
    return job ? mapJob(job) : null;
  },

  async findNextPendingJob() {
    const job = await prisma.productAiJob.findFirst({
      where: { status: "pending" },
      orderBy: { createdAt: "asc" },
    });
    return job ? mapJob(job) : null;
  },

  async findAnyPendingJob() {
    const job = await prisma.productAiJob.findFirst({
      where: { status: "pending" },
      orderBy: { createdAt: "asc" },
    });
    return job ? mapJob(job) : null;
  },

  async updateJob(jobId, data: ProductAiJobUpdate) {
    const job = await prisma.productAiJob.update({
      where: { id: jobId },
      data,
    });
    return mapJob(job);
  },

  async deleteJob(jobId) {
    await prisma.productAiJob.delete({ where: { id: jobId } });
  },

  async deleteTerminalJobs() {
    const result = await prisma.productAiJob.deleteMany({
      where: { status: { in: ["completed", "failed", "canceled"] } },
    });
    return { count: result.count };
  },
};
