import 'server-only';

import { ProductAiJob, Prisma } from '@prisma/client';

import type {
  FindProductAiJobsOptions,
  ProductAiJobRecord,
  ProductAiJobRepository,
  ProductAiJobUpdate,
  ProductAiJobStatus,
} from '@/shared/contracts/jobs';
import prisma from '@/shared/lib/db/prisma';

const mapJob = (job: ProductAiJob): ProductAiJobRecord => ({
  id: job.id,
  productId: job.productId,
  status: job.status as ProductAiJobStatus,
  type: job.type,
  payload: job.payload as Record<string, unknown>,
  result: (job.result as Record<string, unknown>) ?? null,
  errorMessage: job.errorMessage ?? null,
  createdAt: job.createdAt,
  updatedAt: job.updatedAt,
  startedAt: job.startedAt ?? null,
  finishedAt: job.finishedAt ?? null,
});

export const prismaProductAiJobRepository: ProductAiJobRepository = {
  async createJob(productId: string, type: string, payload: unknown) {
    const job = await prisma.productAiJob.create({
      data: {
        productId,
        type,
        payload: payload as Prisma.InputJsonValue,
        status: 'pending',
      },
    });
    return mapJob(job);
  },

  async findJobs(productId?: string, options?: FindProductAiJobsOptions) {
    const statuses =
      options?.statuses && options.statuses.length > 0 ? options.statuses : undefined;
    const jobs = await prisma.productAiJob.findMany({
      where: {
        ...(productId ? { productId } : {}),
        ...(options?.type ? { type: options.type } : {}),
        ...(statuses ? { status: { in: statuses } } : {}),
      },
      orderBy: { createdAt: 'desc' },
      ...(typeof options?.limit === 'number' && options.limit > 0
        ? { take: Math.floor(options.limit) }
        : {}),
    });
    return jobs.map(mapJob);
  },

  async findJobById(jobId: string) {
    const job = await prisma.productAiJob.findUnique({ where: { id: jobId } });
    return job ? mapJob(job) : null;
  },

  async findNextPendingJob() {
    const job = await prisma.productAiJob.findFirst({
      where: { status: 'pending' },
      orderBy: { createdAt: 'asc' },
    });
    return job ? mapJob(job) : null;
  },

  async findAnyPendingJob() {
    const job = await prisma.productAiJob.findFirst({
      where: { status: 'pending' },
      orderBy: { createdAt: 'asc' },
    });
    return job ? mapJob(job) : null;
  },

  async claimNextPendingJob() {
    const job = await prisma.productAiJob.findFirst({
      where: { status: 'pending' },
      orderBy: { createdAt: 'asc' },
    });
    if (!job) return null;
    const updated = await prisma.productAiJob.update({
      where: { id: job.id },
      data: { status: 'running', startedAt: new Date() },
    });
    return mapJob(updated);
  },

  async updateJob(jobId: string, data: ProductAiJobUpdate) {
    const job = await prisma.productAiJob.update({
      where: { id: jobId },
      data: data as Prisma.ProductAiJobUpdateInput,
    });
    return mapJob(job);
  },

  async deleteJob(jobId: string) {
    await prisma.productAiJob.delete({ where: { id: jobId } });
  },

  async deleteTerminalJobs() {
    const result = await prisma.productAiJob.deleteMany({
      where: { status: { in: ['completed', 'failed', 'canceled'] } },
    });
    return { count: result.count };
  },

  async deleteAllJobs() {
    const result = await prisma.productAiJob.deleteMany({});
    return { count: result.count };
  },

  async markStaleRunningJobs(maxAgeMs: number) {
    const cutoff = new Date(Date.now() - maxAgeMs);
    const result = await prisma.productAiJob.updateMany({
      where: {
        status: 'running',
        startedAt: { lt: cutoff },
      },
      data: {
        status: 'failed',
        finishedAt: new Date(),
        errorMessage: 'Job marked failed due to stale running state.',
      },
    });
    return { count: result.count };
  },
};
