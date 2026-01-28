import { NextResponse } from "next/server";
import { z } from "zod";
import { getIntegrationRepository } from "@/features/integrations/server";
import { decryptSecret } from "@/features/integrations/server";
import { callBaseApi, fetchBaseProducts } from "@/features/integrations/server";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import { parseJsonBody } from "@/features/products/server";
import { badRequestError, notFoundError } from "@/shared/errors/app-error";
import { apiHandlerWithParams } from "@/shared/lib/api/api-handler";

const normalizeParameters = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
};

const requestSchema = z
  .object({
    method: z.string().trim().min(1),
    parameters: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough();

/**
 * POST /api/integrations/[id]/connections/[connectionId]/base/request
 * Proxy Base.com API requests using the stored token.
 */
async function POST_handler(
  req: Request,
  { params }: { params: Promise<{ id: string; connectionId: string }> }
) {
  try {
    const { id, connectionId } = await params;
    if (!id || !connectionId) {
      throw badRequestError("Integration id and connection id are required");
    }
    const parsed = await parseJsonBody(req, requestSchema, {
      logPrefix: "integrations.base.request.POST",
    });
    if (!parsed.ok) {
      return parsed.response;
    }
    const { method } = parsed.data;
    const parameters = normalizeParameters(parsed.data.parameters);

    const repo = await getIntegrationRepository();
    const integration = await repo.getIntegrationById(id);
    if (!integration || integration.slug !== "baselinker") {
      throw notFoundError("Base.com integration not found.", { integrationId: id });
    }

    const connection = await repo.getConnectionByIdAndIntegration(
      connectionId,
      id
    );
    if (!connection) {
      throw notFoundError("Connection not found.", { connectionId });
    }

    let baseToken: string | null = null;
    if (connection.baseApiToken) {
      baseToken = decryptSecret(connection.baseApiToken);
    } else if (connection.password) {
      baseToken = decryptSecret(connection.password);
    }

    if (!baseToken) {
      throw badRequestError("No Base API token configured.");
    }

    const isOrdersLogRequest = method === "getOrdersLog";
    if (method === "getInventoryProductsDetailed") {
      const inventoryValue = parameters.inventory_id;
      const inventoryId =
        typeof inventoryValue === "string"
          ? inventoryValue.trim()
        : typeof inventoryValue === "number"
          ? String(inventoryValue)
          : "";
      if (!inventoryId || inventoryId === "0") {
        throw badRequestError("inventory_id is required.");
      }
      const limitRaw = parameters.limit;
      const limit =
        typeof limitRaw === "number" && Number.isFinite(limitRaw)
          ? limitRaw
          : typeof limitRaw === "string"
            ? Number(limitRaw)
            : undefined;
      const products = await fetchBaseProducts(baseToken, inventoryId, limit);
      return NextResponse.json({
        data: { products, count: products.length, inventoryId },
      });
    }

    if (method === "getInventoryProductDetailed") {
      const inventoryValue = parameters.inventory_id;
      const inventoryId =
        typeof inventoryValue === "string"
          ? inventoryValue.trim()
          : typeof inventoryValue === "number"
            ? String(inventoryValue)
            : "";
      if (!inventoryId || inventoryId === "0") {
        throw badRequestError("inventory_id is required.");
      }
      const productValue = parameters.product_id ?? parameters.id;
      const productId =
        typeof productValue === "string"
          ? productValue.trim()
          : typeof productValue === "number"
            ? String(productValue)
            : "";
      if (!productId) {
        throw badRequestError("product_id is required.");
      }
      const payload = await callBaseApi(baseToken, "getInventoryProductsData", {
        inventory_id: inventoryId,
        products: [productId],
      });
      const rawProducts = (payload as { products?: unknown }).products;
      let product: unknown = null;
      if (Array.isArray(rawProducts)) {
        product =
          rawProducts.find((entry) => {
            if (!entry || typeof entry !== "object") return false;
            const record = entry as Record<string, unknown>;
            return (
              record.product_id === productId ||
              record.id === productId ||
              record.base_product_id === productId
            );
          }) ?? rawProducts[0];
      } else if (rawProducts && typeof rawProducts === "object") {
        const recordMap = rawProducts as Record<string, unknown>;
        product =
          recordMap[productId] ??
          recordMap[Number(productId) as unknown as keyof typeof recordMap] ??
          Object.values(recordMap)[0] ??
          null;
      }
      return NextResponse.json({
        data: {
          product: product ?? null,
          inventoryId,
          productId,
        },
      });
    }

    const methodCandidates = isOrdersLogRequest
      ? ["getOrdersLog", "getOrdersLogs", "getOrdersHistory", "getOrdersChanges"]
      : [method];
    let payload: unknown;
    let lastError: Error | null = null;
    let sawUnknownMethod = false;
    for (const candidate of methodCandidates) {
      try {
        payload = await callBaseApi(baseToken, candidate, parameters);
        lastError = null;
        break;
      } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        if (message.toLowerCase().includes("unknown method")) {
          sawUnknownMethod = true;
          lastError = error instanceof Error ? error : new Error(message);
          continue;
        }
        throw error;
      }
    }
    if (!payload && isOrdersLogRequest && sawUnknownMethod) {
      payload = await callBaseApi(baseToken, "getOrders", parameters);
    }
    if (!payload) {
      throw lastError ?? new Error("Base API request failed.");
    }

    return NextResponse.json({ data: payload });
  } catch (error: unknown) {
    const message =
      error instanceof Error ? error.message : "Failed to proxy request";
    return createErrorResponse(error, {
      request: req,
      source: "integrations.[id].connections.[connectionId].base.request.POST",
      fallbackMessage: message,
    });
  }
}

export const POST = apiHandlerWithParams<{ id: string; connectionId: string }>(async (req, _ctx, params) => POST_handler(req, { params: Promise.resolve(params) }), { source: "integrations.[id].connections.[connectionId].base.request.POST" });
