import { NextRequest, NextResponse } from "next/server";
import { getMongoDb } from "@/shared/lib/db/mongo-client";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import { configurationError, notFoundError } from "@/shared/errors/app-error";
import { apiHandler } from "@/shared/lib/api/api-handler";

async function POST_handler(req: NextRequest) {
  try {
    const data = (await req.json()) as Record<string, unknown>;
    if (!process.env.MONGODB_URI) {
      // If no MongoDB, we just skip this part or return success if we don't want to block
      return NextResponse.json({ success: true, message: "MongoDB not configured, skipping." });
    }

    const mongo = await getMongoDb();
    const collection = mongo.collection("ai_configurations");

    const result = await collection.updateOne(
      { type: "description_config" },
      {
        $set: {
          ...data,
          updatedAt: new Date()
        }
      },
      { upsert: true }
    );

    return NextResponse.json({ success: true, id: result.upsertedId });
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "ai-config.POST",
      fallbackMessage: "Failed to save AI configuration",
    });
  }
}

async function GET_handler(req: NextRequest) {
  try {
    if (!process.env.MONGODB_URI) {
      throw configurationError("MongoDB not configured");
    }
    const mongo = await getMongoDb();
    const config = await mongo.collection("ai_configurations").findOne({ type: "description_config" });
    if (!config) {
      throw notFoundError("AI configuration not found");
    }
    return NextResponse.json(config);
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "ai-config.GET",
      fallbackMessage: "Failed to fetch AI configuration",
    });
  }
}

export const POST = apiHandler(POST_handler, { source: "ai-config.POST" });
export const GET = apiHandler(GET_handler, { source: "ai-config.GET" });
