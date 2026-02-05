export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";

import { apiHandler } from "@/shared/lib/api/api-handler";
import type { ApiHandlerContext } from "@/shared/types/api";
import { requireAiPathsAccess } from "@/features/ai/ai-paths/server";
import { getPathRunRepository } from "@/features/ai/ai-paths/services/path-run-repository";
import type { AiPathRunStatus } from "@/shared/types/ai-paths";
import type { ProductAiJobStatus } from "@/features/jobs/types/product-ai-job-repository";
import { getProductAiJobProvider, getProductAiJobRepository } from "@/features/jobs/services/product-ai-job-repository";
import prisma from "@/shared/lib/db/prisma";
import { getMongoDb } from "@/shared/lib/db/mongo-client";

const AI_PATH_STATUSES: AiPathRunStatus[] = [
  "queued",
  "running",
  "paused",
  "completed",
  "failed",
  "canceled",
  "dead_lettered",
];

const JOB_STATUSES: ProductAiJobStatus[] = [
  "pending",
  "running",
  "completed",
  "failed",
  "canceled",
];

const toIso = (value?: Date | string | null): string | null => {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
};

async function GET_handler(_req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  await requireAiPathsAccess();

  const errors: Record<string, string> = {};

  const aiPathsProvider = process.env.DATABASE_URL
    ? "prisma"
    : process.env.MONGODB_URI
      ? "mongodb"
      : "unknown";

  const aiPaths = await (async () => {
    try {
      const repo = getPathRunRepository();
      const byStatusEntries = await Promise.all(
        AI_PATH_STATUSES.map(async (status) => {
          const result = await repo.listRuns({ status, limit: 1, offset: 0 });
          return [status, result.total] as const;
        })
      );
      const byStatus = Object.fromEntries(byStatusEntries) as Record<AiPathRunStatus, number>;
      const all = await repo.listRuns({ limit: 1, offset: 0 });
      const latest = all.runs[0]
        ? {
            id: all.runs[0].id,
            status: all.runs[0].status,
            createdAt: toIso(all.runs[0].createdAt),
          }
        : null;
      return {
        provider: aiPathsProvider,
        total: all.total,
        byStatus,
        latest,
      };
    } catch (error) {
      errors.aiPaths = error instanceof Error ? error.message : "Failed to load AI Paths counts.";
      return {
        provider: aiPathsProvider,
        total: null,
        byStatus: {} as Record<AiPathRunStatus, number>,
        latest: null,
      };
    }
  })();

  const aiJobs = await (async () => {
    try {
      await getProductAiJobRepository();
      const provider = getProductAiJobProvider() ?? "unknown";

      if (provider === "mongodb") {
        const db = await getMongoDb();
        const collection = db.collection("product_ai_jobs");
        const totals = await Promise.all(
          JOB_STATUSES.map(async (status) => [status, await collection.countDocuments({ status })] as const)
        );
        const total = await collection.countDocuments({});
        const latest = await collection
          .find({}, { projection: { _id: 1, id: 1, status: 1, createdAt: 1, productId: 1, type: 1 } })
          .sort({ createdAt: -1 })
          .limit(1)
          .next();
        return {
          provider,
          total,
          byStatus: Object.fromEntries(totals) as Record<ProductAiJobStatus, number>,
          latest: latest
            ? {
                id: (latest as { id?: string; _id?: string }).id ?? String(latest._id),
                status: latest.status as ProductAiJobStatus,
                createdAt: toIso(latest.createdAt as Date | string | null),
                productId: latest.productId as string | null,
                type: latest.type as string | null,
              }
            : null,
        };
      }

      if (provider === "prisma") {
        const totals = await Promise.all(
          JOB_STATUSES.map(async (status) => [status, await prisma.productAiJob.count({ where: { status } })] as const)
        );
        const total = await prisma.productAiJob.count();
        const latest = await prisma.productAiJob.findFirst({
          orderBy: { createdAt: "desc" },
          select: { id: true, status: true, createdAt: true, productId: true, type: true },
        });
        return {
          provider,
          total,
          byStatus: Object.fromEntries(totals) as Record<ProductAiJobStatus, number>,
          latest: latest
            ? {
                id: latest.id,
                status: latest.status as ProductAiJobStatus,
                createdAt: toIso(latest.createdAt),
                productId: latest.productId ?? null,
                type: latest.type ?? null,
              }
            : null,
        };
      }

      return {
        provider,
        total: null,
        byStatus: {} as Record<ProductAiJobStatus, number>,
        latest: null,
      };
    } catch (error) {
      errors.aiJobs = error instanceof Error ? error.message : "Failed to load AI Jobs counts.";
      return {
        provider: getProductAiJobProvider() ?? "unknown",
        total: null,
        byStatus: {} as Record<ProductAiJobStatus, number>,
        latest: null,
      };
    }
  })();

  const ok = Object.keys(errors).length === 0;
  return NextResponse.json(
    {
      ok,
      timestamp: new Date().toISOString(),
      aiPaths,
      aiJobs,
      errors: ok ? undefined : errors,
    },
    { status: ok ? 200 : 500 }
  );
}

export const GET = apiHandler(GET_handler, {
  source: "ai-paths.health.GET",
});
