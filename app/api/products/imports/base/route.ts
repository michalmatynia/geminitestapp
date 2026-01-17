import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import path from "path";
import fs from "fs/promises";
import { getCatalogRepository } from "@/lib/services/catalog-repository";
import { getImageFileRepository } from "@/lib/services/image-file-repository";
import { getProductRepository } from "@/lib/services/product-repository";
import {
  fetchBaseInventories,
  fetchBaseProducts,
} from "@/lib/services/imports/base-client";
import { extractBaseImageUrls, mapBaseProduct } from "@/lib/services/imports/base-mapper";
import { productCreateSchema } from "@/lib/validations/product";

export const runtime = "nodejs";

const requestSchema = z.object({
  token: z.string().trim().min(1),
  action: z.enum(["inventories", "import"]),
  inventoryId: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().positive().optional(),
  imageMode: z.enum(["links", "download"]).optional(),
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

    const [products, catalogRepository, productRepository, imageRepository] = await Promise.all([
      fetchBaseProducts(data.token, data.inventoryId, data.limit),
      getCatalogRepository(),
      getProductRepository(),
      getImageFileRepository(),
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

    const imageMode = data.imageMode ?? "links";
    const maxImages = 15;

    const sanitizeSku = (value: string) =>
      value.trim().replace(/[^a-zA-Z0-9-_]/g, "_");

    const guessMimeType = (url: string) => {
      const lower = url.toLowerCase();
      if (lower.endsWith(".png")) return "image/png";
      if (lower.endsWith(".webp")) return "image/webp";
      if (lower.endsWith(".gif")) return "image/gif";
      if (lower.endsWith(".jpg") || lower.endsWith(".jpeg")) return "image/jpeg";
      return "image/jpeg";
    };

    const extractFilename = (url: string, fallback: string) => {
      try {
        const parsed = new URL(url);
        const base = path.basename(parsed.pathname);
        return base || fallback;
      } catch {
        return fallback;
      }
    };

    const downloadImage = async (url: string, sku: string, index: number) => {
      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`Failed to download image (${res.status})`);
      }
      const contentType = res.headers.get("content-type") || guessMimeType(url);
      const buffer = Buffer.from(await res.arrayBuffer());
      const folderName = sku ? sanitizeSku(sku) : "temp";
      const filename = `${Date.now()}-${index}-${extractFilename(url, "image.jpg")}`;
      const diskDir = path.join(process.cwd(), "public", "uploads", "products", folderName);
      const publicPath = `/uploads/products/${folderName}/${filename}`;
      await fs.mkdir(diskDir, { recursive: true });
      await fs.writeFile(path.join(diskDir, filename), buffer);
      return imageRepository.createImageFile({
        filename,
        filepath: publicPath,
        mimetype: contentType,
        size: buffer.length,
      });
    };

    for (const raw of products) {
      try {
        const mapped = mapBaseProduct(raw);
        const payload = productCreateSchema.parse({
          ...mapped,
          defaultPriceGroupId: defaultPriceGroup.id,
        });
        const created = await productRepository.createProduct(payload);
        if (!created && payload.sku) {
          throw new Error("Failed to create product.");
        }
        await productRepository.replaceProductCatalogs(created.id, [
          defaultCatalog.id,
        ]);

        const imageUrls = extractBaseImageUrls(raw).slice(0, maxImages);
        if (imageUrls.length > 0) {
          const imageFileIds: string[] = [];
          for (let i = 0; i < imageUrls.length; i += 1) {
            const url = imageUrls[i];
            try {
              if (imageMode === "download") {
                const file = await downloadImage(url, payload.sku ?? created.id, i + 1);
                imageFileIds.push(file.id);
              } else {
                const filename = extractFilename(url, `base-image-${i + 1}.jpg`);
                const file = await imageRepository.createImageFile({
                  filename,
                  filepath: url,
                  mimetype: guessMimeType(url),
                  size: 0,
                });
                imageFileIds.push(file.id);
              }
            } catch (imageError) {
              const message =
                imageError instanceof Error
                  ? imageError.message
                  : "Failed to import image.";
              if (errors.length < 10) {
                errors.push(message);
              }
            }
          }
          if (imageFileIds.length > 0) {
            await productRepository.addProductImages(created.id, imageFileIds);
          }
        }

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

            const imageUrls = extractBaseImageUrls(raw).slice(0, maxImages);
            if (imageUrls.length > 0) {
              const imageFileIds: string[] = [];
              for (let i = 0; i < imageUrls.length; i += 1) {
                const url = imageUrls[i];
                try {
                  if (imageMode === "download") {
                    const file = await downloadImage(
                      url,
                      payload.sku ?? created.id,
                      i + 1
                    );
                    imageFileIds.push(file.id);
                  } else {
                    const filename = extractFilename(url, `base-image-${i + 1}.jpg`);
                    const file = await imageRepository.createImageFile({
                      filename,
                      filepath: url,
                      mimetype: guessMimeType(url),
                      size: 0,
                    });
                    imageFileIds.push(file.id);
                  }
                } catch (imageError) {
                  const message =
                    imageError instanceof Error
                      ? imageError.message
                      : "Failed to import image.";
                  if (errors.length < 10) {
                    errors.push(message);
                  }
                }
              }
              if (imageFileIds.length > 0) {
                await productRepository.addProductImages(created.id, imageFileIds);
              }
            }

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
