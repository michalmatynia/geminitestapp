export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/shared/lib/db/prisma";
import { getMongoDb } from "@/shared/lib/db/mongo-client";
import { apiHandlerWithParams } from "@/shared/lib/api/api-handler";
import type { ApiHandlerContext } from "@/shared/types/api";
import { parseJsonBody } from "@/features/products/server";
import { getProductDataProvider } from "@/features/products/server";
import { badRequestError, conflictError, internalError, notFoundError } from "@/shared/errors/app-error";

import type { Producer } from "@/features/products/types";

const producerUpdateSchema = z.object({
  name: z.string().min(1).optional(),
  website: z.string().trim().nullable().optional(),
});

async function PUT_handler(
  req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { id: string },
): Promise<Response> {
  const id = params.id;
  if (!id) throw badRequestError("Producer id is required");

  const provider = await getProductDataProvider();
  const parsed = await parseJsonBody(req, producerUpdateSchema, {
    logPrefix: "producers.PUT",
  });
  if (!parsed.ok) return parsed.response;

  const name =
    typeof parsed.data.name === "string" ? parsed.data.name.trim() : undefined;
  const website =
    typeof parsed.data.website === "string" && parsed.data.website.trim()
      ? parsed.data.website.trim()
      : parsed.data.website === null
        ? null
        : undefined;

  if (provider === "mongodb") {
    if (!process.env["MONGODB_URI"]) {
      throw internalError("MongoDB is not configured.");
    }
    const db = await getMongoDb();
    if (name) {
      const existing = await db.collection("product_producers").findOne({
        name,
        id: { $ne: id },
      });
      if (existing) {
        throw conflictError("A producer with this name already exists", {
          name,
        });
      }
    }
    const update: Record<string, unknown> = { updatedAt: new Date() };
    if (name !== undefined) update['name'] = name;
    if (website !== undefined) update['website'] = website;

    const res = await db.collection("product_producers").findOneAndUpdate(
      { id },
      { $set: update },
      { returnDocument: "after" },
    );
    const doc = res?.['value'] as Record<string, unknown> | null;
    if (!doc) throw notFoundError("Producer not found", { producerId: id });
    return NextResponse.json(doc as unknown as Producer);
  }

  if (!process.env["DATABASE_URL"]) {
    throw badRequestError("Producers require the Postgres product store.");
  }

  if (name) {
    const existing = await prisma.producer.findFirst({
      where: { name, NOT: { id } },
      select: { id: true },
    });
    if (existing) {
      throw conflictError("A producer with this name already exists", {
        name,
        producerId: existing.id,
      });
    }
  }

  const updated = await prisma.producer.update({
    where: { id },
    data: {
      ...(name !== undefined ? { name } : {}),
      ...(website !== undefined ? { website } : {}),
    },
  });
  return NextResponse.json(updated as unknown as Producer);
}

async function DELETE_handler(
  _req: NextRequest,
  _ctx: ApiHandlerContext,
  params: { id: string },
): Promise<Response> {
  const id = params.id;
  if (!id) throw badRequestError("Producer id is required");

  const provider = await getProductDataProvider();

  if (provider === "mongodb") {
    if (!process.env["MONGODB_URI"]) {
      throw internalError("MongoDB is not configured.");
    }
    const db = await getMongoDb();
    const res = await db.collection("product_producers").deleteOne({ id });
    if (!res.deletedCount) {
      throw notFoundError("Producer not found", { producerId: id });
    }
    return new Response(null, { status: 204 });
  }

  if (!process.env["DATABASE_URL"]) {
    throw badRequestError("Producers require the Postgres product store.");
  }
  await prisma.producer.delete({ where: { id } });
  return new Response(null, { status: 204 });
}

export const PUT = apiHandlerWithParams<{ id: string }>(PUT_handler, {
  source: "products.producers.[id].PUT",
});

export const DELETE = apiHandlerWithParams<{ id: string }>(DELETE_handler, {
  source: "products.producers.[id].DELETE",
});
