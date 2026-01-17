import { NextResponse } from "next/server";
import { randomUUID } from "crypto";
import { z } from "zod";
import { getIntegrationRepository } from "@/lib/services/integration-repository";
import { decryptSecret } from "@/lib/utils/encryption";
import { callBaseApi } from "@/lib/services/imports/base-client";

const requestSchema = z.object({
  inventoryId: z.string().trim().min(1),
  productId: z.string().trim().min(1),
});

const extractProductRecord = (payload: unknown, productId: string) => {
  const products = (payload as { products?: unknown })?.products;
  if (Array.isArray(products)) {
    return (
      products.find((entry) => {
        if (!entry || typeof entry !== "object") return false;
        const record = entry as Record<string, unknown>;
        return (
          record.product_id === productId ||
          record.id === productId ||
          record.base_product_id === productId
        );
      }) ?? products[0]
    );
  }
  if (products && typeof products === "object") {
    const recordMap = products as Record<string, unknown>;
    return (
      recordMap[productId] ??
      recordMap[Number(productId) as unknown as keyof typeof recordMap] ??
      Object.values(recordMap)[0]
    );
  }
  return null;
};

const collectKeysFromObject = (value: unknown, keys: Set<string>) => {
  if (!value || typeof value !== "object") return;
  if (Array.isArray(value)) {
    value.forEach((entry) => collectKeysFromObject(entry, keys));
    return;
  }
  Object.keys(value as Record<string, unknown>).forEach((key) => {
    if (key) keys.add(key);
  });
};

const collectPrefixedKeys = (
  value: unknown,
  prefix: string,
  keys: Set<string>,
  depth: number,
  maxDepth: number
) => {
  if (!value || typeof value !== "object") return;
  if (depth > maxDepth) return;
  if (Array.isArray(value)) {
    value.forEach((entry, index) => {
      const nextPrefix = `${prefix}.${index}`;
      keys.add(nextPrefix);
      collectPrefixedKeys(entry, nextPrefix, keys, depth + 1, maxDepth);
    });
    return;
  }
  Object.entries(value as Record<string, unknown>).forEach(([key, entry]) => {
    const nextPrefix = `${prefix}.${key}`;
    keys.add(nextPrefix);
    collectPrefixedKeys(entry, nextPrefix, keys, depth + 1, maxDepth);
  });
};

const collectParameterKeys = (product: Record<string, unknown>) => {
  const keys = new Set<string>();
  const parameterBuckets = [
    product.parameters,
    product.params,
    product.attributes,
    product.features,
    product.text_fields,
    (product.text_fields as Record<string, unknown> | undefined)?.features,
    (product.text_fields as Record<string, unknown> | undefined)?.["features|en"],
  ];
  for (const bucket of parameterBuckets) {
    if (!bucket) continue;
    if (Array.isArray(bucket)) {
      for (const entry of bucket) {
        if (!entry || typeof entry !== "object") continue;
        const record = entry as Record<string, unknown>;
        const name =
          record.name ??
          record.parameter ??
          record.code ??
          record.label ??
          record.title;
        const id =
          record.id ??
          record.parameter_id ??
          record.param_id ??
          record.attribute_id;
        if (typeof name === "string" && name.trim()) {
          keys.add(name.trim());
        }
        if (typeof id === "string" && id.trim()) {
          keys.add(id.trim());
        }
      }
      continue;
    }
    if (typeof bucket === "object") {
      collectKeysFromObject(bucket, keys);
    }
  }

  if (product.text_fields) {
    collectPrefixedKeys(product.text_fields, "text_fields", keys, 0, 2);
  }
  if (product.images) {
    collectPrefixedKeys(product.images, "images", keys, 0, 1);
  }
  if (product.links) {
    collectPrefixedKeys(product.links, "links", keys, 0, 2);
  }
  if (product.prices) {
    collectPrefixedKeys(product.prices, "prices", keys, 0, 1);
  }
  if (product.stock) {
    collectPrefixedKeys(product.stock, "stock", keys, 0, 1);
  }
  if (product.locations) {
    collectPrefixedKeys(product.locations, "locations", keys, 0, 1);
  }
  return Array.from(keys).sort((a, b) => a.localeCompare(b));
};

export async function POST(req: Request) {
  const errorId = randomUUID();
  try {
    const body = await req.json();
    const data = requestSchema.parse(body);

    const integrationRepo = await getIntegrationRepository();
    const integrations = await integrationRepo.listIntegrations();
    const baseIntegration = integrations.find((i) => i.slug === "baselinker");
    if (!baseIntegration) {
      return NextResponse.json(
        { error: "Base integration not found.", errorId },
        { status: 404 }
      );
    }

    const connections = await integrationRepo.listConnections(baseIntegration.id);
    const connection = connections.find((c) => c.baseApiToken);
    if (!connection?.baseApiToken) {
      return NextResponse.json(
        { error: "No Base API token configured.", errorId },
        { status: 400 }
      );
    }

    const token = decryptSecret(connection.baseApiToken);
    const payload = await callBaseApi(token, "getInventoryProductsData", {
      inventory_id: data.inventoryId,
      products: [data.productId],
    });
    const product = extractProductRecord(payload, data.productId);
    if (!product || typeof product !== "object") {
      return NextResponse.json(
        { error: "Product not found in response.", errorId },
        { status: 404 }
      );
    }
    const keys = collectParameterKeys(product as Record<string, unknown>);
    return NextResponse.json({ keys });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[base-import-parameters] Failed to load keys", {
      errorId,
      message,
    });
    return NextResponse.json(
      { error: message, errorId },
      { status: 500 }
    );
  }
}
