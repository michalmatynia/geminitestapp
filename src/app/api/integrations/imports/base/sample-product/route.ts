import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getIntegrationRepository } from "@/features/integrations/server";
import { decryptSecret } from "@/features/integrations/server";
import { callBaseApi } from "@/features/integrations/server";
import {
  getImportSampleInventoryId,
  getImportSampleProductId,
  setImportSampleInventoryId,
  setImportSampleProductId,
} from "@/features/integrations/server";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import { parseJsonBody } from "@/features/products/server";
import { badRequestError, notFoundError } from "@/shared/errors/app-error";
import { apiHandler } from "@/shared/lib/api/api-handler";
import type { ApiHandlerContext } from "@/shared/types/api";

const requestSchema = z.object({
  inventoryId: z.string().trim().optional().nullable(),
  productId: z.string().trim().min(1).optional(),
  saveOnly: z.boolean().optional(),
});

const toStringId = (value: unknown): string | null => {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return null;
};

const extractFirstProductId = (payload: unknown): string | null => {
  const products = (payload as { products?: unknown })?.products;
  if (Array.isArray(products)) {
    for (const entry of products) {
      if (entry && typeof entry === "object") {
        const record = entry as Record<string, unknown>;
        return (
          toStringId(record.product_id) ??
          toStringId(record.id) ??
          toStringId(record.base_product_id)
        );
      }
      const id = toStringId(entry);
      if (id) return id;
    }
    return null;
  }
  if (products && typeof products === "object") {
    const recordMap = products as Record<string, unknown>;
    for (const [key, value] of Object.entries(recordMap)) {
      if (value && typeof value === "object") {
        const record = value as Record<string, unknown>;
        const id =
          toStringId(record.product_id) ??
          toStringId(record.id) ??
          toStringId(record.base_product_id) ??
          toStringId(key);
        if (id) return id;
      } else {
        const id = toStringId(value) ?? toStringId(key);
        if (id) return id;
      }
    }
  }
  return null;
};

async function GET_handler(req: NextRequest): Promise<Response> {
  try {
    const productId = await getImportSampleProductId();
    const inventoryId = await getImportSampleInventoryId();
    return NextResponse.json({ productId, inventoryId });
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "products.imports.base.sample-product.GET",
      fallbackMessage: "Failed to fetch sample product.",
    });
  }
}

async function POST_handler(req: NextRequest): Promise<Response> {
  try {
    const parsed = await parseJsonBody(req, requestSchema, {
      logPrefix: "imports.base.sample-product.POST",
    });
    if (!parsed.ok) {
      return parsed.response;
    }
    const data = parsed.data;

    const inventoryId = data.inventoryId?.trim() ?? "";
    if (data.saveOnly) {
      if (inventoryId) {
        await setImportSampleInventoryId(inventoryId);
      } else {
        await setImportSampleInventoryId("");
      }
      if (data.productId) {
        await setImportSampleProductId(data.productId);
      }
      return NextResponse.json({
        productId: data.productId ?? null,
        inventoryId: inventoryId || null,
      });
    }

    if (!inventoryId) {
      throw badRequestError("Inventory ID is required.");
    }

    let productId = data.productId;
    if (!productId) {
      const integrationRepo = await getIntegrationRepository();
      const integrations = await integrationRepo.listIntegrations();
      const baseIntegration = integrations.find((i) => i.slug === "baselinker");
      if (!baseIntegration) {
        throw notFoundError("Base integration not found.");
      }
      const connections = await integrationRepo.listConnections(
        baseIntegration.id
      );
      const connection = connections.find((c) => c.baseApiToken);
      if (!connection?.baseApiToken) {
        throw badRequestError("No Base API token configured.");
      }
      const token = decryptSecret(connection.baseApiToken);
      const payload = await callBaseApi(token, "getInventoryProductsList", {
        inventory_id: inventoryId,
        limit: 1,
      });
      productId = extractFirstProductId(payload) ?? undefined;
      if (!productId) {
        throw notFoundError("No products found in inventory.");
      }
    }

    await setImportSampleProductId(productId);
    await setImportSampleInventoryId(inventoryId);
    return NextResponse.json({ productId, inventoryId });
  } catch (error: unknown) {
    return createErrorResponse(error, {
      request: req,
      source: "products.imports.base.sample-product.POST",
      fallbackMessage: "Failed to save sample product",
    });
  }
}

export const GET = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => GET_handler(req, ctx),
 { source: "products.imports.base.sample-product.GET" });
export const POST = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => POST_handler(req, ctx),
 { source: "products.imports.base.sample-product.POST" });
