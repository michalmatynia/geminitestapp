import { NextResponse } from "next/server";
import { productService } from "@/lib/services/productService";
import { createErrorResponse } from "@/lib/api/handle-api-error";
import { badRequestError } from "@/lib/errors/app-error";

/**
 * GET /api/products
 * Fetches a list of products with optional filters.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const filters = Object.fromEntries(searchParams.entries());

  try {
    const products = await productService.getProducts(filters);
    return NextResponse.json(products);
  } catch (error) {
    return createErrorResponse(error, {
      request: req,
      source: "products.GET",
      fallbackMessage: "Failed to fetch products",
    });
  }
}

/**
 * POST /api/products
 * Creates a new product.
 */
export async function POST(req: Request) {
  try {
    let formData: FormData;
    try {
      formData = await req.formData();
    } catch (error) {
      throw badRequestError("Invalid form data payload", { error });
    }
    const idempotencyKey =
      req.headers.get("idempotency-key") ??
      req.headers.get("x-idempotency-key");
    const skuField = formData.get("sku");
    if (idempotencyKey && typeof skuField === "string" && skuField.trim()) {
      const existing = await productService.getProductBySku(skuField.trim());
      if (existing) {
        return NextResponse.json({ ...existing, idempotent: true });
      }
    }
    const product = await productService.createProduct(formData);
    return NextResponse.json(product);
  } catch (error: unknown) {
    return createErrorResponse(error, {
      request: req,
      source: "products.POST",
      fallbackMessage: "Failed to create product",
    });
  }
}
