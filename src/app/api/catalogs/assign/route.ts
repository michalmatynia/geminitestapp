import { NextResponse } from "next/server";
import { z } from "zod";
import { getCatalogRepository } from "@/lib/services/catalog-repository";
import { getProductRepository } from "@/features/products/services/product-repository";
import { createErrorResponse } from "@/lib/api/handle-api-error";
import { parseJsonBody } from "@/features/products/api/parse-json";
import { badRequestError } from "@/lib/errors/app-error";
import { apiHandler } from "@/lib/api/api-handler";

const assignSchema = z.object({
  productIds: z.array(z.string().trim().min(1)).min(1),
  catalogIds: z.array(z.string().trim().min(1)).min(1),
  mode: z.enum(["add", "replace", "remove"]).optional(),
});

/**
 * POST /api/catalogs/assign
 * Bulk assigns catalogs to products.
 */
async function POST_handler(req: Request) {
  try {
    const parsed = await parseJsonBody(req, assignSchema, {
      logPrefix: "catalogs.ASSIGN",
    });
    if (!parsed.ok) {
      return parsed.response;
    }
    const data = parsed.data;
    const mode = data.mode ?? "add";

    const uniqueCatalogIds = Array.from(new Set(data.catalogIds));
    const catalogRepository = await getCatalogRepository();
    const existingCatalogs =
      await catalogRepository.getCatalogsByIds(uniqueCatalogIds);
    const existingIds = new Set(existingCatalogs.map((entry) => entry.id));
    const validCatalogIds = uniqueCatalogIds.filter((id) => existingIds.has(id));
    if (validCatalogIds.length === 0) {
      throw badRequestError("No valid catalogs found.", {
        catalogIds: uniqueCatalogIds,
      });
    }

    const uniqueProductIds = Array.from(new Set(data.productIds));
    const productRepository = await getProductRepository();

    for (const productId of uniqueProductIds) {
      const product = await productRepository.getProductById(productId);
      if (!product) {
        continue;
      }
      const existingCatalogIds = product.catalogs.map(
        (entry) => entry.catalogId
      );
      let nextCatalogIds = existingCatalogIds;
      if (mode === "replace") {
        nextCatalogIds = validCatalogIds;
      } else if (mode === "remove") {
        nextCatalogIds = existingCatalogIds.filter(
          (catalogId) => !validCatalogIds.includes(catalogId)
        );
      } else {
        nextCatalogIds = Array.from(
          new Set([...existingCatalogIds, ...validCatalogIds])
        );
      }
      await productRepository.replaceProductCatalogs(productId, nextCatalogIds);
    }

    return NextResponse.json({
      updated: uniqueProductIds.length,
      catalogs: validCatalogIds.length,
      mode,
    });
  } catch (error: unknown) {
    return createErrorResponse(error, {
      request: req,
      source: "catalogs.assign.POST",
      fallbackMessage: "Failed to assign catalogs",
    });
  }
}

export const POST = apiHandler(POST_handler, { source: "catalogs.assign.POST" });
