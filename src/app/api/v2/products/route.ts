import { NextRequest } from 'next/server';
import { withApiVersioning, createVersionedResponse, StandardErrors, withErrorHandling } from '@/features/products/api/server';
import type { ApiVersion } from '@/features/products/api/server';
import { withSecurity } from '@/features/products/security';
import { CachedProductService } from '@/features/products/performance';
import { productService } from '@/features/products/server';

// Versioned products API handler
async function productsHandler(req: NextRequest, version: ApiVersion): Promise<Response> {
  const { searchParams } = new URL(req.url);
  
  try {
    switch (req.method) {
      case 'GET':
        return await handleGetProducts(req, version, searchParams);
      case 'POST':
        return await handleCreateProduct(req, version);
      default:
        return StandardErrors.invalidRequest(`Method ${req.method} not allowed`)
          .withMeta(version, '/api/products', req.method)
          .toResponse(405);
    }
  } catch (error) {
    console.error('Products API error:', error);
    return StandardErrors.serverError()
      .withMeta(version, '/api/products', req.method)
      .toResponse(500);
  }
}

async function handleGetProducts(_req: NextRequest, version: ApiVersion, searchParams: URLSearchParams): Promise<Response> {
  const filters = Object.fromEntries(searchParams.entries());
  const page = parseInt(searchParams.get('page') || '1');
  const limit = Math.min(parseInt(searchParams.get('limit') || '20'), 100);
  
  try {
    const products = await productService.getProducts({
      ...filters,
      page: String(page),
      pageSize: String(limit),
    });

    if (!products || products.length === 0) {
      return StandardErrors.notFound('Products')
        .withMeta(version, '/api/products', 'GET')
        .toResponse(404);
    }

    // Add pagination metadata for v2+
    const responseData = version === 'v1' ? products : {
      products,
      pagination: {
        page,
        limit,
        total: products.length,
        hasNext: products.length === limit
      }
    };

    return createVersionedResponse(responseData, version);

  } catch (_error) {
    return StandardErrors.serverError()
      .withMeta(version, '/api/products', 'GET')
      .toResponse(500);
  }
}

async function handleCreateProduct(req: NextRequest, version: ApiVersion): Promise<Response> {
  try {
    const contentType = req.headers.get('content-type') || '';
    
    if (!contentType.includes('application/json')) {
      return StandardErrors.invalidRequest('Content-Type must be application/json')
        .withMeta(version, '/api/products', 'POST')
        .toResponse(400);
    }

    const body = (await req.json()) as Record<string, unknown>;
    const sku = typeof body.sku === 'string' ? body.sku : null;
    
    // Basic validation
    if (!sku) {
      return StandardErrors.validationError([
        { field: 'sku', message: 'SKU is required', code: 'REQUIRED_FIELD' }
      ])
        .withMeta(version, '/api/products', 'POST')
        .toResponse(400);
    }

    // Check for duplicate SKU
    const existing = await CachedProductService.getProductBySku(sku);
    if (existing) {
      return StandardErrors.duplicateResource('sku', sku)
        .withMeta(version, '/api/products', 'POST')
        .toResponse(409);
    }

    // Create product (placeholder)
    const product = {
      id: crypto.randomUUID(),
      ...body,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // Invalidate cache
    CachedProductService.invalidateAll();

    return createVersionedResponse(product, version, 201);

  } catch (error) {
    if (error instanceof SyntaxError) {
      return StandardErrors.invalidRequest('Invalid JSON in request body')
        .withMeta(version, '/api/products', 'POST')
        .toResponse(400);
    }

    return StandardErrors.serverError()
      .withMeta(version, '/api/products', 'POST')
      .toResponse(500);
  }
}

// Export with all middleware layers
export const GET = withSecurity(
  withErrorHandling(
    withApiVersioning(productsHandler)
  ),
  { rateLimiter: 'api' }
);

export const POST = withSecurity(
  withErrorHandling(
    withApiVersioning(productsHandler)
  ),
  { rateLimiter: 'productCreate', enableInputSanitization: true }
);
