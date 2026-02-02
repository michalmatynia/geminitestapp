import { NextRequest, NextResponse } from "next/server";
import { getImageFileRepository } from "@/features/files/server";
import { getProductRepository } from "@/features/products/server";
import type { ProductWithImages } from "@/features/products/server";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import { apiHandler } from "@/shared/lib/api/api-handler";
import type { ApiHandlerContext } from "@/shared/types/api";
import { ErrorSystem } from "@/features/observability/server";
import type { ImageFileRecord } from "@/shared/types/files";

async function GET_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  try {
    const { searchParams } = new URL(req.url);

    const filename = searchParams.get("filename")?.trim() || null;
    const productId = searchParams.get("productId")?.trim() || null;
    const productName = searchParams.get("productName")?.trim() || null;
    const tagsParam = searchParams.get("tags")?.trim() || null;
    const tags = tagsParam ? tagsParam.split(",").map((tag) => tag.trim()).filter(Boolean) : [];

    const imageFileRepository = await getImageFileRepository();
    const productRepository = await getProductRepository();
    const files = await imageFileRepository.listImageFiles({ filename, tags });

    const getProductDisplayName = (product: ProductWithImages): string =>
      product.name_en ?? product.name_pl ?? product.name_de ?? "Product";

    const products = await productRepository.getProducts(
      productName ? { search: productName } : {}
    );
    const filteredProducts = productId
      ? products.filter((product: ProductWithImages) => product.id === productId)
      : products;

    const imageFileToProducts = new Map<
      string,
      Array<{ product: { id: string; name: string } }>
    >();
    for (const product of filteredProducts) {
      const name = getProductDisplayName(product);
      for (const image of product.images ?? []) {
        if (!imageFileToProducts.has(image.imageFileId)) {
          imageFileToProducts.set(image.imageFileId, []);
        }
        imageFileToProducts.get(image.imageFileId)?.push({
          product: { id: product.id, name },
        });
      }
    }

    const allowedImageFileIds =
      productId || productName
        ? new Set(imageFileToProducts.keys())
        : null;

    const result = files
      .filter((file: ImageFileRecord) =>
        allowedImageFileIds ? allowedImageFileIds.has(file.id) : true
      )
      .map((file: ImageFileRecord) => ({
        ...file,
        products: imageFileToProducts.get(file.id) ?? [],
      }));

    return NextResponse.json(result);
  } catch (error) {
    await ErrorSystem.captureException(error, {
      service: "api/files",
      method: "GET",
    });
    return createErrorResponse(error, {
      request: req,
      source: "files.GET",
      fallbackMessage: "Failed to load files",
    });
  }
}

export const GET = apiHandler(
  async (req: NextRequest, ctx: ApiHandlerContext): Promise<Response> => GET_handler(req, ctx),
 { source: "files.GET" });
