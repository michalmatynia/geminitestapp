import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import prisma from "@/shared/lib/db/prisma";
import { parseJsonBody } from "@/features/products/server";
import { getProductDataProvider } from "@/features/products/server";
import { getMongoDb } from "@/shared/lib/db/mongo-client";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import { badRequestError, conflictError, internalError } from "@/shared/errors/app-error";
import { apiHandler } from "@/shared/lib/api/api-handler";
import type { ApiHandlerContext } from "@/shared/types/api";
import type { ProductParameter } from "@/features/products/types";

const productParameterCreateSchema = z.object({
  name_en: z.string().min(1, "English name is required"),
  name_pl: z.string().optional().nullable(),
  name_de: z.string().optional().nullable(),
  catalogId: z.string().min(1, "Catalog ID is required"),
});

/**
 * GET /api/products/parameters
 * Fetches all product parameters (flat list).
 * Query params:
 * - catalogId: Filter by catalog (required)
 */
async function GET_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  try {
    const { searchParams } = new URL(req.url);
    const catalogId = searchParams.get("catalogId");

    if (!catalogId) {
      throw badRequestError("catalogId query parameter is required");
    }

    const provider = await getProductDataProvider();

    if (provider === "mongodb") {
      if (!process.env.MONGODB_URI) {
        throw internalError("MongoDB is not configured.");
      }
      const db = await getMongoDb();
      const parameters = await db
        .collection("product_parameters")
        .find({ catalogId })
        .sort({ name_en: 1 })
        .toArray();
      const normalized = parameters.map((param: Record<string, unknown>) => {
        const { _id, ...rest } = param as unknown as {
          _id?: { toString?: () => string };
        } & Record<string, unknown>;
        const fallbackId = _id?.toString ? _id.toString() : undefined;
        return {
          ...rest,
          id: (rest as { id?: string }).id ?? fallbackId,
        };
      });
      return NextResponse.json(normalized as ProductParameter[]);
    }

    if (!process.env.DATABASE_URL) {
      throw badRequestError("Product parameters require the Postgres product store.");
    }

    const parameters = await prisma.productParameter.findMany({
      where: { catalogId },
      orderBy: { name_en: "asc" },
    });
    return NextResponse.json(parameters as ProductParameter[]);
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "products.parameters.GET",
      fallbackMessage: "Failed to fetch product parameters",
    });
  }
}

/**
 * POST /api/products/parameters
 * Creates a new product parameter.
 */
async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  try {
    const provider = await getProductDataProvider();
    const parsed = await parseJsonBody(req, productParameterCreateSchema, {
      logPrefix: "product-parameters.POST",
    });
    if (!parsed.ok) {
      return parsed.response;
    }

    const { name_en, name_pl, name_de, catalogId } = parsed.data;

    if (provider === "mongodb") {
      if (!process.env.MONGODB_URI) {
        throw internalError("MongoDB is not configured.");
      }
      const db = await getMongoDb();
      const existing = await db.collection("product_parameters").findOne({
        name_en,
        catalogId,
      });
      if (existing) {
        throw conflictError(
          "A parameter with this name already exists in this catalog",
          { name_en, catalogId }
        );
      }
      const now = new Date();
      const parameter = {
        id: randomUUID(),
        name_en,
        name_pl: name_pl ?? null,
        name_de: name_de ?? null,
        catalogId,
        createdAt: now,
        updatedAt: now,
      };
      await db.collection("product_parameters").insertOne(parameter);
      return NextResponse.json(parameter as ProductParameter, { status: 201 });
    }

    if (!process.env.DATABASE_URL) {
      throw badRequestError("Product parameters require the Postgres product store.");
    }

    const existing = await prisma.productParameter.findFirst({
      where: { name_en, catalogId },
    });
    if (existing) {
      throw conflictError(
        "A parameter with this name already exists in this catalog",
        { name_en, catalogId }
      );
    }

    const parameter = await prisma.productParameter.create({
      data: {
        name_en,
        name_pl: name_pl ?? null,
        name_de: name_de ?? null,
        catalogId,
      },
    });

    return NextResponse.json(parameter as ProductParameter, { status: 201 });
  } catch (error: unknown) {
    return createErrorResponse(error, {
      request: req,
      source: "products.parameters.POST",
      fallbackMessage: "Failed to create product parameter",
    });
  }
}

export const GET = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => GET_handler(req, ctx),
 { source: "products.parameters.GET" });
export const POST = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => POST_handler(req, ctx),
 { source: "products.parameters.POST" });
