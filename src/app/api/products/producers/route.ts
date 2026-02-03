export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import prisma from "@/shared/lib/db/prisma";
import { getMongoDb } from "@/shared/lib/db/mongo-client";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import { apiHandler } from "@/shared/lib/api/api-handler";
import type { ApiHandlerContext } from "@/shared/types/api";
import { parseJsonBody } from "@/features/products/server";
import { getProductDataProvider } from "@/features/products/server";
import { badRequestError, conflictError, internalError } from "@/shared/errors/app-error";

import type { Producer } from "@/features/products/types";

const producerCreateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  website: z.string().trim().nullable().optional(),
});

/**
 * GET /api/products/producers
 * Fetches all producers (flat list).
 */
async function GET_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  try {
    const provider = await getProductDataProvider();

    if (provider === "mongodb") {
      if (!process.env.MONGODB_URI) {
        throw internalError("MongoDB is not configured.");
      }
      const db = await getMongoDb();
      const docs = await db
        .collection("product_producers")
        .find({})
        .sort({ name: 1 })
        .toArray();
      const normalized = docs.map((doc: Record<string, unknown>) => {
        const { _id, ...rest } = doc as unknown as {
          _id?: { toString?: () => string };
        } & Record<string, unknown>;
        const fallbackId = _id?.toString ? _id.toString() : undefined;
        return {
          ...rest,
          id: (rest as { id?: string }).id ?? fallbackId,
        };
      });
      return NextResponse.json(normalized as Producer[]);
    }

    if (!process.env.DATABASE_URL) {
      throw badRequestError("Producers require the Postgres product store.");
    }

    const producers = await prisma.producer.findMany({
      orderBy: { name: "asc" },
    });
    return NextResponse.json(producers as unknown as Producer[]);
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "products.producers.GET",
      fallbackMessage: "Failed to fetch producers",
    });
  }
}

/**
 * POST /api/products/producers
 * Creates a new producer.
 */
async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  try {
    const provider = await getProductDataProvider();
    const parsed = await parseJsonBody(req, producerCreateSchema, {
      logPrefix: "producers.POST",
    });
    if (!parsed.ok) {
      return parsed.response;
    }

    const { name, website } = parsed.data;
    const trimmedName = name.trim();
    const trimmedWebsite =
      typeof website === "string" && website.trim() ? website.trim() : null;

    if (provider === "mongodb") {
      if (!process.env.MONGODB_URI) {
        throw internalError("MongoDB is not configured.");
      }
      const db = await getMongoDb();
      const existing = await db.collection("product_producers").findOne({
        name: trimmedName,
      });
      if (existing) {
        throw conflictError("A producer with this name already exists", {
          name: trimmedName,
        });
      }
      const now = new Date();
      const producer = {
        id: randomUUID(),
        name: trimmedName,
        website: trimmedWebsite,
        createdAt: now,
        updatedAt: now,
      };
      await db.collection("product_producers").insertOne(producer);
      return NextResponse.json(producer as unknown as Producer, { status: 201 });
    }

    if (!process.env.DATABASE_URL) {
      throw badRequestError("Producers require the Postgres product store.");
    }

    const existing = await prisma.producer.findFirst({
      where: { name: trimmedName },
      select: { id: true },
    });
    if (existing) {
      throw conflictError("A producer with this name already exists", {
        name: trimmedName,
        producerId: existing.id,
      });
    }

    const created = await prisma.producer.create({
      data: {
        name: trimmedName,
        website: trimmedWebsite,
      },
    });
    return NextResponse.json(created as unknown as Producer, { status: 201 });
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "products.producers.POST",
      fallbackMessage: "Failed to create producer",
    });
  }
}

export const GET = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => GET_handler(req, ctx),
  { source: "products.producers.GET" },
);

export const POST = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => POST_handler(req, ctx),
  { source: "products.producers.POST" },
);

