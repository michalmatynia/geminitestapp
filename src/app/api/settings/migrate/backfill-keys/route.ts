import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import type { Filter } from "mongodb";

import { auth } from "@/features/auth/server";
import { getMongoDb } from "@/shared/lib/db/mongo-client";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import { parseJsonBody } from "@/shared/lib/api/parse-json";
import { apiHandler } from "@/shared/lib/api/api-handler";
import type { ApiHandlerContext } from "@/shared/types/api";
import { authError, internalError } from "@/shared/errors/app-error";

export const runtime = "nodejs";

const backfillSchema = z.object({
  dryRun: z.boolean().optional(),
  limit: z.number().int().min(1).max(5000).optional(),
});

type BackfillResult = {
  matched: number;
  modified: number;
  remaining: number;
  sampleIds?: string[];
};

async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  try {
    const session = await auth();
    const hasAccess =
      session?.user?.isElevated ||
      session?.user?.permissions?.includes("settings.manage");
    if (!hasAccess) {
      throw authError("Unauthorized.");
    }

    const parsed = await parseJsonBody(req, backfillSchema, {
      logPrefix: "settings.migrate.backfill-keys.POST",
    });
    if (!parsed.ok) {
      return parsed.response;
    }

    if (!process.env.MONGODB_URI) {
      throw internalError("MongoDB is not configured.");
    }

    const limit = parsed.data.limit ?? 500;
    const filter: Filter<{ _id: string; key?: string | null }> = {
      $and: [
        { _id: { $type: "string" as const } },
        {
          $or: [
            { key: { $exists: false } },
            { key: null },
            { key: "" },
          ],
        },
      ],
    };

    const mongo = await getMongoDb();
    const collection = mongo.collection<{ _id: string; key?: string | null }>("settings");

    if (parsed.data.dryRun) {
      const total = await collection.countDocuments(filter);
      const sample = await collection
        .find(filter, { projection: { _id: 1 } })
        .limit(5)
        .toArray();
      return NextResponse.json({
        matched: total,
        modified: 0,
        remaining: total,
        sampleIds: sample.map((doc) => doc._id),
      } satisfies BackfillResult);
    }

    const docs = await collection
      .find(filter, { projection: { _id: 1 } })
      .limit(limit)
      .toArray();

    if (docs.length === 0) {
      return NextResponse.json({
        matched: 0,
        modified: 0,
        remaining: 0,
      } satisfies BackfillResult);
    }

    const result = await collection.bulkWrite(
      docs.map((doc) => ({
        updateOne: {
          filter: { _id: doc._id },
          update: { $set: { key: doc._id } },
        },
      })),
      { ordered: false }
    );

    const remaining = await collection.countDocuments(filter);

    return NextResponse.json({
      matched: docs.length,
      modified: result.modifiedCount ?? 0,
      remaining,
    } satisfies BackfillResult);
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "settings.migrate.backfill-keys.POST",
      fallbackMessage: "Failed to backfill settings keys",
    });
  }
}

export const POST = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => POST_handler(req, ctx),
  { source: "settings.migrate.backfill-keys.POST" }
);
