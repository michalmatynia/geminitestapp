import { NextRequest, NextResponse } from "next/server";
import { productService } from "@/features/products/server";
import { createErrorResponse } from "@/shared/lib/api/handle-api-error";
import { badRequestError } from "@/shared/errors/app-error";

import type { ApiHandlerContext } from "@/shared/types/api";
import { ErrorSystem } from "@/features/observability/server";
import { validateProductCreateMiddleware } from "@/features/products/validations";
import { CachedProductService, performanceMonitor } from "@/features/products/performance";

/**
 * GET /api/products
 * Fetches a list of products with caching and performance monitoring.
 */
async function GET_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  const { searchParams } = new URL(req.url);
  const filters = Object.fromEntries(searchParams.entries());

  try {
    // Read directly from the product service.
    // Why: this route is the source of truth for the admin list and must never
    // return stale empty cache entries.
    const products = await productService.getProducts(filters);

    performanceMonitor.record('db.query', 1, { operation: 'getProducts' });
    return NextResponse.json(products);
  } catch (error) {
    performanceMonitor.record('db.error', 1, { operation: 'getProducts' });
    
    await ErrorSystem.captureException(error, {
      service: "api/products",
      method: "GET",
      filters,
    });
    return createErrorResponse(error, {
      request: req,
      source: "products.GET",
      fallbackMessage: "Failed to fetch products",
    });
  }
}

/**
 * POST /api/products
 * Creates a new product with validation and cache invalidation.
 */
async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
  try {
    let formData: FormData;
    try {
      formData = await req.formData();
    } catch (error) {
      throw badRequestError("Invalid form data payload", { error });
    }

    // Validate the form data
    const validation = await validateProductCreateMiddleware(formData);
    if (!validation.success) {
      return validation.response;
    }

    const idempotencyKey =
      req.headers.get("idempotency-key") ??
      req.headers.get("x-idempotency-key");
    const skuField = formData.get("sku");
    if (idempotencyKey && typeof skuField === "string" && skuField.trim()) {
      const existing = await CachedProductService.getProductBySku(skuField.trim());
      if (existing) {
        return NextResponse.json({
          ...((existing as unknown) as Record<string, unknown>),
          idempotent: true,
        });
      }
    }
    
    const product = await productService.createProduct(formData);
    
    // Invalidate relevant caches
    CachedProductService.invalidateAll();
    
    return NextResponse.json(product);
  } catch (error: unknown) {
    await ErrorSystem.captureException(error, {
      service: "api/products",
      method: "POST",
    });
    return createErrorResponse(error, {
      request: req,
      source: "products.POST",
      fallbackMessage: "Failed to create product",
    });
  }
}

export const GET = async (req: NextRequest): Promise<Response> => GET_handler(req, {} as ApiHandlerContext);

export const POST = async (req: NextRequest): Promise<Response> => POST_handler(req, {} as ApiHandlerContext);
