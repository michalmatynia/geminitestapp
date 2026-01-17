import { NextResponse } from "next/server";
import { z } from "zod";
import prisma from "@/lib/prisma";
import path from "path";
import fs from "fs/promises";
import { getCatalogRepository } from "@/lib/services/catalog-repository";
import { getImageFileRepository } from "@/lib/services/image-file-repository";
import { getProductRepository } from "@/lib/services/product-repository";
import { getImportTemplate } from "@/lib/services/import-template-repository";
import { getIntegrationRepository } from "@/lib/services/integration-repository";
import { decryptSecret } from "@/lib/utils/encryption";
import {
  fetchBaseInventories,
  fetchBaseProducts,
} from "@/lib/services/imports/base-client";
import { getProductDataProvider } from "@/lib/services/product-provider";
import { getMongoDb } from "@/lib/db/mongo-client";
import { extractBaseImageUrls, mapBaseProduct } from "@/lib/services/imports/base-mapper";
import { productCreateSchema } from "@/lib/validations/product";

export const runtime = "nodejs";

const requestSchema = z.object({
  token: z.string().trim().min(1).optional(),
  action: z.enum(["inventories", "import", "list"]),
  inventoryId: z.string().trim().min(1).optional(),
  catalogId: z.string().trim().min(1).optional(),
  templateId: z.string().trim().min(1).optional(),
  limit: z.coerce.number().int().positive().optional(),
  imageMode: z.enum(["links", "download"]).optional(),
  uniqueOnly: z.boolean().optional(),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const data = requestSchema.parse(body);
    let token = data.token;

    if (!token) {
      const integrationRepo = await getIntegrationRepository();
      const integrations = await integrationRepo.listIntegrations();
      const baseIntegration = integrations.find((i) => i.slug === "baselinker");

      if (baseIntegration) {
        const connections = await integrationRepo.listConnections(
          baseIntegration.id
        );
        // Use the first connection with a token
        const connection = connections.find((c) => c.baseApiToken);
        if (connection?.baseApiToken) {
          try {
            token = decryptSecret(connection.baseApiToken);
          } catch {
            // Ignore decryption errors, will fail later if token is still missing
          }
        }
      }
    }

    if (!token) {
      return NextResponse.json(
        { error: "Base.com API token is required (or connect integration)." },
        { status: 400 }
      );
    }

    if (data.action === "inventories") {
      const inventories = await fetchBaseInventories(token);
      return NextResponse.json({ inventories });
    }

    if (!data.inventoryId) {
      return NextResponse.json(
        { error: "Inventory ID is required." },
        { status: 400 }
      );
    }

    if (data.action === "list") {
      const products = await fetchBaseProducts(
        token,
        data.inventoryId,
        data.limit
      );
      const provider = await getProductDataProvider();
      let existingIds = new Set<string>();
      if (provider === "mongodb") {
        const mongo = await getMongoDb();
        const docs = await mongo
          .collection<{ baseProductId?: string | null }>("products")
          .find({ baseProductId: { $exists: true, $ne: null } })
          .project({ baseProductId: 1 })
          .toArray();
        existingIds = new Set(
          docs
            .map((doc) => (typeof doc.baseProductId === "string" ? doc.baseProductId : null))
            .filter(Boolean) as string[]
        );
      } else {
        const rows = await prisma.product.findMany({
          where: { baseProductId: { not: null } },
          select: { baseProductId: true },
        });
        existingIds = new Set(
          rows
            .map((row) =>
              typeof row.baseProductId === "string" ? row.baseProductId : null
            )
            .filter(Boolean) as string[]
        );
      }

      const toStringId = (value: unknown): string | null => {
        if (typeof value === "string" && value.trim()) return value.trim();
        if (typeof value === "number" && Number.isFinite(value)) {
          return String(value);
        }
        return null;
      };

      const list = products
        .map((record) => {
          const baseProductId =
            toStringId(record.base_product_id) ??
            toStringId(record.product_id) ??
            toStringId(record.id);
          const name =
            (typeof record.name === "string" && record.name.trim()) ||
            (typeof record.name_en === "string" && record.name_en.trim()) ||
            (typeof record.title === "string" && record.title.trim()) ||
            baseProductId ||
            "Unnamed";
          const sku =
            (typeof record.sku === "string" && record.sku.trim()) ||
            (typeof record.code === "string" && record.code.trim()) ||
            null;
          return {
            baseProductId: baseProductId ?? null,
            name,
            sku,
            exists: baseProductId ? existingIds.has(baseProductId) : false,
          };
        })
        .filter((item) => item.baseProductId);

      const filtered = data.uniqueOnly
        ? list.filter((item) => !item.exists)
        : list;

      return NextResponse.json({
        products: filtered,
        total: list.length,
        filtered: filtered.length,
        existing: list.filter((item) => item.exists).length,
      });
    }

    const [products, catalogRepository, productRepository, imageRepository] = await Promise.all([
      fetchBaseProducts(token, data.inventoryId, data.limit),
      getCatalogRepository(),
      getProductRepository(),
      getImageFileRepository(),
    ]);

    const template = data.templateId
      ? await getImportTemplate(data.templateId)
      : null;
    if (data.templateId && !template) {
      return NextResponse.json(
        { error: "Import template not found." },
        { status: 400 }
      );
    }

    const catalogs = await catalogRepository.listCatalogs();
    const defaultCatalog = catalogs.find((catalog) => catalog.isDefault);
    const targetCatalog = data.catalogId
      ? catalogs.find((catalog) => catalog.id === data.catalogId)
      : defaultCatalog;
    if (!targetCatalog) {
      return NextResponse.json(
        { error: "Selected catalog not found." },
        { status: 400 }
      );
    }

    const defaultPriceGroupId = targetCatalog.defaultPriceGroupId;
    const provider = await getProductDataProvider();
    const defaultPriceGroup = defaultPriceGroupId
      ? { id: defaultPriceGroupId }
      : provider === "mongodb"
        ? (() => {
            const mongoDefault = getMongoDb()
              .then((mongo) =>
                mongo
                  .collection<{ id: string }>("price_groups")
                  .findOne({ isDefault: true }, { projection: { id: 1 } })
              )
              .catch(() => null);
            return mongoDefault;
          })()
        : prisma.priceGroup.findFirst({
            where: { isDefault: true },
            select: { id: true },
          });
    const resolvedDefault = await defaultPriceGroup;
    if (!resolvedDefault?.id) {
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
        const mapped = mapBaseProduct(raw, template?.mappings ?? []);
        const imageUrls = extractBaseImageUrls(raw).slice(0, maxImages);
        const payload = productCreateSchema.parse({
          ...mapped,
          defaultPriceGroupId: resolvedDefault.id,
          imageLinks: imageUrls,
        });
        const created = await productRepository.createProduct(payload);
        if (!created && payload.sku) {
          throw new Error("Failed to create product.");
        }
        await productRepository.replaceProductCatalogs(created.id, [
          targetCatalog.id,
        ]);

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
            const mapped = mapBaseProduct(raw, template?.mappings ?? []);
            const imageUrls = extractBaseImageUrls(raw).slice(0, maxImages);
            const fallbackSku = mapped.baseProductId
              ? `BASE-${mapped.baseProductId}`
              : undefined;
            const payload = productCreateSchema.parse({
              ...mapped,
              sku: fallbackSku,
              defaultPriceGroupId: resolvedDefault.id,
              imageLinks: imageUrls,
            });
            const created = await productRepository.createProduct(payload);
            await productRepository.replaceProductCatalogs(created.id, [
              targetCatalog.id,
            ]);

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
