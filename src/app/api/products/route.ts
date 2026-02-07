export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { productService } from "@/features/products/server";
import { getProductDataProvider } from "@/features/products/server";
import { badRequestError } from "@/shared/errors/app-error";

import type { ApiHandlerContext } from "@/shared/types/api";
import { validateProductCreateMiddleware } from "@/features/products/validations/middleware";
import { CachedProductService, performanceMonitor } from "@/features/products/performance";

import { apiHandler } from "@/shared/lib/api/api-handler";

/**
 * GET /api/products
 * Fetches a list of products with caching and performance monitoring.
 */
const shouldLogTiming = () => process.env.DEBUG_API_TIMING === "true";

const buildServerTiming = (entries: Record<string, number | null | undefined>): string => {
  const parts = Object.entries(entries)
    .filter(([, value]) => typeof value === "number" && Number.isFinite(value) && value >= 0)
    .map(([name, value]) => `${name};dur=${Math.round(value as number)}`);
  return parts.join(", ");
};

const attachTimingHeaders = (response: Response, entries: Record<string, number | null | undefined>): void => {
  const value = buildServerTiming(entries);
  if (value) {
    response.headers.set("Server-Timing", value);
  }
};

async function GET_handler(req: NextRequest, ctx: ApiHandlerContext): Promise<Response> {
  const { searchParams } = new URL(req.url);
  const filters = Object.fromEntries(searchParams.entries());
  const timings: Record<string, number | null | undefined> = {};

  try {
    const providerStart = performance.now();
    const provider = await getProductDataProvider();
    timings.provider = performance.now() - providerStart;

    // Read directly from the product service.
    // Why: this route is the source of truth for the admin list and must never
    // return stale empty cache entries.
    const products = await productService.getProducts(filters, { timings, provider });
    timings.total = ctx.getElapsedMs();

    if (shouldLogTiming()) {
      console.log("[timing] products.GET", { provider, ...timings });
    }

    const response = NextResponse.json(products, {
      headers: { "Cache-Control": "no-store" },
    });
    attachTimingHeaders(response, timings);
    return response;
  } catch (error) {
    timings.total = ctx.getElapsedMs();
    if (shouldLogTiming()) {
      console.log("[timing] products.GET error", timings);
    }
    performanceMonitor.record("db.error", 1, { operation: "getProducts" });
    throw error; // Let apiHandler handle logging and response
  }
}

/**
 * POST /api/products
 * Creates a new product with validation and cache invalidation.
 */
async function POST_handler(req: NextRequest, _ctx: ApiHandlerContext): Promise<Response> {
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
}

export const GET = apiHandler(GET_handler, { source: "products.GET" });

export const POST = apiHandler(POST_handler, { source: "products.POST" });
