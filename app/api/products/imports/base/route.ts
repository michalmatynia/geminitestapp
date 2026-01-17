import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import { getCatalogRepository } from "@/lib/services/catalog-repository";
import { getProductRepository } from "@/lib/services/product-repository";
import {
  fetchBaseInventories,
  fetchBaseProducts,
} from "@/lib/services/imports/base-client";
import { mapBaseProduct } from "@/lib/services/imports/base-mapper";
import { productCreateSchema } from "@/lib/validations/product";

export const runtime = "nodejs";

const requestSchema = z.object({
  token: z.string().trim().min(1),
  action: z.enum(["inventories", "import"]),
  inventoryId: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().positive().optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = requestSchema.parse(body);

    if (data.action === "inventories") {
      const inventories = await fetchBaseInventories(data.token);
      return NextResponse.json({ inventories });
    }

    if (!data.inventoryId) {
      return NextResponse.json(
        { error: "Inventory ID is required." },
        { status: 400 }
      );
    }

    const [products, catalogRepository, productRepository] = await Promise.all([
      fetchBaseProducts(data.token, data.inventoryId, data.limit),
      getCatalogRepository(),
      getProductRepository(),
    ]);

    const catalogs = await catalogRepository.listCatalogs();
    const defaultCatalog = catalogs.find((catalog) => catalog.isDefault);
    if (!defaultCatalog) {
      return NextResponse.json(
        { error: "Default catalog is required before importing products." },
        { status: 400 }
      );
    }

    const defaultPriceGroup = await prisma.priceGroup.findFirst({
      where: { isDefault: true },
      select: { id: true },
    });
    if (!defaultPriceGroup) {
      return NextResponse.json(
        { error: "Default price group is required before importing products." },
        { status: 400 }
      );
    }

    let imported = 0;
    let failed = 0;
    const errors: string[] = [];

    const isSkuConflict = (error: unknown) => {
      if (!(error instanceof Error)) return false;
      return /sku/i.test(error.message) && /unique|duplicate/i.test(error.message);
    };

    for (const raw of products) {
      try {
        const mapped = mapBaseProduct(raw);
        const payload = productCreateSchema.parse({
          ...mapped,
          defaultPriceGroupId: defaultPriceGroup.id,
        });
        let created = await productRepository.createProduct(payload);
        if (!created && payload.sku) {
          throw new Error("Failed to create product.");
        }
        await productRepository.replaceProductCatalogs(created.id, [
          defaultCatalog.id,
        ]);
        imported += 1;
      } catch (error: unknown) {
        if (isSkuConflict(error)) {
          try {
            const mapped = mapBaseProduct(raw);
            const fallbackSku = mapped.baseProductId
              ? `BASE-${mapped.baseProductId}`
              : undefined;
            const payload = productCreateSchema.parse({
              ...mapped,
              sku: fallbackSku,
              defaultPriceGroupId: defaultPriceGroup.id,
            });
            const created = await productRepository.createProduct(payload);
            await productRepository.replaceProductCatalogs(created.id, [
              defaultCatalog.id,
            ]);
            imported += 1;
            continue;
          } catch (fallbackError) {
            error = fallbackError;
          }
        }
        failed += 1;
        const message =
          error instanceof Error ? error.message : "Failed to import product.";
        if (errors.length < 10) {
          errors.push(message);
        }
      }
    }

    return NextResponse.json({
      imported,
      failed,
      errors,
      total: products.length,
    });
  } catch (error: unknown) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid payload", details: error.flatten() },
        { status: 400 }
      );
    }
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(
      { error: "An unknown error occurred" },
      { status: 500 }
    );
  }
}
