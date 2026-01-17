import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { getIntegrationRepository } from "@/lib/services/integration-repository";
import { decryptSecret } from "@/lib/utils/encryption";
import { callBaseApi, fetchBaseProducts } from "@/lib/services/imports/base-client";

const normalizeParameters = (value: unknown): Record<string, unknown> => {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return {};
  }
  return value as Record<string, unknown>;
};

/**
 * POST /api/integrations/[id]/connections/[connectionId]/base/request
 * Proxy Base.com API requests using the stored token.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string; connectionId: string }> }
) {
  const errorId = randomUUID();
  try {
    const { id, connectionId } = await params;
    let body: unknown;
    try {
      body = await req.json();
    } catch (error) {
      console.error("[base][request] Invalid JSON payload", {
        errorId,
        error,
      });
      return NextResponse.json(
        { error: "Invalid JSON payload.", errorId },
        { status: 400 }
      );
    }

    if (!body || typeof body !== "object") {
      return NextResponse.json(
        { error: "Invalid request body.", errorId },
        { status: 400 }
      );
    }

    const method =
      typeof (body as { method?: unknown }).method === "string"
        ? (body as { method: string }).method.trim()
        : "";
    if (!method) {
      return NextResponse.json(
        { error: "Base API method is required.", errorId },
        { status: 400 }
      );
    }

    const parameters = normalizeParameters(
      (body as { parameters?: unknown }).parameters
    );

    const repo = await getIntegrationRepository();
    const integration = await repo.getIntegrationById(id);
    if (!integration || integration.slug !== "baselinker") {
      return NextResponse.json(
        { error: "Base.com integration not found.", errorId },
        { status: 404 }
      );
    }

    const connection = await repo.getConnectionByIdAndIntegration(
      connectionId,
      id
    );
    if (!connection) {
      return NextResponse.json(
        { error: "Connection not found.", errorId },
        { status: 404 }
      );
    }

    let baseToken: string | null = null;
    if (connection.baseApiToken) {
      baseToken = decryptSecret(connection.baseApiToken);
    } else if (connection.password) {
      baseToken = decryptSecret(connection.password);
    }

    if (!baseToken) {
      return NextResponse.json(
        { error: "No Base API token configured.", errorId },
        { status: 400 }
      );
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
        return NextResponse.json(
          { error: "inventory_id is required.", errorId },
          { status: 400 }
        );
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
        return NextResponse.json(
          { error: "inventory_id is required.", errorId },
          { status: 400 }
        );
      }
      const productValue = parameters.product_id ?? parameters.id;
      const productId =
        typeof productValue === "string"
          ? productValue.trim()
          : typeof productValue === "number"
            ? String(productValue)
            : "";
      if (!productId) {
        return NextResponse.json(
          { error: "product_id is required.", errorId },
          { status: 400 }
        );
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
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[base][request] Failed to proxy request", {
      errorId,
      message,
    });
    return NextResponse.json(
      { error: message, errorId },
      { status: 500 }
    );
  }
}
