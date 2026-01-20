type BaseApiResponse = {
  status?: string;
  error_code?: string;
  error_message?: string;
  [key: string]: unknown;
};

export type BaseInventory = {
  id: string;
  name: string;
};

export type BaseProductRecord = Record<string, unknown>;

const DEFAULT_BASE_API_URL = "https://api.baselinker.com/connector.php";

const buildBaseApiUrl = () => {
  const raw = process.env.BASE_API_URL || DEFAULT_BASE_API_URL;
  if (raw.includes("connector.php")) return raw;
  return `${raw.replace(/\/$/, "")}/connector.php`;
};

const toArray = (value: unknown): unknown[] => {
  if (Array.isArray(value)) return value;
  if (value && typeof value === "object") {
    return Object.values(value as Record<string, unknown>);
  }
  return [];
};

const toStringId = (value: unknown): string | null => {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }
  return null;
};

const extractInventoryList = (payload: BaseApiResponse): BaseInventory[] => {
  const candidates = [
    payload.inventories,
    payload.inventory,
    payload.storages,
    payload.storage,
    (payload.data as Record<string, unknown> | undefined)?.inventories,
    (payload.data as Record<string, unknown> | undefined)?.storages,
  ];
  const raw = candidates.map(toArray).find((list) => list.length > 0) ?? [];
  return raw
    .map((entry) => {
      if (!entry || typeof entry !== "object") return null;
      const record = entry as Record<string, unknown>;
      const id =
        toStringId(record.inventory_id) ??
        toStringId(record.storage_id) ??
        toStringId(record.id);
      if (!id) return null;
      const name =
        (typeof record.name === "string" && record.name.trim()) ||
        (typeof record.label === "string" && record.label.trim()) ||
        id;
      return { id, name };
    })
    .filter(Boolean) as BaseInventory[];
};

const extractProductIds = (payload: BaseApiResponse): string[] => {
  const rawProducts =
    payload.products ??
    payload.items ??
    (payload.data as Record<string, unknown> | undefined)?.products ??
    (payload.data as Record<string, unknown> | undefined)?.items;
  const ids = new Set<string>();
  if (Array.isArray(rawProducts)) {
    for (const entry of rawProducts) {
      if (entry && typeof entry === "object") {
        const record = entry as Record<string, unknown>;
        const id =
          toStringId(record.product_id) ??
          toStringId(record.id) ??
          toStringId(record.base_product_id);
        if (id) ids.add(id);
      } else {
        const id = toStringId(entry);
        if (id) ids.add(id);
      }
    }
  } else if (rawProducts && typeof rawProducts === "object") {
    for (const [key, value] of Object.entries(
      rawProducts as Record<string, unknown>
    )) {
      const record = value && typeof value === "object" ? value : null;
      const id =
        (record as Record<string, unknown> | null)?.product_id ??
        (record as Record<string, unknown> | null)?.id ??
        (record as Record<string, unknown> | null)?.base_product_id ??
        key;
      const resolved = toStringId(id);
      if (resolved) ids.add(resolved);
    }
  }
  return Array.from(ids);
};

const extractProducts = (payload: BaseApiResponse): BaseProductRecord[] => {
  const rawProducts =
    payload.products ??
    payload.items ??
    (payload.data as Record<string, unknown> | undefined)?.products ??
    (payload.data as Record<string, unknown> | undefined)?.items;

  if (Array.isArray(rawProducts)) {
    return rawProducts.map((entry) => {
      if (entry && typeof entry === "object") {
        return { ...(entry as Record<string, unknown>) };
      }
      const id = toStringId(entry);
      return id ? { id } : {};
    });
  }

  if (rawProducts && typeof rawProducts === "object") {
    return Object.entries(rawProducts as Record<string, unknown>).map(
      ([key, value]) => {
        if (value && typeof value === "object") {
          const record = value as Record<string, unknown>;
          return {
            product_id: record.product_id ?? key,
            id: record.id ?? key,
            ...record,
          };
        }
        const id = toStringId(value) ?? key;
        return id ? { id } : {};
      }
    );
  }

  return [];
};

const hasProductDetails = (product: BaseProductRecord) => {
  const keys = Object.keys(product);
  const idKeys = new Set(["id", "product_id", "base_product_id"]);
  return keys.some((key) => !idKeys.has(key));
};

export async function callBaseApi(
  token: string,
  method: string,
  parameters: Record<string, unknown> = {}
): Promise<BaseApiResponse> {
  const endpoint = buildBaseApiUrl();
  const body = new URLSearchParams({
    token,
    method,
    parameters: JSON.stringify(parameters),
  });
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!response.ok) {
    throw new Error(`Base API request failed (${response.status}).`);
  }
  const payload = (await response.json()) as BaseApiResponse;
  if (payload.status === "ERROR") {
    const message =
      (typeof payload.error_message === "string" && payload.error_message) ||
      (typeof payload.error_code === "string" && payload.error_code) ||
      "Base API error.";
    throw new Error(message);
  }
  return payload;
}

export async function fetchBaseInventories(token: string) {
  const methods = ["getInventories", "getInventory", "getInventoryList"];
  let lastError: Error | null = null;
  for (const method of methods) {
    try {
      const payload = await callBaseApi(token, method);
      const inventories = extractInventoryList(payload);
      if (inventories.length > 0) {
        return inventories;
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Base API error.");
    }
  }
  if (lastError) {
    throw lastError;
  }
  return [];
}

export async function fetchBaseProductIds(token: string, inventoryId: string) {
  const candidates = [
    {
      method: "getInventoryProductsList",
      paramKey: "inventory_id",
    },
    {
      method: "getProductsList",
      paramKey: "storage_id",
    },
  ];

  for (const candidate of candidates) {
    try {
      const payload = await callBaseApi(token, candidate.method, {
        [candidate.paramKey]: inventoryId,
      });
      const ids = extractProductIds(payload);
      if (ids.length > 0) return ids;
    } catch {
      // Continue to next candidate
    }
  }
  return [];
}

export async function fetchBaseProductDetails(
  token: string,
  inventoryId: string,
  productIds: string[]
) {
  const candidates = [
    {
      method: "getInventoryProductsData",
      paramKey: "inventory_id",
    },
    {
      method: "getProductsData",
      paramKey: "storage_id",
    },
  ];

  for (const candidate of candidates) {
    try {
      const payload = await callBaseApi(token, candidate.method, {
        [candidate.paramKey]: inventoryId,
        products: productIds,
      });
      const products = extractProducts(payload);
      if (products.length > 0) return products;
    } catch {
      // Continue
    }
  }
  return [];
}

export async function fetchBaseProducts(
  token: string,
  inventoryId: string,
  limit?: number
) {
  const ids = await fetchBaseProductIds(token, inventoryId);
  const targetIds =
    typeof limit === "number" && limit > 0 ? ids.slice(0, limit) : ids;

  if (targetIds.length === 0) return [];

  return fetchBaseProductDetails(token, inventoryId, targetIds);
}

/**
 * Check if a SKU already exists in a Base.com inventory
 * Returns the product ID if found, null otherwise
 */
export async function checkBaseSkuExists(
  token: string,
  inventoryId: string,
  sku: string
): Promise<{ exists: boolean; productId?: string }> {
  try {
    // Use getInventoryProductsData with filter parameter if available
    // Otherwise fetch all and filter locally
    const candidates = [
      {
        method: "getInventoryProductsList",
        paramKey: "inventory_id",
      },
      {
        method: "getProductsList",
        paramKey: "storage_id",
      },
    ];

    for (const candidate of candidates) {
      try {
        // Try with filter first (some API versions support this)
        const payload = await callBaseApi(token, candidate.method, {
          [candidate.paramKey]: inventoryId,
          filter_sku: sku,
        });
        const ids = extractProductIds(payload);
        if (ids.length > 0) {
          // Verify by fetching details
          const details = await fetchBaseProductDetails(token, inventoryId, ids);
          const match = details.find((p) => {
            const pSku = p.sku ?? p.SKU ?? p.Sku;
            return typeof pSku === "string" && pSku.toLowerCase() === sku.toLowerCase();
          });
          if (match) {
            const productId = toStringId(match.product_id ?? match.id);
            return productId ? { exists: true, productId } : { exists: true };
          }
        }
      } catch {
        // Filter might not be supported, continue
      }
    }

    // Fallback: Fetch all products and check SKU locally (expensive but reliable)
    const allIds = await fetchBaseProductIds(token, inventoryId);
    if (allIds.length === 0) return { exists: false };

    // Fetch in batches to avoid timeout
    const batchSize = 100;
    for (let i = 0; i < allIds.length; i += batchSize) {
      const batch = allIds.slice(i, i + batchSize);
      const products = await fetchBaseProductDetails(token, inventoryId, batch);
      const match = products.find((p) => {
        const pSku = p.sku ?? p.SKU ?? p.Sku;
        return typeof pSku === "string" && pSku.toLowerCase() === sku.toLowerCase();
      });
      if (match) {
        const productId = toStringId(match.product_id ?? match.id);
        return productId ? { exists: true, productId } : { exists: true };
      }
    }

    return { exists: false };
  } catch (error) {
    console.error("[base-client] Error checking SKU existence:", error);
    // On error, assume SKU doesn't exist to avoid blocking export
    return { exists: false };
  }
}
