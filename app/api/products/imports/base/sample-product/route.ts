import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import { getIntegrationRepository } from "@/lib/services/integration-repository";
import { decryptSecret } from "@/lib/utils/encryption";
import { callBaseApi } from "@/lib/services/imports/base-client";
import {
  getImportSampleInventoryId,
  getImportSampleProductId,
  setImportSampleInventoryId,
  setImportSampleProductId,
} from "@/lib/services/import-template-repository";

const requestSchema = z.object({
  inventoryId: z.string().trim().min(1),
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

export async function GET() {
  try {
    const productId = await getImportSampleProductId();
    const inventoryId = await getImportSampleInventoryId();
    return NextResponse.json({ productId, inventoryId });
  } catch (error) {
    const errorId = randomUUID();
    console.error("[base-import-sample][GET] Failed to fetch sample product", {
      errorId,
      error,
    });
    return NextResponse.json(
      { error: "Failed to fetch sample product.", errorId },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const errorId = randomUUID();
  try {
    const body = await req.json();
    const data = requestSchema.parse(body);

    if (data.saveOnly) {
      await setImportSampleInventoryId(data.inventoryId);
      if (data.productId) {
        await setImportSampleProductId(data.productId);
      }
      return NextResponse.json({
        productId: data.productId ?? null,
        inventoryId: data.inventoryId,
      });
    }

    let productId = data.productId;
    if (!productId) {
      const integrationRepo = await getIntegrationRepository();
      const integrations = await integrationRepo.listIntegrations();
      const baseIntegration = integrations.find((i) => i.slug === "baselinker");
      if (!baseIntegration) {
        return NextResponse.json(
          { error: "Base integration not found.", errorId },
          { status: 404 }
        );
      }
      const connections = await integrationRepo.listConnections(
        baseIntegration.id
      );
      const connection = connections.find((c) => c.baseApiToken);
      if (!connection?.baseApiToken) {
        return NextResponse.json(
          { error: "No Base API token configured.", errorId },
          { status: 400 }
        );
      }
      const token = decryptSecret(connection.baseApiToken);
      const payload = await callBaseApi(token, "getInventoryProductsList", {
        inventory_id: data.inventoryId,
        limit: 1,
      });
      productId = extractFirstProductId(payload) ?? undefined;
      if (!productId) {
        return NextResponse.json(
          { error: "No products found in inventory.", errorId },
          { status: 404 }
        );
      }
    }

    await setImportSampleProductId(productId);
    await setImportSampleInventoryId(data.inventoryId);
    return NextResponse.json({ productId, inventoryId: data.inventoryId });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[base-import-sample][POST] Failed to save sample product", {
      errorId,
      message,
    });
    return NextResponse.json(
      { error: message, errorId },
      { status: 500 }
    );
  }
}
