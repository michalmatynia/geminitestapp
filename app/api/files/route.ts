import { NextResponse } from "next/server";
import { getImageFileRepository } from "@/lib/services/image-file-repository";
import { getProductRepository } from "@/lib/services/product-repository";
import type { ProductWithImages } from "@/types";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);

  const filename = searchParams.get("filename")?.trim() || null;
  const productId = searchParams.get("productId")?.trim() || null;
  const productName = searchParams.get("productName")?.trim() || null;

  const imageFileRepository = await getImageFileRepository();
  const productRepository = await getProductRepository();
  const files = await imageFileRepository.listImageFiles({ filename });

  const getProductDisplayName = (product: ProductWithImages) =>
    product.name_en ?? product.name_pl ?? product.name_de ?? "Product";

  const products = await productRepository.getProducts(
    productName ? { search: productName } : {}
  );
  const filteredProducts = productId
    ? products.filter((product) => product.id === productId)
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
    .filter((file) =>
      allowedImageFileIds ? allowedImageFileIds.has(file.id) : true
    )
    .map((file) => ({
      ...file,
      products: imageFileToProducts.get(file.id) ?? [],
    }));

  return NextResponse.json(result);
}
