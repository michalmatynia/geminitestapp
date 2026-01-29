import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/shared/lib/db/prisma";
import { parseJsonBody } from "@/features/products/server";
import { getProductDataProvider } from "@/features/products/server";
import { getMongoDb } from "@/shared/lib/db/mongo-client";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import { badRequestError, conflictError, internalError, notFoundError } from "@/shared/errors/app-error";
import { apiHandlerWithParams } from "@/shared/lib/api/api-handler";
import type { ApiHandlerContext } from "@/shared/types/api";

const productParameterUpdateSchema = z.object({
  name_en: z.string().min(1).optional(),
  name_pl: z.string().optional().nullable(),
  name_de: z.string().optional().nullable(),
  catalogId: z.string().min(1).optional(),
});

/**
 * PUT /api/products/parameters/[id]
 * Updates a product parameter.
 */
async function PUT_handler(req: NextRequest,
  props: { params: Promise<{ id: string }> }
): Promise<Response> {
  const params = await props.params;
  try {
    if (!params.id) {
      throw badRequestError("Parameter id is required");
    }
    const provider = await getProductDataProvider();
    const parsed = await parseJsonBody(req, productParameterUpdateSchema, {
      logPrefix: "product-parameters.PUT",
      allowEmpty: true,
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
      const current = await db
        .collection("product_parameters")
        .findOne({ id: params.id });
      if (!current) {
        throw notFoundError("Parameter not found", { parameterId: params.id });
      }
      const nextCatalogId =
        catalogId ?? (current as { catalogId?: string }).catalogId;
      if (!nextCatalogId) {
        throw badRequestError("Catalog ID is required.");
      }
      if (name_en !== undefined) {
        const existing = await db.collection("product_parameters").findOne({
          name_en,
          catalogId: nextCatalogId,
          id: { $ne: params.id },
        });
        if (existing) {
          throw conflictError(
            "A parameter with this name already exists in this catalog",
            { name_en, catalogId: nextCatalogId }
          );
        }
      }

      const updateDoc = {
        ...(name_en !== undefined ? { name_en } : {}),
        ...(name_pl !== undefined ? { name_pl } : {}),
        ...(name_de !== undefined ? { name_de } : {}),
        ...(catalogId !== undefined ? { catalogId: nextCatalogId } : {}),
        updatedAt: new Date(),
      };

      await db
        .collection("product_parameters")
        .updateOne({ id: params.id }, { $set: updateDoc });
      const updated = await db
        .collection("product_parameters")
        .findOne({ id: params.id });
      return NextResponse.json(updated);
    }

    if (!process.env.DATABASE_URL) {
      throw badRequestError("Product parameters require the Postgres product store.");
    }

    const current = await prisma.productParameter.findUnique({
      where: { id: params.id },
      select: { catalogId: true },
    });
    if (!current) {
      throw notFoundError("Parameter not found", { parameterId: params.id });
    }
    const nextCatalogId = catalogId ?? current.catalogId;

    if (name_en !== undefined) {
      const existing = await prisma.productParameter.findFirst({
        where: {
          name_en,
          catalogId: nextCatalogId,
          NOT: { id: params.id },
        },
      });
      if (existing) {
        throw conflictError(
          "A parameter with this name already exists in this catalog",
          { name_en, catalogId: nextCatalogId }
        );
      }
    }

    const parameter = await prisma.productParameter.update({
      where: { id: params.id },
      data: {
        ...(name_en !== undefined && { name_en }),
        ...(name_pl !== undefined && { name_pl }),
        ...(name_de !== undefined && { name_de }),
        ...(catalogId !== undefined && { catalogId: nextCatalogId }),
      },
    });

    return NextResponse.json(parameter);
  } catch (error: unknown) {
    return createErrorResponse(error, {
      request: req,
      source: "products.parameters.[id].PUT",
      fallbackMessage: "Failed to update product parameter",
      extra: { parameterId: params.id },
    });
  }
}

/**
 * DELETE /api/products/parameters/[id]
 * Deletes a product parameter.
 */
async function DELETE_handler(req: NextRequest,
  props: { params: Promise<{ id: string }> }
): Promise<Response> {
  const params = await props.params;
  try {
    if (!params.id) {
      throw badRequestError("Parameter id is required");
    }
    const provider = await getProductDataProvider();
    if (provider === "mongodb") {
      if (!process.env.MONGODB_URI) {
        throw internalError("MongoDB is not configured.");
      }
      const db = await getMongoDb();
      await db.collection("product_parameters").deleteOne({ id: params.id });
      return NextResponse.json({ success: true });
    }

    if (!process.env.DATABASE_URL) {
      throw badRequestError("Product parameters require the Postgres product store.");
    }

    await prisma.productParameter.delete({ where: { id: params.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "products.parameters.[id].DELETE",
      fallbackMessage: "Failed to delete product parameter",
      extra: { parameterId: params.id },
    });
  }
}

export const PUT = apiHandlerWithParams<{ id: string }>(async (req: NextRequest, _ctx: ApiHandlerContext, params: { id: string }): Promise<Response> => PUT_handler(req, { params: Promise.resolve(params) }), { source: "products.parameters.[id].PUT" });
export const DELETE = apiHandlerWithParams<{ id: string }>(async (req: NextRequest, _ctx: ApiHandlerContext, params: { id: string }): Promise<Response> => DELETE_handler(req, { params: Promise.resolve(params) }), { source: "products.parameters.[id].DELETE" });
