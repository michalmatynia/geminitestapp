export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { getMongoDb } from "@/shared/lib/db/mongo-client";
import { configurationError, notFoundError } from "@/shared/errors/app-error";
import { apiHandler } from "@/shared/lib/api/api-handler";
import type { ApiHandlerContext } from "@/shared/types/api";

async function POST_handler(
  req: NextRequest,
  _ctx: ApiHandlerContext,
): Promise<Response> {
  const data = (await req.json()) as Record<string, unknown>;
  if (!process.env.MONGODB_URI) {
    // If no MongoDB, we just skip this part or return success if we don't want to block
    return NextResponse.json({
      success: true,
      message: "MongoDB not configured, skipping.",
    });
  }

  const mongo = await getMongoDb();
  const collection = mongo.collection("ai_configurations");

  const result = await collection.updateOne(
    { type: "description_config" },
    {
      $set: {
        ...data,
        updatedAt: new Date(),
      },
    },
    { upsert: true },
  );

  return NextResponse.json({ success: true, id: result.upsertedId });
}

async function GET_handler(
  req: NextRequest,
  _ctx: ApiHandlerContext,
): Promise<Response> {
  if (!process.env.MONGODB_URI) {
    throw configurationError("MongoDB not configured");
  }
  const mongo = await getMongoDb();
  const config = await mongo
    .collection("ai_configurations")
    .findOne({ type: "description_config" });
  if (!config) {
    throw notFoundError("AI configuration not found");
  }
  return NextResponse.json(config);
}

export const GET = apiHandler(
  async (_req: NextRequest, ctx: ApiHandlerContext): Promise<Response> =>
    GET_handler(_req, ctx),
  { source: "ai-config.GET" },
);
export const POST = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> =>
    POST_handler(req, ctx),
  { source: "ai-config.POST" },
);
